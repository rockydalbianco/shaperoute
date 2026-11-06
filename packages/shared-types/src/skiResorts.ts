/**
 * The ski resorts of the world (TASK-406, ADR-0338, docs/API.md «Ski
 * resorts»): GET /ski-resorts by name or near a place, GET
 * /ski-resorts/{id}, and GET /ski-resorts/{id}/weather from MET Norway. The
 * bodies are fixtures/ski-resorts.json and fixtures/ski-resort-weather.json;
 * the API's side is shaperoute_api/ski_resorts_api.py. In a file of its own,
 * as keptRoutes.ts: index.ts is left as it is.
 */

/** The most resorts one search gives (ski_resorts.py MAX_FOUND). */
export const SKI_RESORTS_MAX = 50;
/** The longest name asked (`q`). */
export const SKI_RESORT_QUERY_MAX = 60;

/** The difficulties of the downhill pistes the app names, from the easiest
 * (OpenSkiData's). Others may come: they count in `piste_km` only. */
export const PISTE_DIFFICULTIES = [
  "novice",
  "easy",
  "intermediate",
  "advanced",
  "expert",
  "freeride",
] as const;
export type PisteDifficulty = (typeof PISTE_DIFFICULTIES)[number];

export interface SkiResort {
  id: string;
  name: string;
  /** ISO 3166-1 alpha-2, when known. */
  country: string | null;
  region: string | null;
  lat: number;
  lon: number;
  /** South, west, north, east, in degrees. */
  bbox: [number, number, number, number];
  lifts: number;
  /** The downhill pistes, in km. */
  piste_km: number;
  piste_km_by_difficulty: Record<string, number>;
  min_elevation_m: number | null;
  max_elevation_m: number | null;
  website: string | null;
  /** Metres to the resort's centre: only when asked by place. */
  away_m: number | null;
}

export interface SkiResorts {
  resorts: SkiResort[];
}

/** One hour of MET Norway's forecast. */
export interface WeatherHour {
  /** The hour starts here, ISO 8601 UTC. */
  time: string;
  temperature_c: number | null;
  wind_ms: number | null;
  /** MET Norway's symbol_code, as "lightsnow_day". */
  symbol: string | null;
  precipitation_mm: number | null;
}

/** The weather at one altitude of a resort. */
export interface AltitudeWeather {
  /** The altitude asked; null: MET Norway's own terrain. */
  altitude_m: number | null;
  /** When MET Norway made it. */
  updated_at: string | null;
  /** The next 24 hours, from the one now in. */
  hours: WeatherHour[];
  /** Expected in those hours: an estimate, never a snow report. */
  fresh_snow_cm: number;
  snow_estimate: true;
}

export interface SkiResortWeather {
  resort_id: string;
  /** To show with it: «MET Norway». */
  attribution: string;
  /** An older forecast, as MET Norway did not answer now. */
  stale: boolean;
  base: AltitudeWeather;
  /** Null when the resort has one altitude or none. */
  top: AltitudeWeather | null;
}
