import type { Activity, Direction, LatLon, Walk } from "@shaperoute/shared-types";

import { favoriteTitle, type Keepable } from "../favorites/favoriteRoute";
import { announceMOf, isRide } from "../navigation/ride";
import { simplifyDirections } from "../navigation/simplifyDirections";
import { startsAnywhere } from "../navigation/startAnywhere";
import { walksOf } from "../route/walks";

/**
 * A route as the Apple Watch follows it on its own (TASK-370 part B3a,
 * ADR-0314): what the phone decides is decided here, once, before the
 * route goes, and the watch only follows it (WatchCore's Navigator, Loop
 * and Pen). The directions as the run says them (`simplifyDirections`), the
 * walks that fit the line (`walksOf`), whether a closed route starts where
 * the runner reaches it (`startsAnywhere`), whether the sport rides
 * (`isRide`) or paddles, and how far ahead a turn is told. The watch reads
 * the same fields in Swift (WatchCore/WatchRoute.swift), tested on
 * targets/watch/Core/Fixtures/routes.json.
 */

/** What the watch needs of a direction: the fields of the guide traces. */
export type WatchDirection = Pick<
  Direction,
  "distance_m" | "turn" | "angle_deg" | "joined" | "street" | "branches"
>;

export type WatchRoute = {
  /** The key the app makes from the route's line (favoriteKey): the same
   * route sent again replaces the one the watch has. */
  key: string;
  /** What it draws, in the phone's language: "CIAO", «Stella». */
  title: string;
  activity: string;
  /** The distance on the roads. */
  distanceM: number;
  points: LatLon[];
  directions: WatchDirection[];
  walks: Walk[];
  word: string | null;
  anywhere: boolean;
  ride: boolean;
  paddle: boolean;
  announceM: number;
};

/** The watch keeps this many routes sent with «Send to watch», besides the
 * favorites (the user's choice, 2026-11-08). */
export const WATCH_ROUTES_KEPT = 20;

/**
 * A route has at most this many points on the watch. WatchConnectivity
 * carries a user info of any size in theory, but a big one waits behind the
 * others and the watch keeps it in memory: 6000 points are a 60 km ride at
 * the engine's spacing, about 150 KB.
 */
export const MAX_WATCH_POINTS = 6000;

/** Coordinates on the watch have 6 decimals: about 10 cm. */
function rounded([lat, lon]: LatLon): LatLon {
  return [Number(lat.toFixed(6)), Number(lon.toFixed(6))];
}

/** A route to send, as the phone has it. */
export type RouteToSend = {
  key: string;
  title: string;
  activity: Activity;
  distanceM: number;
  points: LatLon[];
  /** The directions the API gave for the line; none on the water. */
  directions: readonly Direction[];
  walks?: readonly Walk[] | null;
  word?: string | null;
};

/** The route as the watch follows it; null when it cannot be followed
 * there: fewer than two points, or more than MAX_WATCH_POINTS. */
export function watchRouteOf(route: RouteToSend): WatchRoute | null {
  const { points, activity } = route;
  if (points.length < 2 || points.length > MAX_WATCH_POINTS) {
    return null;
  }
  const walks = [...walksOf(points, route.walks)];
  const word = route.word ?? null;
  return {
    key: route.key,
    title: route.title,
    activity,
    distanceM: Math.round(route.distanceM),
    points: points.map(rounded),
    directions: simplifyDirections(points, [...route.directions]).map(
      ({ distance_m, turn, angle_deg, joined, street, branches }) => ({
        distance_m,
        turn,
        angle_deg,
        joined,
        street,
        branches,
      }),
    ),
    walks,
    word,
    anywhere: startsAnywhere(points, { word, walks }),
    ride: isRide(activity),
    paddle: activity === "paddling",
    announceM: announceMOf(activity),
  };
}

/** The route on the map, as the heart keeps it, to send with its
 * directions. */
export function routeToSendOf(
  { id, request }: Keepable,
  directions: readonly Direction[],
): RouteToSend {
  return {
    key: id,
    title: favoriteTitle(request),
    activity: request.activity ?? "running",
    distanceM: request.route_m,
    points: request.points,
    directions,
    walks: request.walks ?? null,
    word: request.word,
  };
}

const TURNS: readonly string[] = [
  "depart",
  "left",
  "right",
  "sharp-left",
  "sharp-right",
  "straight",
  "u-turn",
];

type Fields = Record<string, unknown>;

function isFields(value: unknown): value is Fields {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isReal(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isIndex(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function pointOf(value: unknown): LatLon | null {
  if (!Array.isArray(value) || value.length !== 2) {
    return null;
  }
  const [lat, lon]: unknown[] = value;
  return isReal(lat) && isReal(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180
    ? [lat, lon]
    : null;
}

function directionOf(value: unknown): WatchDirection | null {
  if (!isFields(value)) {
    return null;
  }
  const { distance_m, turn, angle_deg, joined, street, branches } = value;
  if (
    !isReal(distance_m) ||
    distance_m < 0 ||
    typeof turn !== "string" ||
    !TURNS.includes(turn) ||
    !isReal(angle_deg) ||
    typeof joined !== "boolean" ||
    (street !== null && typeof street !== "string") ||
    !isIndex(branches)
  ) {
    return null;
  }
  return {
    distance_m,
    turn: turn as Direction["turn"],
    angle_deg,
    joined,
    street,
    branches,
  };
}

/**
 * The route in `value`, as a message carries it; null when a field is not
 * right: the watch refuses the same ones (WatchRoute.swift), with
 * `invalidField`. Walks must fit the points, in order, as `walksOf` keeps
 * them.
 */
export function decodeWatchRoute(value: unknown): WatchRoute | null {
  if (!isFields(value)) {
    return null;
  }
  const { key, title, activity, distanceM, word, anywhere, ride, paddle, announceM } =
    value;
  if (
    typeof key !== "string" ||
    key === "" ||
    typeof title !== "string" ||
    typeof activity !== "string" ||
    activity === "" ||
    !isReal(distanceM) ||
    distanceM < 0 ||
    (word !== null && typeof word !== "string") ||
    typeof anywhere !== "boolean" ||
    typeof ride !== "boolean" ||
    typeof paddle !== "boolean" ||
    !isReal(announceM) ||
    announceM <= 0 ||
    !Array.isArray(value.points) ||
    !Array.isArray(value.directions) ||
    !Array.isArray(value.walks)
  ) {
    return null;
  }
  const points = (value.points as unknown[]).map(pointOf);
  const directions = (value.directions as unknown[]).map(directionOf);
  if (
    points.length < 2 ||
    points.length > MAX_WATCH_POINTS ||
    points.some((point) => point === null) ||
    directions.some((direction) => direction === null)
  ) {
    return null;
  }
  const line = points as LatLon[];
  const walks = value.walks as unknown[];
  const fit = walksOf(line, walks as Walk[]);
  if (fit.length !== walks.length) {
    return null;
  }
  return {
    key,
    title,
    activity,
    distanceM,
    points: line,
    directions: directions as WatchDirection[],
    walks: [...fit],
    word,
    anywhere,
    ride,
    paddle,
    announceM,
  };
}
