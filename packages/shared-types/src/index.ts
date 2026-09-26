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
  "butterfly",
  "snail",
  "dog_head",
] as const;
export type Shape = (typeof SHAPES)[number];

export const ACTIVITIES = ["running"] as const;
export type Activity = (typeof ACTIVITIES)[number];

/** Plausible target distances for running, in metres. */
export const MIN_DISTANCE_M = 1_000;
export const MAX_DISTANCE_M = 50_000;

/**
 * The letters a word may use (route_engine/letters.json, ADR-0044): A to Z
 * since TASK-059 (ADR-0056). At most MAX_WORD_LETTERS of them, with
 * LETTER_DISTANCE_M of route for each (TASK-056). Upper or lower case alike.
 */
export const LETTERS = [
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
  "H",
  "I",
  "J",
  "K",
  "L",
  "M",
  "N",
  "O",
  "P",
  "Q",
  "R",
  "S",
  "T",
  "U",
  "V",
  "W",
  "X",
  "Y",
  "Z",
] as const;
export const MAX_WORD_LETTERS = 8;
export const LETTER_DISTANCE_M = 3_000;

interface RouteRequestFields {
  start: LatLon;
  /** Target distance in metres, a whole number. */
  distance_m: number;
  activity: Activity;
}

/** A shape of the catalogue, or a word written one letter at a time: one
 * of the two, the other absent or null (TASK-056). */
export type RouteRequest =
  | (RouteRequestFields & { shape: Shape; word?: null })
  | (RouteRequestFields & { shape?: null; word: string });

export interface RouteResult {
  /** The route, closed: the last point is the first. */
  points: LatLon[];
  /** Distance actually covered, in metres. */
  distance_m: number;
  /** How much the route looks like the shape, from 0 to 1. */
  similarity: number;
  /** Null for a word (TASK-056) or an image (TASK-073). */
  shape: Shape | null;
  warnings: string[];
  /** Turn by turn, the start first (TASK-048); empty without a search. */
  directions: Direction[];
  /** The word in capitals, null for a shape or an image (TASK-056). */
  word?: string | null;
}

/** What a direction says to do (route_engine/directions.py, ADR-0045). */
export const TURNS = [
  "depart",
  "left",
  "right",
  "sharp-left",
  "sharp-right",
  "straight",
  "u-turn",
] as const;
export type Turn = (typeof TURNS)[number];

/** Directions closer than this to the one before are read with it. */
export const GROUP_M = 15;

/** What to do at one junction of the route. */
export interface Direction {
  /** OpenStreetMap id of the junction's node. */
  node: number;
  point: LatLon;
  /** Along the route from its start, in metres. */
  distance_m: number;
  /** "depart" for the first: the road the route starts on. */
  turn: Turn;
  /** The turn in degrees, positive to the right. */
  angle_deg: number;
  /** Name or ref of the road entered; null when OSM has neither, never made up. */
  street: string | null;
  /** OSM highway of the road entered, like "footway". */
  road_type: string | null;
  /** Roads that meet at the junction. */
  branches: number;
  /** Less than GROUP_M after the direction before: read with it. */
  joined: boolean;
  /**
   * When `street` is null, the street the road runs along, deduced from the
   * roads beside it (ADR-0054, ADR-0057): never a name of the road itself.
   * Missing from an API older than TASK-060.
   */
  along?: string | null;
}

/** Codes of the errors the API answers with (docs/API.md). */
export const API_ERROR_CODES = [
  "invalid_request",
  "shape_not_drawable",
  "map_data_unavailable",
  "engine_error",
  "http_error",
  "ai_unavailable",
  "image_not_usable",
] as const;
export type ApiErrorCode = (typeof API_ERROR_CODES)[number];

/** The body of every error answer of the API. */
export interface ApiError {
  error: {
    code: ApiErrorCode;
    /** In English, for people: the engine's own words when it has them. */
    message: string;
    /**
     * Only with "shape_not_drawable", else null: a distance the shape fits,
     * in whole km as metres (TASK-031).
     */
    suggested_distance_m: number | null;
    /**
     * Only with "image_not_usable", else null: why the engine found no
     * outline (TASK-073). Missing from an API older than TASK-073.
     */
    reason?: ImageReason | null;
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
  request: RouteRequest | ImageRouteRequest;
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

/** The largest image POST /image-outlines takes, before base64 (ADR-0069). */
export const MAX_IMAGE_BYTES = 10_000_000;
/** The most corners an outline traced from an image has (ADR-0068). */
export const MAX_OUTLINE_POINTS = 100;

/**
 * Why an image gives no outline (route_engine/image_outline.py, ADR-0068):
 * not PNG or JPEG, unreadable, a background that is not plain, no subject,
 * more than one, a subject on the edge, too small, too jagged.
 */
export const IMAGE_REASONS = [
  "format",
  "unreadable",
  "background",
  "no_subject",
  "scattered",
  "edge",
  "small",
  "jagged",
] as const;
export type ImageReason = (typeof IMAGE_REASONS)[number];

/**
 * What the app sends to POST /image-outlines (TASK-073, ADR-0069): a PNG or
 * JPEG file in base64, at most MAX_IMAGE_BYTES before encoding.
 */
export interface ImageOutlineRequest {
  image: string;
}

/** A point of an outline as [x, y]. */
export type OutlinePoint = [x: number, y: number];

/** The outline the engine traced from an image, to show before the route. */
export interface ImageOutline {
  /** Closed, centred and scaled into [-1, 1], y upwards: what an
   * ImageRouteRequest sends back. */
  points: OutlinePoint[];
  /** The same corners over the image, as shares of its width and height
   * from the top left: to draw the outline on the picture. */
  image_points: OutlinePoint[];
  /** Width over height of the image, upright. */
  aspect: number;
}

/**
 * What the app sends to POST /image-route-jobs: the route of an image's
 * outline. The answer is a RouteJob, read at /route-jobs/{job_id}; its
 * result has neither shape nor word.
 */
export interface ImageRouteRequest {
  start: LatLon;
  /** The `points` of an ImageOutline, unchanged. */
  outline: OutlinePoint[];
  /** Target distance in metres, a whole number. */
  distance_m: number;
  activity: Activity;
}
