import type { Activity } from "@shaperoute/shared-types";

import {
  addFix,
  emptyTrack,
  pauseTrack,
  resumeTrack,
  type Track,
} from "../navigation/trackRecorder";
import type { SavedRun, ScorableRun } from "../navigation/trackStore";
import type { WatchTrack } from "./watchTrack";

/**
 * A workout of the Apple Watch as a run of the phone (TASK-370 part B3c2,
 * ADR-0314): the same SavedRun the phone writes for its own, so that the
 * end of a run opens it as it is, with the score of the drawing, «Save» and
 * the form of always (the user's choice «Avviso e scheda»). The line is made
 * again by the phone's own recorder (`addFix`, `pauseTrack`, `resumeTrack`):
 * its distance, its gaps after the pauses, the fixes it leaves out, all as
 * the phone counts them. Pure.
 */

/** A run of the watch: along a route, scored; or without one. */
export type WatchRun =
  { kind: "route"; run: ScorableRun } | { kind: "free"; run: SavedRun };

type Event =
  | { atMs: number; order: 0; pause: "end" }
  | { atMs: number; order: 1; fix: WatchTrack["fixes"][number] }
  | { atMs: number; order: 2; pause: "start" };

/** The track's line as the phone's recorder makes it, the pauses in. */
export function trackOf(watch: WatchTrack): Track {
  const events: Event[] = [
    ...watch.pauses.flatMap((pause): Event[] => [
      { atMs: pause.fromMs, order: 2, pause: "start" },
      { atMs: pause.toMs, order: 0, pause: "end" },
    ]),
    ...watch.fixes.map((fix): Event => ({ atMs: fix.timeMs, order: 1, fix })),
  ];
  // In time; at the same moment a pause ends, then the fix, then one begins.
  events.sort((a, b) => a.atMs - b.atMs || a.order - b.order);
  let track = emptyTrack();
  for (const event of events) {
    if ("fix" in event) {
      const { point, timeMs, accuracyM, altitudeM } = event.fix;
      track = addFix(track, { point, timeMs, accuracyM, altitudeM });
    } else if (event.pause === "start") {
      track = pauseTrack(track, event.atMs);
    } else {
      track = resumeTrack(track, event.atMs);
    }
  }
  return track;
}

/** The watch's workout as the phone's run. */
export function watchRunOf(watch: WatchTrack): WatchRun {
  const activity = watch.activity as Activity;
  const run: SavedRun = {
    version: 1,
    route: watch.route?.points ?? [],
    // A run's file says no sport (trackStore.ts): any other does.
    ...(activity !== "running" ? { activity } : {}),
    track: trackOf(watch),
    status: watch.status,
  };
  const { route } = watch;
  if (route === null) {
    return { kind: "free", run };
  }
  return {
    kind: "route",
    run: {
      ...run,
      // Unknown from a phone older than B3c: the score then counts none.
      similarity: route.similarity ?? 0,
      ...(route.walks.length > 0 ? { walks: route.walks } : {}),
      ...(route.word !== null ? { word: route.word } : {}),
    },
  };
}
