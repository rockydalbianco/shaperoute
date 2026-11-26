/**
 * The empty pages' buttons, wired in the app (TASK-509): «Log in» of the
 * empty «Feed» opens «Profile», where one logs in; «My position» of an
 * «Explore» with no start asks the phone where it is, as «Draw»'s own
 * does. The pages themselves are in FeedScreenEmpty.test.tsx and
 * ExploreNoStart.test.tsx; the rest of the app in App.test.tsx.
 */
import list from "@shaperoute/shared-types/fixtures/recommended-routes.json";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react-native";
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

const requestPermission = jest.mocked(Location.requestForegroundPermissionsAsync);
const getPosition = jest.mocked(Location.getCurrentPositionAsync);
const API = "http://192.168.1.23:8000";

let fetchSpy: jest.SpiedFunction<typeof fetch>;

function atTrento() {
  requestPermission.mockResolvedValue({
    granted: true,
  } as Location.LocationPermissionResponse);
  getPosition.mockResolvedValue({
    coords: { latitude: 46.0671, longitude: 11.1214 },
  } as Location.LocationObject);
}

beforeEach(() => {
  requestPermission.mockReset();
  getPosition.mockReset();
  fetchSpy = jest.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    const url = String(input);
    if (url.startsWith(`${API}/recommended-routes`)) {
      return Response.json(list);
    }
    return Response.json(
      { error: { code: "http_error", message: url } },
      { status: 404 },
    );
  });
});

afterEach(() => {
  fetchSpy.mockRestore();
});

test("«Log in» of the empty «Feed» opens «Profile»", async () => {
  atTrento();
  await render(<App />);
  await screen.findByText("Starting from your position.");
  await fireEvent.press(screen.getByRole("tab", { name: "Feed" }));
  const empty = await screen.findByTestId("feed-log-in");
  await fireEvent.press(within(empty).getByRole("button", { name: "Log in" }));
  expect(
    screen.getByRole("tab", { name: "Profile", selected: true }),
  ).toBeOnTheScreen();
});

test("«My position» of an «Explore» with no start asks the phone where it is", async () => {
  // The position is not given at first: no start, nothing near it.
  requestPermission.mockResolvedValue({
    granted: false,
  } as Location.LocationPermissionResponse);
  await render(<App />);
  await waitFor(() => expect(requestPermission).toHaveBeenCalledTimes(1));
  await fireEvent.press(screen.getByRole("tab", { name: "Explore" }));
  const empty = await screen.findByTestId("explore-no-start");
  expect(getPosition).not.toHaveBeenCalled();
  // Given now: the button asks again, and the page has its start.
  atTrento();
  await fireEvent.press(within(empty).getByRole("button", { name: "My position" }));
  await waitFor(() => expect(requestPermission).toHaveBeenCalledTimes(2));
  await waitFor(() => expect(getPosition).toHaveBeenCalledTimes(1));
  await waitFor(() => expect(screen.queryByTestId("explore-no-start")).toBeNull());
  expect(screen.getByTestId("explore-subtitle")).toBeOnTheScreen();
});
