import type { LatLon } from "@shaperoute/shared-types";

import type { SnowPart } from "../activities/snowDay";

/** A number on the map of a day of skiing: «1», «2»… on the descents,
 * «L1», «L2»… on the lifts (TASK-429 part B, ADR-0357). */
export type SkiLabel = {
  point: LatLon;
  text: string;
  kind: "lift" | "descent";
};

/** What a part is called on the map and in «Runs»: «3», or «L2». */
export function partName(part: Pick<SnowPart, "kind" | "n">): string {
  return part.kind === "lift" ? `L${part.n}` : String(part.n);
}

/**
 * The numbers of `parts` on the map: each at the fix halfway along its part,
 * so it sits on its own line. A part whose fixes the track has not gives
 * none.
 */
export function skiDayLabels(
  points: readonly LatLon[],
  parts: readonly SnowPart[] | null,
): SkiLabel[] {
  if (parts === null) {
    return [];
  }
  return parts.flatMap((part) => {
    const point = points[Math.round((part.leg.from + part.leg.to) / 2)];
    return point === undefined
      ? []
      : [{ point, text: partName(part), kind: part.kind }];
  });
}
