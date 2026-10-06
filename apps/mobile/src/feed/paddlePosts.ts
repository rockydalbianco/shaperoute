import type { Shape } from "@shaperoute/shared-types";

import {
  type ExampleDetail,
  examplesKey,
  PADDLE_EXAMPLES,
  thinned,
} from "../explore/exampleRoutes";
import { turnOf } from "../explore/recommendedRoutes";
import { WATER_PLACES } from "../paddle/waterPlaces";
import { walksOf } from "../route/walks";
import type { SamplePost } from "./sampleFeed";

/** As the drawings of the runs (`LINE_POINTS` in tools/sample_feed.py). */
const LINE_POINTS = 120;

/**
 * Made-up paddlers, one for each place of «Explore» with «Paddle», each with
 * its own shape (TASK-228, the user's choices). The name, the title, the
 * time and the score are invented, as the runners' are; the route is not: it
 * is the place's example of that shape, drawn by the route engine on the
 * real water and already in the app (paddleExamples.json). About 12 to 15
 * minutes a kilometre: a canoe or a board, without hurry.
 */
const PADDLERS: readonly {
  place: string;
  shape: Shape;
  user: string;
  title: string;
  minutes: number;
  score: number;
}[] = [
  {
    place: "Lago di Garda",
    shape: "heart",
    user: "greta_kayak",
    title: "A heart on Lake Garda",
    minutes: 26,
    score: 96,
  },
  {
    place: "Lago di Como",
    shape: "star",
    user: "leo.sup",
    title: "Star off the lakefront",
    minutes: 29,
    score: 91,
  },
  {
    place: "Jesolo",
    shape: "moon",
    user: "irene_onwater",
    title: "Morning moon off Jesolo",
    minutes: 24,
    score: 94,
  },
  {
    place: "Riccione",
    shape: "dog_head",
    user: "ale.paddle",
    title: "Dog paddle off Riccione",
    minutes: 30,
    score: 89,
  },
];

// The routes whole, by the id of their post: to open without asking the API.
const details = new Map<string, ExampleDetail>();

/** The example of `shape` that came with the app for the place `name`. */
function exampleOf(name: string, shape: Shape): ExampleDetail | undefined {
  const place = WATER_PLACES.find((water) => water.name === name);
  if (place === undefined) {
    return undefined;
  }
  const key = examplesKey(place.point, PADDLE_EXAMPLES);
  return PADDLE_EXAMPLES.bundled?.[key]?.find((detail) => detail.shape === shape);
}

/**
 * The line a post draws: a few points of the route, or, for a shape drawn in
 * pieces, all of them with the points the pen comes to without drawing (as
 * the cards of «Explore», TASK-226).
 */
function lineOf(detail: ExampleDetail): Pick<SamplePost, "line" | "gaps"> {
  const walks = walksOf(detail.points, detail.walks);
  if (walks.length === 0) {
    return { line: thinned(detail.points, LINE_POINTS) };
  }
  const gaps = walks.flatMap(([from, to]) =>
    Array.from({ length: to - from }, (_, i) => from + 1 + i),
  );
  return { line: detail.points, gaps };
}

/**
 * The drawings on the water of «Feed», in the order they are shown. A place
 * or a shape no longer among the app's examples has no post: the tests say
 * so, not the page.
 */
export const PADDLE_POSTS: readonly SamplePost[] = PADDLERS.flatMap(
  ({ place, shape, ...made }) => {
    const detail = exampleOf(place, shape);
    if (detail === undefined) {
      return [];
    }
    details.set(detail.id, detail);
    return [
      {
        id: detail.id,
        ...made,
        city: detail.city,
        shape,
        route_m: Math.round(detail.route_m),
        activity: "paddling" as const,
        ...lineOf(detail),
        // Turned as the engine turned it on the water (TASK-232).
        ...turnOf(detail),
      },
    ];
  },
);

/** The route of a post on the water, whole; of a run's post, none. */
export function paddleDetail(post: SamplePost): ExampleDetail | undefined {
  return post.activity === "paddling" ? details.get(post.id) : undefined;
}

/** How many drawings of the runs between two on the water. */
export const RUNS_BETWEEN = 4;
/** How many drawings of the runs before the first one on the water. */
export const RUNS_BEFORE = 2;

/**
 * «Feed» with the drawings on the water among those of the runs, always,
 * whatever the sport (the user's choice): the first after two runs, then
 * one every four. Those left when the runs end come last.
 */
export function withPaddle(
  runs: readonly SamplePost[],
  paddles: readonly SamplePost[] = PADDLE_POSTS,
): SamplePost[] {
  const feed: SamplePost[] = [];
  let next = 0;
  runs.forEach((run, i) => {
    if (i % RUNS_BETWEEN === RUNS_BEFORE && next < paddles.length) {
      feed.push(paddles[next]);
      next += 1;
    }
    feed.push(run);
  });
  return [...feed, ...paddles.slice(next)];
}
