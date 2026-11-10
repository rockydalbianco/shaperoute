import type { LatLon, RouteResult } from "@shaperoute/shared-types";

import { choicesOf, MAX_CHOICES, withFirst } from "./choices";

// The whole answer when its first route is already on screen (TASK-435,
// ADR-0361): «the first stays A».

/** A route of its own: `turn` makes its points another route's. */
function route(
  similarity: number,
  turn: number,
  more: Partial<RouteResult> = {},
): RouteResult {
  const points: LatLon[] = [
    [46.0671, 11.1214],
    [46.068 + turn / 1000, 11.122],
    [46.0671, 11.1214],
  ];
  return {
    points,
    distance_m: 5000 + turn,
    similarity,
    shape: "heart",
    warnings: [],
    directions: [],
    word: null,
    alternatives: [],
    ...more,
  };
}

/** The same route as the API sends it again: other arrays, the same numbers. */
function again(result: RouteResult): RouteResult {
  return JSON.parse(JSON.stringify(result)) as RouteResult;
}

test("the engine chose the first route: it stays, with the alternatives", () => {
  const first = route(0.9, 0);
  const b = route(0.88, 1);
  const c = route(0.85, 2);
  const whole = { ...again(first), alternatives: [b, c] };

  const shown = withFirst(first, whole);
  expect(choicesOf(shown).map((r) => r.similarity)).toEqual([0.9, 0.88, 0.85]);
  // The route on screen is the same one: its points are not other arrays.
  expect(shown.points).toBe(first.points);
});

test("a nearby start drew better: the first stays A, the better one is B", () => {
  const first = route(0.88, 0);
  const better = route(0.92, 1, { better_distance_m: 6000 });
  const c = route(0.86, 2);
  const whole = { ...better, alternatives: [again(first), c] };

  const shown = withFirst(first, whole);
  expect(choicesOf(shown).map((r) => r.similarity)).toEqual([0.88, 0.92, 0.86]);
  expect(shown.points).toBe(first.points);
  // Alternatives as the engine's are: none of their own, no better distance.
  expect(shown.alternatives?.[0].alternatives).toEqual([]);
  expect(shown.alternatives?.[0].better_distance_m).toBeNull();
});

test("the first route keeps what it said: its own better distance", () => {
  const first = route(0.88, 0, { better_distance_m: 7000 });
  const whole = { ...route(0.92, 1), alternatives: [again(first)] };
  expect(withFirst(first, whole).better_distance_m).toBe(7000);
});

test("the engine left the first route out: three in all, the last one goes", () => {
  const first = route(0.8, 0);
  const whole = { ...route(0.95, 1), alternatives: [route(0.93, 2), route(0.91, 3)] };

  const shown = withFirst(first, whole);
  expect(choicesOf(shown)).toHaveLength(MAX_CHOICES);
  expect(choicesOf(shown).map((r) => r.similarity)).toEqual([0.8, 0.95, 0.93]);
});

test("an answer with the first route alone leaves it alone", () => {
  const first = route(0.9, 0);
  expect(choicesOf(withFirst(first, again(first)))).toHaveLength(1);
});

test("an answer of an API without alternatives adds its route", () => {
  const first = route(0.88, 0);
  const whole = route(0.92, 1);
  delete whole.alternatives;
  expect(choicesOf(withFirst(first, whole)).map((r) => r.similarity)).toEqual([
    0.88, 0.92,
  ]);
});
