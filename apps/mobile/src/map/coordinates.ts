import type { LatLon } from "@shaperoute/shared-types";

/**
 * A point as [longitude, latitude]: the order of MapLibre and GeoJSON.
 *
 * The app keeps every point as a LatLon, like the rest of the project; these
 * two functions are the only place where the order is swapped.
 */
export type LngLat = [lon: number, lat: number];

export function toLngLat([lat, lon]: LatLon): LngLat {
  return [lon, lat];
}

export function fromLngLat([lon, lat]: LngLat): LatLon {
  return [lat, lon];
}

const EARTH_RADIUS_M = 6_371_000;

/** Great-circle distance in metres, as the route engine measures it. */
export function metresBetween([lat1, lon1]: LatLon, [lat2, lon2]: LatLon): number {
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLon = (lon2 - lon1) * rad;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(a));
}
