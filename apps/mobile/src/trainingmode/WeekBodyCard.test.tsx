/**
 * The body of the week (TASK-490 part B): each muscle by its look, the
 * share of the body, the words for the screen reader; with an account, the
 * sets of the workouts since Monday, those still on the phone too.
 */
import session from "@shaperoute/shared-types/fixtures/session.json";
import type { GymSet, Session } from "@shaperoute/shared-types";
import { act, render, screen } from "@testing-library/react-native";

import { ActivitiesContext, type ActivitiesDoor } from "../activities/activitiesDoor";
import { FollowsContext, type FollowsDoor } from "../social/followsDoor";
import { forgetWeekWorkouts } from "./useWeekBody";
import { WeekBody, WeekBodyCard, weekBodyLabel } from "./WeekBodyCard";
import { noSets } from "./weekBody";

jest.mock("../gym/gymOutbox", () => ({ loadGymOutbox: jest.fn(() => []) }));
const { loadGymOutbox } = jest.requireMock<{ loadGymOutbox: jest.Mock }>(
  "../gym/gymOutbox",
);

const OWNER = 7;

function sets(exercise: string, n: number): GymSet[] {
  return Array.from({ length: n }, (_, at) => ({
    exercise,
    kind: "load",
    reps: 8,
    load_kg: 60,
    at_s: at * 60,
    live: true,
  }));
}

/** The API: this month's calendar with one workout of today and one of
 * last month's, and the sets of each. */
function api() {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 1);
  const old = new Date(now.getFullYear(), now.getMonth() - 1, 3, 18);
  return jest.fn(async (url: string) => {
    const path = String(url);
    if (path.includes("/me/gym-calendar")) {
      return Response.json({
        month: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`,
        tz: "Europe/Rome",
        count: 2,
        duration_s: 0,
        days: [
          {
            day: today.getDate(),
            workouts: [
              {
                id: "today",
                started_at: today.toISOString(),
                duration_s: 1,
                drawing_id: null,
              },
            ],
          },
          {
            day: 3,
            workouts: [
              {
                id: "old",
                started_at: old.toISOString(),
                duration_s: 1,
                drawing_id: null,
              },
            ],
          },
        ],
        last: null,
      });
    }
    const id = path.split("/").at(-1);
    return Response.json({
      id,
      started_at: (id === "today" ? today : old).toISOString(),
      ended_at: (id === "today" ? today : old).toISOString(),
      duration_s: 3600,
      rests: 0,
      rest_s: 0,
      show_exercises: true,
      sets: id === "today" ? sets("bench_press", 4) : sets("back_squat", 12),
    });
  });
}

async function shown(signedIn: boolean, fetchFn: jest.Mock) {
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
        <WeekBody fetchFn={fetchFn as unknown as typeof fetch} />
      </ActivitiesContext.Provider>
    </FollowsContext.Provider>,
  );
  await act(async () => {});
}

beforeEach(() => {
  forgetWeekWorkouts();
  loadGymOutbox.mockReturnValue([]);
});

test("each muscle by its look, and the share of the body", async () => {
  const count = noSets();
  count.chest = 12;
  count.quads = 6;
  count.biceps = 2;
  await render(<WeekBodyCard count={count} language="en" />);
  expect(screen.getByTestId("week-muscle-chest-3")).toBeOnTheScreen();
  expect(screen.getByTestId("week-muscle-quads-2")).toBeOnTheScreen();
  expect(screen.getByTestId("week-muscle-biceps-1")).toBeOnTheScreen();
  expect(screen.queryByTestId(/week-muscle-lats/)).toBeNull();
  // (1 + 0.6 + 0.2) / 17 muscles = 10.6%.
  expect(screen.getByTestId("week-body-percent")).toHaveTextContent("11%");
  expect(screen.getByText("This week")).toBeOnTheScreen();
});

test("the screen reader hears every look in words", () => {
  const count = noSets();
  count.chest = 12;
  count.biceps = 2;
  expect(weekBodyLabel(count, "en")).toBe(
    "7% of your body trained this week. 10 sets or more: chest. 1 to 4 sets: biceps.",
  );
});

test("nothing without an account, and nothing asked", async () => {
  const fetchFn = api();
  await shown(false, fetchFn);
  expect(screen.queryByTestId("week-body")).toBeNull();
  expect(fetchFn).not.toHaveBeenCalled();
});

test("with an account: the sets since Monday, not those of the month before", async () => {
  await shown(true, api());
  // Four bench press: chest 4 (1–4), shoulders and triceps 2.
  expect(await screen.findByTestId("week-muscle-chest-1")).toBeOnTheScreen();
  expect(screen.getByTestId("week-muscle-triceps-1")).toBeOnTheScreen();
  expect(screen.queryByTestId(/week-muscle-quads/)).toBeNull();
});

test("a workout still waiting on the phone counts too", async () => {
  loadGymOutbox.mockReturnValue([
    {
      owner: OWNER,
      key: "waiting",
      request: { started_at: new Date().toISOString(), sets: sets("bench_press", 8) },
    },
  ]);
  await shown(true, api());
  // 4 sent + 8 waiting = 12 sets of chest.
  expect(await screen.findByTestId("week-muscle-chest-3")).toBeOnTheScreen();
});
