/**
 * «Gym workout» of the Feed's «+» (TASK-484 part B, ADR-0395): a workout
 * at the gym written by hand. «Save» off without exercises, the day
 * between 2020 and today, «Pick a time before now.», «From a plan», the
 * post on «Everyone» under «Imported», and «Save» through the gym's file
 * on the phone with `source: "manual"`.
 */
import type { GymPlan, GymSessionRequest, Session } from "@shaperoute/shared-types";
import session from "@shaperoute/shared-types/fixtures/session.json";
import { act, fireEvent, render, screen } from "@testing-library/react-native";

import { ActivitiesContext, type ActivitiesDoor } from "../activities/activitiesDoor";
import { answers } from "../account/testing";
import { FollowsContext, type FollowsDoor } from "../social/followsDoor";
import { GymByHand } from "./GymByHand";
import { loadGymOutbox } from "./gymOutbox";
import { forgetPlans, mergePlans } from "./plans";

jest.mock(
  "react-native-safe-area-context",
  () => jest.requireActual("react-native-safe-area-context/jest/mock").default,
);
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
jest.mock("react-native-view-shot");

const { files } = jest.requireMock<{ files: Map<string, string> }>("expo-file-system");
const signedIn = session as Session;
const OWNER = signedIn.user.id;
// Saturday 21 November 2026, 20:12 on the phone's clock.
const NOW = new Date(2026, 10, 21, 20, 12);

const SAVED = {
  id: "x",
  started_at: "2026-11-21T18:00:00Z",
  duration_s: 3600,
  rests: 0,
  rest_s: 0,
  show_exercises: true,
  sets: [],
  source: "manual",
};

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

async function show(fetchFn: jest.Mock = answers(), onDone: () => void = jest.fn()) {
  await render(
    <FollowsContext.Provider value={follows()}>
      <ActivitiesContext.Provider value={activities()}>
        <GymByHand onDone={onDone} fetchFn={fetchFn} />
      </ActivitiesContext.Provider>
    </FollowsContext.Provider>,
  );
  await act(async () => {});
}

/** A plank, 3 × 45 s, through the editor of the plans. */
async function addPlank() {
  await fireEvent.press(screen.getByTestId("session-add"));
  await fireEvent.press(screen.getByTestId("group-core"));
  await fireEvent.press(screen.getByTestId("exercise-plank"));
  await fireEvent.press(screen.getByTestId("session-item-0"));
  await fireEvent.changeText(screen.getByTestId("set-duration_s"), "45");
}

function saveButton() {
  return screen.getByTestId("by-hand-save");
}

beforeEach(() => {
  files.clear();
  forgetPlans();
  jest.useFakeTimers({ now: NOW });
});

afterEach(() => {
  jest.useRealTimers();
});

test("it opens on today, an hour ended before now, Save off without exercises", async () => {
  await show();
  expect(screen.getByRole("header", { name: "Gym workout" })).toBeOnTheScreen();
  expect(screen.getByTestId("by-hand-day")).toHaveTextContent("Today");
  expect(screen.getByTestId("by-hand-start").props.value).toBe("19:05");
  expect(screen.getByTestId("by-hand-duration").props.value).toBe("1:00");
  expect(saveButton()).toBeDisabled();
  // No plan kept: no «From a plan».
  expect(screen.queryByTestId("by-hand-from-plan")).toBeNull();
  expect(screen.getByTestId("imported-mark")).toBeOnTheScreen();
  expect(
    screen.getByText(
      "Workouts written by hand don't count for Play, contests, levels or the leaderboard.",
    ),
  ).toBeOnTheScreen();
  // From the Feed's «+», the post starts on «Everyone».
  expect(screen.getByRole("radio", { name: "Everyone" })).toBeChecked();
});

test("the day goes back to yesterday and on to today, never after", async () => {
  await show();
  expect(screen.getByTestId("by-hand-day-after")).toBeDisabled();
  await fireEvent.press(screen.getByTestId("by-hand-day-before"));
  expect(screen.getByTestId("by-hand-day")).toHaveTextContent("Yesterday");
  await fireEvent.press(screen.getByTestId("by-hand-day-before"));
  expect(screen.getByTestId("by-hand-day")).toHaveTextContent("Thu 19 Nov 2026");
  await fireEvent.press(screen.getByTestId("by-hand-day-after"));
  await fireEvent.press(screen.getByTestId("by-hand-day-after"));
  expect(screen.getByTestId("by-hand-day")).toHaveTextContent("Today");
  expect(screen.getByTestId("by-hand-day-after")).toBeDisabled();
});

test("a workout ending after now says so, and Save stays off", async () => {
  await show();
  await addPlank();
  expect(saveButton()).toBeEnabled();
  await fireEvent.changeText(screen.getByTestId("by-hand-start"), "19:30");
  expect(screen.getByText("Pick a time before now.")).toBeOnTheScreen();
  expect(saveButton()).toBeDisabled();
  // Yesterday the same hour is before now.
  await fireEvent.press(screen.getByTestId("by-hand-day-before"));
  expect(screen.queryByText("Pick a time before now.")).toBeNull();
  expect(saveButton()).toBeEnabled();
  // A length that is not one: Save off, without a sentence.
  await fireEvent.changeText(screen.getByTestId("by-hand-duration"), "0:00");
  expect(saveButton()).toBeDisabled();
  expect(screen.queryByText("Pick a time before now.")).toBeNull();
});

test("Save sends it written by hand, its sets not live, then closes", async () => {
  const fetchFn = answers({ status: 201, body: SAVED }, { status: 204 });
  const onDone = jest.fn();
  await show(fetchFn, onDone);
  await addPlank();
  await fireEvent.press(saveButton());
  await act(async () => {});
  expect(onDone).toHaveBeenCalledTimes(1);

  const [url, init] = fetchFn.mock.calls[0];
  expect(String(url)).toMatch(/^http:\/\/api\/me\/gym-sessions\/[a-z0-9]{8,40}$/);
  expect(init?.method).toBe("PUT");
  const body = JSON.parse(init?.body as string) as GymSessionRequest;
  expect(body).toEqual({
    started_at: new Date(2026, 10, 21, 19, 5).toISOString(),
    ended_at: new Date(2026, 10, 21, 20, 5).toISOString(),
    show_exercises: true,
    source: "manual",
    sets: [900, 1800, 2700].map((at_s) => ({
      exercise: "plank",
      kind: "timed",
      duration_s: 45,
      at_s,
      live: false,
    })),
  });
  expect(loadGymOutbox()).toEqual([]);
});

test("without a network it waits on the phone, written by hand", async () => {
  const fetchFn = answers(new Error("Network request failed"));
  const onDone = jest.fn();
  await show(fetchFn, onDone);
  await addPlank();
  await fireEvent.press(saveButton());
  await act(async () => {});
  expect(onDone).toHaveBeenCalledTimes(1);
  expect(loadGymOutbox()).toEqual([
    expect.objectContaining({
      owner: OWNER,
      request: expect.objectContaining({ source: "manual" }),
      drawing: expect.objectContaining({ activity: "gym", visibility: "everyone" }),
    }),
  ]);
});

const ONE: GymPlan = {
  key: "push",
  name: "Push",
  days: [1],
  items: [{ exercise: "bench_press", kind: "load", sets: 4, reps: 10, load_kg: 60 }],
  position: 0,
  updated_at: "2026-11-01T10:00:00Z",
};

const WEEK: GymPlan = {
  ...ONE,
  key: "split",
  name: "Split",
  days: [1, 3],
  items: [],
  position: 1,
  program: {
    starts_on: "2030-01-07",
    weeks: 1,
    mode: "same",
    step_kg: 2.5,
    sessions: [
      {
        day: 1,
        name: "Upper",
        items: [
          { exercise: "bench_press", kind: "load", sets: 3, reps: 8, load_kg: 50 },
        ],
      },
      {
        day: 3,
        name: "Lower",
        items: [
          { exercise: "back_squat", kind: "load", sets: 5, reps: 5, load_kg: 90 },
        ],
      },
    ],
    custom: [],
  },
};

test("From a plan copies a plan of one workout at once", async () => {
  mergePlans(OWNER, [ONE, WEEK]);
  await show();
  await fireEvent.press(screen.getByTestId("by-hand-from-plan"));
  expect(screen.getByTestId("by-hand-plan-push")).toBeOnTheScreen();
  expect(screen.getByTestId("by-hand-plan-split")).toBeOnTheScreen();
  await fireEvent.press(screen.getByTestId("by-hand-plan-push"));
  expect(screen.getByTestId("session-item-0")).toHaveProp(
    "accessibilityLabel",
    "Bench press, 4 × 10",
  );
  expect(saveButton()).toBeEnabled();
});

test("From a plan asks which day of a plan with days", async () => {
  mergePlans(OWNER, [ONE, WEEK]);
  await show();
  await fireEvent.press(screen.getByTestId("by-hand-from-plan"));
  await fireEvent.press(screen.getByTestId("by-hand-plan-split"));
  expect(screen.getByRole("header", { name: "Split" })).toBeOnTheScreen();
  expect(screen.getByText("Mon · Upper")).toBeOnTheScreen();
  await fireEvent.press(screen.getByTestId("by-hand-plan-day-3"));
  expect(screen.getByTestId("session-item-0")).toHaveProp(
    "accessibilityLabel",
    "Squat, 5 × 5",
  );
  // «‹» goes back a step at a time.
  await fireEvent.press(screen.getByTestId("by-hand-from-plan"));
  await fireEvent.press(screen.getByTestId("by-hand-plan-split"));
  await fireEvent.press(screen.getByTestId("by-hand-plans-back"));
  expect(screen.getByTestId("by-hand-plans")).toBeOnTheScreen();
  await fireEvent.press(screen.getByTestId("by-hand-plans-back"));
  expect(screen.getByTestId("gym-by-hand")).toBeOnTheScreen();
});
