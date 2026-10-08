import type { RouteResult } from "@shaperoute/shared-types";

import {
  asRecommended,
  EXAMPLE_SHAPES,
  examplesKey,
  PADDLE_EXAMPLES,
} from "../explore/exampleRoutes";
import { metresBetween } from "../map/coordinates";
import { apartOnWater } from "../route/penUpShapes";
import { walksOf } from "../route/walks";
import { asPlace, WATER_PLACES } from "./waterPlaces";

/**
 * The examples the app comes with (TASK-227): written by `python -m
 * shaperoute_api.paddle_examples` with the engine on the server's water, they
 * must be what the app would have drawn itself, place by place.
 */
const bundled = PADDLE_EXAMPLES.bundled ?? {};
const shapes = [...EXAMPLE_SHAPES, ...PADDLE_EXAMPLES.more];

test("every place of «Explore» has its eight shapes, and nothing else is there", () => {
  const keys = WATER_PLACES.map((place) => examplesKey(place.point, PADDLE_EXAMPLES));
  expect(Object.keys(bundled).sort()).toEqual([...keys].sort());
  for (const key of keys) {
    expect(bundled[key].map((d) => d.shape)).toEqual(shapes);
  }
  expect(shapes).toEqual([
    "heart",
    "circle",
    "star",
    "moon",
    "horse",
    "snail",
    "dog_head",
    "rabbit_head",
  ]);
});

test.each(WATER_PLACES.map((place) => [place.name, place] as const))(
  "%s: each is the app's own example of its route",
  (_, place) => {
    for (const detail of bundled[examplesKey(place.point, PADDLE_EXAMPLES)]) {
      const shape = detail.shape as (typeof shapes)[number];
      const drawn = {
        points: detail.points,
        distance_m: detail.route_m,
        similarity: detail.similarity,
        alternatives: [],
        ...(detail.walks !== undefined ? { walks: detail.walks } : {}),
        centre: detail.centre,
        // How far the engine turned the shape (TASK-232), when it did.
        ...(detail.rotation_deg !== undefined
          ? { rotation_deg: detail.rotation_deg }
          : {}),
      } as unknown as RouteResult;
      expect(
        asRecommended(asPlace(place), shape, drawn, PADDLE_EXAMPLES).detail,
      ).toEqual(detail);
    }
  },
);

test.each(WATER_PLACES.map((place) => [place.name, place] as const))(
  "%s: closed routes of about 2 km, from the shore near the place",
  (_, place) => {
    for (const detail of bundled[examplesKey(place.point, PADDLE_EXAMPLES)]) {
      const { points } = detail;
      expect(points[0]).toEqual(points[points.length - 1]);
      expect(Math.abs(detail.route_m - 2000)).toBeLessThanOrEqual(200);
      // The engine starts within 2 km of the point asked (water_fit).
      expect(metresBetween(place.point, points[0])).toBeLessThan(2000);
      expect(detail.similarity).toBe(1);
    }
  },
);

test.each(WATER_PLACES.map((place) => [place.name, place] as const))(
  "%s: the shapes in pieces are drawn piece by piece, the others in one line",
  (_, place) => {
    for (const detail of bundled[examplesKey(place.point, PADDLE_EXAMPLES)]) {
      const shape = detail.shape as (typeof shapes)[number];
      // As «Draw» asks for the shape on the water (TASK-226): the heads
      // have their eyes apart, and the stretches with the pen up say so.
      expect(detail.walks !== undefined).toBe(apartOnWater(shape));
      if (detail.walks === undefined) {
        continue;
      }
      // To each eye and back to the outline, each a straight stretch.
      expect(detail.walks).toHaveLength(3);
      expect(walksOf(detail.points, detail.walks)).toEqual(detail.walks);
      expect(detail.walks.every(([from, to]) => to === from + 1)).toBe(true);
      const up = detail.walks.reduce(
        (sum, [from, to]) =>
          sum + metresBetween(detail.points[from], detail.points[to]),
        0,
      );
      expect(up).toBeLessThan(0.07 * detail.route_m);
    }
  },
);

test.each(WATER_PLACES.map((place) => [place.name, place] as const))(
  "%s: each says where its shape is, to be moved from there",
  (_, place) => {
    for (const detail of bundled[examplesKey(place.point, PADDLE_EXAMPLES)]) {
      // The centre of the shape as the engine placed it (TASK-244): on the
      // water, inside the line that draws it.
      const [lat, lon] = detail.centre ?? [NaN, NaN];
      const lats = detail.points.map((point) => point[0]);
      const lons = detail.points.map((point) => point[1]);
      expect(lat).toBeGreaterThan(Math.min(...lats));
      expect(lat).toBeLessThan(Math.max(...lats));
      expect(lon).toBeGreaterThan(Math.min(...lons));
      expect(lon).toBeLessThan(Math.max(...lons));
    }
  },
);
