/**
 * The tile of a workout at the gym in the Feed (TASK-385 part D, the
 * user's «Prima foto, se no riquadro»): 🏋️, its time and its main
 * exercises, asked once of the API; none when its owner hides them.
 */
import type { FeedPost as ApiFeedPost, Session } from "@shaperoute/shared-types";
import session from "@shaperoute/shared-types/fixtures/session.json";
import { act, render, screen } from "@testing-library/react-native";

import { answers as answering, apiError } from "../account/testing";
import { FeedPost } from "../feed/FeedPost";
import { shownPost } from "../feed/feedPosts";
import { FollowsContext, type FollowsDoor } from "../social/followsDoor";
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

function post(id = "g1"): ApiFeedPost {
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

const set = (exercise: string, at_s: number) => ({
  exercise,
  kind: "load",
  reps: 5,
  load_kg: 60,
  at_s,
  live: true,
});

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

async function show(shown: ApiFeedPost) {
  await render(
    <FollowsContext.Provider value={follows()}>
      <FeedPost post={shownPost(shown)} width={320} onOpen={jest.fn()} />
    </FollowsContext.Provider>,
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

test("the tile names the main exercises of the workout", async () => {
  fetchSpy.mockImplementation(
    answers({
      status: 200,
      body: {
        rests: 0,
        rest_s: 0,
        sets: [set("bench_press", 0), set("deadlift", 60), set("deadlift", 120)],
      },
    }),
  );
  await show(post());
  expect(
    screen.getByTestId("gym-tile-exercises", { includeHiddenElements: true }),
  ).toHaveTextContent("Deadlift\nBench press");
  expect(String(fetchSpy.mock.calls[0][0])).toBe("http://api/drawings/g1/exercises");
});

test("hidden by its owner, the tile has its time alone", async () => {
  fetchSpy.mockImplementation(answers({ status: 404, body: apiError("not_found") }));
  await show(post("g2"));
  expect(screen.getByText("1 h 00 min", { includeHiddenElements: true })).toBeTruthy();
  expect(
    screen.queryByTestId("gym-tile-exercises", { includeHiddenElements: true }),
  ).toBeNull();
});

test("a run's card asks for no exercises", async () => {
  await show({ ...post("r1"), activity: "running", distance_m: 5_000 });
  expect(fetchSpy).not.toHaveBeenCalled();
});
