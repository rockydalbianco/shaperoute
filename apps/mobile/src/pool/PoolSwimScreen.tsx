import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { gymStyles } from "../gym/gymStyles";
import { t } from "../i18n";
import { clockLabel } from "../navigation/freeRun";
import { HoldButton } from "../screens/HoldButton";
import { color, fontSize, fontWeight, space } from "../theme/tokens";
import { metresLabel } from "./PoolDraw";
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
 * the phone waits at the edge of the pool.
 */
export function PoolSwimScreen({ swim, nowMs }: { swim: PoolSwim; nowMs: number }) {
  const insets = useSafeAreaInsets();
  const paused = isPaused(swim);
  return (
    <View style={gymStyles.screen} testID="pool-swim">
      <View style={[styles.head, { paddingTop: insets.top + space.xl }]}>
        <Text style={gymStyles.muted}>
          {`🏊 ${t("Pool swim")} · ${metresLabel(swim.poolLengthM)}`}
        </Text>
        <Text style={styles.clock} accessibilityRole="timer" testID="pool-clock">
          {clockLabel(activeMs(swim, nowMs))}
        </Text>
        {paused && <Text style={gymStyles.muted}>{t("Paused")}</Text>}
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
