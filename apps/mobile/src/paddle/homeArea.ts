import type { LatLon } from "@shaperoute/shared-types";
import { File, Paths } from "expo-file-system";

import type { Activity } from "../api/activities";
import { metresBetween } from "../map/coordinates";

/**
 * Where the person usually starts (TASK-269, ADR-0239; decided by the agent
 * on the user's delegation): the area most of the latest activities of «My
 * activities» start from, any sport. «Explore» with «Paddle» suggests the
 * lakes and the sea nearest it, and the shapes drawn ahead (TASK-246) are
 * those of the places nearest it.
 *
 * Kept on the phone only, in a file of the app's documents: worked out from
 * the list the app already has, nothing asked, nothing sent, nothing on the
 * account. No address, no new permission.
 */
export type HomeArea = {
  /** The centre of the starts of the area. */
  point: LatLon;
  /** The town most of those activities start from, as the API named it;
   * null when it named none. */
  place: string | null;
};

/** Where an activity began, and the town the API found there. */
export type Start = { point: LatLon; place: string | null };

export const HOME_AREA_FILE = "home-area.json";
/** Starts this near one another are one area: the town and around it. */
export const HOME_RADIUS_M = 10_000;

/** Where an activity began: the first point of its track, else of its
 * route; null for one without either. */
export function startOf(activity: Activity): Start | null {
  const point = activity.track_preview[0] ?? activity.route_preview?.[0];
  return point === undefined ? null : { point, place: activity.place };
}

/**
 * The area most of `starts` are in: the start with the most others within
 * HOME_RADIUS_M, and the centre of those. On a tie, the first of the list,
 * the latest activity. Null without starts.
 */
export function homeAreaOf(starts: readonly Start[]): HomeArea | null {
  let best: Start[] = [];
  for (const start of starts) {
    const around = starts.filter(
      (other) => metresBetween(start.point, other.point) <= HOME_RADIUS_M,
    );
    if (around.length > best.length) {
      best = around;
    }
  }
  if (best.length === 0) {
    return null;
  }
  const lat = best.reduce((sum, s) => sum + s.point[0], 0) / best.length;
  const lon = best.reduce((sum, s) => sum + s.point[1], 0) / best.length;
  return { point: [lat, lon], place: mostNamed(best) };
}

/** The name most starts have; on a tie, the first of the list. */
function mostNamed(starts: readonly Start[]): string | null {
  const counts = new Map<string, number>();
  for (const { place } of starts) {
    if (place !== null && place.trim() !== "") {
      counts.set(place, (counts.get(place) ?? 0) + 1);
    }
  }
  let name: string | null = null;
  for (const [place, count] of counts) {
    if (name === null || count > (counts.get(name) ?? 0)) {
      name = place;
    }
  }
  return name;
}

function isHome(value: unknown): value is HomeArea {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const { point, place } = value as Record<string, unknown>;
  return (
    Array.isArray(point) &&
    point.length === 2 &&
    point.every((v) => typeof v === "number" && Number.isFinite(v)) &&
    (place === null || typeof place === "string")
  );
}

/** The home area the phone keeps; null when there is none. */
export function loadHomeArea(): HomeArea | null {
  try {
    const file = new File(Paths.document, HOME_AREA_FILE);
    if (!file.exists) {
      return null;
    }
    const data: unknown = JSON.parse(file.textSync());
    return isHome(data) ? data : null;
  } catch {
    return null;
  }
}

/**
 * The home area of the activities the API listed, kept on the phone: the
 * latest first, as «My activities» has them. An empty list leaves none:
 * another account, or every activity deleted.
 */
export function noteHomeArea(activities: readonly Activity[]): void {
  const home = homeAreaOf(
    activities.map(startOf).filter((start): start is Start => start !== null),
  );
  try {
    const file = new File(Paths.document, HOME_AREA_FILE);
    file.create({ overwrite: true });
    file.write(JSON.stringify(home));
  } catch {
    // A convenience: without it the places are those near the start.
  }
}
