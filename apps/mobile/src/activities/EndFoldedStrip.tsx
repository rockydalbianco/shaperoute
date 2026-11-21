import type { Activity } from "@shaperoute/shared-types";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { t } from "../i18n";
import type { Track } from "../navigation/trackRecorder";
import { useRunNumbers } from "../screens/RunPanel";
import {
  color,
  fontSize,
  fontWeight,
  MIN_TAP_SIZE,
  radius,
  space,
} from "../theme/tokens";

/**
 * The card at the end of an activity, folded (TASK-478 part b, the user's
 * choice of 2026-11-18, «Scheda che si piega»): as the card of a run while
 * it records (TASK-472), only a strip is left, how far and how long, with
 * «Save» beside them, so that the map takes the rest of the screen.
 * Touched, the strip opens the card again. Without an account there is no
 * «Save» in it, as there is none under the card.
 */
export function EndFoldedStrip({
  track,
  activity,
  onOpen,
  onSave,
}: {
  track: Track;
  activity?: Activity;
  onOpen: () => void;
  /** The «Save» of the card under it; none without an account. */
  onSave?: () => void;
}) {
  // A run that is over: its clock stands at the last fix.
  const numbers = useRunNumbers(track, false, undefined, activity);
  return (
    <View style={styles.row} testID="end-folded">
      <Pressable
        style={styles.numbers}
        onPress={onOpen}
        accessibilityRole="button"
        accessibilityLabel={t("Show the numbers")}
        testID="end-folded-open"
      >
        <Text style={styles.value} numberOfLines={1} adjustsFontSizeToFit>
          {numbers.km}
          <Text style={styles.unit}> {numbers.units}</Text>
          <Text style={styles.dot}> · </Text>
          {numbers.time}
        </Text>
      </Pressable>
      {onSave !== undefined && (
        <Pressable
          style={styles.save}
          onPress={onSave}
          accessibilityRole="button"
          accessibilityLabel={t("Save to My activities")}
          testID="end-folded-save"
        >
          <Text style={styles.saveText}>{t("Save")}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
  },
  numbers: {
    flex: 1,
    minHeight: MIN_TAP_SIZE,
    justifyContent: "center",
  },
  value: {
    color: color.text,
    fontSize: fontSize.title,
    fontWeight: fontWeight.semibold,
    fontVariant: ["tabular-nums"],
  },
  unit: {
    color: color.textMuted,
    fontSize: fontSize.body,
    fontWeight: fontWeight.regular,
  },
  dot: {
    color: color.textMuted,
  },
  // Neutral, as «Save» under the card: the yellow is the route's.
  save: {
    minHeight: MIN_TAP_SIZE,
    paddingHorizontal: space.lg,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.borderStrong,
    backgroundColor: color.surfaceRaised,
  },
  saveText: {
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
});
