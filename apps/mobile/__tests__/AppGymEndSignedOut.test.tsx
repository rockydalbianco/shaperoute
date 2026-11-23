/**
 * The end of a workout at the gym, and of a swim in a pool, with nobody
 * signed in (TASK-453, the user's «Come la corsa» of 2026-11-11): «Sign up
 * or log in…» shows the page of the profile with «Sign up» on it. Their
 * screen is over the whole app: the page opened under it and the line
 * seemed to do nothing (seen in the simulator on 2026-11-11, three taps).
 * What ended stays on the phone meanwhile; it comes back with «Save» for
 * who signed up, and as it was when the page is left. The same at the end
 * of a run is in AppActivities.test.tsx.
 */
import session from "@shaperoute/shared-types/fixtures/session.json";
import signUpRequest from "@shaperoute/shared-types/fixtures/sign-up-request.json";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import * as Location from "expo-location";

import App from "../App";
import { apiError, type MemorySecureStore } from "../src/account/testing";
import { SIGN_IN_TO_KEEP_RUNS } from "../src/activities/activitiesDoor";
import { forgetHeldWorkout, startGymWorkout } from "../src/gym/useWorkout";
import { loadWorkout } from "../src/gym/workoutStore";
import { loadPoolSwim } from "../src/pool/poolStore";
import { forgetHeldPoolSwim, startPoolSwim } from "../src/pool/usePoolSwim";

// The whole app, loaded cold.
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
// The phone's documents folder, in memory: the workout is kept there.
jest.mock("expo-file-system", () => {
  const files = new Map<string, string>();
  class File {
    uri: string;
    constructor(directory: { uri: string }, name: string) {
      this.uri = `${directory.uri}${name}`;
    }
    get exists(): boolean {
      return files.has(this.uri);
    }
    create(): void {
      files.set(this.uri, "");
    }
    write(text: string): void {
      files.set(this.uri, text);
    }
    textSync(): string {
      return files.get(this.uri) ?? "";
    }
    delete(): void {
      files.delete(this.uri);
    }
  }
  return { File, files, Paths: { document: { uri: "file:///documents/" } } };
});
jest.mock("expo-location", () => ({
  Accuracy: { Balanced: 3, BestForNavigation: 6 },
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  watchPositionAsync: jest.fn(),
}));
jest.mock("expo-speech", () => ({ speak: jest.fn(), stop: jest.fn() }));
jest.mock("expo-keep-awake", () => ({
  activateKeepAwakeAsync: jest.fn(() => Promise.resolve()),
  deactivateKeepAwake: jest.fn(() => Promise.resolve()),
  useKeepAwake: jest.fn(),
}));
jest.mock("expo-secure-store", () =>
  jest
    .requireActual<typeof import("../src/account/testing")>("../src/account/testing")
    .memorySecureStore(),
);

const { files } = jest.requireMock<{ files: Map<string, string> }>("expo-file-system");
const store = jest.requireMock<MemorySecureStore>("expo-secure-store");
const API = "http://192.168.1.23:8000";
const MIN = 60_000;

type Answers = Record<string, () => Response>;

/** The fake API, by method and path; anything else is a 404. */
function api(answers: Answers = {}) {
  jest.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    const path = String(input).replace(API, "");
    const answer = answers[`${init?.method ?? "GET"} ${path}`];
    return answer !== undefined
      ? answer()
      : Response.json(apiError("http_error", path), { status: 404 });
  });
}

async function wait(ms: number) {
  await act(() => jest.advanceTimersByTimeAsync(ms));
}

async function open() {
  await render(<App />);
  await wait(0);
}

/** A workout of one set at the bench, ended. */
async function endWorkout() {
  await act(async () => startGymWorkout());
  await fireEvent.press(screen.getByTestId("group-chest"));
  await fireEvent.press(screen.getByTestId("exercise-bench_press"));
  await wait(MIN);
  await fireEvent.changeText(screen.getByTestId("set-reps"), "10");
  await fireEvent.changeText(screen.getByTestId("set-load_kg"), "60");
  await fireEvent.press(screen.getByTestId("log-set"));
  await fireEvent(screen.getByLabelText("Stop"), "longPress");
  expect(screen.getByTestId("gym-end")).toBeOnTheScreen();
}

function line() {
  return screen.getByRole("button", { name: SIGN_IN_TO_KEEP_RUNS });
}

/** «Sign up» is what the screen shows: the page of the profile is the one
 * selected, with its form, and why it opened. */
function onSignUp() {
  expect(screen.getByRole("tab", { name: /^Profile/ })).toBeSelected();
  expect(screen.getByLabelText("email")).toBeOnTheScreen();
  expect(screen.getByTestId("account-submit")).toBeOnTheScreen();
  expect(screen.getByText(SIGN_IN_TO_KEEP_RUNS)).toBeOnTheScreen();
}

async function signUp() {
  await fireEvent.changeText(screen.getByLabelText("email"), signUpRequest.email);
  await fireEvent.changeText(screen.getByLabelText("username"), signUpRequest.username);
  await fireEvent.changeText(screen.getByLabelText("password"), signUpRequest.password);
  await fireEvent.press(screen.getByRole("checkbox", { name: "I am at least 16" }));
  await fireEvent.press(screen.getByTestId("account-submit"));
  await wait(0);
}

beforeEach(() => {
  jest.useFakeTimers();
  files.clear();
  store.kept.clear();
  forgetHeldWorkout();
  forgetHeldPoolSwim();
  jest
    .mocked(Location.requestForegroundPermissionsAsync)
    .mockResolvedValue({ granted: true } as Location.LocationPermissionResponse);
  jest.mocked(Location.getCurrentPositionAsync).mockResolvedValue({
    coords: { latitude: 46.07, longitude: 11.12 },
  } as Location.LocationObject);
  jest
    .mocked(Location.watchPositionAsync)
    .mockResolvedValue({ remove: jest.fn() } as Location.LocationSubscription);
  api();
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});

test("the line at the end of a workout shows «Sign up»; signed up, the workout is back with «Save»", async () => {
  api({
    "POST /accounts": () => Response.json(session, { status: 201 }),
    "GET /me/favorites": () => Response.json({ favorites: [] }),
  });
  await open();
  await endWorkout();
  expect(screen.queryByTestId("gym-save")).toBeNull();

  await fireEvent.press(line());
  // The end of the workout is out of the way, kept on the phone.
  expect(screen.queryByTestId("gym-end")).toBeNull();
  onSignUp();
  expect(loadWorkout()?.endedMs).not.toBeNull();

  await signUp();
  // Back by itself, with the workout to save.
  expect(await screen.findByTestId("gym-end")).toBeOnTheScreen();
  expect(screen.getByTestId("gym-save")).toBeOnTheScreen();
  expect(screen.getByText("1 exercise · 1 set")).toBeOnTheScreen();
  expect(screen.queryByRole("button", { name: SIGN_IN_TO_KEEP_RUNS })).toBeNull();
  expect(loadWorkout()?.sets).toHaveLength(1);
});

test("the page left without an account, the end of the workout is back as it was", async () => {
  await open();
  await endWorkout();
  await fireEvent.press(line());
  expect(screen.queryByTestId("gym-end")).toBeNull();
  onSignUp();

  await fireEvent.press(screen.getByRole("tab", { name: "Draw" }));
  expect(screen.getByTestId("gym-end")).toBeOnTheScreen();
  expect(screen.queryByTestId("gym-save")).toBeNull();
  expect(loadWorkout()?.sets).toHaveLength(1);
  // And the line still goes there.
  await fireEvent.press(line());
  expect(screen.queryByTestId("gym-end")).toBeNull();
  onSignUp();
});

test("the same at the end of a swim in a pool", async () => {
  api({
    "POST /accounts": () => Response.json(session, { status: 201 }),
    "GET /me/favorites": () => Response.json({ favorites: [] }),
  });
  await open();
  await act(async () => startPoolSwim(25));
  await wait(10 * MIN);
  await fireEvent(screen.getByLabelText("Stop"), "longPress");
  expect(screen.getByTestId("pool-end")).toBeOnTheScreen();
  expect(screen.queryByTestId("pool-save")).toBeNull();

  await fireEvent.press(line());
  expect(screen.queryByTestId("pool-end")).toBeNull();
  onSignUp();
  expect(loadPoolSwim()?.endedMs).not.toBeNull();

  await signUp();
  expect(await screen.findByTestId("pool-end")).toBeOnTheScreen();
  expect(screen.getByTestId("pool-save")).toBeOnTheScreen();
});
