import { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { clockLabel, kmNumber } from "../navigation/freeRun";
import { distanceLabel } from "../navigation/phrases";
import { useRunControl } from "../navigation/runControl";
import { climbM, kcal } from "../navigation/runMetrics";
import {
  aboutMinutes,
  averagePaceS,
  etaMs,
  lastKmS,
  paceClock,
  recentPaceS,
} from "../navigation/runStats";
import { activeMs, openPause, type Track } from "../navigation/trackRecorder";
import { color, fontSize, fontWeight, radius, space } from "../theme/tokens";

/**
 * The numbers of a run in progress (TASK-164, TASK-169), the same with a
 * route and without one. Few of them under the map (`RunStrip`): how far,
 * the pace now and the time. All of them on the page of the data and while
 * the run is paused (`RunGrid`): also the average pace, the last kilometre,
 * the metres climbed and the energy.
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

/** Along a route: the metres left, and the share of it done, 0 to 1. */
export type RouteProgress = { remainingM: number; done: number };

export type RunNumbers = {
  /** "2.34": the kilometres, without their unit. */
  km: string;
  /** "5:21", or NO_NUMBER before the pace means anything. */
  average: string;
  recent: string;
  lastKm: string;
  /** "12:34". */
  time: string;
  /** "42", metres, or NO_NUMBER when the phone gives no height. */
  climb: string;
  /** "187", kilocalories. */
  energy: string;
  /** "3.2 km to go" and "about 17 min", along a route. */
  toGo: string | null;
  eta: string | null;
};

/**
 * The numbers of `track`, again every second while `live`: the GPS is on
 * and the run is not over. The clock waits during the countdown and during
 * a pause, and a run that is over stops it at its last fix.
 */
export function useRunNumbers(
  track: Track,
  live: boolean,
  route?: RouteProgress,
): RunNumbers {
  const { phase } = useRunControl();
  const pause = openPause(track);
  const ticking =
    live && pause === null && phase !== "countdown" && track.fixes.length > 0;
  const now = useNow(ticking, TICK_MS);
  const last = track.fixes[track.fixes.length - 1];
  const at = pause !== null ? pause.fromMs : ticking ? now : (last?.timeMs ?? 0);
  const ms = activeMs(track, at);
  const average = averagePaceS(track, ms);
  const recent = pause === null ? recentPaceS(track, at) : null;
  // Every fix of the run, once per fix and not once per second.
  const lastKm = useMemo(() => lastKmS(track), [track]);
  const climbed = useMemo(() => climbM(track), [track]);
  const eta = route ? etaMs(route.remainingM, track, ms) : null;
  return {
    km: kmNumber(track.distanceM),
    average: average === null ? NO_NUMBER : paceClock(average),
    recent: recent === null ? NO_NUMBER : paceClock(recent),
    lastKm: lastKm === null ? NO_NUMBER : paceClock(lastKm),
    time: clockLabel(ms),
    climb: climbed === null ? NO_NUMBER : String(Math.round(climbed)),
    energy: String(kcal(track.distanceM)),
    toGo: route ? `${distanceLabel(route.remainingM)} to go` : null,
    eta: eta === null ? null : aboutMinutes(eta),
  };
}

/** Under the map, where the map is what is looked at: three numbers, the
 * distance first and largest (TASK-204), with no box around them. */
export function RunStrip({ numbers }: { numbers: RunNumbers }) {
  return (
    <View style={styles.strip}>
      <Metric label="Distance" value={numbers.km} unit="km" lead />
      <View style={styles.divider} />
      <Metric label="Pace now" value={numbers.recent} unit="/km" />
      <View style={styles.divider} />
      <Metric label="Time" value={numbers.time} />
    </View>
  );
}

/** A number of the strip: the value with its unit, its name under it. */
function Metric({
  label,
  value,
  unit,
  lead = false,
}: {
  label: string;
  value: string;
  unit?: string;
  /** The number looked for first: larger, and given more of the width. */
  lead?: boolean;
}) {
  return (
    <View
      style={[styles.metric, lead && styles.metricLead]}
      accessible
      accessibilityLabel={`${label}: ${value}${unit ? ` ${unit}` : ""}`}
    >
      <Value value={value} unit={unit} size={lead ? "lead" : "metric"} />
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

/** A value and, smaller beside it, its unit. */
function Value({
  value,
  unit,
  size,
}: {
  value: string;
  unit?: string;
  size: "lead" | "metric" | "tile";
}) {
  return (
    <View style={styles.valueRow}>
      {/* An hour and more is seven characters: smaller, never cut. */}
      <Text
        style={[styles.value, size === "lead" && styles.valueLead]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
      </Text>
      {unit && <Text style={styles.unit}>{unit}</Text>}
    </View>
  );
}

/** Every number but the distance, three to a row: beside the kilometres
 * on the page of the data, and under them while the run is paused. */
export function RunGrid({ numbers }: { numbers: RunNumbers }) {
  return (
    <View style={styles.grid}>
      <View style={styles.tiles}>
        <Tile label="Pace now" value={numbers.recent} unit="/km" />
        <Tile label="Avg pace" value={numbers.average} unit="/km" />
        <Tile label="Time" value={numbers.time} />
      </View>
      <View style={styles.tiles}>
        <Tile label="Last km" value={numbers.lastKm} unit="/km" />
        <Tile label="Elev. gain" value={numbers.climb} unit="m" />
        <Tile label="Calories" value={numbers.energy} unit="kcal" />
      </View>
    </View>
  );
}

/** How much of the route is run, and what is left of it. */
export function RouteBar({
  route,
  numbers,
}: {
  route: RouteProgress;
  numbers: RunNumbers;
}) {
  const percent = Math.round(route.done * 100);
  return (
    <View style={styles.route}>
      <View
        style={styles.bar}
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: 100, now: percent }}
      >
        <View testID="route-done" style={[styles.done, { width: `${percent}%` }]} />
      </View>
      <View style={styles.left}>
        <Text style={styles.leftText}>{numbers.toGo}</Text>
        {numbers.eta !== null && <Text style={styles.leftText}>{numbers.eta}</Text>}
      </View>
    </View>
  );
}

export function Tile({
  label,
  value,
  unit,
}: {
  label: string;
  value: string;
  unit?: string;
}) {
  return (
    <View
      style={styles.tile}
      accessible
      accessibilityLabel={`${label}: ${value}${unit ? ` ${unit}` : ""}`}
    >
      <Value value={value} unit={unit} size="tile" />
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  strip: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: space.md,
  },
  metric: {
    flex: 1,
    gap: space.xs,
  },
  metricLead: {
    flex: 1.4,
  },
  // A thin line between two numbers, as tall as they are.
  divider: {
    alignSelf: "stretch",
    width: StyleSheet.hairlineWidth,
    backgroundColor: color.border,
  },
  grid: {
    gap: space.sm,
  },
  tiles: {
    flexDirection: "row",
    gap: space.sm,
  },
  tile: {
    flex: 1,
    gap: space.xs,
    paddingVertical: space.md,
    paddingHorizontal: space.md,
    borderRadius: radius.md,
    backgroundColor: color.background,
  },
  valueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: space.xs,
  },
  // Not the yellow: that is the route's and the main action's (ADR-0046).
  value: {
    flexShrink: 1,
    color: color.text,
    fontSize: fontSize.title,
    fontWeight: fontWeight.bold,
    fontVariant: ["tabular-nums"],
  },
  valueLead: {
    fontSize: fontSize.display,
  },
  unit: {
    color: color.textMuted,
    fontSize: fontSize.small,
    fontWeight: fontWeight.semibold,
  },
  // Under the number, small and spaced: read after it, not before.
  label: {
    color: color.textMuted,
    fontSize: fontSize.label,
    fontWeight: fontWeight.semibold,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  route: {
    gap: space.sm,
  },
  bar: {
    height: space.sm,
    borderRadius: radius.pill,
    backgroundColor: color.surfaceRaised,
    overflow: "hidden",
  },
  // The route, as far as it is run: the yellow is the route's.
  done: {
    height: space.sm,
    borderRadius: radius.pill,
    backgroundColor: color.accent,
  },
  left: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: space.md,
  },
  leftText: {
    color: color.textMuted,
    fontSize: fontSize.small,
    fontWeight: fontWeight.semibold,
  },
});
