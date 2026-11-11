import type { DrawingDetail, SkiDayPart } from "@shaperoute/shared-types";
import { useEffect, useMemo, useState } from "react";

import type { Leg } from "../activities/snowDay";
import { partsOf } from "../api/skiSeason";
import { useDrawingsDoor } from "../social/drawingsDoor";
import { type SkiLabel, skiDayLabels } from "./skiDayLabels";

/** A saved day of skiing on the map: its lifts as stretches of the post's
 * track, and the numbers of its lifts and descents. */
export type SkiDayMap = { lifts: Leg[]; labels: SkiLabel[] };

/** What the map draws of a saved day from its parts: the lifts whose fixes
 * the server found, and a number on every part that has them. None when no
 * lift has fixes: the day is drawn as before. */
export function skiDayMapOf(
  track: DrawingDetail["track"],
  parts: readonly SkiDayPart[],
): SkiDayMap | null {
  const placed = parts.flatMap((part) =>
    part.from_fix === null ||
    part.to_fix === null ||
    part.to_fix <= part.from_fix ||
    part.to_fix >= track.length
      ? []
      : [{ part, leg: { from: part.from_fix, to: part.to_fix } }],
  );
  const lifts = placed.filter(({ part }) => part.kind === "lift").map(({ leg }) => leg);
  if (lifts.length === 0) {
    return null;
  }
  const labels = skiDayLabels(
    track,
    placed.map(({ part, leg }) => ({
      kind: part.kind,
      n: part.n,
      leg,
      startMs: 0,
      endMs: 0,
      ms: 0,
      metres: part.metres,
      heightM: part.height_m,
      topMps: part.top_mps,
    })),
  );
  return { lifts, labels };
}

/**
 * The map of a post of a day of skiing opened on it (TASK-429 part C,
 * ADR-0357): its descents yellow and its lifts red and dashed, numbered,
 * as at the end of the day, from the parts the server gives with the day
 * (GET /drawings/{id}/ski-day). Null for any other post, and for a day
 * without parts: the map shows it as before.
 */
export function useSkiDayMap(drawing: DrawingDetail | null): SkiDayMap | null {
  const { skiDayOf } = useDrawingsDoor();
  const id = drawing !== null && drawing.activity === "skiing" ? drawing.id : null;
  const [read, setRead] = useState<{ id: string; parts: SkiDayPart[] } | null>(null);
  useEffect(() => {
    if (id === null || skiDayOf === undefined) {
      return;
    }
    let live = true;
    void skiDayOf(id).then((day) => {
      if (live) {
        setRead({ id, parts: partsOf(day) });
      }
    });
    return () => {
      live = false;
    };
  }, [id, skiDayOf]);
  const track = drawing?.track;
  return useMemo(
    () =>
      id === null || track === undefined || read === null || read.id !== id
        ? null
        : skiDayMapOf(track, read.parts),
    [id, read, track],
  );
}
