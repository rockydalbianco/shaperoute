import type {
  LatLon,
  StrokeMatchRequest,
  StrokeMatchResult,
} from "@shaperoute/shared-types";
import { act, renderHook } from "@testing-library/react-native";

import type { MatchAnswer, matchStroke } from "../engine/matchOnPhone";
import {
  MATCH_DEBOUNCE_MS,
  type MapMatchingOptions,
  useMapMatching,
} from "./useMapMatching";

jest.mock("expo-file-system", () => jest.requireActual("../engine/memoryFiles"));
jest.mock("expo-file-system/legacy", () => ({ downloadAsync: jest.fn() }));

const URL = "http://192.168.1.23:8000";

/** Two lines drawn one after the other, each a few hundred metres. */
const FIRST: LatLon[] = [
  [46.0702, 11.1265],
  [46.0706, 11.1278],
  [46.0712, 11.1291],
];
const SECOND: LatLon[] = [
  [46.0716, 11.1306],
  [46.072, 11.132],
  [46.0728, 11.1331],
];
const END: LatLon = [46.0713, 11.129];

/** The roads of a stroke: its points, ending at END. */
function roadsOf(request: StrokeMatchRequest): StrokeMatchResult {
  return {
    points: [...request.line.slice(0, -1), END],
    away_m: request.line.map(() => 5),
    off_roads: false,
  };
}

type Ask = {
  request: StrokeMatchRequest;
  finish: (answer: MatchAnswer) => void;
  signal?: AbortSignal;
};

/** A matcher whose answers the test gives, one request at a time. */
function matcher() {
  const asks: Ask[] = [];
  const match = jest.fn(
    (
      _: string | null,
      request: StrokeMatchRequest,
      options?: { signal?: AbortSignal },
    ) =>
      new Promise<MatchAnswer>((finish) =>
        asks.push({ request, finish, signal: options?.signal }),
      ),
  ) as unknown as typeof matchStroke;
  return { match, asks };
}

function render(
  lines: LatLon[][],
  match: typeof matchStroke,
  over: Partial<MapMatchingOptions> = {},
) {
  return renderHook((props: MapMatchingOptions) => useMapMatching(props), {
    initialProps: {
      apiUrl: URL,
      activity: "running",
      lines,
      enabled: true,
      match,
      ...over,
    },
  });
}

async function answer(ask: Ask, given?: MatchAnswer) {
  await act(async () => {
    ask.finish(given ?? { kind: "match", match: roadsOf(ask.request), by: "phone" });
  });
}

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.clearAllTimers();
  jest.useRealTimers();
});

test("off, nothing is sent and there are no strokes", async () => {
  const { match } = matcher();
  const { result } = await render([FIRST], match, { enabled: false });
  await act(async () => {
    jest.advanceTimersByTime(MATCH_DEBOUNCE_MS);
  });
  expect(result.current.strokes).toEqual([]);
  expect(result.current.snapping).toBe(false);
  expect(match).not.toHaveBeenCalled();
});

test("a stroke waits for the timer, then is anchored", async () => {
  const { match, asks } = matcher();
  const { result } = await render([FIRST], match);
  expect(result.current.snapping).toBe(true);
  await act(async () => {
    jest.advanceTimersByTime(MATCH_DEBOUNCE_MS - 1);
  });
  expect(match).not.toHaveBeenCalled();
  await act(async () => {
    jest.advanceTimersByTime(1);
  });
  expect(asks).toHaveLength(1);
  expect(asks[0].request).toMatchObject({ activity: "running" });
  expect(asks[0].request.from).toBeUndefined();

  await answer(asks[0]);
  expect(result.current.strokes.map((stroke) => stroke.state)).toEqual(["matched"]);
  expect(result.current.snapping).toBe(false);
});

test("the second stroke starts at the end of the first on the roads, at once", async () => {
  const { match, asks } = matcher();
  const { result } = await render([FIRST, SECOND], match);
  await act(async () => {
    jest.advanceTimersByTime(MATCH_DEBOUNCE_MS);
  });
  await answer(asks[0]);
  await act(async () => {
    jest.advanceTimersByTime(0);
  });
  expect(asks).toHaveLength(2);
  expect(asks[1].request.from).toEqual(END);
  await answer(asks[1]);
  expect(result.current.strokes.map((stroke) => [stroke.line, stroke.state])).toEqual([
    [0, "matched"],
    [1, "matched"],
  ]);
});

test("a new line cancels what was being sent, and Undo then Redo is drawn at once", async () => {
  const { match, asks } = matcher();
  const { result, rerender } = await render([FIRST], match);
  await act(async () => {
    jest.advanceTimersByTime(MATCH_DEBOUNCE_MS);
  });
  await answer(asks[0]);

  const both = [FIRST, SECOND];
  await rerender({
    apiUrl: URL,
    activity: "running",
    lines: both,
    enabled: true,
    match,
  });
  await act(async () => {
    jest.advanceTimersByTime(MATCH_DEBOUNCE_MS);
  });
  expect(asks).toHaveLength(2);

  // «Undo» while the second is on its way: it is let go.
  await rerender({
    apiUrl: URL,
    activity: "running",
    lines: [FIRST],
    enabled: true,
    match,
  });
  expect(asks[1].signal?.aborted).toBe(true);
  expect(result.current.strokes.map((stroke) => stroke.state)).toEqual(["matched"]);

  // «Redo»: asked again, answered, then Undo and Redo draw from memory.
  await rerender({
    apiUrl: URL,
    activity: "running",
    lines: both,
    enabled: true,
    match,
  });
  await act(async () => {
    jest.advanceTimersByTime(MATCH_DEBOUNCE_MS);
  });
  await answer(asks[2]);
  await rerender({
    apiUrl: URL,
    activity: "running",
    lines: [FIRST],
    enabled: true,
    match,
  });
  await rerender({
    apiUrl: URL,
    activity: "running",
    lines: both,
    enabled: true,
    match,
  });
  expect(result.current.strokes.map((stroke) => stroke.state)).toEqual([
    "matched",
    "matched",
  ]);
  expect(result.current.snapping).toBe(false);
  await act(async () => {
    jest.advanceTimersByTime(MATCH_DEBOUNCE_MS);
  });
  expect(asks).toHaveLength(3);
});

test("a stroke left without an answer is asked again on retry", async () => {
  const { match, asks } = matcher();
  const { result } = await render([FIRST], match);
  await act(async () => {
    jest.advanceTimersByTime(MATCH_DEBOUNCE_MS);
  });
  await answer(asks[0], { kind: "none", why: "no server" });
  expect(result.current.strokes[0]).toMatchObject({ state: "failed", retry: true });
  await act(async () => {
    jest.advanceTimersByTime(MATCH_DEBOUNCE_MS);
  });
  expect(asks).toHaveLength(1);

  await act(async () => {
    result.current.retry();
  });
  await act(async () => {
    jest.advanceTimersByTime(MATCH_DEBOUNCE_MS);
  });
  expect(asks).toHaveLength(2);
  await answer(asks[1]);
  expect(result.current.strokes[0].state).toBe("matched");
});

test("a verdict is kept: the stroke is not asked again", async () => {
  const { match, asks } = matcher();
  const { result } = await render([FIRST], match);
  await act(async () => {
    jest.advanceTimersByTime(MATCH_DEBOUNCE_MS);
  });
  await answer(asks[0], { kind: "verdict", code: "shape_not_drawable", message: "" });
  await act(async () => {
    result.current.retry();
  });
  await act(async () => {
    jest.advanceTimersByTime(MATCH_DEBOUNCE_MS);
  });
  expect(asks).toHaveLength(1);
  expect(result.current.strokes[0]).toMatchObject({ state: "failed", retry: false });
});

test("after a stroke left as drawn, the next one starts afresh", async () => {
  const { match, asks } = matcher();
  await render([FIRST, SECOND], match);
  await act(async () => {
    jest.advanceTimersByTime(MATCH_DEBOUNCE_MS);
  });
  await answer(asks[0], { kind: "none", why: "no zone" });
  await act(async () => {
    jest.advanceTimersByTime(0);
  });
  expect(asks).toHaveLength(2);
  expect(asks[1].request.from).toBeUndefined();
});

test("another magnet asks the strokes again", async () => {
  const { match, asks } = matcher();
  const { rerender } = await render([FIRST], match, { fit: 0.5 });
  await act(async () => {
    jest.advanceTimersByTime(MATCH_DEBOUNCE_MS);
  });
  await answer(asks[0]);
  await rerender({
    apiUrl: URL,
    activity: "running",
    lines: [FIRST],
    enabled: true,
    match,
    fit: 0.8,
  });
  await act(async () => {
    jest.advanceTimersByTime(MATCH_DEBOUNCE_MS);
  });
  expect(asks).toHaveLength(2);
  expect(asks[1].request.fit).toBe(0.8);
});
