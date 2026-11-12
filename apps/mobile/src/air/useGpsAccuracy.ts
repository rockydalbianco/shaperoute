import * as Location from "expo-location";
import { useEffect, useState } from "react";

import { t } from "../i18n";

/**
 * How good the GPS is before take-off (TASK-305 part R5b, «Ready to fly»):
 * the phone's own reading of its error, in metres, while the flight's
 * «Draw» is on screen. The position goes nowhere: only its error is shown.
 */

/** Up to this error the GPS is ready for a flight's numbers. */
export const GPS_READY_M = 10;

export type GpsState =
  /** No permission, or no GPS: nothing to say here (Draw says it). */
  { kind: "off" } | { kind: "waiting" } | { kind: "fix"; accuracyM: number };

/** Starts reading the error; the function it gives back stops it. */
export type WatchAccuracy = (
  onAccuracy: (metres: number) => void,
) => Promise<(() => void) | null>;

/** The phone's GPS at its best, once a second, without asking again for a
 * permission «Draw» has asked for already. */
export const watchAccuracy: WatchAccuracy = async (onAccuracy) => {
  try {
    const permission = await Location.getForegroundPermissionsAsync();
    if (!permission.granted) {
      return null;
    }
    const subscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: 1000,
        distanceInterval: 0,
      },
      (location) => {
        const metres = location.coords.accuracy;
        if (typeof metres === "number" && Number.isFinite(metres) && metres >= 0) {
          onAccuracy(metres);
        }
      },
    );
    return () => subscription.remove();
  } catch {
    return null;
  }
};

/** The GPS while `on`, stopped as soon as it is not. */
export function useGpsAccuracy(
  on: boolean,
  watch: WatchAccuracy = watchAccuracy,
): GpsState {
  const [state, setState] = useState<GpsState>({ kind: "waiting" });

  useEffect(() => {
    if (!on) {
      return;
    }
    let live = true;
    let stop: (() => void) | null = null;
    void watch((metres) => {
      if (live) {
        setState({ kind: "fix", accuracyM: metres });
      }
    }).then((stopper) => {
      if (!live) {
        stopper?.();
        return;
      }
      if (stopper === null) {
        setState({ kind: "off" });
        return;
      }
      stop = stopper;
    });
    return () => {
      live = false;
      stop?.();
    };
  }, [on, watch]);

  return state;
}

/** «GPS ready · ±5 m», «Weak GPS · ±25 m: wait in the open», «Waiting for
 * GPS…»; null with no GPS to speak of. */
export function gpsLine(state: GpsState): string | null {
  if (state.kind === "off") {
    return null;
  }
  if (state.kind === "waiting") {
    return t("Waiting for GPS…");
  }
  const m = String(Math.max(1, Math.round(state.accuracyM)));
  return state.accuracyM <= GPS_READY_M
    ? t("GPS ready · ±{m} m", { m })
    : t("Weak GPS · ±{m} m: wait in the open", { m });
}
