/**
 * The shape asked for, in «Draw» (TASK-442): over the map while its route is
 * drawn, then under the route as the search placed it, the one of the route
 * chosen. The rest of the app is in App.test.tsx.
 */
import type { LatLon, RouteJob } from "@shaperoute/shared-types";
import jobDone from "@shaperoute/shared-types/fixtures/route-job-done.json";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import * as Location from "expo-location";

import App from "../App";

jest.mock("react-native-webview");
jest.mock(
  "react-native-safe-area-context",
  () => jest.requireActual("react-native-safe-area-context/jest/mock").default,
);
jest.mock("expo-constants", () => ({
  __esModule: true,
  default: { expoConfig: { hostUri: "192.168.1.23:8081" } },
}));
jest.mock("expo-file-system");
jest.mock("expo-location", () => ({
  Accuracy: { Balanced: 3 },
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
}));

const { injectJavaScript } =
  jest.requireMock<typeof import("../__mocks__/react-native-webview")>(
    "react-native-webview",
  );

/** The shape is hidden from a screen reader: the queries look for it anyway. */
const HIDDEN = { includeHiddenElements: true };

/** The heart as the search placed it for the route A, and for B. */
const PLACED_A: LatLon[][] = [
  [
    [46.067, 11.121],
    [46.071, 11.127],
    [46.067, 11.134],
    [46.067, 11.121],
  ],
];
const PLACED_B: LatLon[][] = [
  [
    [46.0672, 11.1212],
    [46.0716, 11.128],
    [46.0672, 11.1352],
    [46.0672, 11.1212],
  ],
];

const done = jobDone as unknown as RouteJob & {
  result: NonNullable<RouteJob["result"]>;
};
/** As the API answers since TASK-347: each route with its placed outline. */
const withShapes = {
  ...done,
  result: {
    ...done.result,
    placed_outline: PLACED_A,
    alternatives: (done.result.alternatives ?? []).map((other) => ({
      ...other,
      placed_outline: PLACED_B,
    })),
  },
};
const running = { job_id: "4f2c9e1a", status: "running", result: null, error: null };

let answer: unknown;
let fetchSpy: jest.SpiedFunction<typeof fetch>;

beforeEach(() => {
  injectJavaScript.mockClear();
  answer = withShapes;
  jest
    .mocked(Location.requestForegroundPermissionsAsync)
    .mockResolvedValue({ granted: true } as Location.LocationPermissionResponse);
  jest.mocked(Location.getCurrentPositionAsync).mockResolvedValue({
    coords: { latitude: 46.0671, longitude: 11.1214 },
  } as Location.LocationObject);
  fetchSpy = jest
    .spyOn(globalThis, "fetch")
    .mockImplementation(async (_input, init) => {
      if ((init?.method ?? "GET") === "POST") {
        return Response.json({ ...running, status: "queued" }, { status: 202 });
      }
      return Response.json(answer);
    });
});

afterEach(() => {
  fetchSpy.mockRestore();
  jest.useRealTimers();
});

function ghosts(): string[] {
  return injectJavaScript.mock.calls
    .map(([script]) => String(script))
    .filter((script) => script.includes('"type":"showGhost"'));
}

const lngLat = (lines: LatLon[][]) =>
  JSON.stringify(lines.map((line) => line.map(([lat, lon]) => [lon, lat])));

async function asked() {
  jest.useFakeTimers();
  await render(<App />);
  await screen.findByText("Starting from your position.");
  await fireEvent(screen.getByTestId("map"), "message", {
    nativeEvent: { data: '{"type":"ready"}' },
  });
  await fireEvent.press(screen.getByTestId("draw-route"));
}

async function drawn() {
  await asked();
  await act(() => jest.advanceTimersByTimeAsync(2000));
}

test("while the heart is drawn its shape is over the map, and the map is told nothing", async () => {
  answer = running;
  await asked();
  await act(() => jest.advanceTimersByTimeAsync(1000));
  expect(screen.getByTestId("loading")).toBeOnTheScreen();
  expect(screen.getByTestId("shape-ghost", HIDDEN)).toBeTruthy();
  expect(ghosts()).toEqual([]);
});

test("the route come, the shape over the map goes and the placed one is under the route", async () => {
  answer = running;
  await asked();
  await act(() => jest.advanceTimersByTimeAsync(1000));
  answer = withShapes;
  await act(() => jest.advanceTimersByTimeAsync(3000));

  expect(screen.queryByTestId("shape-ghost", HIDDEN)).toBeNull();
  expect(ghosts()).toHaveLength(1);
  expect(ghosts()[0]).toContain(`"lines":${lngLat(PLACED_A)}`);
  // Before the route, which frames the map and is sent last.
  const scripts = injectJavaScript.mock.calls.map(([script]) => String(script));
  expect(scripts.at(-1)).toContain('"type":"showRoute"');
});

test("another route chosen has its own shape under it", async () => {
  await drawn();
  await fireEvent.press(screen.getByTestId("route-B"));
  expect(ghosts()).toHaveLength(2);
  expect(ghosts()[1]).toContain(`"lines":${lngLat(PLACED_B)}`);
});

test("back to «Draw», the shape goes from the map", async () => {
  await drawn();
  await fireEvent.press(screen.getByLabelText("Back"));
  expect(ghosts().at(-1)).toContain('"type":"showGhost","lines":[]');
});

test("a route from an API that sends no placed outline has no shape, and no error", async () => {
  answer = done;
  await drawn();
  expect(screen.getByRole("radio", { name: /^Route A/ })).toBeSelected();
  expect(ghosts()).toEqual([]);
});
