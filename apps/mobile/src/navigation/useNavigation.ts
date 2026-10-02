import type { Direction, LatLon } from "@shaperoute/shared-types";
import * as Location from "expo-location";
import * as Speech from "expo-speech";
import { useEffect, useRef, useState } from "react";
import { Vibration } from "react-native";

import { type Cue, type Navigation, onFix, startNavigation } from "./navigator";
import { emptyTrack, type Track } from "./trackRecorder";
import { type RunRecorder, startRun } from "./trackStore";

/** A fix at least this often apart, in metres: a stride or two. */
export const FIX_EVERY_M = 5;
/** The vibration with each turn, in milliseconds: felt in a pocket. */
export const VIBRATE_MS = 400;

export type NavigationState =
  | { status: "starting" }
  /** `track` is the line run so far, for the numbers of the run (TASK-164). */
  | {
      status: "following";
      navigation: Navigation;
      position: LatLon | null;
      track: Track;
    }
  | { status: "denied" };

/** Says and vibrates what the navigator decided. */
export function play(cues: Cue[]): void {
  for (const cue of cues) {
    if (cue.vibrate) {
      Vibration.vibrate(VIBRATE_MS);
    }
    // Each cue after the last one: a turn is never cut by the next.
    Speech.speak(cue.say, { language: "en-US" });
  }
}

/**
 * Follows the phone's position along the route while `active`, with the
 * screen on (TASK-049), and records the track that is run in a file on the
 * phone (TASK-112). The position never leaves the phone.
 */
export function useNavigation(
  points: LatLon[] | null,
  directions: Direction[],
  active: boolean,
  /** The route's similarity to its shape, kept with the track for the score. */
  similarity?: number,
): NavigationState {
  const [state, setState] = useState<NavigationState>({ status: "starting" });
  const navigation = useRef<Navigation | null>(null);

  useEffect(() => {
    if (!active || points === null) {
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
      const started = startNavigation(points, directions);
      navigation.current = started.navigation;
      // A route stopped lately goes on with its track (trackStore).
      const recorder = startRun(points, Date.now(), similarity);
      run = recorder;
      setState({
        status: "following",
        navigation: started.navigation,
        position: null,
        track: recorder.track(),
      });
      play(started.cues);
      subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          distanceInterval: FIX_EVERY_M,
        },
        ({ coords, timestamp }) => {
          if (stopped || navigation.current === null) {
            return;
          }
          const fix: LatLon = [coords.latitude, coords.longitude];
          const next = onFix(navigation.current, fix, {
            accuracyM: coords.accuracy,
            timeMs: timestamp,
          });
          navigation.current = next.navigation;
          recorder.onFix(
            { point: fix, timeMs: timestamp, accuracyM: coords.accuracy },
            next.navigation.arrived,
          );
          setState({
            status: "following",
            navigation: next.navigation,
            position: fix,
            track: recorder.track(),
          });
          play(next.cues);
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
      void Speech.stop();
      setState({ status: "starting" });
    };
  }, [active, points, directions, similarity]);

  return state;
}

/** The track so far, or an empty one: for the screens that show it. */
export function trackOfNavigation(state: NavigationState): Track {
  return state.status === "following" ? state.track : EMPTY;
}

const EMPTY = emptyTrack();
