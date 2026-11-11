import { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useBody } from "../body/useBody";
import { gymStyles } from "../gym/gymStyles";
import { t } from "../i18n";
import { LiveShareButton } from "../liveShare/LiveShareButton";
import { useLiveShareNumbers } from "../liveShare/useLiveShareNumbers";
import { clockLabel } from "../navigation/freeRun";
import { HoldButton } from "../screens/HoldButton";
import { color, fontSize, fontWeight, space } from "../theme/tokens";
import { averagePace } from "./poolChoice";
import { metresLabel } from "./PoolDraw";
import { poolLiveStats } from "./poolLive";
import {
  activeMs,
  finishPoolSwim,
  isPaused,
  pausePoolSwim,
  type PoolSwim,
  resumePoolSwim,
} from "./poolSwim";
import { changePoolSwim } from "./usePoolSwim";

/**
 * A swim in a pool while it lasts (TASK-400 part B, ADR-0334, point 3): the
 * pool, the time without the pauses, «Pause» and «Stop» to hold. No GPS:
 * the phone waits at the edge of the pool. «Share live» (TASK-424 part B2):
 * the link shows the time, the lengths estimated from the pace and the
 * calories, with no map.
 */
export function PoolSwimScreen({
  swim,
  nowMs,
  fetchFn,
  apiKey,
}: {
  swim: PoolSwim;
  nowMs: number;
  /** For the tests: the fetch and the API key of «Share live». */
  fetchFn?: typeof fetch;
  apiKey?: string | null;
}) {
  const insets = useSafeAreaInsets();
  const paused = isPaused(swim);
  const body = useBody();
  // The pace of the last swims, as «How many lengths?» will propose.
  const [pace] = useState(averagePace);
  // No watch follows a swim in a pool yet: no live heart rate to send.
  const numbers = useCallback(
    (atMs: number) => poolLiveStats(swim, atMs, pace, body, null),
    [swim, pace, body],
  );
  useLiveShareNumbers(numbers, paused);
  // On the screen too, every second (TASK-424 part C1): the lengths and the
  // calories the link sends, estimated from the pace.
  const now = numbers(nowMs);
  return (
    <View style={gymStyles.screen} testID="pool-swim">
      <View style={[styles.head, { paddingTop: insets.top + space.xl }]}>
        <Text style={gymStyles.muted}>
          {`🏊 ${t("Pool swim")} · ${metresLabel(swim.poolLengthM)}`}
        </Text>
        <Text style={styles.clock} accessibilityRole="timer" testID="pool-clock">
          {clockLabel(activeMs(swim, nowMs))}
        </Text>
        <View style={styles.figures}>
          <Figure
            label={t("Lengths")}
            value={String(now.lengths ?? 0)}
            testID="pool-live-lengths"
          />
          <Figure
            label={t("Calories")}
            value={typeof now.kcal === "number" ? String(now.kcal) : "–"}
            unit={typeof now.kcal === "number" ? "kcal" : undefined}
            testID="pool-live-kcal"
            energy
          />
        </View>
        {paused && <Text style={gymStyles.muted}>{t("Paused")}</Text>}
        <LiveShareButton
          canStart={swim.endedMs === null}
          trackless={{ activity: "swimming", poolLengthM: swim.poolLengthM }}
          fetchFn={fetchFn}
          apiKey={apiKey}
        />
      </View>
      <View style={[styles.foot, { paddingBottom: insets.bottom + space.md }]}>
        <Pressable
          style={gymStyles.button}
          onPress={() =>
            changePoolSwim((going, at) =>
              paused ? resumePoolSwim(going, at) : pausePoolSwim(going, at),
            )
          }
          accessibilityRole="button"
          testID="pool-pause"
        >
          <Text style={gymStyles.buttonText}>{paused ? t("Resume") : t("Pause")}</Text>
        </Pressable>
        <HoldButton
          onHeld={() => changePoolSwim((going, at) => finishPoolSwim(going, at))}
        />
      </View>
    </View>
  );
}

/** A number of the swim, its name under it. */
function Figure({
  label,
  value,
  unit,
  testID,
  energy = false,
}: {
  label: string;
  value: string;
  unit?: string;
  testID: string;
  /** The calories: in red (TASK-424 part C3). */
  energy?: boolean;
}) {
  return (
    <View
      style={styles.figure}
      accessible
      accessibilityLabel={`${label}: ${value}${unit ? ` ${unit}` : ""}`}
    >
      <Text style={[styles.value, energy && styles.energy]} testID={testID}>
        {unit ? `${value} ${unit}` : value}
      </Text>
      <Text style={gymStyles.muted}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  head: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: space.sm,
  },
  clock: {
    color: color.text,
    fontSize: fontSize.display,
    fontWeight: fontWeight.bold,
    fontVariant: ["tabular-nums"],
  },
  figures: {
    flexDirection: "row",
    justifyContent: "center",
    gap: space.xl,
  },
  figure: {
    alignItems: "center",
  },
  value: {
    color: color.text,
    fontSize: fontSize.title,
    fontWeight: fontWeight.bold,
    fontVariant: ["tabular-nums"],
  },
  // The calories, in red wherever they are (TASK-424 part C3).
  energy: {
    color: color.energy,
  },
  foot: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.lg,
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: color.border,
  },
});
