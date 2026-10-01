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
  | { type: "showTrack"; coordinates: LngLat[] }
  | { type: "clearTrack" }
  | { type: "follow"; lngLat: LngLat }
  | { type: "showStops"; stops: StopFeature[] }
  | { type: "clearStops" };

/** A place of a themed route on the map (TASK-129). */
export type StopFeature = { name: string; lngLat: LngLat; passed: boolean };

/** From the map page to the app, through `window.ReactNativeWebView`. */
export type FromPage =
  | { type: "ready" }
  /** The first tiles are drawn: the map has finished loading (TASK-058). */
  | { type: "loaded" }
  | { type: "error"; message: string };

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

/** Draws the run over the route, without moving the map (TASK-113). */
export function showTrack(points: LatLon[]): ToPage {
  return { type: "showTrack", coordinates: points.map(toLngLat) };
}

export function clearTrack(): ToPage {
  return { type: "clearTrack" };
}

/** Marks the places of a themed route, named when the route passes by. */
export function showStops(
  stops: { name: string; point: LatLon; passed: boolean }[],
): ToPage {
  return {
    type: "showStops",
    stops: stops.map((s) => ({
      name: s.name,
      lngLat: toLngLat(s.point),
      passed: s.passed,
    })),
  };
}

export function clearStops(): ToPage {
  return { type: "clearStops" };
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
  if (message.type === "ready" || message.type === "loaded") {
    return { type: message.type };
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
