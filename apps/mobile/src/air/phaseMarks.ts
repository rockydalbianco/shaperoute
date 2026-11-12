import { useSyncExternalStore } from "react";

import { type KeptList, keptList } from "../storage/keptList";
import type { PhaseKind, PhaseMark } from "./flightParts";

/**
 * The pilot's touches on «On foot | In the air» (TASK-305 part R6b): kept
 * on the phone with the flight they belong to, its first fix's time, so that
 * a flight taken up again after the app was closed, and its end, see them.
 * Only the last flights' are kept.
 */

export const PHASE_MARKS_FILE = "flight-phase-marks.json";
/** The flights whose touches are kept: this one and a few before. */
export const KEPT_FLIGHTS = 3;

export type KeptMark = PhaseMark & { flightMs: number };

function isMark(value: unknown): value is KeptMark {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const { flightMs, atMs, kind } = value as Record<string, unknown>;
  return (
    typeof flightMs === "number" &&
    Number.isFinite(flightMs) &&
    typeof atMs === "number" &&
    Number.isFinite(atMs) &&
    (kind === "foot" || kind === "air")
  );
}

const kept: KeptList<KeptMark> = keptList(PHASE_MARKS_FILE, isMark);
let all: KeptMark[] | null = null;
const listeners = new Set<() => void>();
const NONE: PhaseMark[] = [];
const byFlight = new Map<number, PhaseMark[]>();

function loaded(list: KeptList<KeptMark>): KeptMark[] {
  if (all === null) {
    all = list.load();
  }
  return all;
}

/** The touches of the flight that began at `flightMs`, in their order. */
export function phaseMarksOf(
  flightMs: number,
  list: KeptList<KeptMark> = kept,
): PhaseMark[] {
  const cached = byFlight.get(flightMs);
  if (cached !== undefined) {
    return cached;
  }
  const mine = loaded(list)
    .filter((mark) => mark.flightMs === flightMs)
    .map(({ atMs, kind }) => ({ atMs, kind }))
    .sort((a, b) => a.atMs - b.atMs);
  byFlight.set(flightMs, mine);
  return mine;
}

/** The pilot touched `kind` at `atMs` in the flight of `flightMs`. */
export function markPhase(
  flightMs: number,
  atMs: number,
  kind: PhaseKind,
  list: KeptList<KeptMark> = kept,
): void {
  const flights = [...new Set([flightMs, ...loaded(list).map((m) => m.flightMs)])]
    .sort((a, b) => b - a)
    .slice(0, KEPT_FLIGHTS);
  all = [...loaded(list), { flightMs, atMs, kind }].filter((mark) =>
    flights.includes(mark.flightMs),
  );
  list.save(all);
  byFlight.clear();
  for (const listener of listeners) {
    listener();
  }
}

/** For the tests: as at the start of the app. */
export function resetPhaseMarks(): void {
  all = null;
  byFlight.clear();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** The touches of the flight under way, for a screen; none before its first
 * fix. */
export function usePhaseMarks(flightMs: number | null): PhaseMark[] {
  return useSyncExternalStore(subscribe, () =>
    flightMs === null ? NONE : phaseMarksOf(flightMs),
  );
}
