import { Pressable, StyleSheet, Text } from "react-native";

import { color, fontSize, MIN_TAP_SIZE, space } from "../theme/tokens";
import { SIGN_IN_TO_KEEP_RUNS, useActivitiesDoor } from "./activitiesDoor";

/**
 * Under the card of a run that ended (TASK-172): with an account, where
 * the run goes; without one, the way to keep the next ones. The run of who
 * has no account stays as it was: on the phone until «Done».
 */
export function RunKeptLine() {
  const { status, signIn } = useActivitiesDoor();
  if (status !== "off") {
    return <Text style={styles.line}>Done saves this run in My activities.</Text>;
  }
  return (
    <Pressable style={styles.tap} onPress={signIn} accessibilityRole="button">
      <Text style={[styles.line, styles.link]}>{SIGN_IN_TO_KEEP_RUNS}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tap: {
    minHeight: MIN_TAP_SIZE,
    justifyContent: "center",
  },
  line: {
    paddingTop: space.sm,
    color: color.textMuted,
    fontSize: fontSize.small,
  },
  // Not yellow: that is the route's (docs/UI.md, «Il tema»).
  link: {
    color: color.text,
    textDecorationLine: "underline",
  },
});
