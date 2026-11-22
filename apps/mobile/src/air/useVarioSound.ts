import { useEffect, useRef } from "react";

import type { Track } from "../navigation/trackRecorder";
import { thresholdsOf, useVarioPrefs, VOLUME_LEVEL } from "./varioPrefs";
import { playTone, stopTones } from "./varioSound";
import { soundClimbOf, toneFor, type VarioTone } from "./varioTone";

/**
 * The vario's sound while a flight is recorded (TASK-479 part C,
 * ADR-0388): in the air, with the recording going and the sound on, the
 * tone of the climb of the moment, worked out again at every fix and every
 * tick of the clock (`nowMs`), so it goes quiet once the fixes stop. Held
 * by the recording, not by the flight screen: it plays with the screen
 * closed or off too.
 */
export function useVarioSound({
  track,
  nowMs,
  sounding,
}: {
  track: Track;
  nowMs: number;
  /** In the air, recording, not paused. */
  sounding: boolean;
}): void {
  const prefs = useVarioPrefs();
  const previous = useRef<VarioTone>(null);
  const on = sounding && prefs.on;
  useEffect(() => {
    const climb = on ? soundClimbOf(track, nowMs) : null;
    const tone = on ? toneFor(climb, thresholdsOf(prefs), previous.current) : null;
    previous.current = tone;
    playTone(tone, VOLUME_LEVEL[prefs.volume]);
  }, [on, track, nowMs, prefs]);
  // Silence when the recording's screen goes.
  useEffect(() => stopTones, []);
}
