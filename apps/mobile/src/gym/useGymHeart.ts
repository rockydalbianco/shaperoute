import { useCallback, useEffect, useRef, useState } from "react";

import { appBody } from "../body/bodyProfile";
import { appHeart } from "../body/heartZones";
import { type HeartReader, readHeart } from "../health/heartSamples";
import { keepPoolHeartOn, loadPoolHeartOn } from "../pool/poolHeart";
import type { PoolHeartState } from "../pool/usePoolHeart";
import { gymHeartOf, gymWindow, hasGymWindow } from "./gymHeart";
import type { Workout } from "./workout";

/** Where the heart rate of the workout is, as a swim's (TASK-385 part G):
 * `absent`, `ask`, `reading`, `none` or `heart` (usePoolHeart.ts). */
export type GymHeartState = PoolHeartState;

/**
 * The heart rate of the workout ended: read at once when the user added it
 * before, here or at the end of a swim (one consent for both, the user's
 * «Un sì per tutti»), else on the button's tap, which asks the phone first
 * and is kept as the consent.
 */
export function useGymHeart(
  reader: HeartReader | null,
  workout: Workout,
): { state: GymHeartState; add: () => void } {
  const [state, setState] = useState<GymHeartState>(() =>
    reader === null || !hasGymWindow(workout)
      ? { kind: "absent" }
      : { kind: "reading" },
  );
  const live = useRef(true);
  useEffect(() => {
    live.current = true;
    return () => {
      live.current = false;
    };
  }, []);

  // The window is the workout's start, end and pauses: a set corrected at
  // its end does not read it again.
  const { startedMs, endedMs } = workout;
  const latest = useRef(workout);
  useEffect(() => {
    latest.current = workout;
  }, [workout]);

  const read = useCallback(async () => {
    if (reader === null) {
      return;
    }
    setState({ kind: "reading" });
    const going = latest.current;
    const { fromMs, toMs, pauses } = gymWindow(going);
    const samples = await readHeart(reader, fromMs, toMs, pauses);
    const heart = gymHeartOf(
      samples,
      going,
      appHeart(),
      appBody(),
      new Date(going.startedMs).getFullYear(),
    );
    if (live.current) {
      setState(heart === null ? { kind: "none" } : { kind: "heart", heart });
    }
  }, [reader]);

  useEffect(() => {
    if (reader === null || !hasGymWindow(latest.current)) {
      return;
    }
    let going = true;
    void (async () => {
      const available = await reader.available().catch(() => false);
      if (!going || !live.current) {
        return;
      }
      if (!available) {
        setState({ kind: "absent" });
      } else if (loadPoolHeartOn()) {
        await read();
      } else {
        setState({ kind: "ask" });
      }
    })();
    return () => {
      going = false;
    };
  }, [reader, read, workout.key, startedMs, endedMs]);

  const add = useCallback(() => {
    if (reader === null) {
      return;
    }
    keepPoolHeartOn();
    void (async () => {
      try {
        await reader.ask();
      } catch {
        // A sheet that did not open reads as a refusal: no readings.
      }
      await read();
    })();
  }, [reader, read]);

  return { state, add };
}
