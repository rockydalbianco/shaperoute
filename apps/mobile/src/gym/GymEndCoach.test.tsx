/**
 * «Next time» at the end of a workout (TASK-491 part C, ADR-0399): all the
 * reps at the same weight twice in a row, this workout the second, says
 * the weight to lift next time; signed out, nothing is asked.
 */
import type { GymPlan, GymSession } from "@shaperoute/shared-types";
import { act, render, screen } from "@testing-library/react-native";
import type { ReactNode } from "react";

import { ActivitiesContext, type ActivitiesDoor } from "../activities/activitiesDoor";
import type { CoachFetchers } from "../coach/coachData";
import { SignedIn } from "../health/sleepEnd.testing";
import { FollowsContext, type FollowsDoor } from "../social/followsDoor";
import { GymEnd } from "./GymEnd";
import type { Workout } from "./workout";

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

const DAY = 86_400_000;
const NOW = Date.now();

const PLAN: GymPlan = {
  key: "p",
  name: "Push",
  days: [1, 2, 3, 4, 5, 6, 7],
  items: [{ exercise: "bench_press", kind: "load", sets: 3, reps: 10, load_kg: 60 }],
  position: 0,
  updated_at: new Date(NOW - 30 * DAY).toISOString(),
};

function sets(reps: number) {
  return [0, 1, 2].map((n) => ({
    exercise: "bench_press",
    kind: "load" as const,
    reps,
    load_kg: 60,
    at_s: n * 120,
    live: true,
  }));
}

/** The same workout of the plan three days ago, all its reps done. */
const BEFORE: GymSession = {
  id: "before",
  started_at: new Date(NOW - 3 * DAY).toISOString(),
  duration_s: 3600,
  rests: 2,
  rest_s: 240,
  show_exercises: true,
  plan: "p",
  sets: sets(10),
};

const fetchers: CoachFetchers = {
  calendar: async (month) => ({
    kind: "ok",
    value: {
      month,
      tz: "UTC",
      count: 1,
      duration_s: 3600,
      days: BEFORE.started_at.startsWith(month)
        ? [
            {
              day: 1,
              workouts: [
                {
                  id: BEFORE.id,
                  started_at: BEFORE.started_at,
                  duration_s: 3600,
                  drawing_id: null,
                },
              ],
            },
          ]
        : [],
      last: null,
    },
  }),
  session: async () => ({ kind: "ok", value: BEFORE }),
  plans: async () => ({ kind: "ok", value: { plans: [PLAN] } }),
  activities: async () => ({ kind: "unreachable", url: "" }),
};
const coach = jest.fn(() => fetchers);

/** This workout of the plan: ended an hour ago, after an hour. */
function workout(reps: number): Workout {
  const startedMs = NOW - 2 * 3_600_000;
  return {
    key: "gymkey12345",
    startedMs,
    pauses: [],
    current: null,
    sets: sets(reps).map((set, index) => ({ ...set, n: index + 1 })),
    rest: null,
    rests: 2,
    restS: 240,
    restChoices: {},
    lastActiveMs: startedMs + 3_600_000,
    endedMs: startedMs + 3_600_000,
    nextN: 4,
    plan: { key: "p", name: "Push", items: PLAN.items },
  };
}

function SignedOut({ children }: { children: ReactNode }) {
  return (
    <FollowsContext.Provider
      value={
        {
          apiUrl: "http://api",
          account: { state: { status: "signedOut" }, sessionEnded: () => {} },
          openProfile: () => {},
        } as unknown as FollowsDoor
      }
    >
      <ActivitiesContext.Provider
        value={
          {
            signedIn: false,
            owner: null,
            refresh: () => {},
            signIn: () => {},
          } as unknown as ActivitiesDoor
        }
      >
        {children}
      </ActivitiesContext.Provider>
    </FollowsContext.Provider>
  );
}

async function shown(
  reps: number,
  Doors: (props: { children: ReactNode }) => ReactNode,
) {
  await render(
    <Doors>
      <GymEnd
        workout={workout(reps)}
        onSave={jest.fn()}
        health={null}
        sleep={null}
        heart={null}
        coach={coach}
      />
    </Doors>,
  );
  await act(async () => {});
}

beforeEach(() => coach.mockClear());

test("all the reps twice in a row: the weight for next time", async () => {
  await shown(10, SignedIn);
  expect(await screen.findByTestId("gym-end-next-time")).toHaveTextContent(
    "Next time: Bench press 62.5 kg",
  );
});

test("reps missed today: no line", async () => {
  await shown(8, SignedIn);
  expect(coach).toHaveBeenCalled();
  expect(screen.queryByTestId("gym-end-next-time")).toBeNull();
});

test("signed out: nothing asked, no line", async () => {
  await shown(10, SignedOut);
  expect(coach).not.toHaveBeenCalled();
  expect(screen.queryByTestId("gym-end-next-time")).toBeNull();
});
