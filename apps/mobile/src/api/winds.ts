import type { LatLon } from "@shaperoute/shared-types";

import { type AccountOutcome, ask } from "./accounts";

/**
 * The wind aloft (TASK-479 part H, ADR-0388, docs/API.md «Winds»): GET
 * /winds for a place rounded to about a kilometre, as every «near me» of
 * the app. Hour by hour from now, at four pressure levels: the speed and
 * the direction it comes from, with the model, its run and the credit the
 * app always shows. 503 when the server has no fresh run for the place.
 */

type Options = { fetchFn?: typeof fetch; key?: string | null };

export type LevelWind = {
  hpa: number;
  speed_ms: number | null;
  from_deg: number | null;
};
export type HourWinds = { time: string; winds: LevelWind[] };
export type Winds = {
  source: string;
  run: string;
  attribution: string;
  lat: number;
  lon: number;
  levels: number[];
  hours: HourWinds[];
};

/** The place sent: about a kilometre. */
export const WIND_DECIMALS = 2;

const isNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);
const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function isLevelWind(value: unknown): value is LevelWind {
  return (
    isObject(value) &&
    isNumber(value.hpa) &&
    (value.speed_ms === null || isNumber(value.speed_ms)) &&
    (value.from_deg === null || isNumber(value.from_deg))
  );
}

export function isWinds(body: unknown): body is Winds {
  return (
    isObject(body) &&
    typeof body.source === "string" &&
    typeof body.run === "string" &&
    typeof body.attribution === "string" &&
    isNumber(body.lat) &&
    isNumber(body.lon) &&
    Array.isArray(body.levels) &&
    body.levels.every(isNumber) &&
    Array.isArray(body.hours) &&
    body.hours.every(
      (hour: unknown) =>
        isObject(hour) &&
        typeof hour.time === "string" &&
        !Number.isNaN(Date.parse(hour.time)) &&
        Array.isArray(hour.winds) &&
        hour.winds.every(isLevelWind),
    )
  );
}

/** GET /winds around `place`, without a token. */
export function fetchWinds(
  baseUrl: string,
  place: LatLon,
  options: Options = {},
): Promise<AccountOutcome<Winds>> {
  const [lat, lon] = place.map((n) => n.toFixed(WIND_DECIMALS));
  return ask(
    baseUrl,
    `/winds?lat=${lat}&lon=${lon}`,
    { method: "GET" },
    isWinds,
    options,
  );
}
