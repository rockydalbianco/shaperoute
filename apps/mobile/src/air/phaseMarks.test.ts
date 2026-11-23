/**
 * The pilot's touches on «On foot | In the air» (TASK-305 part R6b): kept
 * with their flight, in their order, only the last flights'.
 */
import type { KeptList } from "../storage/keptList";
import {
  KEPT_FLIGHTS,
  type KeptMark,
  markPhase,
  phaseMarksOf,
  resetPhaseMarks,
} from "./phaseMarks";

function memory(): KeptList<KeptMark> & { list: KeptMark[] } {
  const kept = {
    list: [] as KeptMark[],
    load: () => [...kept.list],
    save: (list: KeptMark[]) => {
      kept.list = [...list];
      return true;
    },
  };
  return kept;
}

afterEach(() => resetPhaseMarks());

test("a flight's touches, in their order, and only its own", () => {
  const kept = memory();
  markPhase(1000, 5000, "air", kept);
  markPhase(1000, 3000, "foot", kept);
  markPhase(2000, 2500, "air", kept);
  expect(phaseMarksOf(1000, kept)).toEqual([
    { atMs: 3000, kind: "foot" },
    { atMs: 5000, kind: "air" },
  ]);
  expect(phaseMarksOf(2000, kept)).toEqual([{ atMs: 2500, kind: "air" }]);
  expect(phaseMarksOf(9999, kept)).toEqual([]);
  // After a restart of the app, the phone remembers.
  resetPhaseMarks();
  expect(phaseMarksOf(1000, kept)).toHaveLength(2);
});

test("only the last flights' touches are kept", () => {
  const kept = memory();
  for (let flight = 1; flight <= KEPT_FLIGHTS + 2; flight += 1) {
    markPhase(flight * 1000, flight * 1000 + 1, "air", kept);
  }
  const flights = new Set(kept.list.map((mark) => mark.flightMs));
  expect(flights.size).toBe(KEPT_FLIGHTS);
  expect(flights.has((KEPT_FLIGHTS + 2) * 1000)).toBe(true);
  expect(flights.has(1000)).toBe(false);
});
