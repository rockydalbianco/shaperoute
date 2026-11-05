/**
 * «Edit the drawing» under the routes A, B and C of «Draw» (TASK-403,
 * ADR-0337, back after TASK-340): the line of the route chosen goes on the
 * map of «Draw on the map» where it is, and nothing is asked before «Draw
 * route». The cards' button is in AppEditDrawing.test.tsx.
 */
import jobDone from "@shaperoute/shared-types/fixtures/route-job-done.json";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import * as Location from "expo-location";

import App from "../App";

jest.setTimeout(20_000);

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
jest.mock("expo-sharing", () => ({
  isAvailableAsync: jest.fn(),
  shareAsync: jest.fn(),
}));
jest.mock("expo-location", () => ({
  Accuracy: { Balanced: 3 },
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
}));

const { injectJavaScript } =
  jest.requireMock<typeof import("../__mocks__/react-native-webview")>(
    "react-native-webview",
  );
const API = "http://192.168.1.23:8000";
const routeA = jobDone.result.points as [number, number][];
const routeB = jobDone.result.alternatives[0].points as [number, number][];

let fetchSpy: jest.SpiedFunction<typeof fetch>;

beforeEach(() => {
  injectJavaScript.mockClear();
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
        const queued = {
          job_id: "4f2c9e1a",
          status: "queued",
          result: null,
          error: null,
        };
        return Response.json(queued, { status: 202 });
      }
      return Response.json(jobDone);
    });
});

afterEach(() => {
  fetchSpy.mockRestore();
  jest.useRealTimers();
});

/** The messages of a type the app sent to the map's page. */
function sent(type: string): Record<string, unknown>[] {
  return injectJavaScript.mock.calls
    .map(([script]: [string]) => String(script).match(/receive\((.*)\); true;$/)?.[1])
    .filter((json): json is string => json !== undefined)
    .map((json) => JSON.parse(json) as Record<string, unknown>)
    .filter((message) => message.type === type);
}

function posted() {
  return fetchSpy.mock.calls.filter(([, init]) => (init?.method ?? "GET") === "POST");
}

/** Whether a line of the map's figure passes within ~10 m of the point. */
function passesBy(lines: [number, number][][], [lat, lon]: [number, number]) {
  return lines.some((line) =>
    line.some(([x, y]) => Math.abs(x - lon) < 1e-4 && Math.abs(y - lat) < 1e-4),
  );
}

async function drawn() {
  jest.useFakeTimers();
  await render(<App />);
  await screen.findByText("Starting from your position.");
  await fireEvent(screen.getByTestId("map"), "message", {
    nativeEvent: { data: '{"type":"ready"}' },
  });
  await fireEvent.press(screen.getByTestId("draw-route"));
  await act(() => jest.advanceTimersByTimeAsync(2000));
}

test("under A, B and C «Edit the drawing» puts the line of the route chosen on the map, and «Draw route» asks for it as a drawing", async () => {
  await drawn();
  await fireEvent.press(screen.getByTestId("route-B"));
  expect(screen.getByRole("radio", { name: /^Route B/ })).toBeSelected();
  const before = posted().length;

  await fireEvent.press(screen.getByRole("button", { name: "Edit the drawing" }));

  // The map of «Draw on the map» at once, with B's line where it is: its
  // corners, not A's. Nothing travels before «Draw route».
  expect(screen.getByText("Undo")).toBeOnTheScreen();
  const lines = sent("setCanvas").at(-1)?.lines as [number, number][][];
  expect(passesBy(lines, routeB[2])).toBe(true);
  expect(passesBy(lines, routeA[2])).toBe(false);
  expect(posted()).toHaveLength(before);

  // «Draw route»: a drawing, not the shape, from where B starts.
  await fireEvent.press(screen.getByText("Draw route"));
  await act(() => jest.advanceTimersByTimeAsync(2000));
  const asked = posted().slice(before);
  expect(asked).toHaveLength(1);
  expect(String(asked[0][0])).toBe(`${API}/image-route-jobs`);
  const body = JSON.parse(String(asked[0][1]?.body));
  expect(body).not.toHaveProperty("shape");
  expect(body.start[0]).toBeCloseTo(routeB[0][0], 3);
  expect(body.start[1]).toBeCloseTo(routeB[0][1], 3);
});
