import { useEffect, useRef } from "react";

import type { Track } from "../navigation/trackRecorder";
import type { FlightTask } from "./flightTask";
import { progressOf } from "./taskProgress";
import { callTurnpoint } from "./turnpointCall";
import { useTask } from "./waypointStore";

/**
 * The turnpoints of the pilot's task taken, said aloud while a flight is
 * recorded (TASK-479 part D2): held by the recording, as the vario's
 * sound, so it speaks with the flight screen closed too. What was taken
 * before this hook came (the app opened again in the air) is not said
 * again.
 */

/** The turnpoints taken since `seen`, in order: the newest only when
 * several came at once, so the voice says one sentence. */
export function newlyTaken(
  seen: number,
  taken: readonly { index: number }[],
): number | null {
  return taken.length > seen ? taken[taken.length - 1].index : null;
}

export function useTurnpointCall({
  track,
  takeoffMs,
  sounding,
}: {
  track: Track;
  takeoffMs: number | null;
  /** In the air, recording, not paused. */
  sounding: boolean;
}): void {
  const loaded = useTask();
  const seen = useRef<{ task: FlightTask; count: number } | null>(null);
  useEffect(() => {
    if (loaded === null) {
      seen.current = null;
      return;
    }
    const { task } = loaded;
    const progress = progressOf(task, track.fixes, takeoffMs);
    if (seen.current === null || seen.current.task !== task) {
      // A task just loaded, or this hook just came: nothing to say yet.
      seen.current = { task, count: progress.taken.length };
      return;
    }
    const index = newlyTaken(seen.current.count, progress.taken);
    seen.current = { task, count: progress.taken.length };
    if (index !== null && sounding) {
      callTurnpoint(task, index);
    }
  }, [loaded, track, takeoffMs, sounding]);
}
