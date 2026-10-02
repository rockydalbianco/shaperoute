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
  "rabbit_head",
  "pumpkin",
  "christmas_tree",
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

/** The letters of a word (TASK-080, ADR-0075): round, the default, or block,
 * square letters turned to the street grid (ADR-0072). Only for a word. */
export const LETTER_STYLES = ["round", "block"] as const;
export type LetterStyle = (typeof LETTER_STYLES)[number];

interface RouteRequestFields {
  start: LatLon;
  /** Target distance in metres, a whole number. */
  distance_m: number;
  activity: Activity;
}

/** A shape of the catalogue, or a word written one letter at a time: one
 * of the two, the other absent or null (TASK-056). */
export type RouteRequest =
  | (RouteRequestFields & { shape: Shape; word?: null; style?: "round" })
  | (RouteRequestFields & { shape?: null; word: string; style?: LetterStyle });

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
  /**
   * Other routes for the same request, best first, to choose from (TASK-093,
   * ADR-0087): at most MAX_ALTERNATIVES, each a whole result with no
   * alternatives of its own. Missing from an older API.
   */
  alternatives?: RouteResult[];
}

/** Routes besides the one chosen by the engine: three to choose from. */
export const MAX_ALTERNATIVES = 2;

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
  /** A line drawn on an image's outline gives no outline (TASK-079). */
  "outline_edit_rejected",
  /** A key is set on the API and the request has the wrong one (TASK-081). */
  "unauthorized",
  /**
   * Too many requests from this phone in a minute (TASK-081), or too many
   * wrong passwords for one email (TASK-114).
   */
  "too_many_requests",
  /** Signing up with an email that already has an account (TASK-114). */
  "email_taken",
  /** Signing up with a username already taken, whatever the case. */
  "username_taken",
  /** Signing in with a wrong email or password. */
  "wrong_credentials",
  /** No session token, or one that was signed out. */
  "not_signed_in",
  /** A session unused for 90 days: sign in again. */
  "session_expired",
  /** The API has no database: accounts are off on that server. */
  "accounts_unavailable",
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
     * outline (TASK-073). Missing from an API older than TASK-073. With
     * "outline_edit_rejected", why the drawing was refused (TASK-079).
     */
    reason?: ImageReason | EditReason | null;
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

/** One GPS fix of a run, as the app recorded it (TASK-112). */
export interface TrackFix {
  point: LatLon;
  /** When the fix was taken, in milliseconds on the phone's clock. */
  time_ms: number;
  /** Radius of the fix's error, in metres; null or absent when unknown. */
  accuracy_m?: number | null;
}

/** What the app sends to POST /track-scores (TASK-113, ADR-0093). */
export interface TrackScoreRequest {
  /** The planned route: RouteResult.points. */
  points: LatLon[];
  /** The planned route's: RouteResult.similarity. */
  similarity: number;
  /** The run, fix by fix, in order. */
  track: TrackFix[];
}

/** The score of a run (route_engine/track_score.py, ADR-0090). */
export interface TrackScoreResult {
  /** From 0 to 100: the route's similarity times `fidelity`. */
  score: number;
  /** How much of the plan was run, and nothing else, from 0 to 1. */
  fidelity: number;
  /** Share of the planned route with the run near it. */
  covered: number;
  /** Share of the run near the planned route. */
  on_route: number;
  /** Length of the run, in metres. */
  distance_m: number;
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
 * more than 4 subjects (TASK-084), a subject on the edge, too small, too
 * jagged.
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
  /** The other subjects of the image (TASK-084) and the details drawn by
   * hand (TASK-079), in the frame of `points`: each starts on the outline
   * or on an earlier one, and the route goes along it and back; one that
   * ends on its own second point closes a loop, drawn once. Empty for one
   * subject as traced; missing from an API older than TASK-079. */
  strokes?: OutlinePoint[][];
  /** The same strokes over the image, like `image_points`. */
  image_strokes?: OutlinePoint[][];
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
  /** The `strokes` of an ImageOutline, unchanged (TASK-079); absent or
   * empty for an outline without. */
  strokes?: OutlinePoint[][];
  /** Target distance in metres, a whole number. */
  distance_m: number;
  activity: Activity;
}

/** The most points of all the strokes of an outline together, as the
 * route travels them: the other subjects of the image (TASK-084) and the
 * details drawn by hand (TASK-079). A line run out and back counts twice:
 * about 100 points of details without loops. */
export const MAX_DETAIL_POINTS = 200;
/** The most points of a line drawn with a finger (TASK-079). */
export const MAX_DRAWN_POINTS = 2_000;

/**
 * Why a line drawn on an outline was refused (route_engine/outline_edits.py,
 * TASK-079, ADR-0074): too short or small; a part over the start of a
 * detail; too many corners. A drawing away from the outline is not
 * refused, it is joined to the nearest line; and lines may cross.
 */
export const EDIT_REASONS = ["short", "covers_detail", "too_many_corners"] as const;
export type EditReason = (typeof EDIT_REASONS)[number];

/** What a line drawn on an outline adds: a closed part joined to the
 * silhouette, or a detail the route goes along and back. */
export type EditKind = "part" | "detail";

/**
 * What the app sends to POST /image-outline-edits (TASK-079, ADR-0074): the
 * outline it shows over the picture and one line drawn on it. The answer is
 * the new ImageOutline, or an ApiError "outline_edit_rejected" with its
 * `reason`. Nothing is kept between two edits: undo is the app's own.
 */
export interface ImageOutlineEditRequest {
  /** The `image_points` of the ImageOutline shown. */
  image_points: OutlinePoint[];
  /** Its `image_strokes`. */
  image_strokes: OutlinePoint[][];
  /** Its `aspect`. */
  aspect: number;
  kind: EditKind;
  /** The line drawn, as shares of the image from the top left. */
  line: OutlinePoint[];
}

/**
 * Accounts (TASK-114, ADR-0115): email and password. What the app sends to
 * POST /accounts to sign up; signing up also signs in.
 */
export interface SignUpRequest {
  /** Stored in lower case: one address is one account. */
  email: string;
  /** PASSWORD_LENGTH.min to PASSWORD_LENGTH.max characters. */
  password: string;
  /** 3 to 20 letters, digits, "_" or "."; unique whatever the case. */
  username: string;
  /** The "I am at least 16" box (ADR-0114): false is refused. */
  at_least_16: boolean;
}

/** The limits of a password, checked by the API too. */
export const PASSWORD_LENGTH = { min: 8, max: 128 } as const;

/** What the app sends to POST /session to sign in. */
export interface SignInRequest {
  email: string;
  password: string;
}

export const USER_ROLES = ["user", "admin"] as const;
export type UserRole = (typeof USER_ROLES)[number];

/** GET /me, and the user of a Session: never the password or a token. */
export interface User {
  id: number;
  email: string;
  username: string;
  role: UserRole;
  /** ISO 8601, UTC. */
  created_at: string;
}

/**
 * The answer of POST /accounts and POST /session, the only one with the
 * token: the app keeps it in expo-secure-store and sends it back as
 * "Authorization: Bearer <token>". It ends 90 days after its last use, or
 * with DELETE /session.
 */
export interface Session {
  token: string;
  user: User;
}
