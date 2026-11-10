/// <reference types="node" />

import { readdirSync, readFileSync } from "fs";
import { join } from "path";

import type { LatLon } from "@shaperoute/shared-types";

import { metresBetween } from "../map/coordinates";
import { drawingOf } from "../mapdraw/edit";
import { distanceOf } from "../mapdraw/figure";
import { routeTrack } from "./figureLines";

/**
 * «Edit the drawing» on every route of the catalog of «Explore» (TASK-432):
 * the card shows the button only when the line of the route makes a
 * drawing (`cardTrack` in App.tsx). Before, 334 of the 575 routes of the
 * catalog crossed themselves and made none: no button. Now such a route is
 * the loop of TASK-428 hung on a ring at its start, or the closed outline
 * `firstLineOf` finds of all its points.
 */

type RouteFile = {
  shape?: string;
  word?: string;
  distance_m?: number;
  points: LatLon[];
};

/** Every route of the catalog (`catalog/`): the seed of each city and
 * MuW's own drawings, by their points. */
function catalogRoutes(): [string, LatLon[]][] {
  const catalog = join(__dirname, "..", "..", "..", "..", "catalog");
  const read = (path: string) => JSON.parse(readFileSync(path, "utf8"));
  const seed = readdirSync(join(catalog, "seed")).flatMap((file) =>
    (read(join(catalog, "seed", file)).routes as RouteFile[]).map(
      (route): [string, LatLon[]] => [
        `${file} ${route.shape ?? route.word} ${route.distance_m}`,
        route.points,
      ],
    ),
  );
  const muw = readdirSync(join(catalog, "muw_routes")).map(
    (file): [string, LatLon[]] => [
      file,
      (read(join(catalog, "muw_routes", file)) as RouteFile).points,
    ],
  );
  return [...seed, ...muw];
}

/** The length of a route, in metres. */
function lengthOf(points: LatLon[]): number {
  return points
    .slice(1)
    .reduce((total, p, i) => total + metresBetween(points[i], p), 0);
}

test("every route of the catalog of «Explore» has a drawing to edit, run once", () => {
  const routes = catalogRoutes();
  expect(routes.length).toBeGreaterThan(500);
  for (const [name, points] of routes) {
    const track = routeTrack(points);
    const drawing = track === null ? null : drawingOf(track.lines);
    if (track === null || drawing === null) {
      throw new Error(`${name} makes no drawing: no «Edit the drawing»`);
    }
    // Never out and back: at most the route itself (simplified, a little
    // less).
    const asked = distanceOf({
      figure: drawing,
      centre: track.centre,
      unitM: track.unitM,
    });
    const ratio = asked / lengthOf(points);
    if (ratio > 1.02) {
      throw new Error(`${name} asks ${ratio.toFixed(2)} times the route`);
    }
  }
}, 60_000);
