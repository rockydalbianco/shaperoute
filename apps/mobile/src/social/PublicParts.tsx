import { DRAWING_TITLE_MAX_LENGTH } from "@shaperoute/shared-types";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import {
  color,
  fontSize,
  fontWeight,
  MIN_TAP_SIZE,
  radius,
  space,
} from "../theme/tokens";

/**
 * The pieces of «Public» (TASK-117) that the end of a run and a run of «My
 * activities» share: the switch, the title, a line under them. As Strava's
 * (strava/StravaParts.tsx), so the two sit together.
 */

/** At the end of a run, under «Public» on. */
export const PUBLIC_AT_END =
  "Others see it in your profile, without the first and last 200 m.";
/** On a run of «My activities», under «Public» on. */
export const PUBLIC_ON_CARD =
  "Public in your profile, without the first and last 200 m.";

/** A choice on the phone, waiting for a network: what happens then. */
export function waitingText(on: boolean): string {
  return on
    ? "Saved on the phone. It goes public when you are back online."
    : "Saved on the phone. It is sent when you are back online.";
}

/** On or off, as «Send to Strava» is. */
export function PublicSwitch({
  on,
  onChange,
  disabled = false,
}: {
  on: boolean;
  onChange: (on: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      style={[styles.switch, on && styles.switchOn, disabled && styles.busy]}
      onPress={() => onChange(!on)}
      disabled={disabled}
      accessibilityRole="switch"
      accessibilityState={{ checked: on, disabled }}
      accessibilityLabel="Public"
    >
      <Text style={styles.switchText}>Public</Text>
      <Text style={[styles.switchState, on && styles.switchStateOn]}>
        {on ? "On" : "Off"}
      </Text>
    </Pressable>
  );
}

/** The title of the run: the drawing's, and Strava's at the end of a run. */
export function DrawingTitle({
  value,
  onChange,
  onDone,
  editable = true,
}: {
  value: string;
  onChange: (text: string) => void;
  /** Typing is over (the keyboard closed): a run of «My activities» saves it. */
  onDone?: () => void;
  editable?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>Title</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChange}
        onEndEditing={onDone}
        editable={editable}
        placeholder="Give it a name"
        placeholderTextColor={color.textFaint}
        maxLength={DRAWING_TITLE_MAX_LENGTH}
        returnKeyType="done"
        accessibilityLabel="Title"
      />
    </View>
  );
}

/** A line under «Public»: what the others see, or what went wrong. */
export function PublicLine({ text, alert }: { text: string; alert?: boolean }) {
  return (
    <Text
      style={alert ? styles.problem : styles.line}
      accessibilityRole={alert ? "alert" : undefined}
    >
      {text}
    </Text>
  );
}

const styles = StyleSheet.create({
  switch: {
    minHeight: MIN_TAP_SIZE,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space.sm,
    paddingHorizontal: space.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
  switchOn: {
    borderColor: color.borderStrong,
  },
  busy: {
    opacity: 0.6,
  },
  switchText: {
    flex: 1,
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
  switchState: {
    color: color.textFaint,
    fontWeight: fontWeight.semibold,
  },
  switchStateOn: {
    color: color.text,
  },
  field: {
    gap: space.xs,
  },
  label: {
    color: color.textMuted,
    fontSize: fontSize.small,
  },
  input: {
    minHeight: MIN_TAP_SIZE,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    fontSize: fontSize.input,
    color: color.text,
    backgroundColor: color.surface,
  },
  line: {
    color: color.textMuted,
    fontSize: fontSize.small,
  },
  problem: {
    color: color.error,
    fontSize: fontSize.small,
  },
});
