/**
 * The Coach's page (TASK-491 part B): the body of the week, the tips with
 * their buttons, and what it says without an account, a network or
 * workouts.
 */
import session from "@shaperoute/shared-types/fixtures/session.json";
import type { GymPlan, GymSession, Session } from "@shaperoute/shared-types";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import { ActivitiesContext, type ActivitiesDoor } from "../activities/activitiesDoor";
import { FollowsContext, type FollowsDoor } from "../social/followsDoor";
import { CoachPage } from "./CoachPage";
import type { CoachFetchers } from "./coachData";

jest.mock("../trainingmode/WeekBodyCard", () => ({
  WeekBody: () => {
    const { Text: Shown } =
      jest.requireActual<typeof import("react-native")>("react-native");
    return <Shown testID="week-body">body</Shown>;
  },
}));

jest.mock("./snooze", () => ({
  loadSnoozed: jest.fn(() => new Set()),
  snooze: jest.fn(),
}));
const { snooze } = jest.requireMock<{ snooze: jest.Mock }>("./snooze");

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

const PLAN: GymPlan = {
  key: "p",
  name: "Push",
  days: [1, 2, 3, 4, 5, 6, 7],
  items: [{ exercise: "bench_press", kind: "load", sets: 3, reps: 10, load_kg: 60 }],
  position: 0,
  updated_at: at(30),
};

/** A workout of plan «p»: three sets of bench press, 10 reps at 60 kg. */
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

function fetchersWith(workouts: GymSession[]): CoachFetchers {
  return {
    calendar: async (month) => ({
      kind: "ok",
      value: {
        month,
        tz: "UTC",
        count: workouts.length,
        duration_s: 0,
        days: workouts
          .filter((one) => one.started_at.startsWith(month))
          .map((one, index) => ({
            day: index + 1,
            workouts: [
              {
                id: one.id,
                started_at: one.started_at,
                duration_s: 3600,
                drawing_id: null,
              },
            ],
          })),
        last: null,
      },
    }),
    session: async (key) => {
      const found = workouts.find((one) => one.id === key);
      return found === undefined
        ? { kind: "bad_answer", status: 404 }
        : { kind: "ok", value: found };
    },
    plans: async () => ({ kind: "ok", value: { plans: [PLAN] } }),
    activities: async () => ({
      kind: "ok",
      value: { activities: [], next: null, total: 0 },
    }),
  };
}

const down = { kind: "unreachable" as const, url: "x" };
const UNREACHABLE: CoachFetchers = {
  calendar: async () => down,
  session: async () => down,
  plans: async () => down,
  activities: async () => down,
};

async function shown(signedIn: boolean, fetchers: CoachFetchers, onBack = jest.fn()) {
  const fetchersOf = jest.fn(() => fetchers);
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
          { owner: signedIn ? OWNER : null, total: 1 } as unknown as ActivitiesDoor
        }
      >
        <CoachPage onBack={onBack} fetchersOf={fetchersOf} />
      </ActivitiesContext.Provider>
    </FollowsContext.Provider>,
  );
  // The Coach has read everything it asks.
  await waitFor(() => expect(screen.queryByTestId("coach-loading")).toBeNull());
  return fetchersOf;
}

beforeEach(() => {
  mockKeep.mockClear();
  snooze.mockClear();
  mockPlans = [{ ...PLAN, owner: OWNER, state: "sent" } as GymPlan];
});

test("without an account: the invitation, nothing asked", async () => {
  const fetchersOf = await shown(false, fetchersWith([]));
  expect(screen.getByTestId("coach-invite")).toHaveTextContent(
    "Create an account to get tips from your workouts",
  );
  expect(fetchersOf).not.toHaveBeenCalled();
  expect(screen.getByText(/not medical advice/)).toBeOnTheScreen();
});

test("the body of the week on top, then the tips with their study", async () => {
  await shown(true, fetchersWith([workout("a", 1), workout("b", 4)]));
  expect(screen.getByTestId("week-body")).toBeOnTheScreen();
  expect(screen.getByText("Coach")).toBeOnTheScreen();
  expect(screen.getByText("Based on your last 4 weeks")).toBeOnTheScreen();
  const card = screen.getByTestId("tip-P1:bench_press:");
  expect(card).toHaveTextContent(/Bench press: 62.5 kg/);
  expect(card).toHaveTextContent(/Why: Double progression · ACSM 2009/);
});

test("«Apply to plan» changes the plan and the tip goes", async () => {
  await shown(true, fetchersWith([workout("a", 1), workout("b", 4)]));
  await fireEvent.press(screen.getByTestId("tip-apply-P1:bench_press:"));
  expect(mockKeep).toHaveBeenCalledTimes(1);
  expect(mockKeep.mock.calls[0][0]).toBe("p");
  expect(mockKeep.mock.calls[0][1].items[0]).toMatchObject({ reps: 10, load_kg: 62.5 });
  expect(snooze).toHaveBeenCalledWith(OWNER, "P1:bench_press:");
  expect(screen.queryByTestId("tip-P1:bench_press:")).toBeNull();
});

test("«Not now» leaves the plan as it is and puts the tip off", async () => {
  await shown(true, fetchersWith([workout("a", 1), workout("b", 4)]));
  await fireEvent.press(screen.getByTestId("tip-later-P1:bench_press:"));
  expect(mockKeep).not.toHaveBeenCalled();
  expect(snooze).toHaveBeenCalledWith(OWNER, "P1:bench_press:");
  expect(screen.queryByTestId("tip-P1:bench_press:")).toBeNull();
});

test("nothing done in four weeks: how the tips come", async () => {
  await shown(true, fetchersWith([]));
  expect(screen.getByTestId("coach-empty")).toHaveTextContent(
    "Log a few workouts and your tips will show up here",
  );
});

test("no network: says so", async () => {
  await shown(true, UNREACHABLE);
  expect(screen.getByTestId("coach-unreachable")).toBeOnTheScreen();
});

test("back", async () => {
  const onBack = jest.fn();
  await shown(false, fetchersWith([]), onBack);
  await fireEvent.press(screen.getByTestId("coach-back"));
  expect(onBack).toHaveBeenCalled();
});

// The tip with no plan change has «OK».
test("a tip that does not change the plan: «OK»", async () => {
  mockPlans = [];
  const noPlan = fetchersWith([workout("a", 1), workout("b", 4)]);
  await shown(true, {
    ...noPlan,
    plans: async () => ({ kind: "ok", value: { plans: [] } }),
  });
  // Without the plan there is no target: no P1; low volume shows with «OK».
  const ok = screen.getAllByTestId(/^tip-ok-/);
  expect(ok.length).toBeGreaterThan(0);
  expect(screen.queryByTestId(/^tip-apply-/)).toBeNull();
  expect(screen.getAllByText("OK").length).toBe(ok.length);
});
