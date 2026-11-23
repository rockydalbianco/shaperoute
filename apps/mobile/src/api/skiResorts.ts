import type {
  AltitudeWeather,
  LatLon,
  SkiResort,
  SkiResorts,
  SkiResortWeather,
  WeatherHour,
} from "@shaperoute/shared-types";

import { type AccountOutcome, ask } from "./accounts";

/**
 * The ski resorts of the world and their weather (TASK-406 part C,
 * ADR-0338, docs/API.md «Ski resorts»): the same for everyone, so no token.
 * The bodies are packages/shared-types/fixtures/ski-resorts.json and
 * ski-resort-weather.json.
 */

type Options = { fetchFn?: typeof fetch; key?: string | null };

/** What a search asks: a name, or the resorts near a place. */
export type ResortQuery = { name: string } | { near: LatLon };

/** The place sent for the resorts near it: about a kilometre, as the places
 * around (places/photon.ts, TASK-254). Enough to sort the resorts. */
const NEAR_DECIMALS = 2;

const isNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);
const isNumberOrNull = (value: unknown) => value === null || isNumber(value);
const isTextOrNull = (value: unknown) => value === null || typeof value === "string";
const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export function isSkiResort(body: unknown): body is SkiResort {
  if (!isObject(body)) {
    return false;
  }
  const { id, name, country, region, lat, lon, bbox, lifts, piste_km } = body;
  const byDifficulty = body.piste_km_by_difficulty;
  return (
    typeof id === "string" &&
    id !== "" &&
    typeof name === "string" &&
    isTextOrNull(country) &&
    isTextOrNull(region) &&
    isNumber(lat) &&
    isNumber(lon) &&
    Array.isArray(bbox) &&
    bbox.length === 4 &&
    bbox.every(isNumber) &&
    isNumber(lifts) &&
    lifts >= 0 &&
    isNumber(piste_km) &&
    piste_km >= 0 &&
    isObject(byDifficulty) &&
    Object.values(byDifficulty).every(isNumber) &&
    isNumberOrNull(body.min_elevation_m) &&
    isNumberOrNull(body.max_elevation_m) &&
    isTextOrNull(body.website) &&
    // Missing in an answer by name of an API that leaves it out.
    (body.away_m === undefined || isNumberOrNull(body.away_m))
  );
}

export function isSkiResorts(body: unknown): body is SkiResorts {
  return (
    isObject(body) && Array.isArray(body.resorts) && body.resorts.every(isSkiResort)
  );
}

function isWeatherHour(body: unknown): body is WeatherHour {
  return (
    isObject(body) &&
    typeof body.time === "string" &&
    Number.isFinite(Date.parse(body.time)) &&
    isNumberOrNull(body.temperature_c) &&
    isNumberOrNull(body.wind_ms) &&
    isTextOrNull(body.symbol) &&
    isNumberOrNull(body.precipitation_mm)
  );
}

function isAltitudeWeather(body: unknown): body is AltitudeWeather {
  return (
    isObject(body) &&
    isNumberOrNull(body.altitude_m) &&
    isTextOrNull(body.updated_at) &&
    Array.isArray(body.hours) &&
    body.hours.every(isWeatherHour) &&
    isNumber(body.fresh_snow_cm) &&
    body.fresh_snow_cm >= 0
  );
}

export function isSkiResortWeather(body: unknown): body is SkiResortWeather {
  return (
    isObject(body) &&
    typeof body.resort_id === "string" &&
    typeof body.attribution === "string" &&
    typeof body.stale === "boolean" &&
    isAltitudeWeather(body.base) &&
    (body.top === null || isAltitudeWeather(body.top))
  );
}

/** GET /ski-resorts: by name, or the nearest first with `away_m`. */
export function findSkiResorts(
  baseUrl: string,
  query: ResortQuery,
  options: Options = {},
): Promise<AccountOutcome<SkiResorts>> {
  const params =
    "name" in query
      ? `q=${encodeURIComponent(query.name.trim())}`
      : `lat=${query.near[0].toFixed(NEAR_DECIMALS)}&lon=${query.near[1].toFixed(NEAR_DECIMALS)}`;
  return ask(
    baseUrl,
    `/ski-resorts?${params}`,
    { method: "GET" },
    isSkiResorts,
    options,
  );
}

/** GET /ski-resorts/{id}/weather: 503 when MET Norway is silent and the
 * server keeps nothing. */
export function fetchSkiResortWeather(
  baseUrl: string,
  resortId: string,
  options: Options = {},
): Promise<AccountOutcome<SkiResortWeather>> {
  return ask(
    baseUrl,
    `/ski-resorts/${encodeURIComponent(resortId)}/weather`,
    { method: "GET" },
    isSkiResortWeather,
    options,
  );
}
