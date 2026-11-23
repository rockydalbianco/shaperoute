/**
 * The heart rate on the post of a workout at the gym (TASK-385 part G):
 * its average on the tile in the Feed and over the exercises in the card
 * when its owner shows it, as a swim's (PoolTile, PoolFigures); none when
 * the API leaves it out.
 */
import type { FeedPost as ApiFeedPost, Session } from "@shaperoute/shared-types";
import session from "@shaperoute/shared-types/fixtures/session.json";
import { act, render, screen } from "@testing-library/react-native";

import { answers as answering } from "../account/testing";
import { isGymExercises } from "../api/gym";
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

function post(id: string): ApiFeedPost {
  return {
    id,
    title: "Push day",
    started_at: "2026-11-23T17:00:00Z",
    published_at: "2026-11-23T18:10:00Z",
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

async function show(drawingId: string, element = <GymDetail drawingId={drawingId} />) {
  await render(
    <FollowsContext.Provider value={follows()}>{element}</FollowsContext.Provider>,
  );
  await act(async () => {});
}

const HIDDEN = { includeHiddenElements: true };

beforeEach(() => {
  forgetGymExercises();
  fetchSpy.mockReset();
});

afterAll(() => {
  fetchSpy.mockRestore();
});

test("shown by its owner: the average over the exercises", async () => {
  fetchSpy.mockImplementation(
    answers({
      status: 200,
      body: { ...EXERCISES, heart_avg_bpm: 118, heart_max_bpm: 164 },
    }),
  );
  await show("h1");
  expect(screen.getByTestId("gym-detail-heart")).toHaveTextContent(
    "Avg heart rate: 118 bpm",
  );
  expect(screen.getByTestId("gym-exercises")).toBeOnTheScreen();
});

test("the Feed's tile writes it under the energy; another's energy stays the sets'", async () => {
  fetchSpy.mockImplementation(
    answers({
      status: 200,
      body: { ...EXERCISES, heart_avg_bpm: 118, heart_max_bpm: 164 },
    }),
  );
  await show(
    "h3",
    <FeedPost post={shownPost(post("h3"))} width={320} onOpen={jest.fn()} />,
  );
  expect(screen.getByTestId("gym-tile-heart", HIDDEN)).toHaveTextContent(
    "Avg heart rate 118 bpm",
  );
  // Another's body is none: the hour of weights (gymKcal.test.ts).
  expect(screen.getByTestId("gym-tile-kcal", HIDDEN)).toHaveTextContent("184 kcal");
});

test("left out by the API: the exercises alone", async () => {
  fetchSpy.mockImplementation(answers({ status: 200, body: EXERCISES }));
  await show(
    "h4",
    <FeedPost post={shownPost(post("h4"))} width={320} onOpen={jest.fn()} />,
  );
  expect(screen.queryByTestId("gym-tile-heart", HIDDEN)).toBeNull();
  await screen.unmount();
  forgetGymExercises();

  fetchSpy.mockImplementation(answers({ status: 200, body: EXERCISES }));
  await show("h2");
  expect(screen.getByTestId("gym-exercises")).toBeOnTheScreen();
  expect(screen.queryByTestId("gym-detail-heart")).toBeNull();
});

test("a heart rate the API cannot send is not the exercises' answer", () => {
  expect(isGymExercises({ ...EXERCISES, heart_avg_bpm: 118, heart_max_bpm: 164 })).toBe(
    true,
  );
  expect(isGymExercises({ ...EXERCISES, heart_avg_bpm: "118" })).toBe(false);
  expect(isGymExercises({ ...EXERCISES, heart_avg_bpm: 118.5 })).toBe(false);
  expect(isGymExercises({ ...EXERCISES, heart_max_bpm: 400 })).toBe(false);
});
