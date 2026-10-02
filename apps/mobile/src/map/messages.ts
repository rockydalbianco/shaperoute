import type { LatLon, Walk } from "@shaperoute/shared-types";

import { piecesOf, walksOf } from "../route/walks";
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
  | {
      type: "showRoute";
      coordinates: LngLat[];
      startHere: LngLat | null;
      /** A word with the pen up (TASK-198): the letters, drawn as the
       * route, and the walks between them, dashed. Absent otherwise. */
      letters?: LngLat[][];
      walks?: LngLat[][];
    }
  | { type: "clearRoute" }
  | { type: "showOthers"; lines: LngLat[][] }
  | { type: "showTrack"; coordinates: LngLat[] }
  | { type: "clearTrack" }
  | { type: "follow"; lngLat: LngLat; heading: number | null }
  | { type: "stopFollow" }
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
 * `requested`, the start the user asked for, it marks where to go. With the
 * walks of a word with the pen up (TASK-198) the letters are the route and
 * the walks are dashed; without, the message is the one of before.
 */
export function showRoute(
  points: LatLon[],
  requested: LatLon | null = null,
  walks: readonly Walk[] | null = null,
): ToPage {
  const moved =
    requested !== null && metresBetween(requested, points[0]) > START_HERE_M;
  const shown = {
    type: "showRoute" as const,
    coordinates: points.map(toLngLat),
    startHere: moved ? toLngLat(points[0]) : null,
  };
  const walked = walksOf(points, walks);
  if (walked.length === 0) {
    return shown;
  }
  const pieces = piecesOf(points, walked);
  return {
    ...shown,
    letters: pieces.letters.map((line) => line.map(toLngLat)),
    walks: pieces.walks.map((line) => line.map(toLngLat)),
  };
}

/**
 * Moves the position marker and keeps the map on it, close up, without
 * framing the route again: navigation (TASK-049). With `heading`, degrees
 * clockwise from north, the marker is an arrow turned that way (TASK-164).
 */
export function follow(point: LatLon, heading: number | null = null): ToPage {
  return {
    type: "follow",
    lngLat: toLngLat(point),
    heading: heading === null ? null : Math.round(heading) % 360,
  };
}

/** The run is over: the arrow goes back to being the position marker. */
export function stopFollow(): ToPage {
  return { type: "stopFollow" };
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

/** Draws the other routes to choose from under the route, without moving
 * the map (TASK-093); none clears them. */
export function showOthers(routes: LatLon[][]): ToPage {
  return { type: "showOthers", lines: routes.map((points) => points.map(toLngLat)) };
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
