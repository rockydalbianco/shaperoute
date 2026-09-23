import type { LatLon } from "@shaperoute/shared-types";

import { type LngLat, toLngLat } from "./coordinates";

/** From the app to the map page, delivered by `pageScript`. */
export type ToPage =
  | { type: "setPosition"; lngLat: LngLat }
  | { type: "showRoute"; coordinates: LngLat[] }
  | { type: "clearRoute" };

/** From the map page to the app, through `window.ReactNativeWebView`. */
export type FromPage = { type: "ready" } | { type: "error"; message: string };

export function setPosition(point: LatLon): ToPage {
  return { type: "setPosition", lngLat: toLngLat(point) };
}

/** Draws the route and frames the map on it. */
export function showRoute(points: LatLon[]): ToPage {
  return { type: "showRoute", coordinates: points.map(toLngLat) };
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
