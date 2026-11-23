import type { ImageRouteRequest, LatLon } from "@shaperoute/shared-types";
import { act, renderHook, waitFor } from "@testing-library/react-native";

import { strokeMatchesOnServer } from "../api/strokeMatches";
import { matchStroke } from "../engine/matchOnPhone";
import { fromPlane } from "./plane";
import { type MapCanvasOptions, useMapCanvas } from "./useMapCanvas";

/** «Draw route» for a drawing made by hand (TASK-347 part C3, ADR-0300):
 * asked anchored, so the route stays where and as it was drawn, of a server
 * that answered the probe; free of an older one, and for a shape. */

jest.mock("../api/imageOutlines", () => ({ requestImageOutline: jest.fn() }));
jest.mock("../api/strokeMatches", () => ({
  ...jest.requireActual<typeof import("../api/strokeMatches")>("../api/strokeMatches"),
  strokeMatchesOnServer: jest.fn(),
}));
jest.mock("../engine/matchOnPhone", () => ({
  ...jest.requireActual<typeof import("../engine/matchOnPhone")>(
    "../engine/matchOnPhone",
  ),
  matchStroke: jest.fn(async () => ({ kind: "none" })),
}));

const TRENTO: LatLon = [46.0671, 11.1214];
const MIDDLE: LatLon = [46.07, 11.13];
const PX_M = 2;

function setUp(options: Partial<MapCanvasOptions> = {}) {
  return renderHook(
    (props: Partial<MapCanvasOptions>) =>
      useMapCanvas({
        apiUrl: "http://api.test",
        penUp: true,
        activity: "running",
        limitsM: [1000, 21_000],
        distanceM: 5000,
        start: TRENTO,
        ...options,
        ...props,
      }),
    { initialProps: {} },
  );
}

/** A round line about 600 m wide around the middle. */
function roundLine(): LatLon[] {
  return Array.from({ length: 120 }, (_, i) => {
    const a = (2 * Math.PI * 0.97 * i) / 119;
    return fromPlane(MIDDLE, [600 * Math.cos(a), 600 * Math.sin(a)]);
  });
}

function placement(request: unknown): unknown {
  return (request as ImageRouteRequest | null)?.placement;
}

beforeEach(() => {
  jest.mocked(strokeMatchesOnServer).mockReset();
  jest.mocked(matchStroke).mockClear();
});

test("a server that answers the probe draws a hand drawing where it was drawn", async () => {
  jest.mocked(strokeMatchesOnServer).mockResolvedValue(true);
  const { result } = await setUp();
  await act(async () =>
    result.current.onCanvas({ type: "drawn", line: roundLine(), metresPerPx: PX_M }),
  );
  // Nothing at once: the probe waits for the stroke's answer.
  expect(strokeMatchesOnServer).not.toHaveBeenCalled();
  await waitFor(() => expect(placement(result.current.request)).toBe("anchored"));
  expect(strokeMatchesOnServer).toHaveBeenCalledWith("http://api.test");
  expect(matchStroke).toHaveBeenCalled();
  // Sized from the result, it stays anchored.
  let sized: unknown = null;
  await act(async () => {
    sized = result.current.sizeTo(6000);
  });
  expect(placement(sized)).toBe("anchored");
  // Changed to a shape of the catalogue, the search places it as before.
  let changed: unknown = null;
  await act(async () => {
    changed = result.current.changeTo({ kind: "shape", shape: "heart" }, 5000);
  });
  expect(placement(changed)).toBeUndefined();
  expect(placement(result.current.request)).toBeUndefined();
});

test("an older server, or no answer, keeps the drawing free", async () => {
  jest.mocked(strokeMatchesOnServer).mockResolvedValue(false);
  const { result } = await setUp();
  await act(async () =>
    result.current.onCanvas({ type: "drawn", line: roundLine(), metresPerPx: PX_M }),
  );
  await waitFor(() => expect(strokeMatchesOnServer).toHaveBeenCalled());
  expect(result.current.request).not.toBeNull();
  expect(placement(result.current.request)).toBeUndefined();

  jest.mocked(strokeMatchesOnServer).mockResolvedValue(null);
  const other = await setUp({ apiUrl: "http://other.test" });
  await act(async () =>
    other.result.current.onCanvas({
      type: "drawn",
      line: roundLine(),
      metresPerPx: PX_M,
    }),
  );
  await waitFor(() =>
    expect(strokeMatchesOnServer).toHaveBeenLastCalledWith("http://other.test"),
  );
  expect(placement(other.result.current.request)).toBeUndefined();
});

test("the answer belongs to its server: another server is asked again", async () => {
  jest
    .mocked(strokeMatchesOnServer)
    .mockImplementation(async (url) => url === "http://api.test");
  const { result, rerender } = await setUp();
  await act(async () =>
    result.current.onCanvas({ type: "drawn", line: roundLine(), metresPerPx: PX_M }),
  );
  await waitFor(() => expect(placement(result.current.request)).toBe("anchored"));
  await act(async () => rerender({ apiUrl: "http://old.test" }));
  await waitFor(() =>
    expect(strokeMatchesOnServer).toHaveBeenLastCalledWith("http://old.test"),
  );
  expect(placement(result.current.request)).toBeUndefined();
});

test("a shape of the catalogue is never asked anchored, nor probed for", async () => {
  jest.mocked(strokeMatchesOnServer).mockResolvedValue(true);
  const { result } = await setUp();
  await act(async () => result.current.pick("heart"));
  expect(result.current.request).not.toBeNull();
  expect(placement(result.current.request)).toBeUndefined();
  expect(strokeMatchesOnServer).not.toHaveBeenCalled();
});

test("without a server, nothing is probed and the drawing stays free", async () => {
  const { result } = await setUp({ apiUrl: null });
  await act(async () =>
    result.current.onCanvas({ type: "drawn", line: roundLine(), metresPerPx: PX_M }),
  );
  await waitFor(() => expect(matchStroke).toHaveBeenCalled());
  await act(async () => {});
  expect(strokeMatchesOnServer).not.toHaveBeenCalled();
  expect(placement(result.current.request)).toBeUndefined();
});
