import type { BodyProfile } from "../body/bodyProfile";
import { type HeartSettings, maxHeartRate, zonesOf } from "../body/heartZones";
import type { Units } from "../units/units";
import type { WatchMessage } from "./watchMessages";

/**
 * What the watch keeps of the phone's settings (TASK-370 parts A3 and B5):
 * the units, and the heart rate zones of «Heart rate zones» when the phone
 * has them, an age or a max heart rate. The watch shows the zone of the
 * heart rate it measures; it never counts the zones itself. Pure.
 */
export function watchSettings(
  units: Units,
  heart: HeartSettings,
  body: BodyProfile,
  year: number,
  at: number,
): Extract<WatchMessage, { type: "settings" }> {
  const max = maxHeartRate(heart, body, year);
  if (max === null) {
    return { type: "settings", units, at };
  }
  const zones = zonesOf(max.bpm, heart);
  const heartZones = [
    ...zones.map((zone) => zone.fromBpm),
    zones[zones.length - 1].toBpm,
  ];
  return { type: "settings", units, heartZones, at };
}
