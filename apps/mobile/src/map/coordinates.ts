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
