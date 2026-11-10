import { useEffect } from "react";

import type { Track } from "../navigation/trackRecorder";
import { finishLiveShare, observeLiveShare } from "./liveShareStore";
import { kcalOf } from "./liveStats";

/**
 * The recording screen tells the live link what it knows (TASK-424 part
 * B1): the track, the calories it counts, the watch's heart rate and the
 * pause, at each change; and, when it goes away (the activity ended, saved
 * or not), that the activity is over. Nothing is sent without a link: the
 * link starts only from its button.
 */
export function useLiveShareFeed(
  track: Track,
  energy: string | null,
  bpm: number | null,
  paused: boolean,
): void {
  const kcal = kcalOf(energy);
  useEffect(() => {
    observeLiveShare({ track, kcal, bpm, paused });
  }, [track, kcal, bpm, paused]);
  // The screen of the recording goes when the activity ends.
  useEffect(() => () => finishLiveShare(), []);
}
