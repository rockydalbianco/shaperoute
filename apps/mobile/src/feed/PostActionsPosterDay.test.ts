/**
 * «Poster and video» on one's own post of the Feed (TASK-450): the poster
 * has the post's title and the day of the run, as from «My activities».
 */
import type { FeedPost as ApiFeedPost } from "@shaperoute/shared-types";

import { shownPost } from "./feedPosts";
import { postOfDrawing } from "./PostActions";

jest.mock(
  "react-native-safe-area-context",
  () => jest.requireActual("react-native-safe-area-context/jest/mock").default,
);
jest.mock("expo-file-system");

const DRAWING = {
  id: "d1",
  title: "Morning",
  started_at: "2026-10-30T08:00:00Z",
  published_at: "2026-10-30T10:00:00Z",
  place: "Caldonazzo",
  shape: "moon",
  word: null,
  style: null,
  route_title: null,
  distance_m: 5000,
  duration_s: 1800,
  score: null,
  fidelity: null,
  rotation_deg: 45,
  activity: "running",
  track_preview: [
    [46.0, 11.2],
    [46.01, 11.21],
  ],
  author: { public_id: "ada", username: "ada_runs" },
} as ApiFeedPost;

test("the poster of a post of the Feed has its title and the day it was run", () => {
  const post = postOfDrawing(shownPost(DRAWING));
  expect(post.title).toBe("Morning");
  // The day of the run, not the one it was published on.
  expect(post.startedAt).toBe("2026-10-30T08:00:00Z");
});
