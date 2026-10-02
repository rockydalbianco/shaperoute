import type { LatLon } from "@shaperoute/shared-types";

import type { ActivityRequest } from "../api/activities";
import type { SavedRun } from "../navigation/trackStore";
import { activityKey } from "./activityKey";

/**
 * A run that ended, as «My activities» keeps it (TASK-172): its key, and
 * what PUT /me/activities/{key} takes. The fixes and the pauses go as they
 * were recorded: metres, seconds and score are the API's to count.
 */
export type RecordedRun = { id: string; request: ActivityRequest };

/** What the route of a run draws, when the app still knows. */
export type Drawn = {
  shape: string | null;
  word: string | null;
  style: "round" | "block" | null;
  title: string | null;
};

/** The API's limits (activities.py): longer texts are cut, not refused. */
const MAX_NAME = 40;
const MAX_TITLE = 60;

function cut(text: string | null, length: number): string | null {
  return text === null ? null : text.slice(0, length);
}

/** Whether two lines are the same points in the same order. */
export function sameLine(a: LatLon[], b: LatLon[]): boolean {
  return (
    a.length === b.length &&
    a.every(([lat, lon], i) => lat === b[i][0] && lon === b[i][1])
  );
}

/**
 * The run in `run`, to send; null when it has no line. `drawn` is what its
 * route draws: left out for a run without a route.
 */
export function recordedRun(run: SavedRun, drawn: Drawn | null): RecordedRun | null {
  const { fixes, pauses = [] } = run.track;
  if (fixes.length < 2) {
    return null;
  }
  // A route is sent whole or not at all: its line and its similarity.
  const withRoute = run.route.length >= 2 && run.similarity !== undefined;
  const what = withRoute ? drawn : null;
  return {
    id: activityKey(fixes[0]),
    request: {
      track: fixes.map((fix) => ({
        point: fix.point,
        time_ms: fix.timeMs,
        accuracy_m: fix.accuracyM,
      })),
      // A pause still open has nothing of the run after it.
      pauses: pauses.flatMap((pause) =>
        pause.toMs === null || pause.toMs < pause.fromMs
          ? []
          : [{ from_ms: pause.fromMs, to_ms: pause.toMs, auto: pause.auto === true }],
      ),
      points: withRoute ? run.route : null,
      similarity:
        withRoute && run.similarity !== undefined
          ? Math.min(1, Math.max(0, run.similarity))
          : null,
      shape: cut(what?.shape ?? null, MAX_NAME),
      word: cut(what?.word ?? null, MAX_NAME),
      style: what?.style ?? null,
      title: cut(what?.title ?? null, MAX_TITLE),
    },
  };
}
