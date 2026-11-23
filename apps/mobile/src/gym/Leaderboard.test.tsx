/**
 * The monthly leaderboard at the gym (TASK-385 F, ADR-0327, the user's
 * choices of 2026-11-06): opened from the box of the profile and from an
 * exercise of the post, each person's best live set, who asks besides, a
 * row opens its post and «…» reports it, the months before.
 */
import catalog from "@shaperoute/shared-types/fixtures/gym-exercises.json";
import leaderboard from "@shaperoute/shared-types/fixtures/gym-leaderboard.json";
import levels from "@shaperoute/shared-types/fixtures/gym-levels.json";
import session from "@shaperoute/shared-types/fixtures/session.json";
import type { Session } from "@shaperoute/shared-types";
import { act, fireEvent, render, screen } from "@testing-library/react-native";

import { answers } from "../account/testing";
import { DrawingsContext, type DrawingsDoor } from "../social/drawingsDoor";
import { FollowsContext, type FollowsDoor } from "../social/followsDoor";
import { GymDetail } from "./GymDetail";
import { GymLevels } from "./GymLevels";
import { hasLeaderboard, monthLabel, NO_LEADERBOARD } from "./Leaderboard";
import { forgetGymExercises } from "./useGymExercises";

jest.mock(
  "react-native-safe-area-context",
  () => jest.requireActual("react-native-safe-area-context/jest/mock").default,
);
jest.mock("expo-file-system");

const fetchSpy = jest.spyOn(globalThis, "fetch");
const open = jest.fn();

function follows(): FollowsDoor {
  return {
    apiUrl: "http://api",
    account: {
      state: { status: "signedIn", session: session as Session },
      sessionEnded: () => {},
    },
    openProfile: () => {},
  } as unknown as FollowsDoor;
}

async function shown(children: React.ReactNode) {
  await render(
    <FollowsContext.Provider value={follows()}>
      <DrawingsContext.Provider value={{ open } as unknown as DrawingsDoor}>
        {children}
      </DrawingsContext.Provider>
    </FollowsContext.Provider>,
  );
  await act(async () => {});
}

function asked(): string[] {
  return fetchSpy.mock.calls.map((call) => String(call[0]));
}

beforeEach(() => {
  forgetGymExercises();
  fetchSpy.mockReset();
  open.mockReset();
});

afterAll(() => {
  fetchSpy.mockRestore();
});

test("every exercise of the catalog with a scale has a leaderboard", () => {
  const without = catalog.exercises
    .filter((exercise) => exercise.scale === null)
    .map((exercise) => exercise.key);
  expect([...NO_LEADERBOARD]).toEqual(without);
  expect(hasLeaderboard("bench_press")).toBe(true);
  expect(hasLeaderboard("assisted_pull_up")).toBe(false);
  expect(hasLeaderboard(undefined)).toBe(false);
  expect(monthLabel("2026-11")).toBe("Nov 2026");
});

test("the profile's box opens the leaderboard of its highest exercise", async () => {
  fetchSpy.mockImplementation(
    answers({ status: 200, body: leaderboard }) as unknown as typeof fetch,
  );
  await shown(<GymLevels levels={levels.gym_levels} />);
  await fireEvent.press(screen.getByTestId("gym-leaderboard-open"));
  await act(async () => {});
  expect(asked()).toEqual([
    `http://api/gym/leaderboard?exercise=${levels.gym_levels[0].exercise}`,
  ]);
  expect(screen.getByText("Gym leaderboard · Nov 2026")).toBeOnTheScreen();
  expect(screen.getByText("Only sets logged live count.")).toBeOnTheScreen();
  expect(screen.getAllByTestId("leaderboard-row")).toHaveLength(1);
  // Who asks is second: its own row, with no «…».
  expect(screen.getByTestId("leaderboard-mine")).toHaveTextContent("2Runner_4280 kg");
  expect(screen.getAllByTestId("report-menu")).toHaveLength(1);
});

test("a row opens its post, the page closed", async () => {
  fetchSpy.mockImplementation(
    answers({ status: 200, body: leaderboard }) as unknown as typeof fetch,
  );
  await shown(<GymLevels levels={levels.gym_levels} />);
  await fireEvent.press(screen.getByTestId("gym-leaderboard-open"));
  await act(async () => {});
  await fireEvent.press(screen.getAllByTestId("leaderboard-row")[0]);
  expect(open).toHaveBeenCalledWith({ id: leaderboard.rows[0].drawing_id });
  expect(screen.queryByTestId("gym-leaderboard")).toBeNull();
});

test("«‹» asks for the month before, «›» comes back to this one", async () => {
  fetchSpy.mockImplementation(((url: string) =>
    answers({
      status: 200,
      body: url.includes("month=2026-10")
        ? { ...leaderboard, month: "2026-10", rows: [], mine: null }
        : leaderboard,
    })(url)) as unknown as typeof fetch);
  await shown(<GymLevels levels={levels.gym_levels} />);
  await fireEvent.press(screen.getByTestId("gym-leaderboard-open"));
  await act(async () => {});
  // This month is the last: «›» is not there for a screen reader either.
  expect(
    screen.getByTestId("leaderboard-after", { includeHiddenElements: true }),
  ).toBeDisabled();
  await fireEvent.press(screen.getByTestId("leaderboard-before"));
  await act(async () => {});
  expect(asked()[1]).toContain("month=2026-10");
  expect(screen.getByText("Gym leaderboard · Oct 2026")).toBeOnTheScreen();
  expect(screen.queryByTestId("leaderboard-row")).toBeNull();
  await fireEvent.press(screen.getByTestId("leaderboard-after"));
  await act(async () => {});
  expect(asked()[2]).not.toContain("month=");
});

test("an exercise of the post opens its own leaderboard; a named one does not", async () => {
  fetchSpy.mockImplementation(((url: string) =>
    answers({
      status: 200,
      body: url.includes("/exercises")
        ? {
            rests: 0,
            rest_s: 0,
            sets: [
              {
                exercise: "back_squat",
                kind: "load",
                reps: 5,
                load_kg: 100,
                at_s: 60,
                live: true,
              },
              {
                name: "Sled push",
                kind: "cardio",
                duration_s: 60,
                at_s: 120,
                live: true,
              },
            ],
          }
        : { ...leaderboard, exercise: "back_squat" },
    })(url)) as unknown as typeof fetch);
  await shown(<GymDetail drawingId="d1" />);
  expect(screen.queryByTestId("gym-exercise-undefined")).toBeNull();
  await fireEvent.press(screen.getByTestId("gym-exercise-back_squat"));
  await act(async () => {});
  expect(asked()).toContain("http://api/gym/leaderboard?exercise=back_squat");
  expect(screen.getByTestId("gym-leaderboard")).toBeOnTheScreen();
  await fireEvent.press(screen.getByTestId("leaderboard-close"));
  expect(screen.queryByTestId("gym-leaderboard")).toBeNull();
});
