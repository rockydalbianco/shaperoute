import type { LatLon } from "@shaperoute/shared-types";
import { act, renderHook } from "@testing-library/react-native";
import { AppState, type AppStateStatus } from "react-native";

import { setPocketOn } from "../navigation/pocketOn";
import { addFix, emptyTrack, type Track } from "../navigation/trackRecorder";
import { type RunNumbers, useRunNumbers } from "./RunPanel";

// The clock of the run's numbers ticks once a second only while someone
// can see it (TASK-496): not behind another app, not with the phone locked,
// not in pocket mode. The numbers are then those of the last fix, for the
// live link, and the clock is read again as the screen is back.

const START: LatLon = [46.0122, 11.2986];
const METRE = 1 / 111_195;
const NOW = Date.UTC(2026, 10, 23, 7, 0, 0);

/** A run that began ten minutes before NOW: a fix every 10 s and 30 m,
 * until `seconds` after NOW. */
function runUntil(seconds: number): Track {
  let track = emptyTrack();
  for (let s = -600; s <= seconds; s += 10) {
    track = addFix(track, {
      point: [START[0] + (s + 600) * 3 * METRE, START[1]],
      timeMs: NOW + s * 1000,
      accuracyM: 5,
    });
  }
  return track;
}

let listeners: ((next: AppStateStatus) => void)[] = [];
let state: AppStateStatus = "active";
function goTo(next: AppStateStatus) {
  state = next;
  return act(async () => listeners.forEach((listener) => listener(next)));
}

function wait(ms: number) {
  return act(async () => {
    await jest.advanceTimersByTimeAsync(ms);
  });
}

let renders = 0;
async function numbersOf(track: Track) {
  renders = 0;
  return renderHook<RunNumbers, { track: Track }>(
    ({ track: shown }) => {
      renders += 1;
      return useRunNumbers(shown, true);
    },
    { initialProps: { track } },
  );
}

beforeEach(() => {
  jest.useFakeTimers({ now: NOW });
  listeners = [];
  state = "active";
  Object.defineProperty(AppState, "currentState", {
    configurable: true,
    get: () => state,
  });
  jest.spyOn(AppState, "addEventListener").mockImplementation((_type, listener) => {
    listeners.push(listener as (next: AppStateStatus) => void);
    return {
      remove: () => {
        listeners = listeners.filter((other) => other !== listener);
      },
    } as ReturnType<typeof AppState.addEventListener>;
  });
});

afterEach(async () => {
  await act(async () => setPocketOn(false));
  jest.restoreAllMocks();
  jest.useRealTimers();
});

test("in front the clock ticks each second, as ever", async () => {
  const { result } = await numbersOf(runUntil(0));
  expect(result.current.time).toBe("10:00");
  for (let second = 1; second <= 5; second += 1) {
    const before = renders;
    await wait(1000);
    expect(result.current.time).toBe(`10:0${second}`);
    expect(renders).toBeGreaterThan(before);
  }
});

test.each<AppStateStatus>(["background", "inactive"])(
  "with the app «%s» nothing ticks; a fix still moves the numbers",
  async (behind) => {
    const { result, rerender } = await numbersOf(runUntil(0));
    await wait(3000);
    expect(result.current.time).toBe("10:03");
    await goTo(behind);
    // The numbers of the last fix, not of a clock nobody reads.
    expect(result.current.time).toBe("10:00");
    const before = renders;
    await wait(60_000);
    expect(renders).toBe(before);
    expect(jest.getTimerCount()).toBe(0);
    // The run goes on with the phone locked: its fixes bring the time.
    await rerender({ track: runUntil(60) });
    expect(result.current.time).toBe("11:00");
    expect(result.current.km).toBe(runDistance(60));
    expect(renders).toBe(before + 1);
  },
);

test("back in front the clock is read at once, and ticks again", async () => {
  const { result, rerender } = await numbersOf(runUntil(0));
  await goTo("background");
  await wait(125_000);
  await rerender({ track: runUntil(120) });
  expect(result.current.time).toBe("12:00");
  await goTo("active");
  expect(result.current.time).toBe("12:05");
  await wait(2000);
  expect(result.current.time).toBe("12:07");
});

test("in pocket mode nothing ticks; out of it the clock is read at once", async () => {
  const { result, rerender } = await numbersOf(runUntil(0));
  await act(async () => setPocketOn(true));
  expect(result.current.time).toBe("10:00");
  const before = renders;
  await wait(45_000);
  expect(renders).toBe(before);
  await rerender({ track: runUntil(40) });
  expect(result.current.time).toBe("10:40");
  await act(async () => setPocketOn(false));
  expect(result.current.time).toBe("10:45");
  await wait(1000);
  expect(result.current.time).toBe("10:46");
});

test("the clock never shows less than the last fix", async () => {
  const { result, rerender } = await numbersOf(runUntil(0));
  await wait(9400);
  expect(result.current.time).toBe("10:09");
  // A fix comes between two ticks: its time is the run's.
  await rerender({ track: runUntil(10) });
  expect(result.current.time).toBe("10:10");
  await wait(600);
  expect(result.current.time).toBe("10:10");
  await wait(1000);
  expect(result.current.time).toBe("10:11");
});

/** The kilometres the panel shows `seconds` after NOW. */
function runDistance(seconds: number): string {
  return (((seconds + 600) * 3) / 1000).toFixed(2);
}
