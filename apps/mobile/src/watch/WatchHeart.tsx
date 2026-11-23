import { useSyncExternalStore } from "react";
import { StyleSheet, Text } from "react-native";

import {
  appHeart,
  maxHeartRate,
  subscribeHeart,
  type Zone,
  zonesOf,
} from "../body/heartZones";
import { useBody } from "../body/useBody";
import { t, tLater } from "../i18n";
import { color, fontSize, fontWeight } from "../theme/tokens";

/** The zones' names, the ones of «Heart rate zones» (HeartZonesPage). */
const ZONE_NAMES: readonly string[] = [
  tLater("Zone 1 Recovery"),
  tLater("Zone 2 Endurance"),
  tLater("Zone 3 Tempo"),
  tLater("Zone 4 Threshold"),
  tLater("Zone 5 Max"),
];

/** The zone `bpm` is in: over the max still the last; under the first
 * none. */
export function zoneOf(bpm: number, zones: readonly Zone[]): Zone | null {
  if (zones.length === 0 || bpm < zones[0].fromBpm) {
    return null;
  }
  return zones.find((zone) => bpm < zone.toBpm) ?? zones[zones.length - 1];
}

/**
 * The heart rate the Apple Watch measures, on the run's card (TASK-370
 * part A3): «♥ 142 bpm», and its zone when «Heart rate zones» has them (an
 * age or a max heart rate). Nothing without a watch.
 */
export function WatchHeart({ bpm }: { bpm: number | null }) {
  const heart = useSyncExternalStore(subscribeHeart, appHeart);
  const body = useBody();
  if (bpm === null) {
    return null;
  }
  const max = maxHeartRate(heart, body, new Date().getFullYear());
  const zone = max === null ? null : zoneOf(bpm, zonesOf(max.bpm, heart));
  const text =
    zone === null ? `♥ ${bpm} bpm` : `♥ ${bpm} bpm · ${t(ZONE_NAMES[zone.number - 1])}`;
  return (
    <Text style={styles.line} numberOfLines={1} testID="watch-heart">
      {text}
    </Text>
  );
}

const styles = StyleSheet.create({
  line: {
    textAlign: "center",
    color: color.textMuted,
    fontSize: fontSize.small,
    fontWeight: fontWeight.semibold,
    fontVariant: ["tabular-nums"],
  },
});
