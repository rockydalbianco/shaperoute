import { StyleSheet, Text, View } from "react-native";

import { t } from "../i18n";
import { MINUTES, ROUTINES } from "../stretch/routines";
import {
  color,
  fontSize,
  fontWeight,
  MIN_TAP_SIZE,
  radius,
  space,
} from "../theme/tokens";
import { Tap } from "../ui/Tap";
import { chooseRoutine, useChosenRoutine } from "./stretchChoice";

/**
 * «Draw» for the sport «Stretching» (TASK-475 part B, ADR-0386): the
 * routines of TASK-466 part B, «Morning», «After run», «After gym», one
 * ticked; «Start stretching» under them opens the one ticked, which asks how
 * long (3, 5 or 10 minutes) on the stretching screen.
 */
export function StretchRoutines() {
  const chosen = useChosenRoutine();
  const lengths = MINUTES.map((minutes) => t("{minutes} min", { minutes })).join(" · ");
  return (
    <View
      style={styles.list}
      accessibilityRole="radiogroup"
      accessibilityLabel={t("Stretching")}
      testID="stretch-routines"
    >
      {ROUTINES.map((routine) => {
        const on = routine.key === chosen;
        return (
          <Tap
            key={routine.key}
            style={[styles.card, on && styles.cardOn]}
            onPress={() => chooseRoutine(routine.key)}
            accessibilityRole="radio"
            accessibilityLabel={t(routine.name)}
            accessibilityState={{ checked: on }}
            testID={`stretch-routine-${routine.key}`}
          >
            <View style={styles.words}>
              <Text style={styles.name}>{t(routine.name)}</Text>
              <Text style={styles.lengths}>{lengths}</Text>
            </View>
            <Text style={[styles.mark, !on && styles.markOff]}>{on ? "✓" : ""}</Text>
          </Tap>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: space.sm,
  },
  card: {
    minHeight: MIN_TAP_SIZE * 1.4,
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
  cardOn: {
    borderWidth: 2,
    borderColor: color.text,
  },
  words: {
    flex: 1,
    gap: space.xs / 2,
  },
  name: {
    color: color.text,
    fontSize: fontSize.input,
    fontWeight: fontWeight.semibold,
  },
  lengths: {
    color: color.textMuted,
    fontSize: fontSize.small,
  },
  mark: {
    width: MIN_TAP_SIZE / 2,
    color: color.text,
    fontSize: fontSize.input,
    fontWeight: fontWeight.semibold,
    textAlign: "center",
  },
  markOff: {
    color: color.textFaint,
  },
});
