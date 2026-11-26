import { act, renderHook } from "@testing-library/react-native";
import * as Location from "expo-location";

import {
  COMPASS_EVERY_MS,
  MOVING_FIX_MS,
  TURN_EVERY_MS,
} from "../navigation/headingUp";
import { setPocketOn } from "../navigation/pocketOn";
import { FIRST_PAGE, setRunPage } from "../navigation/runPage";
import type { TurnedMap } from "./turnedMap";
import { type RunHeading, useHeadingUpMap } from "./useHeadingUpMap";

jest.mock("expo-location", () => ({
  watchHeadingAsync: jest.fn(),
}));

const watchHeading = jest.mocked(Location.watchHeadingAsync);

type Heading = Parameters<Parameters<typeof Location.watchHeadingAsync>[0]>[0];

const NOW = 1_700_000_000_000;

let needle: ((heading: Heading) => void) | null = null;
const remove = jest.fn();

/** The map turned as a drawing 30° clockwise, with its arrow. */
function drawing(turn: TurnedMap["turn"] = null): TurnedMap {
  return {
    bearing: -30,
    turn,
    onTurned: jest.fn(),
    shown: -30,
    arrow: true,
    onArrow: jest.fn(),
  };
}

/** A run with a line pointing east, its last fix just now. */
const RUNNING: RunHeading = { on: true, trackDeg: 90, lastFixMs: NOW - 1000 };

beforeEach(() => {
  needle = null;
  remove.mockClear();
  watchHeading.mockReset();
  watchHeading.mockImplementation(async (callback) => {
    needle = callback;
    return { remove };
  });
  jest.useFakeTimers({ now: NOW });
  setRunPage(FIRST_PAGE);
  setPocketOn(false);
});

afterEach(() => {
  jest.useRealTimers();
  setRunPage(FIRST_PAGE);
  setPocketOn(false);
});

async function flush(): Promise<void> {
  await act(async () => {
    await Promise.resolve();
  });
}

async function wait(ms: number): Promise<void> {
  await act(async () => {
    jest.advanceTimersByTime(ms);
  });
}

async function read(trueHeading: number, accuracy = 3): Promise<void> {
  await act(async () => {
    needle?.({ trueHeading, magHeading: trueHeading, accuracy });
  });
}

test("on «Data» the map is the drawing's: its turn, its arrow, no compass", async () => {
  setRunPage("data");
  const turned = drawing();
  const { result, rerender } = await renderHook(
    ({ turned, run }: { turned: TurnedMap; run: RunHeading }) =>
      useHeadingUpMap(turned, run),
    { initialProps: { turned, run: RUNNING } },
  );
  await flush();
  expect(watchHeading).not.toHaveBeenCalled();
  expect(result.current.turn).toBeNull();
  expect(result.current.compass).toBe(false);
  expect(result.current.facing).toBeNull();
  expect(result.current.onArrow).toBe(turned.onArrow);
  // A tap on the drawing's arrow goes through.
  const asked = { bearing: 0 };
  await rerender({ turned: drawing(asked), run: RUNNING });
  expect(result.current.turn).toBe(asked);
});

test("on «Compass» the compass turns the map, for 4° or more and not twice in 400 ms", async () => {
  const { result } = await renderHook(() => useHeadingUpMap(drawing(), RUNNING));
  await act(async () => {
    setRunPage("compass");
  });
  await flush();
  expect(watchHeading).toHaveBeenCalledTimes(1);
  expect(result.current.compass).toBe(true);
  expect(result.current.arrow).toBe(true);
  // Before the first reading, the line run turns the map at once.
  expect(result.current.turn).toEqual({ bearing: 90 });
  const first = result.current.turn;

  // Barely moved, late enough: the same turn.
  await wait(TURN_EVERY_MS);
  await read(92);
  expect(result.current.turn).toBe(first);
  // Moved enough, and late enough since the last turn: the compass turns it.
  await wait(COMPASS_EVERY_MS);
  await read(100);
  expect(result.current.turn).toEqual({ bearing: 100 });
  const second = result.current.turn;
  // Moved enough, too soon after the last turn: still the same.
  await wait(COMPASS_EVERY_MS);
  await read(110);
  expect(result.current.turn).toBe(second);
  await wait(COMPASS_EVERY_MS);
  await read(112);
  expect(result.current.turn).toEqual({ bearing: 112 });
});

test("a tap puts north up and keeps it; a second tap turns heading-up again", async () => {
  const { result } = await renderHook(() => useHeadingUpMap(drawing(), RUNNING));
  await act(async () => {
    setRunPage("compass");
  });
  await flush();
  await read(90);
  expect(result.current.northUp).toBe(false);

  await act(async () => {
    result.current.onArrow();
  });
  expect(result.current.turn).toEqual({ bearing: 0 });
  expect(result.current.northUp).toBe(true);
  // The compass is let go: no reading turns the map.
  expect(remove).toHaveBeenCalledTimes(1);
  await wait(TURN_EVERY_MS);
  const north = result.current.turn;
  await read(120);
  expect(result.current.turn).toBe(north);

  // The second tap: the line run at once, then the compass again.
  await act(async () => {
    result.current.onArrow();
  });
  await flush();
  expect(result.current.northUp).toBe(false);
  expect(watchHeading).toHaveBeenCalledTimes(2);
  expect(result.current.turn).toEqual({ bearing: 90 });
  await wait(TURN_EVERY_MS);
  await read(120);
  expect(result.current.turn).toEqual({ bearing: 120 });
});

test("leaving «Compass» turns the map back as its drawing, and north up with it", async () => {
  const { result } = await renderHook(() => useHeadingUpMap(drawing(), RUNNING));
  await act(async () => {
    setRunPage("compass");
  });
  await flush();
  await read(90);
  await act(async () => {
    result.current.onArrow();
  });
  expect(result.current.northUp).toBe(true);

  await act(async () => {
    setRunPage("map");
  });
  expect(result.current.turn).toEqual({ bearing: -30 });
  expect(result.current.compass).toBe(false);
  expect(result.current.northUp).toBe(false);
  // Opened again, it starts heading-up, not north up: the line run first,
  // then the compass.
  await act(async () => {
    setRunPage("compass");
  });
  await flush();
  expect(result.current.turn).toEqual({ bearing: 90 });
  await wait(TURN_EVERY_MS);
  await read(45);
  expect(result.current.turn).toEqual({ bearing: 45 });
});

test("the arrow faces where the map turned on «Compass», nowhere on «Data» or north up (TASK-431)", async () => {
  setRunPage("data");
  const { result } = await renderHook(() => useHeadingUpMap(drawing(), RUNNING));
  expect(result.current.facing).toBeNull();
  await act(async () => {
    setRunPage("compass");
  });
  await flush();
  // The line run first, then the compass: always the map's last turn.
  expect(result.current.facing).toBe(90);
  await wait(TURN_EVERY_MS);
  await read(130);
  expect(result.current.facing).toBe(130);
  // North up: the arrow is the line run's again.
  await act(async () => {
    result.current.onArrow();
  });
  expect(result.current.facing).toBeNull();
  await act(async () => {
    result.current.onArrow();
  });
  await flush();
  // Heading-up again: the arrow is where the map turns.
  expect(result.current.facing).toBe(130);
  expect(result.current.turn).toEqual({ bearing: 130 });
  // On «Data», no map: none.
  await act(async () => {
    setRunPage("data");
  });
  expect(result.current.facing).toBeNull();
});

test("the run over, the map goes back too, whatever page was open", async () => {
  const { result, rerender } = await renderHook(
    ({ run }: { run: RunHeading }) => useHeadingUpMap(drawing(), run),
    { initialProps: { run: RUNNING } },
  );
  await act(async () => {
    setRunPage("compass");
  });
  await flush();
  await read(90);
  await rerender({ run: { ...RUNNING, on: false } });
  expect(result.current.turn).toEqual({ bearing: -30 });
  expect(remove).toHaveBeenCalledTimes(1);
});

test("without a compass the line run turns the map while moving; standing still it waits", async () => {
  watchHeading.mockRejectedValue(new Error("no compass"));
  const still: RunHeading = {
    on: true,
    trackDeg: 90,
    lastFixMs: NOW - MOVING_FIX_MS - 1,
  };
  const { result, rerender } = await renderHook(
    ({ run }: { run: RunHeading }) => useHeadingUpMap(drawing(), run),
    { initialProps: { run: still } },
  );
  await act(async () => {
    setRunPage("compass");
  });
  await flush();
  expect(result.current.turn).toBeNull();
  // A fix comes: the runner moves east.
  await rerender({ run: { ...still, lastFixMs: NOW } });
  expect(result.current.turn).toEqual({ bearing: 90 });
});

test("running with a poor compass, the line run wins over the needle", async () => {
  const { result } = await renderHook(() => useHeadingUpMap(drawing(), RUNNING));
  await act(async () => {
    setRunPage("compass");
  });
  await flush();
  await read(200, 1);
  expect(result.current.turn).toEqual({ bearing: 90 });
});

test("on «Map» the arrow faces where the phone points, the map not turning (TASK-519)", async () => {
  const turned = drawing();
  const { result } = await renderHook(() => useHeadingUpMap(turned, RUNNING));
  await flush();
  expect(watchHeading).toHaveBeenCalledTimes(1);
  // Not «Compass»: the drawing's arrow, the drawing's turn.
  expect(result.current.compass).toBe(false);
  expect(result.current.onArrow).toBe(turned.onArrow);
  expect(result.current.turn).toBeNull();
  // Before the first reading, the line run.
  expect(result.current.facing).toBe(90);
  await wait(TURN_EVERY_MS);
  await read(200);
  expect(result.current.facing).toBe(200);
  expect(result.current.turn).toBeNull();
  // 4° or more, not twice in 400 ms, as on «Compass».
  await wait(COMPASS_EVERY_MS);
  await read(202);
  expect(result.current.facing).toBe(200);
  await wait(COMPASS_EVERY_MS);
  await read(240);
  expect(result.current.facing).toBe(240);
  expect(result.current.turn).toBeNull();
});

test("standing still on «Map», the compass turns the arrow all the same (TASK-519)", async () => {
  const still: RunHeading = {
    on: true,
    trackDeg: 90,
    lastFixMs: NOW - MOVING_FIX_MS - 1,
  };
  const { result } = await renderHook(() => useHeadingUpMap(drawing(), still));
  await flush();
  expect(result.current.facing).toBeNull();
  await read(300);
  expect(result.current.facing).toBe(300);
  expect(result.current.turn).toBeNull();
});

test("under pocket mode on «Map» the compass rests and the arrow is the line run's (TASK-519)", async () => {
  const { result } = await renderHook(() => useHeadingUpMap(drawing(), RUNNING));
  await flush();
  await wait(TURN_EVERY_MS);
  await read(200);
  expect(result.current.facing).toBe(200);

  await act(async () => {
    setPocketOn(true);
  });
  expect(remove).toHaveBeenCalledTimes(1);
  expect(result.current.facing).toBeNull();

  await wait(TURN_EVERY_MS);
  await act(async () => {
    setPocketOn(false);
  });
  await flush();
  expect(watchHeading).toHaveBeenCalledTimes(2);
  // A reading of before pocket mode does not count: the line run first.
  expect(result.current.facing).toBe(90);
  await wait(TURN_EVERY_MS);
  await read(210);
  expect(result.current.facing).toBe(210);
});

test("from «Map» to «Compass» the map turns at once where the arrow faces (TASK-519)", async () => {
  const { result } = await renderHook(() => useHeadingUpMap(drawing(), RUNNING));
  await flush();
  await wait(TURN_EVERY_MS);
  await read(200);
  expect(result.current.turn).toBeNull();
  // Same compass, kept on across the pages; the map turns without waiting
  // for the needle to move 4°.
  await act(async () => {
    setRunPage("compass");
  });
  await flush();
  expect(watchHeading).toHaveBeenCalledTimes(1);
  expect(result.current.turn).toEqual({ bearing: 200 });
  expect(result.current.facing).toBe(200);
  // Back on «Map»: the drawing's turn again, the arrow still facing.
  await act(async () => {
    setRunPage("map");
  });
  expect(result.current.turn).toEqual({ bearing: -30 });
  expect(result.current.facing).toBe(200);
});

test("the run over, the arrow on «Map» is the line run's and the compass rests (TASK-519)", async () => {
  const { result, rerender } = await renderHook(
    ({ run }: { run: RunHeading }) => useHeadingUpMap(drawing(), run),
    { initialProps: { run: RUNNING } },
  );
  await flush();
  await read(200);
  await rerender({ run: { ...RUNNING, on: false } });
  expect(result.current.facing).toBeNull();
  expect(remove).toHaveBeenCalledTimes(1);
});
