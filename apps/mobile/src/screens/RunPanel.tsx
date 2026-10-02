import { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { clockLabel, kmLabel } from "../navigation/freeRun";
import { distanceLabel } from "../navigation/phrases";
import {
  aboutMinutes,
  averagePaceS,
  etaMs,
  lastKmS,
  paceClock,
  recentPaceS,
} from "../navigation/runStats";
import type { Track } from "../navigation/trackRecorder";
import { color, fontSize, fontWeight, radius, space } from "../theme/tokens";

/**
 * The numbers of a run in progress (TASK-164), the same with a route and
 * without one: how far in large, beside it what is left or the last
 * kilometre, and under it the average pace, the pace now and the time.
 */

/** The clock ticks once a second. */
export const TICK_MS = 1000;

/** No number yet: the pace before it means anything. */
export const NO_NUMBER = "–";

/** Now, again every `everyMs` while `on`. */
export function useNow(on: boolean, everyMs: number): number {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    if (!on) {
      return;
    }
    // Stale for at most a tick: the clock never goes below 0:00.
    const timer = setInterval(() => setNow(Date.now()), everyMs);
    return () => clearInterval(timer);
  }, [on, everyMs]);
  return now;
}

type Props = {
  /** The line run so far. */
  track: Track;
  /** The clock runs: the GPS is on and the run is not over. */
  ticking: boolean;
  /** Along a route: the metres left, and the share of it done, 0 to 1. */
  route?: { remainingM: number; done: number };
};

export function RunPanel({ track, ticking, route }: Props) {
  const now = useNow(ticking, TICK_MS);
  const first = track.fixes[0];
  const last = track.fixes[track.fixes.length - 1];
  // A run that is over stops its clock at the last fix.
  const at = ticking ? now : (last?.timeMs ?? 0);
  const ms = first === undefined ? 0 : Math.max(0, at - first.timeMs);
  const average = averagePaceS(track, ms);
  const recent = recentPaceS(track, at);
  // Every fix of the run, once per fix and not once per second.
  const lastKm = useMemo(() => lastKmS(track), [track]);
  const eta = route ? etaMs(route.remainingM, track, ms) : null;
  const side = route
    ? {
        top: `${distanceLabel(route.remainingM)} to go`,
        bottom: eta === null ? null : aboutMinutes(eta),
      }
    : lastKm === null
      ? null
      : { top: "Last km", bottom: `${paceClock(lastKm)} /km` };
  return (
    <View style={styles.panel}>
      <View style={styles.head}>
        <Text
          style={styles.km}
          accessibilityLabel={`Distance: ${kmLabel(track.distanceM)}`}
        >
          {kmLabel(track.distanceM)}
        </Text>
        {side && (
          <View style={styles.side}>
            <Text style={styles.sideText}>{side.top}</Text>
            {side.bottom !== null && <Text style={styles.sideText}>{side.bottom}</Text>}
          </View>
        )}
      </View>
      {route && (
        <View
          style={styles.bar}
          accessibilityRole="progressbar"
          accessibilityValue={{ min: 0, max: 100, now: Math.round(route.done * 100) }}
        >
          <View
            testID="route-done"
            style={[styles.done, { width: `${Math.round(route.done * 100)}%` }]}
          />
        </View>
      )}
      <View style={styles.tiles}>
        <Tile
          label="Avg pace"
          value={average === null ? NO_NUMBER : paceClock(average)}
          unit="/km"
        />
        <Tile
          label="Pace now"
          value={recent === null ? NO_NUMBER : paceClock(recent)}
          unit="/km"
        />
        <Tile label="Time" value={clockLabel(ms)} />
      </View>
    </View>
  );
}

function Tile({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <View
      style={styles.tile}
      accessible
      accessibilityLabel={`${label}: ${value}${unit ? ` ${unit}` : ""}`}
    >
      <View style={styles.labels}>
        <Text style={styles.label}>{label}</Text>
        {unit && <Text style={styles.label}>{unit}</Text>}
      </View>
      {/* An hour and more is seven characters: smaller, never cut. */}
      <Text style={styles.value} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    gap: space.md,
  },
  head: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: space.md,
  },
  // Not the yellow: that is the route's and the main action's (ADR-0046).
  km: {
    color: color.text,
    fontSize: fontSize.display,
    fontWeight: fontWeight.bold,
  },
  side: {
    alignItems: "flex-end",
    paddingBottom: space.xs,
  },
  sideText: {
    color: color.textMuted,
    fontSize: fontSize.small,
  },
  bar: {
    height: space.xs,
    borderRadius: radius.pill,
    backgroundColor: color.surfaceRaised,
    overflow: "hidden",
  },
  // The route, as far as it is run: the yellow is the route's.
  done: {
    height: space.xs,
    borderRadius: radius.pill,
    backgroundColor: color.accent,
  },
  tiles: {
    flexDirection: "row",
    gap: space.sm,
  },
  tile: {
    flex: 1,
    gap: space.xs,
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
    borderRadius: radius.md,
    backgroundColor: color.background,
  },
  labels: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: space.xs,
  },
  label: {
    color: color.textMuted,
    fontSize: fontSize.detail,
  },
  value: {
    color: color.text,
    fontSize: fontSize.title,
    fontWeight: fontWeight.bold,
  },
});
