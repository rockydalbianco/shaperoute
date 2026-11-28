import type { LatLon } from "@shaperoute/shared-types";
import { Directory, File, Paths } from "expo-file-system";

import { activityKey } from "../activities/activityKey";
import type { Track } from "../navigation/trackRecorder";
import { type KeptList, keptList } from "../storage/keptList";

/**
 * The flights kept whole on the phone (TASK-479 part F1, ADR-0388 addition
 * F): every fix with its time, its position and its height. The API keeps
 * of a saved run only its line, so the analysis, the IGC file and the
 * comparison of flights from one take-off read them from here. Nothing of
 * it leaves the phone; a flight from before this version, or saved on
 * another phone, is not here.
 *
 * One file a flight in the folder `flights/` of the documents, named by the
 * flight's key (the same as in «My activities», `activityKey`), and a short
 * list of them (`flights.json`) with when and where each began, so the
 * flights from one take-off are found without reading every file.
 */

/** The folder of the flights' files, in the documents. */
export const FLIGHTS_DIRECTORY = "flights";
/** The list of the flights kept. */
export const FLIGHTS_FILE = "flights.json";
/** The most flights kept: a flight of three hours is some 400 KB. Past it
 * the one that began first goes, file and all. */
export const MAX_FLIGHTS = 100;

/** One fix of a flight. */
export type FlightFix = {
  timeMs: number;
  point: LatLon;
  /** Metres above the sea; null when the phone or the file gave none. */
  altM: number | null;
};

/** Where a kept flight came from: recorded by MuW, or read from an IGC. */
export type FlightSource = "muw" | "igc";

/** A flight in the list. */
export type KeptFlightEntry = {
  key: string;
  source: FlightSource;
  /** Its first fix. */
  startMs: number;
  takeoff: LatLon;
};

/** Where the flights are written: the phone's documents, or a test's. */
export type FlightShelf = {
  list: KeptList<KeptFlightEntry>;
  /** The text of a flight's file; null when there is none. */
  read(key: string): string | null;
  /** False when the phone refuses (full, no access). */
  write(key: string, text: string): boolean;
  remove(key: string): void;
};

function isLatLon(value: unknown): value is LatLon {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    value.every((n) => typeof n === "number" && Number.isFinite(n))
  );
}

function isEntry(value: unknown): value is KeptFlightEntry {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const one = value as Record<string, unknown>;
  return (
    typeof one.key === "string" &&
    /^[0-9a-f]{16}$/.test(one.key) &&
    (one.source === "muw" || one.source === "igc") &&
    typeof one.startMs === "number" &&
    isLatLon(one.takeoff)
  );
}

function fileOf(key: string): File {
  return new File(new Directory(Paths.document, FLIGHTS_DIRECTORY), `${key}.json`);
}

/** The phone's documents. */
export const phoneShelf: FlightShelf = {
  list: keptList(FLIGHTS_FILE, isEntry),
  read(key) {
    try {
      const file = fileOf(key);
      return file.exists ? file.textSync() : null;
    } catch {
      return null;
    }
  },
  write(key, text) {
    try {
      new Directory(Paths.document, FLIGHTS_DIRECTORY).create({
        idempotent: true,
        intermediates: true,
      });
      const file = fileOf(key);
      file.create({ overwrite: true });
      file.write(text);
      return true;
    } catch {
      return false;
    }
  },
  remove(key) {
    try {
      const file = fileOf(key);
      if (file.exists) {
        file.delete();
      }
    } catch {
      // Left behind: the list no longer names it.
    }
  },
};

/** The fixes of a recorded track, in its order. */
export function flightFixesOf(track: Track): FlightFix[] {
  return track.fixes.map((fix) => ({
    timeMs: fix.timeMs,
    point: fix.point,
    altM:
      typeof fix.altitudeM === "number" && Number.isFinite(fix.altitudeM)
        ? fix.altitudeM
        : null,
  }));
}

/** As a file: [time, lat, lon, height] for each fix, a metre's tenth at
 * most, positions to some 10 cm. */
type Stored = { version: 1; source: FlightSource; fixes: [number, number, number, number | null][] };

const round = (value: number, places: number) => {
  const scale = 10 ** places;
  return Math.round(value * scale) / scale;
};

export function flightText(source: FlightSource, fixes: FlightFix[]): string {
  const stored: Stored = {
    version: 1,
    source,
    fixes: fixes.map(({ timeMs, point, altM }) => [
      Math.round(timeMs),
      round(point[0], 6),
      round(point[1], 6),
      altM === null ? null : round(altM, 1),
    ]),
  };
  return JSON.stringify(stored);
}

/** The fixes in a flight's file; null for a file that is not one. */
export function fixesOfText(text: string): FlightFix[] | null {
  try {
    const data = JSON.parse(text) as Partial<Stored>;
    if (data.version !== 1 || !Array.isArray(data.fixes)) {
      return null;
    }
    const fixes: FlightFix[] = [];
    for (const row of data.fixes) {
      if (
        !Array.isArray(row) ||
        row.length !== 4 ||
        typeof row[0] !== "number" ||
        typeof row[1] !== "number" ||
        typeof row[2] !== "number" ||
        (row[3] !== null && typeof row[3] !== "number")
      ) {
        return null;
      }
      fixes.push({ timeMs: row[0], point: [row[1], row[2]], altM: row[3] });
    }
    return fixes;
  } catch {
    return null;
  }
}

/**
 * Keeps a flight whole on the phone, under the key of its first fix (the
 * key of «My activities»). The same flight kept again takes its place.
 * False when it has fewer than two fixes or the phone refuses: nothing is
 * kept then, and the list is as before.
 */
export function keepFlight(
  source: FlightSource,
  fixes: FlightFix[],
  shelf: FlightShelf = phoneShelf,
): boolean {
  const first = fixes[0];
  if (first === undefined || fixes.length < 2) {
    return false;
  }
  const key = activityKey(first);
  if (!shelf.write(key, flightText(source, fixes))) {
    return false;
  }
  const entry: KeptFlightEntry = {
    key,
    source,
    startMs: first.timeMs,
    takeoff: first.point,
  };
  const others = shelf.list.load().filter((one) => one.key !== key);
  const all = [...others, entry].sort((a, b) => a.startMs - b.startMs);
  const gone = all.slice(0, Math.max(0, all.length - MAX_FLIGHTS));
  const kept = all.slice(gone.length);
  if (!shelf.list.save(kept)) {
    // Not in the list: its file is of no use.
    shelf.remove(key);
    return false;
  }
  for (const one of gone) {
    shelf.remove(one.key);
  }
  return true;
}

/** The flights kept, the one that began first first. */
export function keptFlights(shelf: FlightShelf = phoneShelf): KeptFlightEntry[] {
  return shelf.list.load();
}

/** A flight kept whole, by its key; null when it is not on this phone. */
export function keptFlight(key: string, shelf: FlightShelf = phoneShelf): FlightFix[] | null {
  if (!shelf.list.load().some((one) => one.key === key)) {
    return null;
  }
  const text = shelf.read(key);
  return text === null ? null : fixesOfText(text);
}
