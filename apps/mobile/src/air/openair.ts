import type { LatLon } from "@shaperoute/shared-types";

/**
 * The pilot's airspace file, read (TASK-479 part E, ADR-0388): OpenAir, the
 * plain text most flight instruments load. MuW never includes airspace
 * data: the pilot loads a file of their own, and these are its volumes.
 *
 * Read: `AC` (class; a new volume), `AN` (name), `AL`/`AH` (floor and
 * ceiling), `DP` (a point), `V X=` (a centre), `V D=` (the way an arc
 * goes), `DC` (a circle), `DA` (an arc by angles), `DB` (an arc between
 * two points). Comments (`*`), the extended format's `AY`, `AF`, `AG`, and
 * the drawing hints `SP`, `SB`, `AT`, `TO`, `TC` are known and passed over.
 * Any other line, or one that cannot be read, is skipped and counted: the
 * pilot sees how many.
 *
 * Limits: `GND`/`SFC`, a height above the ground (`AGL`, `AGND`, `ASFC`,
 * `GND`, `SFC` after a number), above the sea (`MSL`, `AMSL`, or none), a
 * flight level (`FL`), `UNL`; in feet unless `m` is written.
 */

export type Limit =
  | { kind: "ground" }
  | { kind: "aboveGround"; metres: number }
  | { kind: "aboveSea"; metres: number }
  | { kind: "flightLevel"; level: number }
  | { kind: "unlimited" };

export type Airspace = {
  /** As the file writes it: R, Q, P, A … G, CTR, TMZ, RMZ, W, GP … */
  class: string;
  name: string;
  floor: Limit;
  ceiling: Limit;
  /** The outline, closed by its first point. */
  points: LatLon[];
};

export type OpenAirResult = {
  airspaces: Airspace[];
  /** Lines skipped: not OpenAir, or not readable. */
  unread: number;
};

export const METRES_PER_FOOT = 0.3048;
const METRES_PER_NM = 1852;
const EARTH_M = 6_371_008.8;
/** An arc is drawn with a point every this many degrees. */
export const ARC_STEP_DEG = 5;

const RAD = Math.PI / 180;

/** The limit an `AL`/`AH` value says, or null. */
export function readLimit(text: string): Limit | null {
  const value = text.toUpperCase().replace(/\s+/g, "");
  if (value === "GND" || value === "SFC" || value === "0") {
    return { kind: "ground" };
  }
  if (/^UNL(IM(ITED)?)?$/.test(value)) {
    return { kind: "unlimited" };
  }
  const level = /^FL(\d{1,3})$/.exec(value);
  if (level !== null) {
    return { kind: "flightLevel", level: Number(level[1]) };
  }
  const height = /^(\d+(?:\.\d+)?)(FT|F|M)?(AGL|AGND|ASFC|GND|SFC|AMSL|MSL)?$/.exec(
    value,
  );
  if (height === null) {
    return null;
  }
  const number = Number(height[1]);
  const metres = height[2] === "M" ? number : number * METRES_PER_FOOT;
  const reference = height[3];
  if (reference === undefined || reference === "MSL" || reference === "AMSL") {
    return { kind: "aboveSea", metres };
  }
  return metres === 0 ? { kind: "ground" } : { kind: "aboveGround", metres };
}

/** Degrees from `D:M:S`, `D:M.m` or `D.d`. */
function degreesOf(text: string): number | null {
  const parts = text.split(":").map(Number);
  if (
    parts.length === 0 ||
    parts.length > 3 ||
    parts.some((part) => !Number.isFinite(part))
  ) {
    return null;
  }
  const [d, m = 0, s = 0] = parts;
  if (m >= 60 || s >= 60) {
    return null;
  }
  return d + m / 60 + s / 3600;
}

/** A point of the file: `45:30:00 N 010:15:30 E`, `45:30.5N 10:15.2E`. */
export function readPoint(text: string): LatLon | null {
  const found = /^\s*([\d.:]+)\s*([NS])\s*,?\s*([\d.:]+)\s*([EW])\s*$/i.exec(text);
  if (found === null) {
    return null;
  }
  const lat = degreesOf(found[1]);
  const lon = degreesOf(found[3]);
  if (lat === null || lon === null || lat > 90 || lon > 180) {
    return null;
  }
  return [
    found[2].toUpperCase() === "S" ? -lat : lat,
    found[4].toUpperCase() === "W" ? -lon : lon,
  ];
}

/** The point `metres` from `from` towards `bearingDeg`. */
export function destination(from: LatLon, bearingDeg: number, metres: number): LatLon {
  const lat1 = from[0] * RAD;
  const lon1 = from[1] * RAD;
  const angle = metres / EARTH_M;
  const bearing = bearingDeg * RAD;
  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(angle) +
      Math.cos(lat1) * Math.sin(angle) * Math.cos(bearing),
  );
  const lon2 =
    lon1 +
    Math.atan2(
      Math.sin(bearing) * Math.sin(angle) * Math.cos(lat1),
      Math.cos(angle) - Math.sin(lat1) * Math.sin(lat2),
    );
  return [lat2 / RAD, ((lon2 / RAD + 540) % 360) - 180];
}

function bearingTo(a: LatLon, b: LatLon): number {
  const [lat1, lon1] = [a[0] * RAD, a[1] * RAD];
  const [lat2, lon2] = [b[0] * RAD, b[1] * RAD];
  const y = Math.sin(lon2 - lon1) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(lon2 - lon1);
  return (Math.atan2(y, x) / RAD + 360) % 360;
}

function distanceTo(a: LatLon, b: LatLon): number {
  const dLat = (b[0] - a[0]) * RAD;
  const dLon = (b[1] - a[1]) * RAD;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a[0] * RAD) * Math.cos(b[0] * RAD) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** The points of an arc around `centre`, from `fromDeg` to `toDeg`, clockwise
 * for `clockwise`, both ends in. */
export function arcPoints(
  centre: LatLon,
  metres: number,
  fromDeg: number,
  toDeg: number,
  clockwise: boolean,
): LatLon[] {
  let sweep = clockwise ? toDeg - fromDeg : fromDeg - toDeg;
  sweep = ((sweep % 360) + 360) % 360;
  if (sweep === 0) {
    sweep = 360;
  }
  const steps = Math.max(1, Math.ceil(sweep / ARC_STEP_DEG));
  const points: LatLon[] = [];
  for (let i = 0; i <= steps; i += 1) {
    const angle = fromDeg + ((clockwise ? 1 : -1) * (sweep * i)) / steps;
    points.push(destination(centre, angle, metres));
  }
  return points;
}

/** The volumes of an OpenAir file's text. */
export function readOpenAir(text: string): OpenAirResult {
  const airspaces: Airspace[] = [];
  let unread = 0;
  let current:
    | (Omit<Airspace, "floor" | "ceiling"> & {
        floor: Limit | null;
        ceiling: Limit | null;
        /** Its lines read so far, the AC line in. */
        lines: number;
      })
    | null = null;
  let centre: LatLon | null = null;
  let clockwise = true;

  const close = () => {
    if (current === null) {
      return;
    }
    if (
      current.points.length >= 3 &&
      current.floor !== null &&
      current.ceiling !== null
    ) {
      airspaces.push({
        class: current.class,
        name: current.name,
        floor: current.floor,
        ceiling: current.ceiling,
        points: current.points,
      });
    } else {
      // A volume without an outline or its limits: its lines read so far
      // are unread too (the others are counted already).
      unread += current.lines;
    }
    current = null;
  };

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/\*.*$/, "").trim();
    if (line === "") {
      continue;
    }
    const space = line.indexOf(" ");
    const key = (space === -1 ? line : line.slice(0, space)).toUpperCase();
    const rest = space === -1 ? "" : line.slice(space + 1).trim();
    if (["AY", "AF", "AG", "SP", "SB", "AT", "TO", "TC"].includes(key)) {
      continue;
    }
    if (key === "AC") {
      close();
      current = {
        class: rest.toUpperCase(),
        name: "",
        floor: null,
        ceiling: null,
        points: [],
        lines: 1,
      };
      centre = null;
      clockwise = true;
      continue;
    }
    if (current === null) {
      unread += 1;
      continue;
    }
    let read = true;
    if (key === "AN") {
      current.name = rest;
    } else if (key === "AL" || key === "AH") {
      const limit = readLimit(rest);
      if (limit === null) {
        read = false;
      } else if (key === "AL") {
        current.floor = limit;
      } else {
        current.ceiling = limit;
      }
    } else if (key === "DP") {
      const point = readPoint(rest);
      if (point === null) {
        read = false;
      } else {
        current.points.push(point);
      }
    } else if (key === "V") {
      const variable = /^([XD])\s*=\s*(.+)$/i.exec(rest);
      if (variable === null) {
        read = false;
      } else if (variable[1].toUpperCase() === "X") {
        centre = readPoint(variable[2]);
        read = centre !== null;
      } else if (variable[2].trim() === "+" || variable[2].trim() === "-") {
        clockwise = variable[2].trim() === "+";
      } else {
        read = false;
      }
    } else if (key === "DC") {
      const nm = Number(rest);
      if (centre === null || !Number.isFinite(nm) || nm <= 0) {
        read = false;
      } else {
        current.points.push(
          ...arcPoints(centre, nm * METRES_PER_NM, 0, 360, true).slice(0, -1),
        );
      }
    } else if (key === "DA") {
      const numbers = rest.split(",").map((part) => Number(part.trim()));
      if (
        centre === null ||
        numbers.length !== 3 ||
        numbers.some((n) => !Number.isFinite(n))
      ) {
        read = false;
      } else {
        const [nm, from, to] = numbers;
        current.points.push(
          ...arcPoints(centre, nm * METRES_PER_NM, from, to, clockwise),
        );
      }
    } else if (key === "DB") {
      const ends = rest.split(",");
      const a = ends.length === 2 ? readPoint(ends[0]) : null;
      const b = ends.length === 2 ? readPoint(ends[1]) : null;
      if (centre === null || a === null || b === null) {
        read = false;
      } else {
        current.points.push(
          ...arcPoints(
            centre,
            distanceTo(centre, a),
            bearingTo(centre, a),
            bearingTo(centre, b),
            clockwise,
          ),
        );
      }
    } else {
      read = false;
    }
    if (read) {
      current.lines += 1;
    } else {
      unread += 1;
    }
  }
  close();
  return { airspaces, unread };
}
