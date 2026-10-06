/**
 * A favorite keeps how far its shape is turned (TASK-232, ADR-0195): a
 * turned route is kept with its turn, listed with it at once, and opens
 * with the map turned as it was kept. A route north up is kept as before.
 */
import type { LatLon, RouteResult } from "@shaperoute/shared-types";
import turnedFavorite from "@shaperoute/shared-types/fixtures/favorite-turned.json";
import tilted from "@shaperoute/shared-types/fixtures/route-result-tilted.json";
import result from "@shaperoute/shared-types/fixtures/route-result.json";

import type { FavoriteDetail } from "../api/favorites";
import type {
  RecommendedRoute,
  RecommendedRouteDetail,
} from "../explore/recommendedRoutes";
import {
  drawnKeepable,
  exploredKeepable,
  keptNow,
  openedFavorite,
} from "./favoriteRoute";

const START: LatLon = [46.067, 11.1215];
const ASKED = {
  start: START,
  shape: "heart",
  distance_m: 5000,
  activity: "running",
} as const;

test("a shape the engine turned is kept with its turn", () => {
  const drawn = tilted as unknown as RouteResult;
  expect(drawn.rotation_deg).not.toBe(0);
  const kept = drawnKeepable(ASKED, drawn, null);
  expect(kept.request.rotation_deg).toBe(drawn.rotation_deg);
  // Listed at once with it, before the API answers.
  expect(keptNow(kept, new Date("2026-10-06T08:00:00Z")).rotation_deg).toBe(
    drawn.rotation_deg,
  );
});

test("a shape north up, or one that does not say, is kept as before", () => {
  const drawn = result as unknown as RouteResult;
  for (const route of [drawn, { ...drawn, rotation_deg: 0 }]) {
    const kept = drawnKeepable(ASKED, route, null);
    expect("rotation_deg" in kept.request).toBe(false);
    expect("rotation_deg" in keptNow(kept, new Date())).toBe(false);
  }
});

test("an example of «Explore» keeps the turn its route says", () => {
  const detail: RecommendedRouteDetail = {
    id: "example:heart:x",
    city: "Levico Terme",
    shape: "heart",
    word: null,
    style: null,
    distance_m: 5000,
    route_m: 5100,
    similarity: 0.97,
    points: (result as unknown as RouteResult).points,
    license: "",
    rotation_deg: 30,
  };
  const route: RecommendedRoute = {
    ...detail,
    start: detail.points[0],
    away_m: 0,
    preview: detail.points,
  };
  expect(exploredKeepable(route, detail).request.rotation_deg).toBe(30);
  const { rotation_deg: _turn, ...upright } = detail;
  expect("rotation_deg" in exploredKeepable(route, upright).request).toBe(false);
});

test("a turned favorite opens turned: its card, its route and the map", () => {
  const opened = openedFavorite(turnedFavorite as unknown as FavoriteDetail);
  expect(opened.route.rotation_deg).toBe(-30);
  expect(opened.detail.rotation_deg).toBe(-30);
  expect(opened.result.rotation_deg).toBe(-30);
  // Kept again, it keeps its turn.
  expect(opened.keepable.request.rotation_deg).toBe(-30);
});

test("a favorite kept before, or north up, opens north up", () => {
  const { rotation_deg: _turn, ...before } = turnedFavorite;
  for (const favorite of [before, { ...before, rotation_deg: null }]) {
    const opened = openedFavorite(favorite as unknown as FavoriteDetail);
    expect("rotation_deg" in opened.route).toBe(false);
    expect("rotation_deg" in opened.detail).toBe(false);
    expect(opened.result.rotation_deg).toBeUndefined();
    expect("rotation_deg" in opened.keepable.request).toBe(false);
  }
});
