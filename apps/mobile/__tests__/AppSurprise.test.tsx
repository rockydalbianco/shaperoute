/**
 * «Surprise me» in «Draw» (TASK-448): the pill beside «2 WHAT YOU DRAW»
 * writes a shape and a distance in the page, and the route waits for «Draw
 * route». The pick is in src/route/surprisePick.test.ts, the list of the
 * routes near in src/route/useSurprise.test.ts, the pill itself in
 * src/route/SurprisePill.test.tsx; the rest of the app in App.test.tsx.
 */
import jobDone from "@shaperoute/shared-types/fixtures/route-job-done.json";
import bikeList from "@shaperoute/shared-types/fixtures/recommended-routes-bike.json";
import list from "@shaperoute/shared-types/fixtures/recommended-routes.json";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import * as Location from "expo-location";
import { AccessibilityInfo } from "react-native";

import App from "../App";
import { chosenShape } from "../src/route/testing";
import { forgetSurpriseNearby, SURPRISE_RADIUS_M } from "../src/route/useSurprise";
import { loadSport, type Sport } from "../src/settings/sport";

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
jest.mock("expo-file-system");
jest.mock("expo-location", () => ({
  Accuracy: { Balanced: 3 },
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
}));
// The sport kept on the phone, as each test says.
jest.mock("../src/settings/sport", () => ({
  ...jest.requireActual<typeof import("../src/settings/sport")>(
    "../src/settings/sport",
  ),
  loadSport: jest.fn(),
}));

const API = "http://192.168.1.23:8000";

let fetchSpy: jest.SpiedFunction<typeof fetch>;
let random: jest.SpiedFunction<typeof Math.random>;
let said: jest.SpiedFunction<typeof AccessibilityInfo.announceForAccessibility>;

/** The catalogue near the start: a star of 5 km and a heart of 10, with a
 * word and a heart of 21 km no surprise gives; by bike a heart of 30 km.
 * `near` false: the list is not reached. */
function apiAnswers({ near = true }: { near?: boolean } = {}) {
  fetchSpy.mockImplementation(async (input, init) => {
    const url = new URL(String(input));
    if ((init?.method ?? "GET") === "POST") {
      return Response.json(
        { job_id: "4f2c9e1a", status: "queued", result: null, error: null },
        { status: 202 },
      );
    }
    if (url.pathname === "/recommended-routes") {
      if (!near) {
        throw new TypeError("Network request failed");
      }
      return Response.json(
        url.searchParams.get("activity") === "cycling" ? bikeList : list,
      );
    }
    return Response.json(jobDone);
  });
}

/** The requests of the routes near that «Surprise me» made. */
function surpriseAsks(): URL[] {
  return fetchSpy.mock.calls
    .map(([input]) => new URL(String(input)))
    .filter(
      (url) =>
        url.pathname === "/recommended-routes" &&
        url.searchParams.get("radius_m") === String(SURPRISE_RADIUS_M),
    );
}

/** The bodies the app sent to POST /route-jobs, as sent. */
function routeBodies(): string[] {
  return fetchSpy.mock.calls
    .filter(
      ([input, init]) =>
        String(input) === `${API}/route-jobs` && (init?.method ?? "GET") === "POST",
    )
    .map(([, init]) => String(init?.body));
}

async function atTrento(sport: Sport = "run") {
  jest.mocked(loadSport).mockReturnValue(sport);
  jest
    .mocked(Location.requestForegroundPermissionsAsync)
    .mockResolvedValue({ granted: true } as Location.LocationPermissionResponse);
  jest.mocked(Location.getCurrentPositionAsync).mockResolvedValue({
    coords: { latitude: 46.0671, longitude: 11.1214 },
  } as Location.LocationObject);
  await render(<App />);
  await screen.findByText("Starting from your position.");
}

function distanceField() {
  return screen.getByLabelText("Distance in km");
}

/** A tap on the pill, and the answer of the routes near. */
async function surprise() {
  await fireEvent.press(screen.getByRole("button", { name: "Surprise me" }));
  await act(() => jest.advanceTimersByTimeAsync(0));
}

beforeEach(() => {
  jest.useFakeTimers();
  forgetSurpriseNearby();
  fetchSpy = jest.spyOn(globalThis, "fetch");
  // The first shape near, at its first distance.
  random = jest.spyOn(Math, "random").mockReturnValue(0);
  said = jest
    .spyOn(AccessibilityInfo, "announceForAccessibility")
    .mockImplementation(() => {});
  apiAnswers();
});

afterEach(() => {
  fetchSpy.mockRestore();
  random.mockRestore();
  said.mockRestore();
  jest.useRealTimers();
});

test("a tap writes a shape and a distance of the routes near, and draws nothing", async () => {
  await atTrento();
  expect(chosenShape()).toBe("heart");
  expect(distanceField()).toHaveDisplayValue("5");
  expect(surpriseAsks()).toHaveLength(0);

  await surprise();
  expect(chosenShape()).toBe("star");
  expect(distanceField()).toHaveDisplayValue("5");
  expect(screen.getByTestId("draw-route")).toBeEnabled();
  expect(said).toHaveBeenCalledWith("Star, 5 km");
  // Asked at the tap, once, round the start; and no route yet.
  expect(surpriseAsks()).toHaveLength(1);
  expect(surpriseAsks()[0].searchParams.get("activity")).toBeNull();
  expect(routeBodies()).toEqual([]);
});

test("another tap gives another shape, without asking the list again", async () => {
  await atTrento();
  await surprise();
  await surprise();
  expect(chosenShape()).toBe("heart");
  expect(distanceField()).toHaveDisplayValue("10");
  expect(said).toHaveBeenLastCalledWith("Heart, 10 km");
  await surprise();
  expect(chosenShape()).toBe("star");
  expect(distanceField()).toHaveDisplayValue("5");
  expect(surpriseAsks()).toHaveLength(1);
});

test("«Draw route» asks the engine for the surprise as for any shape", async () => {
  await atTrento();
  await surprise();
  await fireEvent.press(screen.getByTestId("draw-route"));
  await act(() => jest.advanceTimersByTimeAsync(500));
  expect(routeBodies()).toEqual([
    '{"start":[46.0671,11.1214],"shape":"star","distance_m":5000,"activity":"running"}',
  ]);
});

test("the distance of a surprise can be changed before «Draw route»", async () => {
  await atTrento();
  await surprise();
  await fireEvent.changeText(distanceField(), "8");
  expect(chosenShape()).toBe("star");
  expect(distanceField()).toHaveDisplayValue("8");
});

test("from «Word» a tap goes back to the shapes", async () => {
  await atTrento();
  await fireEvent.press(screen.getByRole("button", { name: "Word" }));
  expect(screen.queryByTestId("shape-grid")).toBeNull();
  await surprise();
  expect(chosenShape()).toBe("star");
});

test("the list not reached: one of the shapes that come out almost everywhere", async () => {
  apiAnswers({ near: false });
  // The last of the seven, at its last distance.
  random.mockReturnValue(0.99);
  await atTrento();
  await surprise();
  expect(chosenShape()).toBe("butterfly");
  expect(distanceField()).toHaveDisplayValue("10");
});

test("a walk has the pill, with a run's routes", async () => {
  await atTrento("walk");
  await surprise();
  expect(chosenShape()).toBe("star");
  expect(distanceField()).toHaveDisplayValue("5");
});

test("by bike the routes near are the rides, at their distance", async () => {
  await atTrento("bike");
  expect(distanceField()).toHaveDisplayValue("10");
  await surprise();
  expect(chosenShape()).toBe("heart");
  expect(distanceField()).toHaveDisplayValue("30");
  expect(surpriseAsks()).toHaveLength(1);
  expect(surpriseAsks()[0].searchParams.get("activity")).toBe("cycling");
});

test("a sport without a catalogue has no pill", async () => {
  await atTrento("hike");
  expect(screen.getByText("WHAT YOU DRAW")).toBeOnTheScreen();
  expect(screen.queryByRole("button", { name: "Surprise me" })).toBeNull();
});
