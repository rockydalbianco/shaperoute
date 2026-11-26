import type { LatLon } from "@shaperoute/shared-types";

/**
 * A track cut in pieces, as the map page holds it: a day of skiing (what
 * was skied, then the lifts) or a race (on foot, then in the air), each
 * group a list of lines in their order (TASK-496 part D, an addition to
 * ADR-0264).
 */
export type Pieces = readonly (readonly (readonly LatLon[])[])[];

/** What the pieces of now are to the pieces told: "same", nothing new;
 * one piece grown at its end, the last of its group, with the points it
 * gained; or "other", anything else (a lift or a flight found, a line
 * that changed), told whole. */
export type Grown = "same" | "other" | { group: number; added: LatLon[] };

function samePoint(a: LatLon, b: LatLon): boolean {
  return a[0] === b[0] && a[1] === b[1];
}

/** Whether `line` is `told`, judged from its ends and length: a track only
 * ever grows at its end. */
function sameLine(told: readonly LatLon[], line: readonly LatLon[]): boolean {
  return (
    told.length === line.length &&
    told.length > 0 &&
    samePoint(told[0], line[0]) &&
    samePoint(told[told.length - 1], line[line.length - 1])
  );
}

/** How `now` follows from `told`: only the last line of one group may
 * have grown, everything else must be as it was. */
export function grownPieces(told: Pieces, now: Pieces): Grown {
  if (told.length !== now.length) {
    return "other";
  }
  let grown: { group: number; added: LatLon[] } | null = null;
  for (let group = 0; group < now.length; group += 1) {
    const before = told[group];
    const after = now[group];
    if (before.length !== after.length) {
      return "other";
    }
    for (let i = 0; i < after.length; i += 1) {
      if (sameLine(before[i], after[i])) {
        continue;
      }
      const old = before[i];
      const line = after[i];
      const longer =
        i === after.length - 1 &&
        grown === null &&
        old.length > 1 &&
        line.length > old.length &&
        samePoint(old[0], line[0]) &&
        samePoint(old[old.length - 1], line[old.length - 1]);
      if (!longer) {
        return "other";
      }
      grown = { group, added: line.slice(old.length) };
    }
  }
  return grown ?? "same";
}
