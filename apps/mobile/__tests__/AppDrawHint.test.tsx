/**
 * The line over «Draw route» while it is off (TASK-508): the button was
 * dimmed with nothing saying why. The rest of the app is in App.test.tsx.
 */
import jobDone from "@shaperoute/shared-types/fixtures/route-job-done.json";
import { render, screen } from "@testing-library/react-native";
import * as Location from "expo-location";

import App from "../App";
import { typeShape } from "../src/route/testing";

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

const requestPermission = jest.mocked(Location.requestForegroundPermissionsAsync);
const getPosition = jest.mocked(Location.getCurrentPositionAsync);

const START = "Choose a start first";
const SHAPE = "Choose what to draw first";

let fetchSpy: jest.SpiedFunction<typeof fetch>;

beforeEach(() => {
  requestPermission.mockReset();
  getPosition.mockReset();
  fetchSpy = jest
    .spyOn(globalThis, "fetch")
    .mockImplementation(async () => Response.json(jobDone));
});

afterEach(() => {
  fetchSpy.mockRestore();
});

async function atTrento() {
  requestPermission.mockResolvedValue({
    granted: true,
  } as Location.LocationPermissionResponse);
  getPosition.mockResolvedValue({
    coords: { latitude: 46.0671, longitude: 11.1214 },
  } as Location.LocationObject);
  await render(<App />);
  await screen.findByText("Starting from your position.");
}

test("without a start the line says to choose one, over the button that is off", async () => {
  requestPermission.mockReturnValue(new Promise(() => {}));
  await render(<App />);
  expect(screen.getByTestId("draw-route")).toBeDisabled();
  expect(screen.getByTestId("draw-hint")).toHaveTextContent(START);
});

test("with a start and a shape there is no line: the button is on", async () => {
  await atTrento();
  expect(screen.getByTestId("draw-route")).toBeEnabled();
  expect(screen.queryByTestId("draw-hint")).toBeNull();
});

test("a word the AI has still to read has its own note, and no line", async () => {
  await atTrento();
  await typeShape("drago");
  expect(screen.getByTestId("draw-route")).toBeDisabled();
  expect(screen.getByText("Press Done and the AI will read it.")).toBeOnTheScreen();
  expect(screen.queryByTestId("draw-hint")).toBeNull();
});

test("with a start and nothing to draw the line says to choose what", async () => {
  await atTrento();
  await typeShape("");
  expect(screen.getByTestId("draw-route")).toBeDisabled();
  expect(screen.getByTestId("draw-hint")).toHaveTextContent(SHAPE);
});
