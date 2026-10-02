import type { LatLon, Walk } from "@shaperoute/shared-types";

import { type AccountOutcome, ask } from "./accounts";

/**
 * The routes an account keeps (TASK-171): GET, PUT and DELETE
 * /me/favorites, all with the session token (docs/API.md, «Favorites»). The
 * bodies are packages/shared-types/fixtures/favorites.json, favorite.json
 * and favorite-request.json; the types live here, like `RecommendedRoute`.
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
};

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
 * word with the pen up that the API refuses goes once more without its
 * walks (TASK-199, ADR-0158): an API older than TASK-199 keeps it as one
 * line.
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
  const outcome = await put(request);
  if (
    outcome.kind !== "api_error" ||
    outcome.code !== "invalid_request" ||
    request.walks === undefined
  ) {
    return outcome;
  }
  const { walks: _walks, ...older } = request;
  return put(older);
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
    typeof body.created_at === "string"
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
