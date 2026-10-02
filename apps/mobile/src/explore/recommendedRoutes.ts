import type { LatLon } from "@shaperoute/shared-types";

import { apiKey, keyHeaders } from "../api/apiUrl";

/**
 * The best routes already planned near a point, for "Explore" (TASK-126,
 * ADR-0098): GET /recommended-routes and GET /recommended-routes/{id}.
 * The bodies are packages/shared-types/fixtures/recommended-routes.json and
 * recommended-route.json; the types live here, like `Place` in photon.ts.
 */

/** One route of the list, with a light preview of its line. */
export type RecommendedRoute = {
  id: string;
  city: string;
  /** A shape of the catalogue, or null for a word. */
  shape: string | null;
  /** The word in capitals, or null for a shape. */
  word: string | null;
  /** "round" or "block", for a word. */
  style: string | null;
  /** The distance asked for. */
  distance_m: number;
  /** The distance on the roads. */
  route_m: number;
  similarity: number;
  start: LatLon;
  /** From the point asked about to the start, in a straight line. */
  away_m: number;
  preview: LatLon[];
};

/** One route whole, to show on the map and export. */
export type RecommendedRouteDetail = {
  id: string;
  city: string;
  shape: string | null;
  word: string | null;
  style: string | null;
  distance_m: number;
  route_m: number;
  similarity: number;
  points: LatLon[];
  license: string;
};

/** "Near you" (TASK-092, variant C): a start a short run away. */
export const NEAR_RADIUS_M = 5000;

export type ListOutcome =
  { kind: "routes"; routes: RecommendedRoute[] } | { kind: "failed" };

export type DetailOutcome =
  { kind: "route"; route: RecommendedRouteDetail } | { kind: "failed" };

type Options = { fetchFn?: typeof fetch; key?: string | null; signal?: AbortSignal };

export function recommendedUrl(
  baseUrl: string,
  near: LatLon,
  radiusM: number = NEAR_RADIUS_M,
): string {
  return `${baseUrl}/recommended-routes?lat=${near[0]}&lon=${near[1]}&radius_m=${radiusM}`;
}

/** The routes near `near`, the best first. Never throws. */
export async function fetchRecommended(
  baseUrl: string,
  near: LatLon,
  { fetchFn = fetch, key = apiKey(), signal }: Options = {},
): Promise<ListOutcome> {
  try {
    const response = await fetchFn(recommendedUrl(baseUrl, near), {
      headers: keyHeaders(key),
      signal,
    });
    const body: unknown = await response.json();
    return response.ok && isRecommendedList(body)
      ? { kind: "routes", routes: body.routes }
      : { kind: "failed" };
  } catch {
    return { kind: "failed" };
  }
}

/** One route whole. Never throws. */
export async function fetchRecommendedRoute(
  baseUrl: string,
  id: string,
  { fetchFn = fetch, key = apiKey(), signal }: Options = {},
): Promise<DetailOutcome> {
  try {
    const response = await fetchFn(
      `${baseUrl}/recommended-routes/${encodeURIComponent(id)}`,
      { headers: keyHeaders(key), signal },
    );
    const body: unknown = await response.json();
    return response.ok && isRecommendedDetail(body)
      ? { kind: "route", route: body }
      : { kind: "failed" };
  } catch {
    return { kind: "failed" };
  }
}

function isPoint(value: unknown): value is LatLon {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    value.every((n) => typeof n === "number" && Number.isFinite(n))
  );
}

function isLine(value: unknown, min: number): value is LatLon[] {
  return Array.isArray(value) && value.length >= min && value.every(isPoint);
}

function stringOrNull(value: unknown): boolean {
  return value === null || typeof value === "string";
}

function hasRouteFields(r: Record<string, unknown>): boolean {
  return (
    typeof r.id === "string" &&
    typeof r.city === "string" &&
    stringOrNull(r.shape) &&
    stringOrNull(r.word) &&
    stringOrNull(r.style) &&
    // One of the two, as in a route request.
    (typeof r.shape === "string") !== (typeof r.word === "string") &&
    typeof r.distance_m === "number" &&
    typeof r.route_m === "number" &&
    typeof r.similarity === "number"
  );
}

export function isRecommendedList(
  body: unknown,
): body is { routes: RecommendedRoute[] } {
  if (typeof body !== "object" || body === null) {
    return false;
  }
  const routes = (body as Record<string, unknown>).routes;
  return (
    Array.isArray(routes) &&
    routes.every((route: unknown) => {
      if (typeof route !== "object" || route === null) {
        return false;
      }
      const r = route as Record<string, unknown>;
      return (
        hasRouteFields(r) &&
        isPoint(r.start) &&
        typeof r.away_m === "number" &&
        isLine(r.preview, 2)
      );
    })
  );
}

export function isRecommendedDetail(body: unknown): body is RecommendedRouteDetail {
  if (typeof body !== "object" || body === null) {
    return false;
  }
  const r = body as Record<string, unknown>;
  return hasRouteFields(r) && isLine(r.points, 2) && typeof r.license === "string";
}

/** What a route draws, as the user reads it: "heart", "CIAO". */
export function routeTitle(route: {
  shape: string | null;
  word: string | null;
}): string {
  return route.word ?? (route.shape ?? "").replace(/_/g, " ");
}

/** The cities of the catalogue whose name is two words: its files have one. */
const TWO_WORDS: Record<string, string> = {
  newyork: "New York",
  sanfrancisco: "San Francisco",
};

/** The city as the user reads it: "milano" → "Milano", "newyork" → "New York". */
export function cityName(city: string): string {
  return TWO_WORDS[city] ?? city.charAt(0).toUpperCase() + city.slice(1);
}
