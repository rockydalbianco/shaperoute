import type { LatLon } from "@shaperoute/shared-types";
import * as Location from "expo-location";
import { useEffect, useState } from "react";

import { FREE_ROUTE } from "./freeRun";
import { emptyTrack, type Track } from "./trackRecorder";
import { type RunRecorder, startRun } from "./trackStore";
import { FIX_EVERY_M } from "./useNavigation";

export type FreeRunState =
  | { status: "starting" }
  /** `position` is null until the GPS gives the first fix. */
  | { status: "running"; track: Track; position: LatLon | null }
  | { status: "denied" };

/**
 * Records a run without a route while `active` (TASK-149): the phone's
 * position, with the screen on or in pocket mode, into the run file of
 * TASK-112. No directions, no voice. The position never leaves the phone.
 */
export function useFreeRun(active: boolean): FreeRunState {
  const [state, setState] = useState<FreeRunState>({ status: "starting" });

  useEffect(() => {
    if (!active) {
      return;
    }
    let stopped = false;
    let subscription: Location.LocationSubscription | null = null;
    let run: RunRecorder | null = null;
    void (async () => {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (stopped) {
        return;
      }
      if (!permission.granted) {
        setState({ status: "denied" });
        return;
      }
      // A free run stopped lately goes on with its track (trackStore).
      const recorder = startRun(FREE_ROUTE, Date.now());
      run = recorder;
      setState({ status: "running", track: recorder.track(), position: null });
      subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          distanceInterval: FIX_EVERY_M,
        },
        ({ coords, timestamp }) => {
          if (stopped) {
            return;
          }
          const fix: LatLon = [coords.latitude, coords.longitude];
          recorder.onFix(
            { point: fix, timeMs: timestamp, accuracyM: coords.accuracy },
            false,
          );
          setState({ status: "running", track: recorder.track(), position: fix });
        },
      );
      if (stopped) {
        subscription.remove();
      }
    })();
    return () => {
      stopped = true;
      subscription?.remove();
      run?.stop();
      setState({ status: "starting" });
    };
  }, [active]);

  return state;
}

/** The track so far, or an empty one: for the screens that show it. */
export function trackOf(state: FreeRunState): Track {
  return state.status === "running" ? state.track : EMPTY;
}

const EMPTY = emptyTrack();
