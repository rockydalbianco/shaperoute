/**
 * The gym guide with `todayOnly` (TASK-490 part E, ADR-0398): «Today» of
 * the training mode shows the card of today and nothing else, because
 * «Workouts» has the month, the plans and the help. Without it the guide
 * of «Draw» is as it always was.
 */
import calendar from "@shaperoute/shared-types/fixtures/gym-calendar.json";
import session from "@shaperoute/shared-types/fixtures/session.json";
import type { Session } from "@shaperoute/shared-types";
import { act, render, screen } from "@testing-library/react-native";

import { ActivitiesContext, type ActivitiesDoor } from "../activities/activitiesDoor";
import { answers } from "../account/testing";
import { FollowsContext, type FollowsDoor } from "../social/followsDoor";
import { GymDrawGuide } from "./GymDrawGuide";

jest.mock(
  "react-native-safe-area-context",
  () => jest.requireActual("react-native-safe-area-context/jest/mock").default,
);

const FOLLOWS = {
  apiUrl: "http://api",
  account: {
    state: { status: "signedIn", session: session as Session },
    sessionEnded: () => {},
  },
  openProfile: () => {},
} as unknown as FollowsDoor;

/** The guide, signed in, before the first workout (the steps would show). */
async function shown(todayOnly?: boolean) {
  const fetchFn = jest.fn(
    answers({
      status: 200,
      body: { ...calendar, days: [], count: 0, duration_s: 0, last: null },
    }),
  );
  await render(
    <FollowsContext.Provider value={FOLLOWS}>
      <ActivitiesContext.Provider value={{ total: 0 } as unknown as ActivitiesDoor}>
        <GymDrawGuide
          onStart={jest.fn()}
          todayOnly={todayOnly}
          fetchFn={fetchFn as unknown as typeof fetch}
        />
      </ActivitiesContext.Provider>
    </FollowsContext.Provider>,
  );
  await act(async () => {});
}

test("in «Draw», as always: the start, the month, the help and the steps", async () => {
  await shown();
  expect(screen.getByTestId("run-no-route")).toBeOnTheScreen();
  expect(screen.getByTestId("gym-guide-month")).toBeOnTheScreen();
  expect(screen.getByTestId("gym-guide-intro")).toBeOnTheScreen();
  expect(screen.getByTestId("gym-guide-steps")).toBeOnTheScreen();
});

test("with `todayOnly`, only the card of today: no month, no plans, no help", async () => {
  await shown(true);
  expect(screen.getByTestId("run-no-route")).toBeOnTheScreen();
  expect(screen.queryByTestId("gym-guide-month")).toBeNull();
  expect(screen.queryByTestId("gym-guide-plans")).toBeNull();
  expect(screen.queryByTestId("gym-guide-new-plan")).toBeNull();
  expect(screen.queryByTestId("gym-guide-intro")).toBeNull();
  expect(screen.queryByTestId("gym-guide-steps")).toBeNull();
});
