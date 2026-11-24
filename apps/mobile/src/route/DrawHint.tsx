import { StyleSheet, Text } from "react-native";

import { t } from "../i18n";
import { color, fontSize, space } from "../theme/tokens";

/** What «Draw» still lacks before its yellow button can draw. */
export type DrawMissing = "start" | "shape";

/**
 * What to choose first, the start before the shape: the order of the page.
 * Null when both are there: the button is on, or what is missing is said
 * elsewhere (a distance being typed).
 */
export function drawMissing(has: {
  start: boolean;
  shape: boolean;
}): DrawMissing | null {
  if (!has.start) {
    return "start";
  }
  if (!has.shape) {
    return "shape";
  }
  return null;
}

/**
 * The line over «Draw route» while it is off (TASK-508): the button was
 * dimmed with nothing saying why. The texts are the user's choice of
 * 2026-11-24. Nothing once the route can be drawn.
 */
export function DrawHint({ missing }: { missing: DrawMissing | null }) {
  if (missing === null) {
    return null;
  }
  return (
    <Text style={styles.hint} testID="draw-hint" accessibilityLiveRegion="polite">
      {missing === "start" ? t("Choose a start first") : t("Choose what to draw first")}
    </Text>
  );
}

const styles = StyleSheet.create({
  // As the line of the first maps (`../engine/ZoneNotice`), which stands
  // in the same place.
  hint: {
    marginBottom: space.sm,
    color: color.textMuted,
    fontSize: fontSize.small,
    textAlign: "center",
  },
});
