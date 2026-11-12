import { StyleSheet, Text, View } from "react-native";

import { t } from "../i18n";
import { Segmented } from "../screens/Segmented";
import { color, fontSize, space } from "../theme/tokens";
import type { PhaseKind } from "./flightParts";

type Props = {
  /** The kind of the flight now, as the app sees it. */
  phase: PhaseKind;
  /** The pilot corrects it. */
  onChange: (phase: PhaseKind) => void;
};

/**
 * «On foot | In the air» on a flight's recording (TASK-305 part R6b, the
 * user's words of 2026-11-12): what the app sees now, and a touch that
 * corrects it (flightParts.ts, phaseMarks.ts).
 */
export function FlightPhaseSwitch({ phase, onChange }: Props) {
  return (
    <View style={styles.box} testID="flight-phase">
      <Segmented
        options={[
          { value: "foot", label: t("On foot") },
          { value: "air", label: t("In the air") },
        ]}
        value={phase}
        onChange={onChange}
      />
      <Text style={styles.hint}>
        {t("MuW switches by itself; touch to correct it.")}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    gap: space.xs,
  },
  hint: {
    color: color.textMuted,
    fontSize: fontSize.small,
  },
});
