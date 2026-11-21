import { useEffect } from "react";

import { flightNow, flightStats } from "../air/flight";
import type { Track } from "../navigation/trackRecorder";
import { finishLiveShare, observeLiveShare } from "./liveShareStore";
import { kcalOf, liveStats } from "./liveStats";

/**
 * The recording screen tells the live link what it knows (TASK-424 part
 * B1): the track, the calories it counts, the watch's heart rate and the
 * pause, at each change; and, when it goes away (the activity ended, saved
 * or not), that the activity is over. Nothing is sent without a link: the
 * link starts only from its button. A flight adds the numbers of the air
 * (TASK-305 part R2): altitude, highest altitude, vario, speed.
 */
export function useLiveShareFeed(
  track: Track,
  energy: string | null,
  bpm: number | null,
  paused: boolean,
  flight = false,
): void {
  const kcal = kcalOf(energy);
  useEffect(() => {
    observeLiveShare(
      flight
        ? {
            track,
            kcal,
            bpm,
            paused,
            numbers: (atMs) => ({
              ...liveStats(track, atMs, kcal, bpm),
              ...flightStats(flightNow(track, atMs)),
            }),
          }
        : { track, kcal, bpm, paused },
    );
  }, [track, kcal, bpm, paused, flight]);
  // The screen of the recording goes when the activity ends.
  useEffect(() => () => finishLiveShare(), []);
}
