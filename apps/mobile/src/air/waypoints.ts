import type { LatLon } from "@shaperoute/shared-types";

import { METRES_PER_FOOT } from "./openair";

/**
 * The pilot's waypoints from a file (TASK-479 part D1, ADR-0388): turnpoints
 * and landings, read on the phone from the formats pilots trade:
 *
 * - SeeYou `.cup`: a CSV with a header; `4544.123N` / `01050.000E`
 *   (degrees and minutes); the elevation in `m` or `ft`; the style says a
 *   landing (2 to 5: grass and paved runways, outlandings, gliding fields);
 *   the waypoints end at «-----Related Tasks-----».
 * - CompeGPS `.wpt`: `W  NAME  A  45.7355ºN  10.8350ºE  date time  altitude
 *   description`, in degrees (`U  1`); a file in UTM (`U  0`) is not read.
 * - OziExplorer `.wpt`: four header lines, then `n,name,lat,lon,…`, the
 *   altitude in feet in the 15th field (-777: none).
 * - GEO `.wpt` (`$FormatGEO`): `NAME  N 45 44 07.80  E 010 50 06.00  1234
 *   description`.
 *
 * A line that cannot be read is skipped and counted, as for the airspaces.
 */

export type Waypoint = {
  name: string;
  /** The file's short code, when it has one. */
  code: string | null;
  point: LatLon;
  /** Metres above the sea; null when the file does not say. */
  altM: number | null;
  /** A place to land (SeeYou styles 2–5). */
  landing: boolean;
  description: string | null;
};

export type WaypointResult = { waypoints: Waypoint[]; unread: number };

export type WaypointFormat = "cup" | "compegps" | "ozi" | "geo";

function finite(value: number): number | null {
  return Number.isFinite(value) ? value : null;
}

function inRange(lat: number, lon: number): boolean {
  return Math.abs(lat) <= 90 && Math.abs(lon) <= 180 && !(lat === 0 && lon === 0);
}

/** Splits a CSV line, with fields in double quotes (doubled to escape). */
export function csvFields(line: string): string[] {
  const out: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const c = line[i];
    if (quoted) {
      if (c === '"' && line[i + 1] === '"') {
        field += '"';
        i += 1;
      } else if (c === '"') {
        quoted = false;
      } else {
        field += c;
      }
    } else if (c === '"') {
      quoted = true;
    } else if (c === ",") {
      out.push(field);
      field = "";
    } else {
      field += c;
    }
  }
  out.push(field);
  return out.map((one) => one.trim());
}

/** `4544.123N` or `01050.000E` as degrees; null when not one. */
export function cupAngle(text: string): number | null {
  const match = /^(\d{2,3})(\d{2}\.\d+)([NSEW])$/i.exec(text.trim());
  if (match === null) {
    return null;
  }
  const value = Number(match[1]) + Number(match[2]) / 60;
  return /[SW]/i.test(match[3]) ? -value : value;
}

/** `1234.0m`, `4000ft`, `1234`: metres; null when empty or not a number. */
export function cupElevation(text: string): number | null {
  const match = /^(-?\d+(?:\.\d+)?)\s*(m|ft)?$/i.exec(text.trim());
  if (match === null) {
    return null;
  }
  const value = Number(match[1]);
  return match[2]?.toLowerCase() === "ft" ? value * METRES_PER_FOOT : value;
}

const LANDING_STYLES = new Set([2, 3, 4, 5]);

export function readCup(text: string): WaypointResult {
  const lines = text.split(/\r?\n/);
  const waypoints: Waypoint[] = [];
  let unread = 0;
  let columns: string[] | null = null;
  for (const raw of lines) {
    const line = raw.trim();
    if (line === "") {
      continue;
    }
    if (/^-+\s*Related Tasks/i.test(line)) {
      break;
    }
    const fields = csvFields(line);
    if (columns === null) {
      columns = fields.map((field) => field.toLowerCase());
      if (!columns.includes("lat") || !columns.includes("lon")) {
        // No header: the standard order.
        columns = ["name", "code", "country", "lat", "lon", "elev", "style"];
      } else {
        continue;
      }
    }
    const field = (name: string) => fields[columns?.indexOf(name) ?? -1] ?? "";
    const lat = cupAngle(field("lat"));
    const lon = cupAngle(field("lon"));
    const name = field("name");
    if (lat === null || lon === null || name === "" || !inRange(lat, lon)) {
      unread += 1;
      continue;
    }
    const code = field("code");
    const description = field("desc");
    waypoints.push({
      name,
      code: code === "" ? null : code,
      point: [lat, lon],
      altM: cupElevation(field("elev")),
      landing: LANDING_STYLES.has(Number(field("style"))),
      description: description === "" ? null : description,
    });
  }
  return { waypoints, unread };
}

/** `45.7355ºN` or `10.835°E` as degrees. */
function compeAngle(text: string): number | null {
  const match = /^(\d+(?:\.\d+)?)\s*[º°]?\s*([NSEW])$/i.exec(text.trim());
  if (match === null) {
    return null;
  }
  const value = Number(match[1]);
  return /[SW]/i.test(match[2]) ? -value : value;
}

export function readCompeGps(text: string): WaypointResult {
  const waypoints: Waypoint[] = [];
  let unread = 0;
  let utm = false;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (line === "") {
      continue;
    }
    if (/^U\s+0\b/.test(line)) {
      utm = true;
      continue;
    }
    if (/^[GUz]\s/.test(line) || /^w\s/.test(line)) {
      continue;
    }
    if (!/^W\s/.test(line)) {
      unread += 1;
      continue;
    }
    const parts = line.split(/\s+/);
    // W NAME A LAT LON DATE TIME ALT DESCRIPTION…
    const lat = utm ? null : compeAngle(parts[3] ?? "");
    const lon = utm ? null : compeAngle(parts[4] ?? "");
    if (lat === null || lon === null || !inRange(lat, lon)) {
      unread += 1;
      continue;
    }
    const alt = finite(Number(parts[7]));
    const description = parts.slice(8).join(" ");
    waypoints.push({
      name: parts[1],
      code: null,
      point: [lat, lon],
      altM: alt,
      landing: false,
      description: description === "" ? null : description,
    });
  }
  return { waypoints, unread };
}

const OZI_NO_ALTITUDE = -777;

export function readOzi(text: string): WaypointResult {
  const lines = text.split(/\r?\n/).slice(4);
  const waypoints: Waypoint[] = [];
  let unread = 0;
  for (const raw of lines) {
    if (raw.trim() === "") {
      continue;
    }
    const fields = csvFields(raw);
    const lat = Number(fields[2]);
    const lon = Number(fields[3]);
    const name = fields[1] ?? "";
    if (
      fields.length < 4 ||
      name === "" ||
      fields[2] === "" ||
      fields[3] === "" ||
      !Number.isFinite(lat) ||
      !Number.isFinite(lon) ||
      !inRange(lat, lon)
    ) {
      unread += 1;
      continue;
    }
    const feet = Number(fields[14]);
    const description = fields[10] ?? "";
    waypoints.push({
      name,
      code: null,
      point: [lat, lon],
      altM:
        fields[14] === undefined ||
        fields[14] === "" ||
        !Number.isFinite(feet) ||
        feet === OZI_NO_ALTITUDE
          ? null
          : feet * METRES_PER_FOOT,
      landing: false,
      description: description === "" ? null : description,
    });
  }
  return { waypoints, unread };
}

const GEO_LINE =
  /^(.+?)\s+([NS])\s+(\d{1,2})\s+(\d{1,2})\s+(\d{1,2}(?:\.\d+)?)\s+([EW])\s+(\d{1,3})\s+(\d{1,2})\s+(\d{1,2}(?:\.\d+)?)(?:\s+(-?\d+(?:\.\d+)?)(?=\s|$))?\s*(.*)$/;

export function readGeo(text: string): WaypointResult {
  const waypoints: Waypoint[] = [];
  let unread = 0;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (line === "" || line.startsWith("$")) {
      continue;
    }
    const match = GEO_LINE.exec(line);
    if (match === null) {
      unread += 1;
      continue;
    }
    const sign = (hemisphere: string) => (/[SW]/.test(hemisphere) ? -1 : 1);
    const lat =
      sign(match[2]) *
      (Number(match[3]) + Number(match[4]) / 60 + Number(match[5]) / 3600);
    const lon =
      sign(match[6]) *
      (Number(match[7]) + Number(match[8]) / 60 + Number(match[9]) / 3600);
    if (!inRange(lat, lon)) {
      unread += 1;
      continue;
    }
    const description = match[11].trim();
    waypoints.push({
      name: match[1].trim(),
      code: null,
      point: [lat, lon],
      altM: match[10] === undefined ? null : Number(match[10]),
      landing: false,
      description: description === "" ? null : description,
    });
  }
  return { waypoints, unread };
}

/** Which format a waypoint file is in, from its first lines and name. */
export function waypointFormat(text: string, fileName: string): WaypointFormat | null {
  const head = text.trimStart().slice(0, 200);
  if (/^\$FormatGEO/i.test(head)) {
    return "geo";
  }
  if (/^OziExplorer Waypoint File/i.test(head)) {
    return "ozi";
  }
  if (/^G\s+WGS/i.test(head) || /^\s*W\s+\S+\s+A\s/m.test(text)) {
    return "compegps";
  }
  if (/\.cup$/i.test(fileName) || /^name\s*,\s*code/i.test(head)) {
    return "cup";
  }
  return null;
}

/** The waypoints of a file in any of the formats above. */
export function readWaypoints(text: string, fileName: string): WaypointResult {
  switch (waypointFormat(text, fileName)) {
    case "cup":
      return readCup(text);
    case "compegps":
      return readCompeGps(text);
    case "ozi":
      return readOzi(text);
    case "geo":
      return readGeo(text);
    case null:
      return {
        waypoints: [],
        unread: text.split(/\r?\n/).filter((l) => l.trim()).length,
      };
  }
}
