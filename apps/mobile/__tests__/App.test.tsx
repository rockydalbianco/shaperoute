import { SHAPES } from "@shaperoute/shared-types";
import { fireEvent, render, screen } from "@testing-library/react-native";
import * as Location from "expo-location";

import response from "../src/places/fixtures/photon-via-belenzani-trento.json";
import App from "../App";

jest.mock("react-native-webview");
jest.mock(
  "react-native-safe-area-context",
  () => jest.requireActual("react-native-safe-area-context/jest/mock").default,
);
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

let fetchSpy: jest.SpiedFunction<typeof fetch>;

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
