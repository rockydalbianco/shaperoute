import type { LiveStats } from "@shaperoute/shared-types";
import { useEffect } from "react";

import { finishLiveShare, observeLiveNumbers } from "./liveShareStore";

/**
 * A recording screen without a track tells the live link what it knows
 * (TASK-424 part B2): a swim in a pool, a workout at the gym. `numbers`
 * gives them at a time, so the clock needs no new value each second: it is
 * read at each update; a new `numbers` (a pause, a set) or `paused` goes at
 * once. When the screen goes (the activity ended, saved or not), the
 * activity is over. As useLiveShareFeed for the track; nothing is sent
 * without a link, and the link starts only from its button.
 */
export function useLiveShareNumbers(
  numbers: (atMs: number) => LiveStats,
  paused: boolean,
): void {
  useEffect(() => {
    observeLiveNumbers(numbers, paused);
  }, [numbers, paused]);
  // The screen of the recording goes when the activity ends.
  useEffect(() => () => finishLiveShare(), []);
}
