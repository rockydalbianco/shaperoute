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
 * The pieces every Strava place of the app shares (TASK-187): the orange
 * button of Strava's brand rules, the name typed for Strava, a line of
 * trouble.
 */

/** As long as the API keeps a typed name (strava.py, MAX_NAME). */
export const MAX_STRAVA_NAME = 100;

/** «Connect with Strava»: Strava's orange, Strava's words. */
export function ConnectWithStrava({
  busy,
  onPress,
}: {
  busy: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.connect, busy && styles.busy]}
      onPress={onPress}
      disabled={busy}
      accessibilityRole="button"
      accessibilityState={{ disabled: busy, busy }}
    >
      <Text style={styles.connectText}>
        {busy ? "Opening Strava…" : "Connect with Strava"}
      </Text>
    </Pressable>
  );
}

/** On or off, as the other switches of the app are (RoutePanel's pen). */
export function StravaSwitch({
  on,
  onChange,
}: {
  on: boolean;
  onChange: (on: boolean) => void;
}) {
  return (
    <Pressable
      style={[styles.switch, on && styles.switchOn]}
      onPress={() => onChange(!on)}
      accessibilityRole="switch"
      accessibilityState={{ checked: on }}
      accessibilityLabel="Send to Strava"
    >
      <Text style={styles.switchText}>Send to Strava</Text>
      <Text style={[styles.switchState, on && styles.switchStateOn]}>
        {on ? "On" : "Off"}
      </Text>
    </Pressable>
  );
}

/**
 * The name of the activity on Strava, typed or left empty (the user's
 * choice, 2026-10-02): empty, the API gives its own, shown as the hint.
 */
export function StravaName({
  value,
  onChange,
  automatic,
}: {
  value: string;
  onChange: (text: string) => void;
  /** The name the API gives when nothing is typed, when the app knows it. */
  automatic: string | null;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>Name on Strava</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChange}
        placeholder={automatic ?? "Leave empty for an automatic name"}
        placeholderTextColor={color.textFaint}
        maxLength={MAX_STRAVA_NAME}
        returnKeyType="done"
        accessibilityLabel="Name on Strava"
      />
    </View>
  );
}

/** A line under the Strava controls: what went wrong, or what to know. */
export function StravaLine({ text, alert }: { text: string; alert?: boolean }) {
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
  connect: {
    minHeight: MIN_TAP_SIZE,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: space.xl,
    borderRadius: radius.pill,
    backgroundColor: color.strava,
  },
  connectText: {
    color: color.onStrava,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
  busy: {
    opacity: 0.6,
  },
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
