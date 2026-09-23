/**
 * Central contract: RouteRequest in, RouteResult out (docs/ARCHITECTURE.md §3).
 *
 * Mirrors services/route-engine/route_engine/models.py by hand, with the
 * same field names, so the API can pass them through unchanged. The
 * fixtures in ../fixtures keep the two sides in step: see the tests here
 * and services/route-engine/tests/test_contract.py.
 */

/** A point as [latitude, longitude], WGS84, in that order. */
export type LatLon = [lat: number, lon: number];

export const SHAPES = ["circle", "heart"] as const;
export type Shape = (typeof SHAPES)[number];

export const ACTIVITIES = ["running"] as const;
export type Activity = (typeof ACTIVITIES)[number];

/** Plausible target distances for running, in metres. */
export const MIN_DISTANCE_M = 1_000;
export const MAX_DISTANCE_M = 50_000;

export interface RouteRequest {
  start: LatLon;
  shape: Shape;
  /** Target distance in metres, a whole number. */
  distance_m: number;
  activity: Activity;
}

export interface RouteResult {
  /** The route, closed: the last point is the first. */
  points: LatLon[];
  /** Distance actually covered, in metres. */
  distance_m: number;
  /** How much the route looks like the shape, from 0 to 1. */
  similarity: number;
  shape: Shape;
  warnings: string[];
}
