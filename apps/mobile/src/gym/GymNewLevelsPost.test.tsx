/**
 * The levels a workout at the gym reached first, on its post (TASK-385
 * part E): under its tile in the Feed and over its exercises in the card,
 * from the same answer of the API; none when its owner hides them.
 */
import type { FeedPost as ApiFeedPost, Session } from "@shaperoute/shared-types";
import session from "@shaperoute/shared-types/fixtures/session.json";
import { act, render, screen } from "@testing-library/react-native";

import { answers as answering, apiError } from "../account/testing";
import { FeedPost } from "../feed/FeedPost";
import { shownPost } from "../feed/feedPosts";
import { FollowsContext, type FollowsDoor } from "../social/followsDoor";
import { GymDetail } from "./GymDetail";
import { forgetGymExercises } from "./useGymExercises";

jest.mock(
  "react-native-safe-area-context",
  () => jest.requireActual("react-native-safe-area-context/jest/mock").default,
);
jest.mock("expo-file-system");

const fetchSpy = jest.spyOn(globalThis, "fetch");
/** The fake answers, as the global fetch takes them. */
const answers = (...list: Parameters<typeof answering>) =>
  answering(...list) as unknown as typeof fetch;

const EXERCISES = {
  rests: 0,
  rest_s: 0,
  sets: [
    {
      exercise: "bench_press",
      kind: "load",
      reps: 1,
      load_kg: 100,
      at_s: 0,
      live: true,
    },
  ],
  new_levels: [{ exercise: "bench_press", level: 5, value: 100, measure: "load_kg" }],
};
const LINE = "New level: 🐻 Bear · Bench press 100 kg";

function post(id: string): ApiFeedPost {
  return {
    id,
    title: "Push day",
    started_at: "2026-11-05T17:00:00Z",
    published_at: "2026-11-05T18:10:00Z",
    place: null,
    shape: null,
    word: null,
    style: null,
    route_title: null,
    distance_m: 0,
    duration_s: 3_600,
    score: null,
    fidelity: null,
    activity: "gym",
    track_preview: [],
    author: { public_id: "ada", username: "ada_lifts" },
  } as ApiFeedPost;
}

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

async function show(element: React.ReactElement) {
  await render(
    <FollowsContext.Provider value={follows()}>{element}</FollowsContext.Provider>,
  );
  await act(async () => {});
}

beforeEach(() => {
  forgetGymExercises();
  fetchSpy.mockReset();
});

afterAll(() => {
  fetchSpy.mockRestore();
});

test("the Feed names the new level under the tile", async () => {
  fetchSpy.mockImplementation(answers({ status: 200, body: EXERCISES }));
  await show(<FeedPost post={shownPost(post("g1"))} width={320} onOpen={jest.fn()} />);
  expect(screen.getByText(LINE, { includeHiddenElements: true })).toBeTruthy();
});

test("the card names it over the exercises", async () => {
  fetchSpy.mockImplementation(answers({ status: 200, body: EXERCISES }));
  await show(<GymDetail drawingId="g2" />);
  expect(screen.getByText(LINE)).toBeOnTheScreen();
  expect(screen.getByTestId("gym-exercises")).toBeOnTheScreen();
});

test("hidden by its owner, no level shows", async () => {
  fetchSpy.mockImplementation(answers({ status: 404, body: apiError("not_found") }));
  await show(<FeedPost post={shownPost(post("g3"))} width={320} onOpen={jest.fn()} />);
  expect(
    screen.queryByTestId("gym-new-levels", { includeHiddenElements: true }),
  ).toBeNull();
});

test("an API older than part E gives the tile without a level", async () => {
  const { new_levels: _, ...older } = EXERCISES;
  fetchSpy.mockImplementation(answers({ status: 200, body: older }));
  await show(<GymDetail drawingId="g4" />);
  expect(screen.getByTestId("gym-exercises")).toBeOnTheScreen();
  expect(screen.queryByTestId("gym-new-levels")).toBeNull();
});
