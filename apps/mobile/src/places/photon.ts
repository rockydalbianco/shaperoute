import type { LatLon } from "@shaperoute/shared-types";

import { fromLngLat } from "../map/coordinates";

/**
 * Place search with Photon (ADR-0029): OpenStreetMap data, no key, fair use
 * and no guarantee. The only place that names the service: change it here.
 */
export const PHOTON_URL = "https://photon.komoot.io/api/";
export const MAX_PLACES = 5;

export interface Place {
  /** What the user reads, e.g. "Via Rodolfo Belenzani, Trento". */
  label: string;
  point: LatLon;
}

export function photonSearchUrl(query: string): string {
  return `${PHOTON_URL}?q=${encodeURIComponent(query.trim())}&limit=${MAX_PLACES}`;
}

/** Throws when the service cannot be reached or does not answer 200. */
export async function searchPlaces(
  query: string,
  fetchFn: typeof fetch = fetch,
): Promise<Place[]> {
  const response = await fetchFn(photonSearchUrl(query));
  if (!response.ok) {
    throw new Error(`Photon answered ${response.status}`);
  }
  return parsePhotonResponse(await response.json());
}

/**
 * Reads Photon's GeoJSON into places. Features without a name or a point are
 * skipped, and so are repeated labels: a street split into several OSM ways
 * comes back once per way.
 */
export function parsePhotonResponse(body: unknown): Place[] {
  const features = isRecord(body) && Array.isArray(body.features) ? body.features : [];
  const places: Place[] = [];
  const labels = new Set<string>();
  for (const feature of features) {
    const place = toPlace(feature);
    if (place && !labels.has(place.label)) {
      labels.add(place.label);
      places.push(place);
    }
  }
  return places;
}

/** The name, then the first wider area that differs from it. */
export function placeLabel(properties: Record<string, unknown>): string | null {
  const text = (key: string): string | undefined => {
    const value = properties[key];
    return typeof value === "string" && value.trim() ? value.trim() : undefined;
  };
  const address = [text("street"), text("housenumber")].filter(Boolean).join(" ");
  const name = text("name") ?? (address || undefined);
  if (!name) {
    return null;
  }
  const area = [text("city"), text("county"), text("state"), text("country")].find(
    (part) => part !== undefined && part !== name,
  );
  return area ? `${name}, ${area}` : name;
}

function toPlace(feature: unknown): Place | null {
  if (
    !isRecord(feature) ||
    !isRecord(feature.geometry) ||
    !isRecord(feature.properties)
  ) {
    return null;
  }
  const coordinates = feature.geometry.coordinates;
  if (
    !Array.isArray(coordinates) ||
    typeof coordinates[0] !== "number" ||
    typeof coordinates[1] !== "number" ||
    !Number.isFinite(coordinates[0]) ||
    !Number.isFinite(coordinates[1])
  ) {
    return null;
  }
  const label = placeLabel(feature.properties);
  return label ? { label, point: fromLngLat([coordinates[0], coordinates[1]]) } : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
