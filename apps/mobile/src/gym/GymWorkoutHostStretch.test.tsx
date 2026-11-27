/**
 * The stretching at the end of a workout at the gym (TASK-466 part C2,
 * «ADR-0378, aggiunta C ed E», the user's choice «Dentro l'allenamento»):
 * «Stop» held, «Remember to stretch»; «Skip» goes to its end as before,
 * «Stretch» opens «After gym», and what it was goes with the workout at
 * «Save», in `stretch` of PUT /me/gym-sessions/{key}. A workout that ends
 * by itself, or opened again ended already, is not asked; an app closed on
 * the reminder, or after the stretching, finds it where it was.
 */
import type { Session } from "@shaperoute/shared-types";
import session from "@shaperoute/shared-types/fixtures/session.json";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { AccessibilityInfo } from "react-native";

import { ActivitiesContext, type ActivitiesDoor } from "../activities/activitiesDoor";
import { answers } from "../account/testing";
import { FollowsContext, type FollowsDoor } from "../social/followsDoor";
import { routineExercises } from "../stretch/routines";
import { READY_S, SWITCH_S, TICK_MS } from "../stretch/StretchScreen";
import { GYM_STRETCH_FILE, resetGymStretchForTests } from "./gymStretch";
import { GymWorkoutHost } from "./GymWorkoutHost";
import { forgetRestQuestion } from "./restAlert";
import { forgetHeldWorkout, startGymWorkout } from "./useWorkout";

jest.mock(
  "react-native-safe-area-context",
  () => jest.requireActual("react-native-safe-area-context/jest/mock").default,
);
jest.mock("expo-speech", () => ({
  speak: jest.fn(),
  stop: jest.fn(),
  isSpeakingAsync: jest.fn(async () => false),
}));
jest.mock("expo-keep-awake", () => ({
  activateKeepAwakeAsync: jest.fn(() => Promise.resolve()),
  deactivateKeepAwake: jest.fn(() => Promise.resolve()),
}));
jest.mock("../stretch/chime", () => ({ chime: () => {}, tick: () => {} }));
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

const { files } = jest.requireMock<{ files: Map<string, string> }>("expo-file-system");
const signedIn = session as Session;
const OWNER = signedIn.user.id;
const T0 = Date.UTC(2026, 10, 27, 17);
const STRETCH_FILE = `file:///documents/${GYM_STRETCH_FILE}`;

function follows(): FollowsDoor {
  return {
    apiUrl: "http://api",
    account: {
      state: { status: "signedIn", session: signedIn },
      sessionEnded: () => {},
    },
    openProfile: () => {},
  } as unknown as FollowsDoor;
}

function activities(): ActivitiesDoor {
  return {
    signedIn: true,
    owner: OWNER,
    refresh: jest.fn(),
    signIn: jest.fn(),
  } as unknown as ActivitiesDoor;
}

const SAVED = {
  id: "x",
  started_at: new Date(T0).toISOString(),
  duration_s: 120,
  rests: 0,
  rest_s: 0,
  show_exercises: true,
  sets: [],
};

async function show(fetchFn?: jest.Mock) {
  await render(
    <FollowsContext.Provider value={follows()}>
      <ActivitiesContext.Provider value={activities()}>
        <GymWorkoutHost fetchFn={fetchFn} />
      </ActivitiesContext.Provider>
    </FollowsContext.Provider>,
  );
}

function wait(ms: number) {
  return act(() => jest.advanceTimersByTimeAsync(ms));
}

function press(name: string) {
  return act(async () => {
    fireEvent.press(screen.getByRole("button", { name }));
  });
}

/** A plank of a minute, two minutes in all, then «Stop» held. */
async function plankThenStop() {
  await act(async () => startGymWorkout());
  await fireEvent.press(screen.getByTestId("group-core"));
  await fireEvent.press(screen.getByTestId("exercise-plank"));
  await fireEvent.changeText(screen.getByTestId("set-duration_s"), "60");
  await fireEvent.press(screen.getByTestId("log-set"));
  await wait(2 * 60_000);
  await fireEvent(screen.getByLabelText("Stop"), "longPress");
}

/** The seconds of «After gym» of 3 minutes, to its end. */
function wholeSeconds(): number {
  return routineExercises("afterGym", 3).reduce(
    (sum, exercise) =>
      sum +
      READY_S +
      exercise.seconds +
      (exercise.sides ? SWITCH_S + exercise.seconds : 0),
    0,
  );
}

/** The body of the PUT that saved the workout. */
function sent(fetchFn: jest.Mock): Record<string, unknown> {
  const call = fetchFn.mock.calls.find(([url]) =>
    String(url).startsWith("http://api/me/gym-sessions/"),
  );
  expect(call).toBeDefined();
  return JSON.parse(call?.[1]?.body as string);
}

/** As a new start of the app: what is in memory is read from the files. */
async function openAgain(fetchFn?: jest.Mock) {
  await screen.unmount();
  forgetHeldWorkout();
  resetGymStretchForTests();
  await show(fetchFn);
}

beforeEach(() => {
  jest.useFakeTimers({ now: T0 });
  files.clear();
  forgetHeldWorkout();
  resetGymStretchForTests();
  forgetRestQuestion();
  jest
    .spyOn(AccessibilityInfo, "announceForAccessibility")
    .mockImplementation(() => {});
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

test("Stop held: «Remember to stretch» comes before the end; Skip saves as before", async () => {
  const fetchFn = answers({ status: 201, body: SAVED });
  await show(fetchFn);
  await plankThenStop();
  expect(screen.getByTestId("gym-stretch-ask")).toBeOnTheScreen();
  expect(screen.getByText("Remember to stretch")).toBeOnTheScreen();
  expect(screen.queryByTestId("gym-end")).toBeNull();

  await press("Skip");
  expect(screen.getByTestId("gym-end")).toBeOnTheScreen();
  await fireEvent.press(screen.getByTestId("gym-save"));
  await act(async () => {});
  expect(sent(fetchFn)).not.toHaveProperty("stretch");
  // Saved: nothing of it stays on the phone.
  expect(files.has(STRETCH_FILE)).toBe(false);
});

test("Stretch: «After gym», then its end; Save sends it with the workout", async () => {
  const fetchFn = answers({ status: 201, body: SAVED });
  await show(fetchFn);
  await plankThenStop();
  await press("Stretch");
  expect(screen.getByTestId("stretch-chooser")).toBeOnTheScreen();
  expect(screen.getByText("After gym")).toBeOnTheScreen();
  await press("3 min");
  await wait(wholeSeconds() * TICK_MS);

  expect(screen.queryByTestId("stretch-screen")).toBeNull();
  expect(screen.getByTestId("gym-end")).toBeOnTheScreen();
  await fireEvent.press(screen.getByTestId("gym-save"));
  await act(async () => {});
  expect(sent(fetchFn).stretch).toEqual({
    routine: "afterGym",
    minutes: 3,
    duration_s: wholeSeconds(),
    exercises: routineExercises("afterGym", 3).length,
  });
});

test("left before the length is chosen, nothing goes with the workout", async () => {
  const fetchFn = answers({ status: 201, body: SAVED });
  await show(fetchFn);
  await plankThenStop();
  await press("Stretch");
  await press("Not now");
  expect(screen.getByTestId("gym-end")).toBeOnTheScreen();
  await fireEvent.press(screen.getByTestId("gym-save"));
  await act(async () => {});
  expect(sent(fetchFn)).not.toHaveProperty("stretch");
});

test("an app closed on the reminder asks again; after the stretching it still saves it", async () => {
  const fetchFn = answers({ status: 201, body: SAVED });
  await show(fetchFn);
  await plankThenStop();
  await openAgain(fetchFn);
  expect(screen.getByTestId("gym-stretch-ask")).toBeOnTheScreen();

  await press("Stretch");
  await press("3 min");
  await wait(wholeSeconds() * TICK_MS);
  await openAgain(fetchFn);
  expect(screen.getByTestId("gym-end")).toBeOnTheScreen();
  await fireEvent.press(screen.getByTestId("gym-save"));
  await act(async () => {});
  expect(sent(fetchFn).stretch).toMatchObject({ routine: "afterGym", minutes: 3 });
});

test("a workout opened again ended already is not asked", async () => {
  await show();
  await plankThenStop();
  // The workout's file stays; nothing of the stretching was written.
  files.delete(STRETCH_FILE);
  files.delete(`${STRETCH_FILE}.copy`);
  await openAgain();
  expect(screen.queryByTestId("gym-stretch-ask")).toBeNull();
  expect(screen.getByTestId("gym-end")).toBeOnTheScreen();
});

test("a workout that ends by itself, with nobody there, is not asked", async () => {
  await show();
  await act(async () => startGymWorkout());
  await fireEvent.press(screen.getByTestId("group-core"));
  await fireEvent.press(screen.getByTestId("exercise-plank"));
  await fireEvent.changeText(screen.getByTestId("set-duration_s"), "60");
  await fireEvent.press(screen.getByTestId("log-set"));
  // «Still training?» after 30 minutes, unanswered: it ends at the set.
  await wait(30 * 60_000);
  await wait(5 * 60_000);
  expect(screen.queryByTestId("gym-stretch-ask")).toBeNull();
  expect(screen.getByTestId("gym-end")).toBeOnTheScreen();
});

test("Discard forgets the stretching with the workout", async () => {
  await show();
  await plankThenStop();
  await press("Skip");
  await fireEvent.press(screen.getByTestId("gym-discard"));
  await fireEvent.press(screen.getByTestId("gym-discard-sure"));
  expect(screen.queryByTestId("gym-end")).toBeNull();
  expect(files.has(STRETCH_FILE)).toBe(false);
});
