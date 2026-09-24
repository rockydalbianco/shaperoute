import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import {
  color,
  fontSize,
  fontWeight,
  MIN_TAP_SIZE,
  radius,
  space,
} from "../theme/tokens";
import { stepDistance } from "./distance";

type Props = {
  /** The km as typed. */
  text: string;
  onText: (text: string) => void;
  editable: boolean;
};

/**
 * The distance: − and + by a km, and the number still typed with the decimal
 * pad for anything in between (ADR-0034).
 */
export function DistanceStepper({ text, onText, editable }: Props) {
  return (
    <View style={[styles.row, !editable && styles.off]}>
      <Step
        label="−"
        name="Shorter"
        editable={editable}
        onPress={() => onText(stepDistance(text, -1))}
      />
      <View style={styles.value}>
        <TextInput
          style={styles.field}
          value={text}
          onChangeText={onText}
          editable={editable}
          keyboardType="decimal-pad"
          keyboardAppearance="dark"
          selectTextOnFocus
          textAlign="center"
          accessibilityLabel="Distance in km"
        />
        <Text style={styles.unit}>km</Text>
      </View>
      <Step
        label="+"
        name="Longer"
        editable={editable}
        onPress={() => onText(stepDistance(text, 1))}
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
