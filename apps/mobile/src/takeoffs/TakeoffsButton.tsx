import { useState } from "react";
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
import { TakeoffsMap } from "./TakeoffsMap";
import { TAKEOFFS_ON } from "./takeoffsOn";

/**
 * «Takeoffs» under «Ready to fly» (TASK-493 part C): opens the map of
 * takeoffs over the whole screen. Nothing while TAKEOFFS_ON is off. Its own
 * file, so the flight page (TASK-479's) only places it.
 */
export function TakeoffsButton({
  fetchFn,
  on = TAKEOFFS_ON,
}: {
  fetchFn?: typeof fetch;
  /** For the tests: the switch as if it were on. */
  on?: boolean;
}) {
  const [open, setOpen] = useState(false);
  if (!on) {
    return null;
  }
  return (
    <>
      <Pressable
        style={styles.button}
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        testID="takeoffs-button"
      >
        <Text style={styles.text}>{t("Takeoffs")}</Text>
      </Pressable>
      <TakeoffsMap visible={open} onClose={() => setOpen(false)} fetchFn={fetchFn} />
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: MIN_TAP_SIZE,
    borderRadius: radius.lg,
    backgroundColor: color.surface,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: space.lg,
  },
  text: {
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold,
  },
});
