import { type FilePoint, type FileTrack, positionOf } from "./fileTrack";

/**
 * An IGC file (TASK-479 part F1, ADR-0388 addition F; it takes the place of
 * part E of TASK-305): the track of a flight as variometers and flight
 * apps write it. Only the B records (time, position, heights) and the date
 * (HFDTE) are read. The pilot's and the glider's names (HFPLT, HFCM2,
 * HFGTY, HFGID) and everything else are not read, so nothing of them can
 * be shown or published.
 *
 * Heights: the GPS's when the file has them (not all 0), else the pressure
 * height (a recorder without a GPS height); a B record marked V (no 3D fix)
 * has no GPS height. A day is added each time the clock goes back over
 * midnight; a second HFDTE (two files run together) starts a new day.
 */

const B_RECORD =
  /^B(\d{2})(\d{2})(\d{2})(\d{2})(\d{5})([NS])(\d{3})(\d{5})([EW])([AV])([-\d]{5})([-\d]{5})/;
const DATE_RECORD = /^HFDTE(?:DATE:)?(\d{2})(\d{2})(\d{2})/;

const DAY_MS = 86_400_000;
/** The clock going back more than this is the next day. */
const BACK_OVER_MIDNIGHT_S = 12 * 3600;

/** Whether `text` is an IGC file: it begins with its A record and has a
 * header (H) record. A file with neither is not read as one. */
export function isIgc(text: string): boolean {
  const head = text.slice(0, 4096).replace(/^﻿/, "").trimStart();
  return /^A[A-Z0-9]{3}/.test(head) && /(?:^|\n)H[FOP]/.test(head);
}

type Row = {
  seconds: number;
  dayMs: number | null;
  point: FilePoint["point"];
  valid: boolean;
  pressure: number;
  gnss: number;
};

function heightOf(field: string): number {
  const value = Number(field);
  return Number.isFinite(value) ? value : 0;
}

function dayOf(match: RegExpMatchArray): number | null {
  const [day, month, yy] = [Number(match[1]), Number(match[2]), Number(match[3])];
  if (day < 1 || day > 31 || month < 1 || month > 12) {
    return null;
  }
  // IGC is from 1995 on: 95–99 are the 1900s.
  return Date.UTC(yy >= 90 ? 1900 + yy : 2000 + yy, month - 1, day);
}

/** The flight in an IGC file, as «Add past activity» reads any file. */
export function readIgc(text: string): FileTrack {
  const rows: Row[] = [];
  let dayMs: number | null = null;
  let lastSeconds = -1;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    const date = DATE_RECORD.exec(line);
    if (date !== null) {
      dayMs = dayOf(date);
      lastSeconds = -1;
      continue;
    }
    const b = B_RECORD.exec(line);
    if (b === null) {
      continue;
    }
    const [h, m, s] = [Number(b[1]), Number(b[2]), Number(b[3])];
    if (h > 23 || m > 59 || s > 59) {
      continue;
    }
    const seconds = h * 3600 + m * 60 + s;
    if (
      dayMs !== null &&
      lastSeconds >= 0 &&
      seconds < lastSeconds - BACK_OVER_MIDNIGHT_S
    ) {
      dayMs += DAY_MS;
    }
    lastSeconds = seconds;
    const lat = (Number(b[4]) + Number(b[5]) / 60_000) * (b[6] === "S" ? -1 : 1);
    const lon = (Number(b[7]) + Number(b[8]) / 60_000) * (b[9] === "W" ? -1 : 1);
    rows.push({
      seconds,
      dayMs,
      point: positionOf(lat, lon),
      valid: b[10] === "A",
      pressure: heightOf(b[11]),
      gnss: heightOf(b[12]),
    });
  }
  const byGps = rows.some((row) => row.valid && row.gnss !== 0);
  const byPressure = !byGps && rows.some((row) => row.pressure !== 0);
  const points: FilePoint[] = rows.map((row) => ({
    point: row.point,
    timeMs: row.dayMs === null ? null : row.dayMs + row.seconds * 1000,
    altitudeM: byGps ? (row.valid ? row.gnss : null) : byPressure ? row.pressure : null,
  }));
  return { points, sport: "paragliding", igc: true };
}
