/**
 * The takeoffs and landings of free flying (TASK-493, ADR-0400, docs/API.md
 * «Flying sites»): GET /flying-sites for a box of the map, GET
 * /flying-sites/{id} with the sites of the other kind near it, and GET
 * /flying-sites/{id}/history with the flights of MuW from a takeoff. The
 * bodies are fixtures/flying-sites.json, flying-site.json and
 * flying-site-history.json; the API's side is shaperoute_api/flying_sites.py
 * and flying_history.py. OpenStreetMap data under the ODbL: the app always
 * shows `attribution` with them. The format is stable: fields are only ever
 * added (TASK-479 D6 reads it too).
 */

/** The widest box one request reads, in degrees a side (MAX_BOX_DEG). */
export const FLYING_SITES_MAX_BOX_DEG = 5;
/** The most sites one box gives (MAX_SITES). */
export const FLYING_SITES_MAX = 1000;
/** The sites of the other kind a site's page names are within this. */
export const FLYING_SITES_NEAR_M = 15_000;
/** Under this many distinct pilots a takeoff's numbers are not shown. */
export const FLYING_HISTORY_MIN_PILOTS = 3;

export const FLYING_SITE_KINDS = ["takeoff", "landing"] as const;
export type FlyingSiteKind = (typeof FLYING_SITE_KINDS)[number];

/** The compass points of `orientation`, clockwise from north. */
export const COMPASS_POINTS = [
  "N",
  "NNE",
  "NE",
  "ENE",
  "E",
  "ESE",
  "SE",
  "SSE",
  "S",
  "SSW",
  "SW",
  "WSW",
  "W",
  "WNW",
  "NW",
  "NNW",
] as const;
export type CompassPoint = (typeof COMPASS_POINTS)[number];

export interface FlyingSite {
  id: number;
  kind: FlyingSiteKind;
  lat: number;
  lon: number;
  name: string | null;
  /** OSM's `ele`, in metres, when known. */
  ele_m: number | null;
  /** The wind directions the site faces; empty when OSM does not say. */
  orientation: CompassPoint[];
  /** free_flying:official, when known. */
  official: boolean | null;
  /** The object on openstreetmap.org. */
  osm_url: string;
  /** Metres away: only in a site's `near`. */
  away_m: number | null;
}

/** GET /flying-sites?south=…&west=…&north=…&east=…[&kind=…][&limit=…] */
export interface FlyingSites {
  sites: FlyingSite[];
  /** The box has more sites: ask a smaller one. */
  more: boolean;
  attribution: string;
}

/** GET /flying-sites/{id} */
export interface FlyingSiteDetail {
  site: FlyingSite;
  /** The sites of the other kind within FLYING_SITES_NEAR_M, the nearest first. */
  near: FlyingSite[];
  attribution: string;
}

export interface FlyingMonth {
  /** YYYY-MM, UTC. */
  month: string;
  flights: number;
  pilots: number;
}

export interface FlyingRecord {
  value: number;
  /** The post of the flight, for everyone. */
  drawing_id: string;
  username: string;
  /** ISO 8601. */
  started_at: string;
}

export interface FlyingRecords {
  /** The most seconds in the air. */
  longest_s: FlyingRecord | null;
  /** The highest altitude reached, metres above sea level. */
  highest_m: FlyingRecord | null;
  /** The most metres in the air. */
  farthest_m: FlyingRecord | null;
}

/** GET /flying-sites/{id}/history?utc_offset_min=… (a takeoff only). */
export interface FlyingHistory {
  site_id: number;
  /** Fewer than FLYING_HISTORY_MIN_PILOTS pilots: the numbers are null. */
  few: boolean;
  flights: number | null;
  pilots: number | null;
  /** Since the asker's local midnight. */
  today: number | null;
  /** The last 12 months, the oldest first. */
  months: FlyingMonth[] | null;
  in_air_now: {
    count: number;
    /** Live shares among them shared with everyone in the Feed. */
    shares: string[];
  };
  records: FlyingRecords;
}
