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

/** The shape catalogue (ADR-0036): the same names as the route engine. */
export const SHAPES = [
  "circle",
  "heart",
  "star",
  "horse",
  "moon",
  "cat",
  "fish",
] as const;
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

/** Codes of the errors the API answers with (docs/API.md). */
export const API_ERROR_CODES = [
  "invalid_request",
  "shape_not_drawable",
  "map_data_unavailable",
  "engine_error",
  "http_error",
  "ai_unavailable",
] as const;
export type ApiErrorCode = (typeof API_ERROR_CODES)[number];

/** The body of every error answer of the API. */
export interface ApiError {
  error: {
    code: ApiErrorCode;
    /** In English, for people: the engine's own words when it has them. */
    message: string;
  };
}

/** Where a route request stands, from queued to done or failed. */
export const JOB_STATUSES = [
  "queued",
  "downloading_map",
  "computing",
  "done",
  "failed",
] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

/**
 * A route request the API is working on (ADR-0032): the answer to
 * POST /route-jobs and to every GET /route-jobs/{job_id}.
 */
export interface RouteJob {
  job_id: string;
  status: JobStatus;
  /** Only when `status` is "done". */
  result: RouteResult | null;
  /** Only when `status` is "failed". */
  error: ApiError["error"] | null;
}

/** What the app sends to POST /gpx to get the route as a GPX file (ADR-0033). */
export interface GpxRequest {
  request: RouteRequest;
  result: RouteResult;
}

/** The longest text of the shape field the AI reads: a word or a few. */
export const MAX_SHAPE_TEXT_LENGTH = 60;

/**
 * What the app sends to POST /shape-readings (ADR-0012): the words of the
 * shape field that the app's own table does not know.
 */
export interface ShapeReadingRequest {
  text: string;
}

/** The AI's reading of the words: a shape of the catalogue, or none. */
export interface ShapeReading {
  /** The words as read: single spaces, none at the ends. */
  text: string;
  /** Null when no shape of the catalogue fits the words. */
  shape: Shape | null;
}
