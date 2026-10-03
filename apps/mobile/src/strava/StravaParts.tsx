import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { t } from "../i18n";
import {
  color,
  fontSize,
  fontWeight,
  MIN_TAP_SIZE,
  radius,
  space,
} from "../theme/tokens";

/**
 * The pieces every Strava place of the app shares (TASK-187): Strava's own
 * button and logo (TASK-218), the name typed for Strava, a line of trouble.
 */

/** As long as the API keeps a typed name (strava.py, MAX_NAME). */
export const MAX_STRAVA_NAME = 100;

/**
 * Strava's images, from its brand package (developers.strava.com/guidelines,
 * TASK-218), never redrawn: the button at the 48 pt its rules give, the
 * white «Compatible with Strava» because the app is dark.
 */
const CONNECT_BUTTON = require("../../assets/strava/connect-with-strava.png");
export const CONNECT_SIZE = { width: 237, height: 48 };
const COMPATIBLE_LOGO = require("../../assets/strava/compatible-with-strava.png");
export const COMPATIBLE_SIZE = { width: 189, height: 16 };

/**
 * «Connect with Strava»: Strava's button as it is. Busy it stays the same,
 * as the rules ask, and a wheel turns beside it.
 */
export function ConnectWithStrava({
  busy,
  onPress,
}: {
  busy: boolean;
  onPress: () => void;
}) {
  return (
    <View style={styles.connect}>
      <Pressable
        onPress={onPress}
        disabled={busy}
        accessibilityRole="button"
        accessibilityLabel={t(busy ? "Opening Strava…" : "Connect with Strava")}
        accessibilityState={{ disabled: busy, busy }}
      >
        <Image testID="strava-connect" source={CONNECT_BUTTON} style={CONNECT_SIZE} />
      </Pressable>
      {busy && <ActivityIndicator testID="strava-wheel" color={color.textMuted} />}
    </View>
  );
}

/**
 * On or off, as the other switches of the app are (RoutePanel's pen), with
 * «Compatible with Strava» under the words. VoiceOver reads the switch, not
 * the logo.
 */
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
      accessibilityLabel={t("Send to Strava")}
    >
      <View style={styles.switchWords}>
        <Text style={styles.switchText}>{t("Send to Strava")}</Text>
        <Image
          testID="strava-compatible"
          source={COMPATIBLE_LOGO}
          style={COMPATIBLE_SIZE}
        />
      </View>
      <Text style={[styles.switchState, on && styles.switchStateOn]}>
        {t(on ? "On" : "Off")}
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
      <Text style={styles.label}>{t("Name on Strava")}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChange}
        placeholder={automatic ?? t("Leave empty for an automatic name")}
        placeholderTextColor={color.textFaint}
        maxLength={MAX_STRAVA_NAME}
        returnKeyType="done"
        accessibilityLabel={t("Name on Strava")}
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
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
  },
  switch: {
    minHeight: MIN_TAP_SIZE,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space.sm,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
  switchOn: {
    borderColor: color.borderStrong,
  },
  switchWords: {
    flex: 1,
    gap: space.xs,
  },
  switchText: {
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
