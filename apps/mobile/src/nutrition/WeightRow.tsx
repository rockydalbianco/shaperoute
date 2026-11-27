import { StyleSheet, Text, View } from "react-native";

import { weightLabel } from "../body/bodyUnits";
import { useWeighIns } from "../body/useWeighIns";
import { daysBetween, latestOf } from "../body/weighIns";
import { t } from "../i18n";
import { color, font, MIN_TAP_SIZE, radius, space } from "../theme/tokens";
import { Tap } from "../ui/Tap";
import { useUnits } from "../units/useUnits";
import { chartPoints, WeightChart } from "./WeightChart";

/** The last weigh-ins the little line under «Weight» shows. */
const ROW_POINTS = 8;

type Props = { onOpen: () => void };

/**
 * «Weight» under the week of the diary (TASK-489 part K1): the latest
 * weigh-in and a little line of the last ones; a tap opens the weight page.
 */
export function WeightRow({ onOpen }: Props) {
  const weighIns = useWeighIns();
  const units = useUnits();
  const latest = latestOf(weighIns);
  const last = weighIns.entries.slice(-ROW_POINTS);
  const first = last[0];
  const value = latest === null ? t("No weigh-ins yet") : weightLabel(latest.kg, units);
  return (
    <Tap
      style={styles.row}
      onPress={onOpen}
      accessibilityRole="button"
      accessibilityLabel={`${t("Weight")}, ${value}`}
      testID="weight-row"
    >
      {first !== undefined && last.length >= 2 && (
        <View style={styles.line}>
          <WeightChart
            points={chartPoints(
              last.map((entry) => ({
                at: daysBetween(first.day, entry.day),
                value: entry.kg,
              })),
            )}
            height={20}
            stroke={2}
          />
        </View>
      )}
      <Text style={styles.label}>{t("Weight")}</Text>
      <Text style={styles.value}>{`${value} ›`}</Text>
    </Tap>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: MIN_TAP_SIZE,
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
  line: {
    width: 56,
  },
  label: {
    ...font.body,
    color: color.text,
    flex: 1,
  },
  value: {
    ...font.small,
    color: color.textMuted,
  },
});
