import type { Activity } from "@shaperoute/shared-types";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { t } from "../i18n";
import {
  color,
  fontSize,
  fontWeight,
  MIN_TAP_SIZE,
  radius,
  space,
} from "../theme/tokens";
import { useTourPart } from "../tour/tourParts";
import { TOUR_PART } from "../tour/tourSteps";
import { shownNumber, writeDistance } from "../units/distanceInput";
import { useUnits } from "../units/useUnits";
import { stepDistance } from "./distance";

type Props = {
  /** The distance as typed: the km alone, or the miles with their unit
   * ("4.5 mi", `units/distanceInput`). */
  text: string;
  onText: (text: string) => void;
  editable: boolean;
  /** Whose limits − and + keep to (TASK-190): a run's unless said. */
  activity?: Activity;
};

/**
 * The distance: − and + by a km, and the number still typed with the decimal
 * pad for anything in between (ADR-0034). With «Miles» (TASK-182) by a mile,
 * and what is typed is miles.
 */
export function DistanceStepper({
  text,
  onText,
  editable,
  activity = "running",
}: Props) {
  const units = useUnits();
  // Shown by the tour of the first opening (TASK-266).
  const tourRef = useTourPart(TOUR_PART.distance);
  return (
    <View
      ref={tourRef}
      collapsable={false}
      style={[styles.row, !editable && styles.off]}
    >
      <Step
        label="−"
        name={t("Shorter")}
        editable={editable}
        onPress={() => onText(stepDistance(text, -1, activity, units))}
      />
      <View style={styles.value}>
        <TextInput
          style={styles.field}
          value={shownNumber(text, units)}
          onChangeText={(typed) => onText(writeDistance(typed, units))}
          editable={editable}
          keyboardType="decimal-pad"
          keyboardAppearance="dark"
          selectTextOnFocus
          textAlign="center"
          accessibilityLabel={
            units === "mi" ? t("Distance in miles") : t("Distance in km")
          }
        />
        <Text style={styles.unit}>{units}</Text>
      </View>
      <Step
        label="+"
        name={t("Longer")}
        editable={editable}
        onPress={() => onText(stepDistance(text, 1, activity, units))}
      />
    </View>
  );
}

/** A round − or + button. */
function Step({
  label,
  name,
  editable,
  onPress,
}: {
  label: string;
  name: string;
  editable: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={styles.step}
      onPress={onPress}
      disabled={!editable}
      accessibilityRole="button"
      accessibilityLabel={name}
    >
      <Text style={styles.stepText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
  },
  off: {
    opacity: 0.4,
  },
  step: {
    width: MIN_TAP_SIZE + space.md,
    height: MIN_TAP_SIZE + space.md,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.borderStrong,
    backgroundColor: color.surfaceRaised,
  },
  stepText: {
    color: color.text,
    fontSize: fontSize.title,
    fontWeight: fontWeight.medium,
  },
  value: {
    flex: 1,
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "center",
    gap: space.xs,
  },
  field: {
    minWidth: 72,
    minHeight: MIN_TAP_SIZE,
    color: color.text,
    fontSize: fontSize.display,
    fontWeight: fontWeight.bold,
  },
  unit: {
    color: color.textMuted,
    fontSize: fontSize.body,
  },
});
