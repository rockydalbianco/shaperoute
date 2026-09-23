import { SHAPES } from "@shaperoute/shared-types";
import apiError from "@shaperoute/shared-types/fixtures/api-error.json";
import jobDone from "@shaperoute/shared-types/fixtures/route-job-done.json";
import jobFailed from "@shaperoute/shared-types/fixtures/route-job-failed.json";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import * as Location from "expo-location";
import * as Sharing from "expo-sharing";

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
const { written } =
  jest.requireMock<typeof import("../__mocks__/expo-file-system")>("expo-file-system");
const sharingAvailable = jest.mocked(Sharing.isAvailableAsync);
const share = jest.mocked(Sharing.shareAsync);
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
const GPX = '<?xml version="1.0" encoding="UTF-8"?><gpx version="1.1"></gpx>';
const GPX_FILE = "shaperoute-heart-5km-2026-09-23.gpx";

let fetchSpy: jest.SpiedFunction<typeof fetch>;

function job(status: string) {
  return { job_id: "4f2c9e1a", status, result: null, error: null };
}

/**
 * The API accepts the route job, then answers each poll with the next body
 * (the last one repeats); Photon answers as usual.
 */
function apiAnswers(...polls: unknown[]) {
  fetchSpy.mockImplementation(async (input, init) => {
    if (!String(input).startsWith(API)) {
      return Response.json(response);
    }
    const method = init?.method ?? "GET";
    if (method === "DELETE") {
      return new Response(null, { status: 204 });
    }
    if (String(input) === `${API}/gpx`) {
      return new Response(GPX, {
        headers: { "Content-Disposition": `attachment; filename="${GPX_FILE}"` },
      });
    }
    if (method === "POST") {
      return Response.json(job("queued"), { status: 202 });
    }
    return Response.json(polls.length > 1 ? polls.shift() : polls[0]);
  });
}

function apiCalls(method: string) {
  return fetchSpy.mock.calls.filter(
    ([input, init]) =>
      String(input).startsWith(API) && (init?.method ?? "GET") === method,
  );
}

/** What the app sent to the API in its last route request. */
function lastRouteRequest(): unknown {
  const posts = apiCalls("POST").filter(([input]) =>
    String(input).endsWith("/route-jobs"),
  );
  return JSON.parse(String(posts.at(-1)?.[1]?.body));
}

/** Lets the app poll the API once. */
async function nextPoll() {
  await act(() => jest.advanceTimersByTimeAsync(2000));
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
  written.clear();
  sharingAvailable.mockReset().mockResolvedValue(true);
  share.mockReset().mockResolvedValue();
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

function distanceField() {
  return screen.getByLabelText("Distance in km");
}

test("the distance starts at 5 km", async () => {
  requestPermission.mockReturnValue(new Promise(() => {}));
  await render(<App />);
  expect(distanceField()).toHaveDisplayValue("5");
  expect(screen.queryByText(/Enter a distance/)).not.toBeOnTheScreen();
});

test("draws the route for the chosen shape and the distance typed", async () => {
  jest.useFakeTimers();
  apiAnswers(job("computing"), jobDone);
  await atTrento();
  await fireEvent.press(screen.getByText("circle"));
  await fireEvent.changeText(distanceField(), "7,5");
  await fireEvent.press(screen.getByText("Draw route"));
  await nextPoll();
  await nextPoll();

  expect(screen.getByText("4.0 km on roads (target 7.5 km)")).toBeOnTheScreen();
  expect(screen.getByText("• 120 m of the route on steps")).toBeOnTheScreen();
  expect(lastRouteRequest()).toEqual({
    start: [46.0671, 11.1214],
    shape: "circle",
    distance_m: 7500,
    activity: "running",
  });
  expect(lastScript()).toContain('"type":"showRoute","coordinates":[[11.1214,46.0671]');
  jest.useRealTimers();
});

test("a distance that is not valid turns Draw route off and says why", async () => {
  apiAnswers(jobDone);
  await atTrento();
  for (const text of ["0,5", "22", "abc", ""]) {
    await fireEvent.changeText(distanceField(), text);
    expect(screen.getByText("Enter a distance between 1 and 21 km.")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Draw route" })).toBeDisabled();
    await fireEvent.press(screen.getByText("Draw route"));
  }
  expect(apiCalls("POST")).toEqual([]);

  await fireEvent.changeText(distanceField(), "21");
  expect(screen.queryByText(/Enter a distance/)).not.toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "Draw route" })).toBeEnabled();
});

test("above 15 km the panel warns that the route takes longer", async () => {
  requestPermission.mockReturnValue(new Promise(() => {}));
  await render(<App />);
  const warning = "Long routes take longer: up to a few minutes.";
  await fireEvent.changeText(distanceField(), "15");
  expect(screen.queryByText(warning)).not.toBeOnTheScreen();
  await fireEvent.changeText(distanceField(), "15,5");
  expect(screen.getByText(warning)).toBeOnTheScreen();
});

test("while waiting it says what the API is doing, with the seconds", async () => {
  jest.useFakeTimers();
  apiAnswers(job("downloading_map"), job("computing"));
  await atTrento();
  await fireEvent.press(screen.getByText("Draw route"));
  expect(screen.getByText(/Waiting for the API…/)).toBeOnTheScreen();

  await nextPoll();
  expect(screen.getByText(/Downloading map data for this area…/)).toBeOnTheScreen();
  expect(screen.getByText("2 s")).toBeOnTheScreen();

  await nextPoll();
  expect(screen.getByText(/Drawing a 5 km heart…/)).toBeOnTheScreen();
  jest.useRealTimers();
});

test("Cancel stops waiting and tells the API to drop the job", async () => {
  jest.useFakeTimers();
  apiAnswers(job("computing"));
  await atTrento();
  await fireEvent.press(screen.getByText("Draw route"));
  await nextPoll();
  await fireEvent.press(screen.getByText("Cancel"));
  await act(() => jest.advanceTimersByTimeAsync(0));

  expect(screen.getByText("Draw route")).toBeOnTheScreen();
  expect(screen.queryByText(/Drawing a/)).not.toBeOnTheScreen();
  expect(apiCalls("DELETE").map(([url]) => String(url))).toEqual([
    `${API}/route-jobs/4f2c9e1a`,
  ]);
  jest.useRealTimers();
});

test("an error from the API is explained, with the engine's reason", async () => {
  jest.useFakeTimers();
  apiAnswers(jobFailed);
  await atTrento();
  await fireEvent.press(screen.getByText("Draw route"));
  await nextPoll();
  expect(
    screen.getByText(
      "This shape does not fit the roads here. Try another distance, shape or start.",
    ),
  ).toBeOnTheScreen();
  expect(screen.getByText(apiError.error.message)).toBeOnTheScreen();
  jest.useRealTimers();
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
  jest.useFakeTimers();
  apiAnswers(jobDone);
  await atTrento();
  await fireEvent.press(screen.getByText("Draw route"));
  await nextPoll();
  expect(screen.getByText("4.0 km on roads (target 5 km)")).toBeOnTheScreen();

  getPosition.mockResolvedValue(positionAt(46.0122, 11.2986));
  await fireEvent.press(screen.getByText("My position"));
  await screen.findByText("Starting from your position.");

  expect(screen.queryByText(/km on roads/)).not.toBeOnTheScreen();
  const scripts = injectJavaScript.mock.calls.map(([script]) => script);
  const shown = scripts.findIndex((script) => script.includes('"showRoute"'));
  const cleared = scripts.findIndex((script) => script.includes('"clearRoute"'));
  expect(shown).toBeGreaterThan(-1);
  expect(cleared).toBeGreaterThan(shown);
  jest.useRealTimers();
});

test("a new distance takes the old route away", async () => {
  jest.useFakeTimers();
  apiAnswers(jobDone);
  await atTrento();
  await fireEvent.press(screen.getByText("Draw route"));
  await nextPoll();
  expect(screen.getByText("4.0 km on roads (target 5 km)")).toBeOnTheScreen();

  await fireEvent.changeText(distanceField(), "10");

  expect(screen.queryByText(/km on roads/)).not.toBeOnTheScreen();
  expect(lastScript()).toContain('"clearRoute"');
  jest.useRealTimers();
});

test("Export GPX shares the route as a file", async () => {
  jest.useFakeTimers();
  apiAnswers(jobDone);
  await atTrento();
  expect(screen.queryByText("Export GPX")).not.toBeOnTheScreen();
  await fireEvent.press(screen.getByText("Draw route"));
  await nextPoll();

  await fireEvent.press(screen.getByText("Export GPX"));
  await act(() => jest.advanceTimersByTimeAsync(0));

  const [[url, init]] = apiCalls("POST").filter(([input]) =>
    String(input).endsWith("/gpx"),
  );
  expect(url).toBe(`${API}/gpx`);
  expect(JSON.parse(String(init?.body))).toEqual({
    request: {
      start: [46.0671, 11.1214],
      shape: "heart",
      distance_m: 5000,
      activity: "running",
    },
    result: jobDone.result,
  });
  expect(written.get(`file:///cache/${GPX_FILE}`)).toBe(GPX);
  expect(share).toHaveBeenCalledWith(`file:///cache/${GPX_FILE}`, expect.anything());
  expect(screen.getByText("Export GPX")).toBeOnTheScreen();
  jest.useRealTimers();
});

test("Export GPX says so when the phone cannot share", async () => {
  jest.useFakeTimers();
  sharingAvailable.mockResolvedValue(false);
  apiAnswers(jobDone);
  await atTrento();
  await fireEvent.press(screen.getByText("Draw route"));
  await nextPoll();
  await fireEvent.press(screen.getByText("Export GPX"));
  await act(() => jest.advanceTimersByTimeAsync(0));
  expect(screen.getByText("This phone cannot open the share sheet.")).toBeOnTheScreen();
  expect(share).not.toHaveBeenCalled();
  jest.useRealTimers();
});
