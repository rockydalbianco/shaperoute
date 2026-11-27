/**
 * The stretching at the end of a workout on its post (TASK-466 part C2):
 * «Stretching · 5 min» over the exercises when the API gives it with them;
 * nothing when it leaves it out, as for a workout without it or an API
 * before part C.
 */
import type { Session } from "@shaperoute/shared-types";
import session from "@shaperoute/shared-types/fixtures/session.json";
import { act, render, screen } from "@testing-library/react-native";

import { answers as answering } from "../account/testing";
import { isGymExercises, isGymSession } from "../api/gym";
import { FollowsContext, type FollowsDoor } from "../social/followsDoor";
import { GymDetail } from "./GymDetail";
import { forgetGymExercises } from "./useGymExercises";

jest.mock(
  "react-native-safe-area-context",
  () => jest.requireActual("react-native-safe-area-context/jest/mock").default,
);
jest.mock("expo-file-system");

const answers = (...list: Parameters<typeof answering>) =>
  answering(...list) as unknown as typeof fetch;

const EXERCISES = {
  rests: 0,
  rest_s: 0,
  sets: [
    {
      exercise: "bench_press",
      kind: "load",
      reps: 10,
      load_kg: 60,
      at_s: 0,
      live: true,
    },
  ],
};
const STRETCH = { routine: "afterGym", minutes: 5, duration_s: 312, exercises: 6 };

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

async function show(drawingId: string, fetchFn: typeof fetch) {
  await render(
    <FollowsContext.Provider value={follows()}>
      <GymDetail drawingId={drawingId} fetchFn={fetchFn} />
    </FollowsContext.Provider>,
  );
  await act(async () => {});
}

beforeEach(() => {
  forgetGymExercises();
});

test("given with the exercises: «Stretching · 5 min» over them", async () => {
  await show("s1", answers({ status: 200, body: { ...EXERCISES, stretch: STRETCH } }));
  expect(screen.getByTestId("gym-detail-stretch")).toHaveTextContent(
    "Stretching · 5 min",
  );
  expect(screen.getByTestId("gym-exercises")).toBeOnTheScreen();
});

test("left out: the exercises alone, as before", async () => {
  await show("s2", answers({ status: 200, body: EXERCISES }));
  expect(screen.getByTestId("gym-exercises")).toBeOnTheScreen();
  expect(screen.queryByTestId("gym-detail-stretch")).toBeNull();
});

test("a stretch the API cannot send is not its answer", () => {
  expect(isGymExercises({ ...EXERCISES, stretch: STRETCH })).toBe(true);
  expect(isGymExercises({ ...EXERCISES, stretch: { ...STRETCH, minutes: "5" } })).toBe(
    false,
  );
  const workout = {
    id: "k",
    started_at: "2026-11-27T17:00:00Z",
    duration_s: 1200,
    rests: 0,
    rest_s: 0,
    show_exercises: true,
    sets: [],
  };
  expect(isGymSession(workout)).toBe(true);
  expect(isGymSession({ ...workout, stretch: STRETCH })).toBe(true);
  expect(isGymSession({ ...workout, stretch: { ...STRETCH, duration_s: 0 } })).toBe(
    false,
  );
});
