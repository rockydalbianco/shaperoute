import type { Direction, LatLon } from "@shaperoute/shared-types";
import * as Location from "expo-location";
import * as Speech from "expo-speech";
import { useEffect, useRef, useState } from "react";
import { Vibration } from "react-native";

import { type Cue, type Navigation, onFix, startNavigation } from "./navigator";

/** A fix at least this often apart, in metres: a stride or two. */
export const FIX_EVERY_M = 5;
/** The vibration with each turn, in milliseconds: felt in a pocket. */
export const VIBRATE_MS = 400;

export type NavigationState =
  | { status: "starting" }
  | { status: "following"; navigation: Navigation; position: LatLon | null }
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
 * screen on (TASK-049). The position never leaves the phone.
 */
export function useNavigation(
  points: LatLon[] | null,
  directions: Direction[],
  active: boolean,
): NavigationState {
  const [state, setState] = useState<NavigationState>({ status: "starting" });
  const navigation = useRef<Navigation | null>(null);

  useEffect(() => {
    if (!active || points === null) {
      return;
    }
    let stopped = false;
    let subscription: Location.LocationSubscription | null = null;
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
      setState({
        status: "following",
        navigation: started.navigation,
        position: null,
      });
      play(started.cues);
      subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          distanceInterval: FIX_EVERY_M,
        },
        ({ coords }) => {
          if (stopped || navigation.current === null) {
            return;
          }
          const fix: LatLon = [coords.latitude, coords.longitude];
          const next = onFix(navigation.current, fix);
          navigation.current = next.navigation;
          setState({ status: "following", navigation: next.navigation, position: fix });
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
      void Speech.stop();
      setState({ status: "starting" });
    };
  }, [active, points, directions]);

  return state;
}
