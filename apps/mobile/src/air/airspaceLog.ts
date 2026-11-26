import type { LatLon } from "@shaperoute/shared-types";

import type { Track } from "../navigation/trackRecorder";
import { distanceToOutline, heightOf, withinOutline } from "./airspaceNear";
import type { Airspace } from "./openair";

/**
 * The airspace log after a flight (TASK-479 part E3, ADR-0388): each time
 * the flight was inside a volume of the pilot's file, with when, how long
 * and how deep. Worked out on the phone from the track and the file; it is
 * the pilot's alone and never goes to the server or the Feed.
 *
 * After the flight the ground under each fix is not known: a limit above
 * the ground (AGL) then counts as met, and the entry is marked approximate,
 * as one with a flight level (GPS altitude, not a barometer).
 */

/** A window of time in the air; the log looks only within these. */
export type AirWindow = { startMs: number; endMs: number };

export type LogEntry = {
  airspace: Airspace;
  fromMs: number;
  toMs: number;
  /** The deepest the flight went from the outline, metres. */
  edgeM: number;
  /** The deepest the flight went from floor or ceiling (the nearer of
   * them at each fix), metres; null when neither is a known height (from
   * the ground to unlimited). */
  limitM: number | null;
  /** A flight level, or a height above the ground not known, is in the
   * reckoning. */
  approx: boolean;
};

/** An outline's bounds, degrees. */
export type Box = { south: number; west: number; north: number; east: number };

export function boxOf(points: readonly LatLon[]): Box {
  const box = { south: 90, west: 180, north: -90, east: -180 };
  for (const [lat, lon] of points) {
    box.south = Math.min(box.south, lat);
    box.north = Math.max(box.north, lat);
    box.west = Math.min(box.west, lon);
    box.east = Math.max(box.east, lon);
  }
  return box;
}

export function inBox(box: Box, [lat, lon]: LatLon): boolean {
  return lat >= box.south && lat <= box.north && lon >= box.west && lon <= box.east;
}

/** Whether a fix at `altM` is between the limits of `airspace`, and how far
 * from the nearer one. */
function between(
  airspace: Airspace,
  altM: number,
): { inside: boolean; limitM: number | null; approx: boolean } {
  const floor = heightOf(airspace.floor, null);
  const ceiling = heightOf(airspace.ceiling, null);
  const approx =
    floor.approx || ceiling.approx || floor.metres === null || ceiling.metres === null;
  const aboveFloor = floor.metres === null || altM >= floor.metres;
  const belowCeiling = ceiling.metres === null || altM <= ceiling.metres;
  const margins = [
    floor.metres === null ? Number.POSITIVE_INFINITY : altM - floor.metres,
    ceiling.metres === null ? Number.POSITIVE_INFINITY : ceiling.metres - altM,
  ];
  const least = Math.min(...margins);
  return {
    inside: aboveFloor && belowCeiling,
    limitM: Number.isFinite(least) ? least : null,
    approx,
  };
}

function inWindows(timeMs: number, windows: readonly AirWindow[] | null): boolean {
  return (
    windows === null ||
    windows.some((window) => timeMs >= window.startMs && timeMs <= window.endMs)
  );
}

/**
 * The times the track was inside a volume of `airspaces`, in the order
 * they began. Only fixes with a height, within `windows` (null: all of the
 * track). A gap in the recording, or a fix outside, ends a time inside.
 */
export function airspaceLog(
  track: Track,
  airspaces: readonly Airspace[],
  windows: readonly AirWindow[] | null = null,
): LogEntry[] {
  const boxes = airspaces.map((airspace) => boxOf(airspace.points));
  const open = new Map<number, LogEntry>();
  const done: LogEntry[] = [];
  const close = (index: number) => {
    const entry = open.get(index);
    if (entry !== undefined) {
      done.push(entry);
      open.delete(index);
    }
  };
  for (const fix of track.fixes) {
    const altM = fix.altitudeM;
    const usable =
      altM !== undefined &&
      altM !== null &&
      Number.isFinite(altM) &&
      inWindows(fix.timeMs, windows);
    if (fix.gap === true || !usable) {
      [...open.keys()].forEach(close);
      if (!usable) {
        continue;
      }
    }
    airspaces.forEach((airspace, index) => {
      const here = fix.point;
      const level = usable ? between(airspace, altM as number) : null;
      if (
        level === null ||
        !level.inside ||
        !inBox(boxes[index], here) ||
        !withinOutline(here, airspace.points)
      ) {
        close(index);
        return;
      }
      const edgeM = distanceToOutline(here, airspace.points);
      const entry = open.get(index);
      if (entry === undefined) {
        open.set(index, {
          airspace,
          fromMs: fix.timeMs,
          toMs: fix.timeMs,
          edgeM,
          limitM: level.limitM,
          approx: level.approx,
        });
        return;
      }
      entry.toMs = fix.timeMs;
      entry.edgeM = Math.max(entry.edgeM, edgeM);
      entry.limitM =
        entry.limitM === null || level.limitM === null
          ? (entry.limitM ?? level.limitM)
          : Math.max(entry.limitM, level.limitM);
    });
  }
  [...open.keys()].forEach(close);
  return done.sort((a, b) => a.fromMs - b.fromMs);
}
