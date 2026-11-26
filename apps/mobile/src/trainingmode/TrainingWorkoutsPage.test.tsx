/**
 * «Workouts», the second page of the training mode (TASK-490 part A): the
 * plans, the month and its workouts, the exercises of the plans; without
 * an account, «Log in».
 */
import calendar from "@shaperoute/shared-types/fixtures/gym-calendar.json";
import plans from "@shaperoute/shared-types/fixtures/gym-plans.json";
import session from "@shaperoute/shared-types/fixtures/session.json";
import type { GymCalendar, GymPlan, Session } from "@shaperoute/shared-types";
import { act, fireEvent, render, screen } from "@testing-library/react-native";

import { ActivitiesContext, type ActivitiesDoor } from "../activities/activitiesDoor";
import { forgetPlans } from "../gym/plans";
import { FollowsContext, type FollowsDoor } from "../social/followsDoor";
import {
  planEntries,
  TrainingWorkoutsPage,
  workoutLine,
  workoutsOf,
} from "./TrainingWorkoutsPage";

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

const { files } = jest.requireMock<{ files: Map<string, string> }>("expo-file-system");
const OWNER = 7;
const [PUSH] = plans.plans as GymPlan[];

/** The API: its plans and the calendar. */
function api(remote: GymPlan[]) {
  return jest.fn(async (url: string) => {
    if (String(url).includes("/me/gym-calendar")) {
      return Response.json(calendar);
    }
    return Response.json({ plans: remote });
  });
}

async function shown(signedIn: boolean, fetchFn: jest.Mock, onLogIn = jest.fn()) {
  await render(
    <FollowsContext.Provider
      value={
        {
          apiUrl: "http://api",
          account: {
            state: signedIn
              ? { status: "signedIn", session: session as Session }
              : { status: "signedOut" },
            sessionEnded: () => {},
          },
          openProfile: () => {},
        } as unknown as FollowsDoor
      }
    >
      <ActivitiesContext.Provider
        value={
          {
            owner: signedIn ? OWNER : null,
            total: 3,
            list: [],
          } as unknown as ActivitiesDoor
        }
      >
        <TrainingWorkoutsPage
          onLogIn={onLogIn}
          fetchFn={fetchFn as unknown as typeof fetch}
        />
      </ActivitiesContext.Provider>
    </FollowsContext.Provider>,
  );
  await act(async () => {});
}

beforeEach(() => {
  files.clear();
  forgetPlans();
});

test("the workouts of the month, the latest first", () => {
  const ids = workoutsOf(calendar as GymCalendar).map((workout) => workout.id);
  expect(ids[0]).not.toBe("ab00000000000001");
  expect(ids.at(-1)).toBe("ab00000000000001");
  expect(ids).toHaveLength(
    (calendar as GymCalendar).days.flatMap((day) => day.workouts).length,
  );
});

test("a workout: its day, its plan or «Workout at the gym», its time", () => {
  const now = new Date("2026-11-06T12:00:00");
  expect(
    workoutLine(
      {
        id: "a",
        started_at: "2026-11-05T17:00:00",
        duration_s: 3300,
        drawing_id: null,
        plan: "Push",
      },
      now,
    ),
  ).toBe("Yesterday · Push · 55:00");
  expect(
    workoutLine(
      { id: "b", started_at: "2026-11-06T08:00:00", duration_s: 600, drawing_id: null },
      now,
    ),
  ).toBe("Today · Workout at the gym · 10:00");
});

test("the exercises of the plans, once each, without empty names", () => {
  const entries = planEntries([
    {
      items: [
        { exercise: "bench_press", kind: "load", sets: 4 },
        { name: "Sled push", kind: "load", sets: 3 },
        { name: "  ", kind: "load", sets: 3 },
      ],
    },
    { items: [{ exercise: "bench_press", kind: "load", sets: 3 }] },
  ]);
  expect(entries).toEqual([
    { exercise: "bench_press", kind: "load" },
    { name: "Sled push", kind: "load" },
  ]);
});

test("without an account, «Log in» goes to «Profile»", async () => {
  const onLogIn = jest.fn();
  const fetchFn = api([]);
  await shown(false, fetchFn, onLogIn);
  expect(screen.getByRole("header", { name: "Workouts" })).toBeOnTheScreen();
  expect(
    screen.getByText("Log in to keep your plans and see your workouts."),
  ).toBeOnTheScreen();
  await fireEvent.press(screen.getByTestId("training-log-in"));
  expect(onLogIn).toHaveBeenCalledTimes(1);
  expect(fetchFn).not.toHaveBeenCalled();
});

test("with an account: the plans, the month with its workouts, the exercises", async () => {
  await shown(true, api([PUSH]));
  expect(screen.getByRole("header", { name: "My plans" })).toBeOnTheScreen();
  expect(screen.getByTestId(`training-plan-${PUSH.key}`)).toBeOnTheScreen();
  expect(screen.getByText(PUSH.name)).toBeOnTheScreen();
  expect(screen.getByText(`This month: ${calendar.count} times`)).toBeOnTheScreen();
  for (const workout of workoutsOf(calendar as GymCalendar)) {
    expect(screen.getByTestId(`training-done-${workout.id}`)).toBeOnTheScreen();
  }
  expect(screen.getByRole("header", { name: "Exercises" })).toBeOnTheScreen();
  expect(screen.getByTestId("training-find-exercise")).toBeOnTheScreen();
});

test("«Find an exercise» opens the catalog", async () => {
  await shown(true, api([PUSH]));
  await fireEvent.press(screen.getByTestId("training-find-exercise"));
  expect(screen.getByPlaceholderText(/./)).toBeOnTheScreen();
});

test("«How it works» is at the end, with «How plans work» (part E)", async () => {
  await shown(true, api([PUSH]));
  expect(screen.getByRole("header", { name: "How it works" })).toBeOnTheScreen();
  expect(screen.getByText("Pick an exercise from the grid")).toBeOnTheScreen();
  expect(screen.getByTestId("training-how-plans")).toBeOnTheScreen();
});
