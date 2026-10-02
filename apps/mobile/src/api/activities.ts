import type { LatLon, TrackFix, Walk } from "@shaperoute/shared-types";

import { type AccountOutcome, ask } from "./accounts";

/**
 * The runs an account recorded (TASK-172): GET, PUT and DELETE
 * /me/activities, all with the session token (docs/API.md, «My
 * activities»). The bodies are packages/shared-types/fixtures/
 * activities.json, activity.json and activity-request.json; the types live
 * here, like `Favorite`.
 */

/** One run of the list, with a light preview of its lines. */
export type Activity = {
  /** The key the app made from the run's track (activityKey). */
  id: string;
  /** When the run began, as the API writes a moment: read on the phone's
   * clock. */
  started_at: string;
  /** The town the run starts from, when the API found it. */
  place: string | null;
  shape: string | null;
  word: string | null;
  style: string | null;
  /** What the route draws when neither a shape nor a word says it. */
  title: string | null;
  /** Metres and seconds of the run, pauses left out; counted by the API. */
  distance_m: number;
  duration_s: number;
  /** From 0 to 100; null without a route, or for a run too short to judge. */
  score: number | null;
  fidelity: number | null;
  /** The planned route; null for a run without one. */
  route_preview: LatLon[] | null;
  track_preview: LatLon[];
};

/** One run whole, to show on the map. */
export type ActivityDetail = Omit<Activity, "route_preview" | "track_preview"> & {
  /** The planned route's similarity to its shape. */
  similarity: number | null;
  points: LatLon[] | null;
  track: LatLon[];
  /**
   * The planned route's walks, for a word with the pen up (TASK-199):
   * [from, to] indices into `points`. Empty for any other run; missing from
   * an API older than TASK-199. Read through `walksOf`, which trusts only
   * walks that fit the points.
   */
  walks?: Walk[];
};

/** A page of the list, the latest run first. */
export type ActivitiesPage = {
  activities: Activity[];
  /** What to ask the next page with; null on the last one. */
  next: string | null;
  /** How many runs the account has. */
  total: number;
};

/** A stretch of a run that is not of it, on the clock of its fixes. */
export type ActivityPause = {
  from_ms: number;
  to_ms: number;
  auto: boolean;
  /** Paused by the pen between two letters (TASK-198, TASK-199): sent only
   * as true, and only on a run along a word with the pen up. */
  pen?: boolean;
};

/** What PUT /me/activities/{key} takes: the run as the app recorded it. The
 * API counts metres, seconds and score itself. */
export type ActivityRequest = {
  track: TrackFix[];
  pauses: ActivityPause[];
  /** The planned route and its similarity: both, or both null. */
  points: LatLon[] | null;
  similarity: number | null;
  shape: string | null;
  word: string | null;
  style: "round" | "block" | null;
  title: string | null;
  /**
   * The planned route's walks, for a word with the pen up (TASK-199): the
   * API scores the letters alone. Sent only then: an API older than
   * TASK-199 refuses a field it does not know.
   */
  walks?: Walk[];
};

/**
 * `request` as an app older than TASK-199 sends it: without the walks and
 * without the pen on its pauses. The same object when it has neither.
 */
export function withoutPenUp(request: ActivityRequest): ActivityRequest {
  if (request.walks === undefined && !request.pauses.some((p) => "pen" in p)) {
    return request;
  }
  const { walks: _walks, ...older } = request;
  return {
    ...older,
    pauses: request.pauses.map(({ pen: _pen, ...pause }) => pause),
  };
}

type Options = { fetchFn?: typeof fetch; key?: string | null };

/** GET /me/activities: a page, the first without a `cursor`. */
export function fetchActivities(
  baseUrl: string,
  token: string,
  cursor: string | null = null,
  options: Options = {},
): Promise<AccountOutcome<ActivitiesPage>> {
  const query = cursor === null ? "" : `?cursor=${encodeURIComponent(cursor)}`;
  return ask(
    baseUrl,
    `/me/activities${query}`,
    { method: "GET", token },
    isActivitiesPage,
    options,
  );
}

/** GET /me/activities/{key}: the run whole. */
export function fetchActivity(
  baseUrl: string,
  token: string,
  id: string,
  options: Options = {},
): Promise<AccountOutcome<ActivityDetail>> {
  return ask(
    baseUrl,
    `/me/activities/${id}`,
    { method: "GET", token },
    isActivityDetail,
    options,
  );
}

/**
 * PUT /me/activities/{key}: saved once, however many times it is sent. A
 * run along a word with the pen up that the API refuses goes once more as
 * an older app sends it (TASK-199, ADR-0158): an API older than TASK-199
 * keeps it, scored on the whole route, rather than the run being lost.
 */
export async function saveActivity(
  baseUrl: string,
  token: string,
  id: string,
  request: ActivityRequest,
  options: Options = {},
): Promise<AccountOutcome<Activity>> {
  const put = (body: ActivityRequest) =>
    ask(
      baseUrl,
      `/me/activities/${id}`,
      { method: "PUT", body, token },
      isActivity,
      options,
    );
  const outcome = await put(request);
  const older = withoutPenUp(request);
  return outcome.kind === "api_error" &&
    outcome.code === "invalid_request" &&
    older !== request
    ? put(older)
    : outcome;
}

/** DELETE /me/activities/{key}: gone, or never there. */
export function removeActivity(
  baseUrl: string,
  token: string,
  id: string,
  options: Options = {},
): Promise<AccountOutcome<null>> {
  return ask(
    baseUrl,
    `/me/activities/${id}`,
    { method: "DELETE", token },
    isEmpty,
    options,
  );
}

function isEmpty(body: unknown, status: number): body is null {
  return status === 204 && body === null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isPoint(value: unknown): value is LatLon {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    value.every((n) => typeof n === "number" && Number.isFinite(n))
  );
}

function isLine(value: unknown): value is LatLon[] {
  return Array.isArray(value) && value.every(isPoint);
}

function isText(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function isNumber(value: unknown): value is number | null {
  return value === null || typeof value === "number";
}

/** What the list and the whole run share. */
function hasFields(body: Record<string, unknown>): boolean {
  return (
    typeof body.id === "string" &&
    typeof body.started_at === "string" &&
    isText(body.place) &&
    isText(body.shape) &&
    isText(body.word) &&
    isText(body.style) &&
    isText(body.title) &&
    typeof body.distance_m === "number" &&
    typeof body.duration_s === "number" &&
    isNumber(body.score) &&
    isNumber(body.fidelity)
  );
}

export function isActivity(body: unknown): body is Activity {
  return (
    isRecord(body) &&
    hasFields(body) &&
    (body.route_preview === null || isLine(body.route_preview)) &&
    isLine(body.track_preview)
  );
}

export function isActivityDetail(body: unknown): body is ActivityDetail {
  return (
    isRecord(body) &&
    hasFields(body) &&
    isNumber(body.similarity) &&
    (body.points === null || isLine(body.points)) &&
    isLine(body.track) &&
    body.track.length >= 2
  );
}

export function isActivitiesPage(body: unknown): body is ActivitiesPage {
  return (
    isRecord(body) &&
    Array.isArray(body.activities) &&
    body.activities.every(isActivity) &&
    isText(body.next) &&
    typeof body.total === "number"
  );
}
