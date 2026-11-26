import { type LatLon, type Shape, SHAPES } from "@shaperoute/shared-types";
import { File, Paths } from "expo-file-system";

import { metresBetween } from "../map/coordinates";
import { samePick, type SurprisePick } from "./surprisePick";

/**
 * The pairs of «Surprise me» that came out poorly from a start (TASK-448,
 * ADR-0413; the user's choice of 2026-11-26, «Come sempre»): the route was
 * drawn under GOOD_SIMILARITY, or the engine refused the shape there. They
 * stay on the phone, in a file with the point they were asked from, as the
 * shapes of «NEAR YOU» do (TASK-306): the pill does not offer them again
 * from there. Nothing of it leaves the phone.
 */

/** A route at this likeness or more came out well: what the catalogue of
 * «Explore» keeps, and where the engine's own warning stops. */
export const GOOD_SIMILARITY = 0.9;
/** Farther than this from where the pairs were asked, they are forgotten:
 * another start is other streets. As «NEAR YOU» (REDRAW_AFTER_M). */
export const SAME_START_M = 1000;
/** The pairs kept at most: more than every pair a sport has. */
export const MAX_POOR = 60;
export const SURPRISE_FILE = "surprise.json";

/** What the file keeps: the start, and the pairs that came out poorly. */
export type SurpriseKept = { point: LatLon; poor: SurprisePick[] };

export type SurpriseStorage = {
  load: () => SurpriseKept | null;
  save: (kept: SurpriseKept) => void;
};

function isPoint(value: unknown): value is LatLon {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    value.every((n) => typeof n === "number" && Number.isFinite(n))
  );
}

function readPick(value: unknown): SurprisePick | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }
  const { shape, distanceM } = value as Record<string, unknown>;
  return typeof shape === "string" &&
    (SHAPES as readonly string[]).includes(shape) &&
    typeof distanceM === "number" &&
    Number.isFinite(distanceM) &&
    distanceM > 0
    ? { shape: shape as Shape, distanceM }
    : null;
}

/** The file's content, checked: what does not read is as nothing kept. */
export function readSurprise(data: unknown): SurpriseKept | null {
  if (typeof data !== "object" || data === null || !("point" in data)) {
    return null;
  }
  const { point } = data;
  if (!isPoint(point)) {
    return null;
  }
  const listed = "poor" in data && Array.isArray(data.poor) ? data.poor : [];
  const poor: SurprisePick[] = [];
  for (const each of listed) {
    const pick = readPick(each);
    if (pick !== null && !poor.some((other) => samePick(other, pick))) {
      poor.push(pick);
    }
  }
  return { point: [point[0], point[1]], poor: poor.slice(-MAX_POOR) };
}

/** The file in the app's documents. Only this module writes it. */
export const surpriseFile: SurpriseStorage = {
  load() {
    try {
      const file = new File(Paths.document, SURPRISE_FILE);
      return file.exists ? readSurprise(JSON.parse(file.textSync())) : null;
    } catch {
      return null;
    }
  },
  save(kept) {
    try {
      const file = new File(Paths.document, SURPRISE_FILE);
      file.create({ overwrite: true });
      file.write(JSON.stringify(kept));
    } catch {
      // A convenience: without the file a poor pair may come back.
    }
  },
};

/** The pairs that came out poorly from `start`: none when the file is of
 * another start, or there is none. */
export function poorFrom(
  start: LatLon,
  storage: SurpriseStorage = surpriseFile,
): SurprisePick[] {
  const kept = storage.load();
  return kept !== null && metresBetween(kept.point, start) <= SAME_START_M
    ? kept.poor
    : [];
}

/**
 * Keeps `pick` as one that came out poorly from `start`: with the others of
 * the same start, or alone when the file was of another, whose pairs are
 * forgotten. The point kept is the first one, so a start that moves a
 * little at a time does not carry its pairs across the town.
 */
export function keepPoor(
  start: LatLon,
  pick: SurprisePick,
  storage: SurpriseStorage = surpriseFile,
): void {
  const kept = storage.load();
  const here = kept !== null && metresBetween(kept.point, start) <= SAME_START_M;
  const before = here ? kept.poor : [];
  if (before.some((other) => samePick(other, pick))) {
    return;
  }
  storage.save({
    point: here ? kept.point : [start[0], start[1]],
    poor: [...before, pick].slice(-MAX_POOR),
  });
}
