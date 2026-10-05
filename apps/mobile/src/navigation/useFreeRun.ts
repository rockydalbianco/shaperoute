import type { LatLon } from "@shaperoute/shared-types";
import * as Location from "expo-location";
import * as Speech from "expo-speech";
import { useEffect, useState } from "react";

import { loadVoices, speaking } from "../voice/voiceChoice";
import { FREE_ROUTE, kmAnnouncement, wholeKm } from "./freeRun";
import { kmComparison } from "./kmCompare";
import { controlRun, type RunSession } from "./runControl";
import { emptyTrack, type Track } from "./trackRecorder";
import { startRun } from "./trackStore";
import { FIX_EVERY_M, play } from "./useNavigation";

export type FreeRunState =
  | { status: "starting" }
  /** `position` is null until the GPS gives the first fix. */
  | { status: "running"; track: Track; position: LatLon | null }
  | { status: "denied" };

/**
 * Records a run without a route while `active` (TASK-149): the phone's
 * position, with the screen on or in pocket mode, into the run file of
 * TASK-112. No directions: the voice says each kilometre, with the time
 * and the pace, and from the second how it went against the one before
 * (TASK-217). The countdown, «Pause» and the pause by standing still are
 * runControl's (TASK-169). The position never leaves the phone.
 */
export function useFreeRun(active: boolean): FreeRunState {
  const [state, setState] = useState<FreeRunState>({ status: "starting" });

  useEffect(() => {
    if (!active) {
      return;
    }
    let stopped = false;
    let subscription: Location.LocationSubscription | null = null;
    let run: RunSession | null = null;
    let stopRecording: (() => void) | null = null;
    // The phone's voices, before the first kilometre (TASK-209).
    void loadVoices();
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
      stopRecording = recorder.stop;
      // A run that goes on does not say again the kilometres it has said.
      let saidKm = wholeKm(recorder.track());
      let position: LatLon | null = null;
      const session = controlRun(recorder, {
        // «Pause» and «Resume» change the track between two fixes.
        onChange: () => {
          if (!stopped) {
            setState({ status: "running", track: recorder.track(), position });
          }
        },
        say: (text) => play([{ say: text, vibrate: false }]),
      });
      run = session;
      setState({ status: "running", track: recorder.track(), position });
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
          position = fix;
          session.onFix(
            {
              point: fix,
              timeMs: timestamp,
              accuracyM: coords.accuracy,
              altitudeM: coords.altitude,
            },
            false,
          );
          const track = recorder.track();
          const km = wholeKm(track);
          if (km > saidKm) {
            saidKm = km;
            const { language } = speaking();
            play([{ say: kmAnnouncement(km, track, language), vibrate: false }]);
            // Then how it went against the one before (TASK-217).
            const compared = kmComparison(km, track, language);
            if (compared !== null) {
              play([{ say: compared, vibrate: false }]);
            }
          }
          setState({ status: "running", track, position: fix });
        },
      );
      if (stopped) {
        subscription.remove();
      }
    })();
    return () => {
      stopped = true;
      subscription?.remove();
      run?.end();
      stopRecording?.();
      void Speech.stop();
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
