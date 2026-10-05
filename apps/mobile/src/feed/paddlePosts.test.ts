import { examplesKey, PADDLE_EXAMPLES } from "../explore/exampleRoutes";
import { metresBetween } from "../map/coordinates";
import { WATER_PLACES } from "../paddle/waterPlaces";
import { PADDLE_POSTS, paddleDetail, withPaddle } from "./paddlePosts";
import { RUN_POSTS, type SamplePost } from "./sampleFeed";

// As the app accepts a username (src/account/fields.ts).
const USERNAME = /^[A-Za-z0-9_.]{3,20}$/;

/** The place's example of the post's shape, as it came with the app. */
function bundled(post: SamplePost) {
  const place = WATER_PLACES.find((water) => water.name === post.city);
  if (place === undefined) {
    throw new Error(`no place for ${post.city}`);
  }
  const key = examplesKey(place.point, PADDLE_EXAMPLES);
  const example = PADDLE_EXAMPLES.bundled?.[key]?.find((d) => d.shape === post.shape);
  if (example === undefined) {
    throw new Error(`no ${post.shape} at ${post.city}`);
  }
  return { place, example };
}

test("four drawings on the water, one for each place, each its own shape", () => {
  expect(PADDLE_POSTS.map((post) => [post.user, post.city, post.shape])).toEqual([
    ["greta_kayak", "Lago di Garda", "heart"],
    ["leo.sup", "Lago di Como", "star"],
    ["irene_onwater", "Jesolo", "moon"],
    ["ale.paddle", "Riccione", "dog_head"],
  ]);
  expect(PADDLE_POSTS.map((post) => post.city)).toEqual(
    WATER_PLACES.map((water) => water.name),
  );
  for (const post of PADDLE_POSTS) {
    expect(post.activity).toBe("paddling");
    expect(post.user).toMatch(USERNAME);
    expect(RUN_POSTS.map((run) => run.user)).not.toContain(post.user);
    expect(post.title.length).toBeGreaterThan(0);
    expect(post.title.length).toBeLessThanOrEqual(60);
  }
});

test("each line is the route engine's on the real water: the app's example", () => {
  for (const post of PADDLE_POSTS) {
    const { place, example } = bundled(post);
    expect(post.id).toBe(example.id);
    expect(paddleDetail(post)).toBe(example);
    expect(example.activity).toBe("paddling");
    expect(post.route_m).toBe(Math.round(example.route_m));
    // Every point of the line is a point of the route, in its order.
    let from = 0;
    for (const point of post.line) {
      const at = example.points.indexOf(point, from);
      expect(at).toBeGreaterThanOrEqual(from);
      from = at;
    }
    // From the shore and back to it, near the place's point.
    expect(post.line[0]).toBe(example.points[0]);
    expect(post.line[post.line.length - 1]).toBe(
      example.points[example.points.length - 1],
    );
    expect(metresBetween(place.point, post.line[0])).toBeLessThanOrEqual(2000);
  }
});

test("a shape in pieces keeps its pieces: the pen up between them", () => {
  const [heart, , , dog] = PADDLE_POSTS;
  expect(heart.gaps).toBeUndefined();
  expect(heart.line.length).toBeLessThanOrEqual(120);
  const { example } = bundled(dog);
  // All the points: thinned, a stretch with the pen up would be lost.
  expect(dog.line).toBe(example.points);
  const walked = (example.walks ?? []).flatMap(([from, to]) =>
    Array.from({ length: to - from }, (_, i) => from + 1 + i),
  );
  expect(walked.length).toBeGreaterThan(0);
  expect(dog.gaps).toEqual(walked);
});

test("a time for a canoe and a score, as a run's drawing has", () => {
  for (const post of PADDLE_POSTS) {
    const pace = post.minutes / (post.route_m / 1000);
    expect(pace).toBeGreaterThanOrEqual(10);
    expect(pace).toBeLessThanOrEqual(16);
    expect(Number.isInteger(post.score)).toBe(true);
    expect(post.score).toBeGreaterThanOrEqual(60);
    expect(post.score).toBeLessThanOrEqual(99);
  }
});

test("a run's drawing has no route on the water", () => {
  expect(paddleDetail(RUN_POSTS[0])).toBeUndefined();
  expect(paddleDetail({ ...RUN_POSTS[0], id: PADDLE_POSTS[0].id })).toBeUndefined();
});

describe("withPaddle", () => {
  const run = (id: string): SamplePost => ({ ...RUN_POSTS[0], id });
  const paddle = (id: string): SamplePost => ({ ...PADDLE_POSTS[0], id });
  const ids = (feed: SamplePost[]) => feed.map((post) => post.id).join(" ");

  test("the first after two runs, then one every four", () => {
    const runs = Array.from({ length: 11 }, (_, i) => run(`r${i}`));
    const paddles = [paddle("p0"), paddle("p1"), paddle("p2")];
    expect(ids(withPaddle(runs, paddles))).toBe(
      "r0 r1 p0 r2 r3 r4 r5 p1 r6 r7 r8 r9 p2 r10",
    );
  });

  test("those left when the runs end come last; without any, the runs alone", () => {
    const runs = [run("r0"), run("r1"), run("r2")];
    expect(ids(withPaddle(runs, [paddle("p0"), paddle("p1")]))).toBe("r0 r1 p0 r2 p1");
    expect(ids(withPaddle([], [paddle("p0")]))).toBe("p0");
    expect(withPaddle(runs, [])).toEqual(runs);
  });
});
