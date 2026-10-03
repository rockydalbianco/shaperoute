import type {
  Drawing,
  DrawingDetail,
  DrawingRequest,
  DrawingsPage,
  LatLon,
  MyDrawing,
} from "@shaperoute/shared-types";

import { accountProblem, SESSION_ENDED } from "../account/messages";
import { type AccountOutcome, ask } from "./accounts";

/**
 * Drawings (TASK-117, ADR-0159): the calls of docs/API.md, «Drawings», all
 * with the session token. A saved run of «My activities» gets a title and
 * «Public»; public, every member sees it in its profile, cut by the API:
 * never its first and last 200 m, never the planned route. The bodies are
 * packages/shared-types/fixtures/*drawing*.json.
 */

type Options = { fetchFn?: typeof fetch; key?: string | null };

/** What the owner chooses for a run: a title (null: none) and «Public». */
export type DrawingChoice = { title: string | null; public: boolean };

/** Nothing chosen yet: no title, private. */
export const NOT_CHOSEN: DrawingChoice = { title: null, public: false };

/** The title as the API keeps it: without the spaces around; "" is none. */
export function titleOf(text: string): string | null {
  const title = text.trim();
  return title === "" ? null : title;
}

function drawingPath(key: string): string {
  return `/me/activities/${encodeURIComponent(key)}/drawing`;
}

/** GET /me/activities/{key}/drawing: what the owner chose for the run. */
export function fetchMyDrawing(
  baseUrl: string,
  token: string,
  key: string,
  options: Options = {},
): Promise<AccountOutcome<MyDrawing>> {
  return ask(baseUrl, drawingPath(key), { method: "GET", token }, isMyDrawing, options);
}

/**
 * PUT /me/activities/{key}/drawing: the choice whole, both fields every
 * time, so sending it again after a phone without a network changes
 * nothing.
 */
export function saveDrawing(
  baseUrl: string,
  token: string,
  key: string,
  choice: DrawingChoice,
  options: Options = {},
): Promise<AccountOutcome<MyDrawing>> {
  const body: DrawingRequest = { title: choice.title, public: choice.public };
  return ask(
    baseUrl,
    drawingPath(key),
    { method: "PUT", body, token },
    isMyDrawing,
    options,
  );
}

/**
 * GET /me/drawings: the runs with a title or made public. An API older
 * than TASK-117 has no such endpoint and says 404: none, there.
 */
export async function fetchMyDrawings(
  baseUrl: string,
  token: string,
  options: Options = {},
): Promise<AccountOutcome<MyDrawing[]>> {
  const outcome = await ask(
    baseUrl,
    "/me/drawings",
    { method: "GET", token },
    isMyDrawings,
    options,
  );
  if (outcome.kind === "ok") {
    return { kind: "ok", value: outcome.value.drawings };
  }
  return outcome.kind === "api_error" && outcome.code === "http_error"
    ? { kind: "ok", value: [] }
    : outcome;
}

/** GET /users/{public_id}/drawings: a page, the first without a `cursor`. */
export function fetchUserDrawings(
  baseUrl: string,
  token: string,
  publicId: string,
  cursor: string | null = null,
  options: Options = {},
): Promise<AccountOutcome<DrawingsPage>> {
  const query = cursor === null ? "" : `?cursor=${encodeURIComponent(cursor)}`;
  return ask(
    baseUrl,
    `/users/${encodeURIComponent(publicId)}/drawings${query}`,
    { method: "GET", token },
    isDrawingsPage,
    options,
  );
}

/** GET /drawings/{id}: one drawing whole, cut as the others see it. */
export function fetchDrawing(
  baseUrl: string,
  token: string,
  id: string,
  options: Options = {},
): Promise<AccountOutcome<DrawingDetail>> {
  return ask(
    baseUrl,
    `/drawings/${encodeURIComponent(id)}`,
    { method: "GET", token },
    isDrawingDetail,
    options,
  );
}

/**
 * A choice that the same call, later, could make go: no network, the API
 * silent or busy. A run the API does not know (deleted, `404`) or a choice
 * it refuses (`422`, a run too short to publish) would be refused again.
 */
export function worthAgain(outcome: AccountOutcome<unknown>): boolean {
  switch (outcome.kind) {
    case "ok":
      return false;
    case "unreachable":
      return true;
    case "bad_answer":
      return outcome.status >= 500;
    case "api_error":
      return outcome.code === "too_many_requests";
  }
}

/** Words for a drawing call that did not go; null when it did. */
export function drawingProblem(outcome: AccountOutcome<unknown>): string | null {
  if (outcome.kind === "ok") {
    return null;
  }
  if (outcome.kind === "unreachable") {
    return "No connection. Try again when you are online.";
  }
  if (outcome.kind === "api_error") {
    if (outcome.code === "session_expired" || outcome.code === "not_signed_in") {
      return SESSION_ENDED;
    }
    // The API's own words: a title too long, a run too short to publish.
    if (outcome.code === "invalid_request") {
      return outcome.message;
    }
    if (outcome.code === "http_error") {
      return "This run is no longer in your activities.";
    }
  }
  return accountProblem(outcome);
}

function isRecord(body: unknown): body is Record<string, unknown> {
  return typeof body === "object" && body !== null;
}

function isStringOrNull(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function isNumberOrNull(value: unknown): value is number | null {
  return value === null || typeof value === "number";
}

function isLine(value: unknown): value is LatLon[] {
  return (
    Array.isArray(value) &&
    value.every(
      (point) =>
        Array.isArray(point) &&
        point.length === 2 &&
        typeof point[0] === "number" &&
        typeof point[1] === "number",
    )
  );
}

export function isMyDrawing(body: unknown): body is MyDrawing {
  return (
    isRecord(body) &&
    typeof body.key === "string" &&
    isStringOrNull(body.id) &&
    isStringOrNull(body.title) &&
    typeof body.public === "boolean" &&
    isStringOrNull(body.published_at)
  );
}

function isMyDrawings(body: unknown): body is { drawings: MyDrawing[] } {
  return (
    isRecord(body) && Array.isArray(body.drawings) && body.drawings.every(isMyDrawing)
  );
}

/** The fields every drawing has, in a list or whole. */
function hasDrawingFields(body: Record<string, unknown>): boolean {
  return (
    typeof body.id === "string" &&
    isStringOrNull(body.title) &&
    typeof body.started_at === "string" &&
    isStringOrNull(body.published_at) &&
    isStringOrNull(body.place) &&
    isStringOrNull(body.shape) &&
    isStringOrNull(body.word) &&
    isStringOrNull(body.style) &&
    isStringOrNull(body.route_title) &&
    typeof body.distance_m === "number" &&
    typeof body.duration_s === "number" &&
    isNumberOrNull(body.score) &&
    isNumberOrNull(body.fidelity)
  );
}

export function isDrawing(body: unknown): body is Drawing {
  return isRecord(body) && hasDrawingFields(body) && isLine(body.track_preview);
}

export function isDrawingsPage(body: unknown): body is DrawingsPage {
  return (
    isRecord(body) &&
    Array.isArray(body.drawings) &&
    body.drawings.every(isDrawing) &&
    isStringOrNull(body.next) &&
    typeof body.total === "number"
  );
}

export function isDrawingDetail(body: unknown): body is DrawingDetail {
  if (!isRecord(body) || !hasDrawingFields(body) || !isRecord(body.author)) {
    return false;
  }
  return (
    typeof body.author.public_id === "string" &&
    typeof body.author.username === "string" &&
    typeof body.public === "boolean" &&
    isLine(body.track)
  );
}
