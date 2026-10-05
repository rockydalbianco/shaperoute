import type { LatLon } from "@shaperoute/shared-types";

import { apiKey, keyHeaders } from "../api/apiUrl";
import type { Place } from "../places/photon";

/**
 * A town near the start (TASK-236): a city as the search gives it, its
 * label and its centre, and how far its centre is.
 */
export type NearbyCity = Place & { away_m: number };

/** As many as the API gives at most: four towns and the two places
 * nearest of all, however small. Six cards, never more. */
export const MAX_NEARBY = 6;

type Options = { fetchFn?: typeof fetch; key?: string | null; signal?: AbortSignal };

// The towns of each square asked in this run of the app: «Explore» opened
// again, or the start moved a few metres, asks nothing.
const known = new Map<string, NearbyCity[]>();

/** About 1 km, the square the API answers for (nearby_cities.py). */
export function nearbyKey(baseUrl: string, near: LatLon): string {
  return `${baseUrl} ${near[0].toFixed(2)},${near[1].toFixed(2)}`;
}

/** The towns already fetched around `near`, when they are. */
export function knownNearby(baseUrl: string, near: LatLon): NearbyCity[] | null {
  return known.get(nearbyKey(baseUrl, near)) ?? null;
}

/** For tests: as a new opening of the app. */
export function forgetNearby(): void {
  known.clear();
}

function isNearbyCity(value: unknown): value is NearbyCity {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const { label, point, away_m } = value as Record<string, unknown>;
  return (
    typeof label === "string" &&
    label.trim() !== "" &&
    Array.isArray(point) &&
    point.length === 2 &&
    point.every((n) => typeof n === "number" && Number.isFinite(n)) &&
    typeof away_m === "number" &&
    Number.isFinite(away_m)
  );
}

/**
 * The towns near `near`, the nearest first, from the API's GET
 * /nearby-cities: at most four towns within 20 km, or up to 50 km where the
 * towns are few, and the two nearest places, villages too. Never throws:
 * null when the API does not answer, and nothing is kept then.
 */
export async function fetchNearbyCities(
  baseUrl: string,
  near: LatLon,
  { fetchFn = fetch, key = apiKey(), signal }: Options = {},
): Promise<NearbyCity[] | null> {
  const kept = knownNearby(baseUrl, near);
  if (kept !== null) {
    return kept;
  }
  try {
    const response = await fetchFn(
      `${baseUrl}/nearby-cities?lat=${near[0]}&lon=${near[1]}`,
      { headers: keyHeaders(key), signal },
    );
    const body: unknown = await response.json();
    const places = (body as { places?: unknown } | null)?.places;
    if (!response.ok || !Array.isArray(places)) {
      return null;
    }
    const towns = places
      .filter(isNearbyCity)
      .slice(0, MAX_NEARBY)
      .map(({ label, point, away_m }) => ({ label, point, away_m }));
    known.set(nearbyKey(baseUrl, near), towns);
    return towns;
  } catch {
    return null;
  }
}
