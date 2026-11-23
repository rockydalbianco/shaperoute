import type { LatLon, StrokeMatchRequest } from "@shaperoute/shared-types";
import { act, renderHook } from "@testing-library/react-native";

import { type MatchAnswer, matchStroke } from "../engine/matchOnPhone";
import { NOT_ANCHORED, NOT_ANCHORING } from "./anchoring";
import { fromPlane } from "./plane";
import { type MapCanvasOptions, useMapCanvas } from "./useMapCanvas";
import { MATCH_DEBOUNCE_MS } from "./useMapMatching";

/** «Draw on the map» with a drawing anchored to the roads as it is drawn
 * (TASK-347 part C): the strokes of a hand drawing go to the matcher, and
 * the map and the panel get what it answers. */

jest.mock("../api/imageOutlines", () => ({ requestImageOutline: jest.fn() }));
jest.mock("../engine/matchOnPhone", () => ({
  ...jest.requireActual<typeof import("../engine/matchOnPhone")>(
    "../engine/matchOnPhone",
  ),
  matchStroke: jest.fn(),
}));

const TRENTO: LatLon = [46.0671, 11.1214];
const MIDDLE: LatLon = [46.07, 11.13];
const PX_M = 2;

/** The roads of a stroke: its points, a few metres off. */
function roads(request: StrokeMatchRequest): MatchAnswer {
  return {
    kind: "match",
    match: {
      points: request.line.map(([lat, lon]) => [lat + 0.00002, lon]),
      away_m: request.line.map(() => 2),
      off_roads: false,
    },
    by: "phone",
  };
}

function setUp(options: Partial<MapCanvasOptions> = {}) {
  return renderHook(() =>
    useMapCanvas({
      apiUrl: "http://api.test",
      penUp: true,
      activity: "running",
      limitsM: [1000, 21_000],
      distanceM: 5000,
      start: TRENTO,
      ...options,
    }),
  );
}

/** A round line about 600 m wide around the middle. */
function roundLine(): LatLon[] {
  return Array.from({ length: 120 }, (_, i) => {
    const a = (2 * Math.PI * 0.97 * i) / 119;
    return fromPlane(MIDDLE, [600 * Math.cos(a), 600 * Math.sin(a)]);
  });
}

beforeEach(() => {
  jest.useFakeTimers();
  jest.mocked(matchStroke).mockReset();
  jest.mocked(matchStroke).mockImplementation(async (_, request) => roads(request));
});

afterEach(() => {
  jest.clearAllTimers();
  jest.useRealTimers();
});

test("no figure, nothing anchored", async () => {
  const { result } = await setUp();
  expect(result.current.anchored).toBe(NOT_ANCHORED);
  expect(result.current.anchoring).toBe(NOT_ANCHORING);
});

test("a line drawn is anchored: a ghost under its roads, and a score", async () => {
  const { result } = await setUp();
  await act(async () =>
    result.current.onCanvas({ type: "drawn", line: roundLine(), metresPerPx: PX_M }),
  );
  expect(result.current.placed?.figure.kind).toBe("drawing");
  expect(result.current.anchored.ghost).toBe(true);
  expect(result.current.anchoring.snapping).toBe(true);

  await act(async () => {
    await jest.advanceTimersByTimeAsync(MATCH_DEBOUNCE_MS);
  });
  expect(matchStroke).toHaveBeenCalledWith(
    "http://api.test",
    expect.objectContaining({ activity: "running" }),
    expect.objectContaining({ signal: expect.anything() }),
  );
  expect(result.current.anchored.snapped).toHaveLength(1);
  expect(result.current.anchoring).toEqual({
    snapping: false,
    score: 100,
    offRoads: false,
  });
});

test("a shape of the catalogue is not anchored", async () => {
  const { result } = await setUp();
  await act(async () => result.current.pick("heart"));
  await act(async () => {
    await jest.advanceTimersByTimeAsync(MATCH_DEBOUNCE_MS);
  });
  expect(result.current.anchored).toBe(NOT_ANCHORED);
  expect(matchStroke).not.toHaveBeenCalled();
});

test("«Undo» takes the anchoring away with the line", async () => {
  const { result } = await setUp();
  await act(async () =>
    result.current.onCanvas({ type: "drawn", line: roundLine(), metresPerPx: PX_M }),
  );
  await act(async () => {
    await jest.advanceTimersByTimeAsync(MATCH_DEBOUNCE_MS);
  });
  await act(async () => result.current.undo());
  expect(result.current.placed).toBeNull();
  expect(result.current.anchored).toBe(NOT_ANCHORED);
});
