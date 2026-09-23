import { SHAPES } from "@shaperoute/shared-types";
import apiError from "@shaperoute/shared-types/fixtures/api-error.json";
import routeResult from "@shaperoute/shared-types/fixtures/route-result.json";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import * as Location from "expo-location";

import response from "../src/places/fixtures/photon-via-belenzani-trento.json";
import App from "../App";

jest.mock("react-native-webview");
jest.mock(
  "react-native-safe-area-context",
  () => jest.requireActual("react-native-safe-area-context/jest/mock").default,
);
// The Expo dev server as the phone sees it: the API is on the same PC.
jest.mock("expo-constants", () => ({
  __esModule: true,
  default: { expoConfig: { hostUri: "192.168.1.23:8081" } },
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
const requestPermission = jest.mocked(Location.requestForegroundPermissionsAsync);
const getPosition = jest.mocked(Location.getCurrentPositionAsync);

// Only the fields the app reads; the rest of the shapes does not matter here.
function permission(granted: boolean) {
  return { granted } as Location.LocationPermissionResponse;
}

function positionAt(latitude: number, longitude: number) {
  return { coords: { latitude, longitude } } as Location.LocationObject;
}

async function mapIsReady() {
  await fireEvent(screen.getByTestId("map"), "message", {
    nativeEvent: { data: '{"type":"ready"}' },
  });
}

function lastScript(): string | undefined {
  return injectJavaScript.mock.calls.at(-1)?.[0];
}

const API = "http://192.168.1.23:8000";

let fetchSpy: jest.SpiedFunction<typeof fetch>;

/** The API answers with this; Photon with its usual answer. */
function apiAnswers(status: number, body: unknown) {
  fetchSpy.mockImplementation(async (input) =>
    String(input).startsWith(API)
      ? Response.json(body, { status })
      : Response.json(response),
  );
}

/** What the app sent to the API in its last request. */
function lastRouteRequest(): unknown {
  const call = fetchSpy.mock.calls.filter(
    ([input]) => String(input) === `${API}/routes`,
  );
  return JSON.parse(String(call.at(-1)?.[1]?.body));
}

async function atTrento() {
  requestPermission.mockResolvedValue(permission(true));
  getPosition.mockResolvedValue(positionAt(46.0671, 11.1214));
  await render(<App />);
  await screen.findByText("Starting from your position.");
  await mapIsReady();
}

beforeEach(() => {
  requestPermission.mockReset();
  getPosition.mockReset();
  injectJavaScript.mockClear();
  fetchSpy = jest.spyOn(globalThis, "fetch");
});

afterEach(() => {
  fetchSpy.mockRestore();
});

test("shows the app name and every shape from shared-types", async () => {
  requestPermission.mockReturnValue(new Promise(() => {}));
  await render(<App />);
  expect(screen.getByText("ShapeRoute")).toBeOnTheScreen();
  expect(screen.getByText("Finding your position…")).toBeOnTheScreen();
  for (const shape of SHAPES) {
    expect(screen.getByText(shape)).toBeOnTheScreen();
  }
});

test("with the position, the map centres on it and there is no search", async () => {
  requestPermission.mockResolvedValue(permission(true));
  getPosition.mockResolvedValue(positionAt(46.0671, 11.1214));
  await render(<App />);
  expect(await screen.findByText("Starting from your position.")).toBeOnTheScreen();

  await mapIsReady();
  expect(lastScript()).toContain('"lngLat":[11.1214,46.0671]');
  expect(screen.queryByPlaceholderText("City or street")).not.toBeOnTheScreen();
});

test("without permission, a searched place becomes the start", async () => {
  requestPermission.mockResolvedValue(permission(false));
  fetchSpy.mockResolvedValue(Response.json(response));
  await render(<App />);
  await mapIsReady();
  expect(await screen.findByText(/Location is off for ShapeRoute/)).toBeOnTheScreen();
  expect(screen.getByText("Open Settings")).toBeOnTheScreen();
  expect(injectJavaScript).not.toHaveBeenCalled();

  await fireEvent.changeText(
    screen.getByPlaceholderText("City or street"),
    "Belenzani",
  );
  await fireEvent.press(screen.getByText("Search"));
  await fireEvent.press(await screen.findByText("Via Rodolfo Belenzani, Trento"));

  expect(
    screen.getByText("Starting from Via Rodolfo Belenzani, Trento."),
  ).toBeOnTheScreen();
  expect(lastScript()).toContain('"lngLat":[11.1211947,46.0692621]');
});

test("once the GPS answers, it takes over from the searched place", async () => {
  requestPermission.mockResolvedValue(permission(false));
  fetchSpy.mockResolvedValue(Response.json(response));
  await render(<App />);
  await mapIsReady();
  await fireEvent.changeText(
    await screen.findByPlaceholderText("City or street"),
    "Belenzani",
  );
  await fireEvent.press(screen.getByText("Search"));
  await fireEvent.press(await screen.findByText("Via Rodolfo Belenzani, Trento"));

  requestPermission.mockResolvedValue(permission(true));
  getPosition.mockResolvedValue(positionAt(46.0122, 11.2986));
  await fireEvent.press(screen.getByText("My position"));

  expect(await screen.findByText("Starting from your position.")).toBeOnTheScreen();
  expect(lastScript()).toContain('"lngLat":[11.2986,46.0122]');
  expect(screen.queryByPlaceholderText("City or street")).not.toBeOnTheScreen();
});

test("a GPS without an answer offers the search too", async () => {
  requestPermission.mockResolvedValue(permission(true));
  getPosition.mockRejectedValue(new Error("Location services are disabled"));
  await render(<App />);
  expect(await screen.findByText(/not available right now/)).toBeOnTheScreen();
  expect(screen.getByPlaceholderText("City or street")).toBeOnTheScreen();
  expect(screen.queryByText("Open Settings")).not.toBeOnTheScreen();
});

test("a map that cannot load says so", async () => {
  requestPermission.mockReturnValue(new Promise(() => {}));
  await render(<App />);
  await fireEvent(screen.getByTestId("map"), "message", {
    nativeEvent: { data: '{"type":"error","message":"MapLibre GL JS did not load"}' },
  });
  expect(
    screen.getByText(/The map could not load \(MapLibre GL JS did not load\)/),
  ).toBeOnTheScreen();
});

test("Draw route is off until there is a start", async () => {
  requestPermission.mockReturnValue(new Promise(() => {}));
  await render(<App />);
  expect(screen.getByRole("button", { name: "Draw route" })).toBeDisabled();
});

test("draws the route for the chosen shape and distance", async () => {
  apiAnswers(200, routeResult);
  await atTrento();
  await fireEvent.press(screen.getByText("circle"));
  await fireEvent.press(screen.getByText("3 km"));
  await fireEvent.press(screen.getByText("Draw route"));

  expect(await screen.findByText("4.0 km on roads (target 3 km)")).toBeOnTheScreen();
  expect(screen.getByText("• 120 m of the route on steps")).toBeOnTheScreen();
  expect(lastRouteRequest()).toEqual({
    start: [46.0671, 11.1214],
    shape: "circle",
    distance_m: 3000,
    activity: "running",
  });
  expect(lastScript()).toContain('"type":"showRoute","coordinates":[[11.1214,46.0671]');
});

test("while waiting it counts the seconds, and Cancel stops it", async () => {
  jest.useFakeTimers();
  fetchSpy.mockImplementation(
    (_input, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(new Error("Aborted")));
      }),
  );
  await atTrento();
  await fireEvent.press(screen.getByText("Draw route"));
  expect(screen.getByText(/Drawing a 5 km heart…/)).toBeOnTheScreen();
  await act(() => jest.advanceTimersByTimeAsync(3000));
  expect(screen.getByText("3 s")).toBeOnTheScreen();

  await fireEvent.press(screen.getByText("Cancel"));
  expect(await screen.findByText("Draw route")).toBeOnTheScreen();
  expect(screen.queryByText(/Drawing a/)).not.toBeOnTheScreen();
  jest.useRealTimers();
});

test("an error from the API is explained, with the engine's reason", async () => {
  apiAnswers(422, apiError);
  await atTrento();
  await fireEvent.press(screen.getByText("Draw route"));
  expect(
    await screen.findByText(
      "This shape does not fit the roads here. Try another distance, shape or start.",
    ),
  ).toBeOnTheScreen();
  expect(screen.getByText(apiError.error.message)).toBeOnTheScreen();
});

test("an API that does not answer says where it was looked for", async () => {
  requestPermission.mockResolvedValue(permission(true));
  getPosition.mockResolvedValue(positionAt(46.0671, 11.1214));
  fetchSpy.mockRejectedValue(new TypeError("Network request failed"));
  await render(<App />);
  await fireEvent.press(await screen.findByText("Draw route"));
  expect(
    await screen.findByText(
      `Cannot reach the API at ${API}. Start it on the PC with --lan, on the same Wi-Fi.`,
    ),
  ).toBeOnTheScreen();
});

test("a new start takes the old route away", async () => {
  apiAnswers(200, routeResult);
  await atTrento();
  await fireEvent.press(screen.getByText("Draw route"));
  await screen.findByText("4.0 km on roads (target 5 km)");

  getPosition.mockResolvedValue(positionAt(46.0122, 11.2986));
  await fireEvent.press(screen.getByText("My position"));
  await screen.findByText("Starting from your position.");

  expect(screen.queryByText(/km on roads/)).not.toBeOnTheScreen();
  const scripts = injectJavaScript.mock.calls.map(([script]) => script);
  const shown = scripts.findIndex((script) => script.includes('"showRoute"'));
  const cleared = scripts.findIndex((script) => script.includes('"clearRoute"'));
  expect(shown).toBeGreaterThan(-1);
  expect(cleared).toBeGreaterThan(shown);
});
