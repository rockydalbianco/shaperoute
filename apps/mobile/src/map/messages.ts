import type { LatLon } from "@shaperoute/shared-types";

import { type LngLat, metresBetween, toLngLat } from "./coordinates";

/**
 * A route that begins farther than this from the requested start gets a
 * "Start here" marker: the engine moved it where the shape fits (ADR-0025,
 * ADR-0040). Closer, it begins on the nearest road.
 */
export const START_HERE_M = 50;

/** From the app to the map page, delivered by `pageScript`. */
export type ToPage =
  | { type: "setPosition"; lngLat: LngLat }
  | { type: "showRoute"; coordinates: LngLat[]; startHere: LngLat | null }
  | { type: "clearRoute" }
  | { type: "follow"; lngLat: LngLat };

/** From the map page to the app, through `window.ReactNativeWebView`. */
export type FromPage = { type: "ready" } | { type: "error"; message: string };

export function setPosition(point: LatLon): ToPage {
  return { type: "setPosition", lngLat: toLngLat(point) };
}

/**
 * Draws the route and frames the map on it. When it begins away from
 * `requested`, the start the user asked for, it marks where to go.
 */
export function showRoute(points: LatLon[], requested: LatLon | null = null): ToPage {
  const moved =
    requested !== null && metresBetween(requested, points[0]) > START_HERE_M;
  return {
    type: "showRoute",
    coordinates: points.map(toLngLat),
    startHere: moved ? toLngLat(points[0]) : null,
  };
}

/**
 * Moves the position marker and keeps the map on it, close up, without
 * framing the route again: navigation (TASK-049).
 */
export function follow(point: LatLon): ToPage {
  return { type: "follow", lngLat: toLngLat(point) };
}

export function clearRoute(): ToPage {
  return { type: "clearRoute" };
}

/** JavaScript that hands a message to the page (see `mapPage.ts`). */
export function pageScript(message: ToPage): string {
  // The trailing `true` is what injectJavaScript expects as a result.
  return `window.shaperoute && window.shaperoute.receive(${JSON.stringify(message)}); true;`;
}

/** Reads a message posted by the page; anything unexpected gives null. */
export function parsePageMessage(data: string): FromPage | null {
  let message: unknown;
  try {
    message = JSON.parse(data);
  } catch {
    return null;
  }
  if (typeof message !== "object" || message === null || !("type" in message)) {
    return null;
  }
  if (message.type === "ready") {
    return { type: "ready" };
  }
  if (
    message.type === "error" &&
    "message" in message &&
    typeof message.message === "string"
  ) {
    return { type: "error", message: message.message };
  }
  return null;
}
