import { useEffect, useRef } from "react";

import type { Track } from "../navigation/trackRecorder";
import { useAirspaceAlerts } from "./airspaceAlertPrefs";
import { playAirspaceAlert } from "./airspaceAlertSound";
import { alertOf, type Near, nearAirspaces } from "./airspaceNear";
import { useAirspace } from "./airspaceStore";
import { groundNow } from "./groundStore";

/**
 * The airspace warning's sound while a flight is recorded (TASK-479 part
 * E2): in the air, recording, with a file loaded and the sound on, once
 * when a volume comes within the warning, and again every minute while it
 * stays. Held by the recording, as the vario's sound: it plays with the
 * flight screen closed too. The line on the screen is the flight screen's.
 */

/** While the same volume stays within the warning, it sounds again after
 * this long. */
export const ALERT_AGAIN_MS = 60_000;

/** The ground under `here`, metres above the sea, when the page read it
 * near and lately; null otherwise. */
export function groundUnder(here: [number, number], nowMs: number): number | null {
  const ground = groundNow();
  if (ground === null || nowMs - ground.atMs > 60_000) {
    return null;
  }
  const dLat = (ground.point[0] - here[0]) * 111_195;
  const dLon =
    (ground.point[1] - here[1]) * 111_195 * Math.cos((here[0] * Math.PI) / 180);
  return Math.hypot(dLat, dLon) <= 150 ? ground.altM : null;
}

/** The volume to warn of at `nowMs`, or null. */
export function airspaceAlertAt(
  near: readonly Near[] | null,
  thresholds: { horizontalM: number; verticalM: number },
): Near | null {
  return near === null ? null : alertOf(near, thresholds);
}

export function useAirspaceAlert({
  track,
  nowMs,
  sounding,
}: {
  track: Track;
  nowMs: number;
  /** In the air, recording, not paused. */
  sounding: boolean;
}): void {
  const loaded = useAirspace();
  const prefs = useAirspaceAlerts();
  const last = useRef<{ name: string; atMs: number } | null>(null);
  useEffect(() => {
    const fix = track.fixes[track.fixes.length - 1];
    if (!sounding || !prefs.sound || loaded === null || fix === undefined) {
      last.current = null;
      return;
    }
    const altM =
      fix.altitudeM === undefined || fix.altitudeM === null ? null : fix.altitudeM;
    const near = nearAirspaces(
      loaded.airspaces,
      fix.point,
      altM,
      groundUnder(fix.point, nowMs),
    );
    const alert = airspaceAlertAt(near, prefs);
    if (alert === null) {
      last.current = null;
      return;
    }
    const name = `${alert.airspace.class} ${alert.airspace.name}`;
    const again =
      last.current === null ||
      last.current.name !== name ||
      nowMs - last.current.atMs >= ALERT_AGAIN_MS;
    if (again) {
      last.current = { name, atMs: nowMs };
      playAirspaceAlert();
    }
  }, [track, nowMs, sounding, prefs, loaded]);
}
