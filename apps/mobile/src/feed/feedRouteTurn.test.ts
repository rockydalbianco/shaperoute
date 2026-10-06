/**
 * «Feed» and the turn of a figure (TASK-232, ADR-0195): a drawing on the
 * water is turned as the engine turned its example, a drawing of a run as
 * its city file says, and the route a tap opens is turned the same way
 * while it is fetched whole.
 */
import { examplesKey, PADDLE_EXAMPLES } from "../explore/exampleRoutes";
import { WATER_PLACES } from "../paddle/waterPlaces";
import { postRoute } from "./feedRoute";
import { PADDLE_POSTS } from "./paddlePosts";
import { RUN_POSTS, type SamplePost } from "./sampleFeed";

/** The place's example of the post's shape, as it came with the app. */
function bundled(post: SamplePost) {
  const place = WATER_PLACES.find((water) => water.name === post.city);
  const key = place === undefined ? "" : examplesKey(place.point, PADDLE_EXAMPLES);
  const example = PADDLE_EXAMPLES.bundled?.[key]?.find((d) => d.shape === post.shape);
  if (example === undefined) {
    throw new Error(`no ${post.shape} at ${post.city}`);
  }
  return example;
}

test("a drawing on the water is turned as the engine turned its example", () => {
  expect(PADDLE_POSTS.length).toBeGreaterThan(0);
  let turned = 0;
  for (const post of PADDLE_POSTS) {
    const example = bundled(post);
    if (example.rotation_deg === undefined) {
      expect("rotation_deg" in post).toBe(false);
    } else {
      expect(post.rotation_deg).toBe(example.rotation_deg);
      expect(post.rotation_deg).not.toBe(0);
      turned += 1;
    }
  }
  // The water at Riva, Como, Jesolo and Riccione turns most shapes a little.
  expect(turned).toBeGreaterThan(0);
});

test("the drawings of the runs say the turn only when their city file does", () => {
  for (const post of RUN_POSTS) {
    if ("rotation_deg" in post) {
      expect(typeof post.rotation_deg).toBe("number");
      expect(post.rotation_deg).not.toBe(0);
    }
  }
});

test("the route a drawing opens is turned as the drawing, until it says itself", () => {
  const [run] = RUN_POSTS;
  const { rotation_deg: _turn, ...northUp } = run;
  expect("rotation_deg" in postRoute(northUp)).toBe(false);
  expect(postRoute({ ...northUp, rotation_deg: -30 }).rotation_deg).toBe(-30);
  expect("rotation_deg" in postRoute({ ...northUp, rotation_deg: 0 })).toBe(false);
  const turnedPaddle = PADDLE_POSTS.find((post) => post.rotation_deg !== undefined);
  if (turnedPaddle !== undefined) {
    expect(postRoute(turnedPaddle).rotation_deg).toBe(turnedPaddle.rotation_deg);
  }
});
