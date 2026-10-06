import { Pressable, StyleSheet, Text } from "react-native";
import { t } from "../i18n";

import {
  color,
  fontSize,
  fontWeight,
  MIN_TAP_SIZE,
  radius,
  space,
} from "../theme/tokens";
import type { StartView } from "./useStartDirections";

type Props = {
  start: StartView;
  onStart: () => void;
};

/**
 * Start on a route of "Explore" (TASK-145), yellow as on a drawn route: it
 * asks for the directions first, then turn-by-turn begins. After a failure
 * the same button tries again.
 */
export function ExploreStart({ start, onStart }: Props) {
  const loading = start.status === "loading";
  return (
    <>
      <Pressable
        style={[styles.start, loading && styles.off]}
        onPress={onStart}
        disabled={loading}
        accessibilityRole="button"
        accessibilityState={{ busy: loading, disabled: loading }}
      >
        <Text style={styles.startText}>
          {loading ? t("Getting directions…") : t("Start")}
        </Text>
      </Pressable>
      {start.status === "failed" && <Text style={styles.error}>{start.message}</Text>}
    </>
  );
}

const styles = StyleSheet.create({
  start: {
    minHeight: MIN_TAP_SIZE + space.md,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.lg,
    backgroundColor: color.accent,
  },
  off: {
    opacity: 0.4,
  },
  // Dark on yellow: white does not reach the contrast minimum (ADR-0046).
  startText: {
    color: color.onAccent,
    fontWeight: fontWeight.bold,
    fontSize: fontSize.input,
  },
  error: {
    color: color.error,
    fontSize: fontSize.small,
  },
});
