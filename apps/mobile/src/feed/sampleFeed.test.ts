import { SHAPES } from "@shaperoute/shared-types";

import { RUN_POSTS, SAMPLE_FEED } from "./sampleFeed";

// As the app accepts a username (src/account/fields.ts).
const USERNAME = /^[A-Za-z0-9_.]{3,20}$/;

function count(values: string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return counts;
}

test("fifteen drawings of runs, each its own, each by its own runner", () => {
  expect(RUN_POSTS).toHaveLength(15);
  expect(new Set(RUN_POSTS.map((post) => post.id)).size).toBe(15);
  expect(new Set(RUN_POSTS.map((post) => post.user)).size).toBe(15);
  for (const post of RUN_POSTS) {
    expect(post.user).toMatch(USERNAME);
    expect(post.title.length).toBeGreaterThan(0);
    expect(post.title.length).toBeLessThanOrEqual(60);
  }
});

test("seven cities, two drawings or more each, and no figure more than twice", () => {
  const cities = count(RUN_POSTS.map((post) => post.city));
  expect(cities.size).toBe(7);
  expect(Math.min(...cities.values())).toBeGreaterThanOrEqual(2);
  const shapes = count(RUN_POSTS.map((post) => post.shape));
  expect(Math.max(...shapes.values())).toBeLessThanOrEqual(2);
  // The figures are shapes of the catalogue, by the names of the contract.
  for (const shape of shapes.keys()) {
    expect(SHAPES).toContain(shape);
  }
});

test("each drawing of a run has a line to draw, a run's time and a score", () => {
  for (const post of RUN_POSTS) {
    expect(post.activity).toBeUndefined();
    expect(post.line.length).toBeGreaterThanOrEqual(20);
    expect(post.line.length).toBeLessThanOrEqual(120);
    for (const [lat, lon] of post.line) {
      // In Italy, and in the order (lat, lon).
      expect(lat).toBeGreaterThan(36);
      expect(lat).toBeLessThan(47.5);
      expect(lon).toBeGreaterThan(6);
      expect(lon).toBeLessThan(19);
    }
    expect(Number.isInteger(post.score)).toBe(true);
    expect(post.score).toBeGreaterThanOrEqual(60);
    expect(post.score).toBeLessThanOrEqual(99);
    const pace = post.minutes / (post.route_m / 1000);
    expect(pace).toBeGreaterThanOrEqual(5);
    expect(pace).toBeLessThanOrEqual(7);
  }
});

test("«Feed» shows the runs and, among them, the drawings on the water", () => {
  expect(SAMPLE_FEED).toHaveLength(19);
  expect(new Set(SAMPLE_FEED.map((post) => post.id)).size).toBe(19);
  expect(new Set(SAMPLE_FEED.map((post) => post.user)).size).toBe(19);
  // The runs keep their order.
  expect(SAMPLE_FEED.filter((post) => post.activity === undefined)).toEqual(RUN_POSTS);
  // On the water: the third drawing, then one every five.
  expect(
    SAMPLE_FEED.flatMap((post, i) => (post.activity === "paddling" ? [i] : [])),
  ).toEqual([2, 7, 12, 17]);
});
