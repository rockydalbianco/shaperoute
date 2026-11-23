/**
 * The Coach as data (TASK-491 part B): what «Apply» saves, the phone's
 * plans over the API's, nothing asked without an account.
 */
import session from "@shaperoute/shared-types/fixtures/session.json";
import type { GymPlan, GymSession, Session } from "@shaperoute/shared-types";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import type { ReactNode } from "react";

import { ActivitiesContext, type ActivitiesDoor } from "../activities/activitiesDoor";
import { FollowsContext, type FollowsDoor } from "../social/followsDoor";
import type { CoachFetchers } from "./coachData";
import { type Coach, useCoach } from "./useCoach";

jest.mock("./snooze", () => ({
  loadSnoozed: jest.fn(() => new Set()),
  snooze: jest.fn(),
}));

const mockKeep = jest.fn();
let mockPlans: GymPlan[] = [];
jest.mock("../gym/plans", () => ({
  useGymPlans: () => ({ owner: 7, plans: mockPlans, keep: mockKeep, drop: jest.fn() }),
}));

const OWNER = 7;
const DAY = 86_400_000;

function at(days: number): string {
  return new Date(Date.now() - days * DAY).toISOString();
}

function plan(reps: number, kg: number): GymPlan {
  return {
    key: "p",
    name: "Push",
    days: [1, 2, 3, 4, 5, 6, 7],
    items: [{ exercise: "bench_press", kind: "load", sets: 3, reps, load_kg: kg }],
    position: 2,
    updated_at: at(30),
  };
}

function workout(id: string, days: number): GymSession {
  return {
    id,
    started_at: at(days),
    duration_s: 3600,
    rests: 0,
    rest_s: 0,
    show_exercises: true,
    plan: "p",
    sets: [0, 1, 2].map((n) => ({
      exercise: "bench_press",
      kind: "load" as const,
      reps: 10,
      load_kg: 60,
      at_s: n * 120,
      live: true,
    })),
  };
}

const WORKOUTS = [workout("a", 1), workout("b", 4)];

const FETCHERS: CoachFetchers = {
  calendar: async (month) => ({
    kind: "ok",
    value: {
      month,
      tz: "UTC",
      count: 2,
      duration_s: 0,
      days: WORKOUTS.filter((one) => one.started_at.startsWith(month)).map(
        (one, index) => ({
          day: index + 1,
          workouts: [
            {
              id: one.id,
              started_at: one.started_at,
              duration_s: 3600,
              drawing_id: null,
            },
          ],
        }),
      ),
      last: null,
    },
  }),
  session: async (key) => ({
    kind: "ok",
    value: WORKOUTS.find((one) => one.id === key) ?? WORKOUTS[0],
  }),
  plans: async () => ({ kind: "ok", value: { plans: [plan(10, 60)] } }),
  activities: async () => ({
    kind: "ok",
    value: { activities: [], next: null, total: 0 },
  }),
};

const fetchersOf = jest.fn(() => FETCHERS);

function wrapper(signedIn: boolean) {
  return function Doors({ children }: { children: ReactNode }) {
    return (
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
            { owner: signedIn ? OWNER : null, total: 1 } as unknown as ActivitiesDoor
          }
        >
          {children}
        </ActivitiesContext.Provider>
      </FollowsContext.Provider>
    );
  };
}

async function coach(signedIn = true): Promise<{ current: Coach }> {
  const { result } = await renderHook(() => useCoach(fetchersOf), {
    wrapper: wrapper(signedIn),
  });
  if (signedIn) {
    await waitFor(() => expect(result.current.state.kind).toBe("ready"));
  }
  return result;
}

function tipsOf(result: { current: Coach }) {
  const state = result.current.state;
  return state.kind === "ready" ? state.tips : [];
}

beforeEach(() => {
  mockKeep.mockClear();
  fetchersOf.mockClear();
  mockPlans = [{ ...plan(10, 60), owner: OWNER, state: "sent" } as GymPlan];
});

test("without an account nothing is asked", async () => {
  const result = await coach(false);
  expect(result.current.state).toEqual({ kind: "signedOut" });
  expect(fetchersOf).not.toHaveBeenCalled();
});

test("«Apply» saves the plan with the change, without what only the phone keeps", async () => {
  const result = await coach();
  const p1 = tipsOf(result).find((one) => one.rule === "P1");
  expect(p1).toBeDefined();
  await act(async () => {
    result.current.apply(p1!);
  });
  expect(mockKeep).toHaveBeenCalledTimes(1);
  const [key, saved] = mockKeep.mock.calls[0] as [string, Record<string, unknown>];
  expect(key).toBe("p");
  expect(saved).toMatchObject({ name: "Push", days: [1, 2, 3, 4, 5, 6, 7] });
  expect(saved.items).toEqual([
    { exercise: "bench_press", kind: "load", sets: 3, reps: 10, load_kg: 62.5 },
  ]);
  for (const field of ["key", "owner", "state", "updated_at", "position"]) {
    expect(saved).not.toHaveProperty(field);
  }
  expect(tipsOf(result).some((one) => one.rule === "P1")).toBe(false);
});

test("the phone's plans count over the API's: a target already raised asks no more", async () => {
  // On the phone the plan is already at 12 reps: the workouts of 10 reps
  // did not do all of them.
  mockPlans = [{ ...plan(12, 60), owner: OWNER, state: "waiting" } as GymPlan];
  const result = await coach();
  expect(tipsOf(result).some((one) => one.rule === "P1")).toBe(false);
});
