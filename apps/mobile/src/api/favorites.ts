import {
  ACTIVITIES,
  type Activity,
  type LatLon,
  type Stretch,
  type Walk,
} from "@shaperoute/shared-types";

import { type AccountOutcome, ask } from "./accounts";

/**
 * The routes an account keeps (TASK-171): GET, PUT and DELETE
 * /me/favorites, all with the session token (docs/API.md, «Favorites»). The
 * bodies are packages/shared-types/fixtures/favorites.json, favorite.json
 * and favorite-request.json, and since TASK-200 favorites-cycling.json,
 * favorite-cycling.json and favorite-request-cycling.json; the types live
 * here, like `RecommendedRoute`.
 */

/** One favorite of the list, with a light preview of its line. */
export type Favorite = {
  /** The key the app made from the route's line (favoriteKey). */
  id: string;
  /** A city of the catalogue, a place searched for, or "" when unknown. */
  city: string;
  shape: string | null;
  word: string | null;
  style: string | null;
  /** What it draws when neither a shape nor a word says it: a theme. */
  title: string | null;
  /** The distance asked for. */
  distance_m: number;
  /** The distance on the roads. */
  route_m: number;
  similarity: number;
  start: LatLon;
  preview: LatLon[];
  created_at: string;
  /**
   * What the route was drawn for (TASK-200). Missing from an API older than
   * TASK-200, whose favorites are all runs. Read through `favoriteActivity`.
   */
  activity?: string;
  /**
   * How far its shape is turned, as RouteResult.rotation_deg (TASK-232):
   * the card and the map show it turned back. Null for a route north up and
   * every favorite kept before; missing from an API older than TASK-232
   * part C. Read through `turnOf`.
   */
  rotation_deg?: number | null;
};

/** One favorite whole, to show on the map. */
export type FavoriteDetail = Omit<Favorite, "start" | "preview"> & {
  points: LatLon[];
  /**
   * The walks of a word with the pen up (TASK-199): [from, to] indices into
   * `points`. Empty for any other route; missing from an API older than
   * TASK-199. Read through `walksOf`.
   */
  walks?: Walk[];
  /**
   * A bike route's stretches with the bike on foot (TASK-206): [from, to]
   * indices into `points`. Empty for any other route; missing from an API
   * older than TASK-206. Read through `onFootOf`.
   */
  on_foot?: Stretch[];
};

/** What PUT /me/favorites/{key} takes: the route as the app shows it. */
export type FavoriteRequest = {
  city: string;
  shape: string | null;
  word: string | null;
  style: "round" | "block" | null;
  title: string | null;
  distance_m: number;
  route_m: number;
  similarity: number;
  points: LatLon[];
  /**
   * The walks of a word with the pen up (TASK-199). Sent only then: an API
   * older than TASK-199 refuses a field it does not know.
   */
  walks?: Walk[];
  /**
   * What the route was drawn for (TASK-200). Sent only when it is not a run:
   * a run's request is the one of before, which an API older than TASK-200
   * takes.
   */
  activity?: Activity;
  /**
   * A bike route's stretches with the bike on foot (TASK-206). Sent only
   * when it has some: an API older than TASK-206 refuses the field.
   */
  on_foot?: Stretch[];
  /**
   * How far its shape is turned, as RouteResult.rotation_deg (TASK-232,
   * ADR-0195). Sent only when the route is turned: an API older than
   * TASK-232 part C refuses the field.
   */
  rotation_deg?: number;
};

/**
 * What a favorite was drawn for: a run when the API does not say, as every
 * favorite was before TASK-200, or says an activity this app does not know.
 */
export function favoriteActivity(favorite: { activity?: string }): Activity {
  const said = favorite.activity;
  return ACTIVITIES.find((activity) => activity === said) ?? "running";
}

/**
 * `request` as an app older than TASK-199 sends it, without the fields added
 * since (TASK-199 `walks`, TASK-200 `activity`, TASK-206 `on_foot`, TASK-232
 * `rotation_deg`), which an older API refuses. The same object when it has
 * none.
 */
export function asBefore(request: FavoriteRequest): FavoriteRequest {
  if (
    request.walks === undefined &&
    request.activity === undefined &&
    request.on_foot === undefined &&
    request.rotation_deg === undefined
  ) {
    return request;
  }
  const {
    walks: _walks,
    activity: _activity,
    on_foot: _onFoot,
    rotation_deg: _turn,
    ...older
  } = request;
  return older;
}

/**
 * `request` as an app older than TASK-232 part C sends it, without the turn
 * of its shape: an API before it refuses the field, and keeps the route as
 * one north up. The same object when it has none.
 */
export function withoutTurn(request: FavoriteRequest): FavoriteRequest {
  if (request.rotation_deg === undefined) {
    return request;
  }
  const { rotation_deg: _turn, ...older } = request;
  return older;
}

/**
 * `request` as an app older than TASK-206 sends it, without the stretches
 * with the bike on foot: an API with the activity but not the stretches
 * keeps the route as a bike route. The same object when it has none.
 */
export function beforeOnFoot(request: FavoriteRequest): FavoriteRequest {
  if (request.on_foot === undefined) {
    return request;
  }
  const { on_foot: _onFoot, ...older } = request;
  return older;
}

type Options = { fetchFn?: typeof fetch; key?: string | null };

/** GET /me/favorites: the newest first. */
export function fetchFavorites(
  baseUrl: string,
  token: string,
  options: Options = {},
): Promise<AccountOutcome<Favorite[]>> {
  return ask(baseUrl, "/me/favorites", { method: "GET", token }, isList, options).then(
    (outcome) =>
      outcome.kind === "ok" ? { kind: "ok", value: outcome.value.favorites } : outcome,
  );
}

/** GET /me/favorites/{key}: the route whole. */
export function fetchFavorite(
  baseUrl: string,
  token: string,
  id: string,
  options: Options = {},
): Promise<AccountOutcome<FavoriteDetail>> {
  return ask(
    baseUrl,
    `/me/favorites/${id}`,
    { method: "GET", token },
    isFavoriteDetail,
    options,
  );
}

/**
 * PUT /me/favorites/{key}: kept once, however many times it is asked. A
 * word with the pen up, or a route not drawn for a run, that the API refuses
 * goes once more as an older app sends it (TASK-199, TASK-200, ADR-0158,
 * ADR-0160): an older API keeps it as one line, and as a run. A turned
 * route is first sent again without its turn (TASK-232, ADR-0195), a bike
 * route with the bike on foot without its stretches (TASK-206, ADR-0167),
 * then, if refused again, as an older app sends it.
 */
export async function keepFavorite(
  baseUrl: string,
  token: string,
  id: string,
  request: FavoriteRequest,
  options: Options = {},
): Promise<AccountOutcome<Favorite>> {
  const put = (body: FavoriteRequest) =>
    ask(
      baseUrl,
      `/me/favorites/${id}`,
      { method: "PUT", body, token },
      isFavorite,
      options,
    );
  const refused = (outcome: AccountOutcome<Favorite>) =>
    outcome.kind === "api_error" && outcome.code === "invalid_request";
  let sent = request;
  let outcome = await put(sent);
  for (const older of [withoutTurn, beforeOnFoot, asBefore]) {
    const next = older(sent);
    if (refused(outcome) && next !== sent) {
      sent = next;
      outcome = await put(sent);
    }
  }
  return outcome;
}

/** DELETE /me/favorites/{key}: gone, or never there. */
export function removeFavorite(
  baseUrl: string,
  token: string,
  id: string,
  options: Options = {},
): Promise<AccountOutcome<null>> {
  return ask(
    baseUrl,
    `/me/favorites/${id}`,
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

function isText(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

/** What the list and the whole route share. */
function hasFields(body: Record<string, unknown>): boolean {
  return (
    typeof body.id === "string" &&
    typeof body.city === "string" &&
    isText(body.shape) &&
    isText(body.word) &&
    isText(body.style) &&
    isText(body.title) &&
    typeof body.distance_m === "number" &&
    typeof body.route_m === "number" &&
    typeof body.similarity === "number" &&
    typeof body.created_at === "string" &&
    (body.activity === undefined || typeof body.activity === "string") &&
    (body.rotation_deg === undefined ||
      body.rotation_deg === null ||
      typeof body.rotation_deg === "number")
  );
}

export function isFavorite(body: unknown): body is Favorite {
  return (
    isRecord(body) &&
    hasFields(body) &&
    isPoint(body.start) &&
    Array.isArray(body.preview) &&
    body.preview.every(isPoint)
  );
}

export function isFavoriteDetail(body: unknown): body is FavoriteDetail {
  return (
    isRecord(body) &&
    hasFields(body) &&
    Array.isArray(body.points) &&
    body.points.length >= 2 &&
    body.points.every(isPoint)
  );
}

function isList(body: unknown): body is { favorites: Favorite[] } {
  return (
    isRecord(body) && Array.isArray(body.favorites) && body.favorites.every(isFavorite)
  );
}
