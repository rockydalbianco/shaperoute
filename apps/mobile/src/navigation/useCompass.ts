import * as Location from "expo-location";
import { useEffect, useRef, useState } from "react";

import { type CompassReading, keepReading } from "./headingUp";

/**
 * The phone's compass while `on` (TASK-422, ADR-0350): the last reading
 * kept, null without one or while off. Read through expo-location, which
 * the run already has for the GPS: no new dependency. A reading replaces
 * the kept one only when the needle moved (`keepReading`), so the screen
 * is not drawn for every tenth of a degree. Best effort: a phone without a
 * compass, or one that refuses, gives null and the map takes the line run.
 * Turned on again, the last reading of before may show until the needle
 * speaks: it is dated (`atMs`), for whoever must tell.
 */
export function useCompass(on: boolean): CompassReading | null {
  const [reading, setReading] = useState<CompassReading | null>(null);
  const kept = useRef<CompassReading | null>(null);

  useEffect(() => {
    if (!on) {
      kept.current = null;
      return;
    }
    let live = true;
    let subscription: Location.LocationSubscription | null = null;
    Location.watchHeadingAsync(({ trueHeading, magHeading, accuracy }) => {
      if (!live) {
        return;
      }
      const next: CompassReading = {
        trueHeading,
        magHeading,
        accuracy,
        atMs: Date.now(),
      };
      if (keepReading(kept.current, next)) {
        kept.current = next;
        setReading(next);
      }
    })
      .then((made) => {
        if (live) {
          subscription = made;
        } else {
          made.remove();
        }
      })
      .catch(() => {});
    return () => {
      live = false;
      subscription?.remove();
    };
  }, [on]);

  return on ? reading : null;
}
