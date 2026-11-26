import {
  COMPASS_POINTS,
  FLYING_SITE_KINDS,
  type FlyingHistory,
  type FlyingRecord,
  type FlyingSite,
  type FlyingSiteDetail,
  type FlyingSiteKind,
  type FlyingSites,
} from "@shaperoute/shared-types";

import { type AccountOutcome, ask } from "./accounts";

/**
 * The takeoffs and landings of free flying and the history of a takeoff
 * (TASK-493, ADR-0400, docs/API.md «Flying sites»): OpenStreetMap data and
 * numbers without names, the same for everyone, so no token. The bodies
 * are packages/shared-types/fixtures/flying-sites.json, flying-site.json and
 * flying-site-history.json.
 */

type Options = { fetchFn?: typeof fetch; key?: string | null };

/** South, west, north, east, in degrees. */
export type Box = { south: number; west: number; north: number; east: number };

/** A box goes with this many decimals: about ten metres, enough for a map. */
const BOX_DECIMALS = 4;

const isNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);
const isNumberOrNull = (value: unknown) => value === null || isNumber(value);
const isTextOrNull = (value: unknown) => value === null || typeof value === "string";
const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const isCount = (value: unknown): value is number =>
  isNumber(value) && Number.isInteger(value) && value >= 0;

export function isFlyingSite(body: unknown): body is FlyingSite {
  if (!isObject(body)) {
    return false;
  }
  const { id, kind, lat, lon, orientation } = body;
  return (
    isCount(id) &&
    (FLYING_SITE_KINDS as readonly unknown[]).includes(kind) &&
    isNumber(lat) &&
    isNumber(lon) &&
    isTextOrNull(body.name) &&
    isNumberOrNull(body.ele_m) &&
    Array.isArray(orientation) &&
    orientation.every((p) => (COMPASS_POINTS as readonly unknown[]).includes(p)) &&
    (body.official === null || typeof body.official === "boolean") &&
    typeof body.osm_url === "string" &&
    body.osm_url.startsWith("https://www.openstreetmap.org/") &&
    isNumberOrNull(body.away_m)
  );
}

export function isFlyingSites(body: unknown): body is FlyingSites {
  return (
    isObject(body) &&
    Array.isArray(body.sites) &&
    body.sites.every(isFlyingSite) &&
    typeof body.more === "boolean" &&
    typeof body.attribution === "string"
  );
}

export function isFlyingSiteDetail(body: unknown): body is FlyingSiteDetail {
  return (
    isObject(body) &&
    isFlyingSite(body.site) &&
    Array.isArray(body.near) &&
    body.near.every(isFlyingSite) &&
    typeof body.attribution === "string"
  );
}

function isRecordOrNull(body: unknown): body is FlyingRecord | null {
  return (
    body === null ||
    (isObject(body) &&
      isNumber(body.value) &&
      typeof body.drawing_id === "string" &&
      typeof body.username === "string" &&
      typeof body.started_at === "string")
  );
}

export function isFlyingHistory(body: unknown): body is FlyingHistory {
  if (!isObject(body) || !isObject(body.in_air_now) || !isObject(body.records)) {
    return false;
  }
  const { months, in_air_now: inAir, records } = body;
  return (
    isCount(body.site_id) &&
    typeof body.few === "boolean" &&
    (body.flights === null || isCount(body.flights)) &&
    (body.pilots === null || isCount(body.pilots)) &&
    (body.today === null || isCount(body.today)) &&
    (months === null ||
      (Array.isArray(months) &&
        months.every(
          (m) =>
            isObject(m) &&
            typeof m.month === "string" &&
            isCount(m.flights) &&
            isCount(m.pilots),
        ))) &&
    isCount(inAir.count) &&
    Array.isArray(inAir.shares) &&
    inAir.shares.every((s) => typeof s === "string") &&
    isRecordOrNull(records.longest_s) &&
    isRecordOrNull(records.highest_m) &&
    isRecordOrNull(records.farthest_m)
  );
}

/** GET /flying-sites: the sites of a box, at most 5° a side (else 422). */
export function flyingSitesIn(
  baseUrl: string,
  box: Box,
  options: Options & { kind?: FlyingSiteKind; limit?: number } = {},
): Promise<AccountOutcome<FlyingSites>> {
  const { kind, limit, ...rest } = options;
  const at = (value: number) => value.toFixed(BOX_DECIMALS);
  const params = [
    `south=${at(box.south)}`,
    `west=${at(box.west)}`,
    `north=${at(box.north)}`,
    `east=${at(box.east)}`,
    ...(kind === undefined ? [] : [`kind=${kind}`]),
    ...(limit === undefined ? [] : [`limit=${limit}`]),
  ].join("&");
  return ask(
    baseUrl,
    `/flying-sites?${params}`,
    { method: "GET" },
    isFlyingSites,
    rest,
  );
}

/** GET /flying-sites/{id}: one site with the other kind near it. */
export function fetchFlyingSite(
  baseUrl: string,
  siteId: number,
  options: Options = {},
): Promise<AccountOutcome<FlyingSiteDetail>> {
  return ask(
    baseUrl,
    `/flying-sites/${siteId}`,
    { method: "GET" },
    isFlyingSiteDetail,
    options,
  );
}

/** GET /flying-sites/{id}/history: a takeoff's flights; «today» from the
 * phone's own midnight. */
export function fetchFlyingHistory(
  baseUrl: string,
  siteId: number,
  options: Options & { utcOffsetMin?: number } = {},
): Promise<AccountOutcome<FlyingHistory>> {
  const { utcOffsetMin = -new Date().getTimezoneOffset(), ...rest } = options;
  return ask(
    baseUrl,
    `/flying-sites/${siteId}/history?utc_offset_min=${Math.round(utcOffsetMin)}`,
    { method: "GET" },
    isFlyingHistory,
    rest,
  );
}

/** The landings of a box: what TASK-479 D6 asks for the nearest landing. */
export function fetchLandings(
  baseUrl: string,
  box: Box,
  options: Options = {},
): Promise<AccountOutcome<FlyingSites>> {
  return flyingSitesIn(baseUrl, box, { ...options, kind: "landing" });
}
