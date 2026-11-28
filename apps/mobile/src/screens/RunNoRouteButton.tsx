import type { RunActivity } from "@shaperoute/shared-types";
import { Pressable, StyleSheet, Text } from "react-native";

import { t } from "../i18n";
import { runActivityOf, type Sport } from "../settings/sport";
import { SportIcon } from "../sportSigns/SportIcon";
import {
  color,
  fontSize,
  fontWeight,
  MIN_TAP_SIZE,
  radius,
  space,
} from "../theme/tokens";

/**
 * The sport's sign beside «… without a route» (TASK-361): its activity, for
 * `SportIcon` to draw as a line sign (TASK-510; an emoji until then). A
 * string still, so the screens that pass it on keep their props.
 */
export function withoutRouteIcon(sport: Sport): RunActivity {
  return runActivityOf(sport);
}

/**
 * «Run without a route» in the header of «Draw» (TASK-361): outlined, no
 * more yellow (ADR-0183 set aside), so the only yellow on the screen is the
 * route's button at its foot. The runner and the words are one button:
 * the runner alone did not say what it does.
 */
export function RunNoRouteButton({
  label,
  icon = "running",
  onPress,
}: {
  /** «Run without a route», or the sport's own words (`withoutRouteLabel`). */
  label: string;
  /** The sport's activity, drawn as its sign: a bike rides. */
  icon?: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={t("Records the run without drawing a route first")}
      testID="run-no-route"
    >
      <SportIcon activity={icon} size={ICON_SIZE} />
      <Text style={styles.text} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

/** The sign's side: as the body text beside it, a little taller. */
const ICON_SIZE = 18;

const styles = StyleSheet.create({
  button: {
    minHeight: MIN_TAP_SIZE,
    flexDirection: "row",
    alignItems: "center",
    gap: space.xs,
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.borderStrong,
    backgroundColor: "transparent",
  },
  pressed: {
    backgroundColor: color.surfaceRaised,
  },
  text: {
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
});
