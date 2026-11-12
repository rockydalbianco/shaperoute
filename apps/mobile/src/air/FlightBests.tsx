import { StyleSheet, Text, View } from "react-native";

import { dayLabel } from "../activities/activityText";
import {
  type FlightBest,
  type FlightBests as Bests,
  hasBests,
} from "../api/flightBests";
import { t } from "../i18n";
import { clockLabel } from "../navigation/freeRun";
import { speedOf } from "../screens/SnowFinishCard";
import {
  color,
  fontSize,
  fontWeight,
  MIN_TAP_SIZE,
  radius,
  space,
} from "../theme/tokens";
import { Tap } from "../ui/Tap";
import { runDistanceLabel } from "../units/format";
import { speedUnit } from "../units/runFormat";
import type { Units } from "../units/units";

type Row = { key: keyof Bests; label: string; value: string };

/** The rows of the bests there are, in their order: higher, longer,
 * farther, faster. Heights in metres, as in flight. */
export function bestRows(bests: Bests, units: Units): Row[] {
  const rows: (Row | null)[] = [
    bests.highest && {
      key: "highest",
      label: t("Max altitude"),
      value: `${Math.round(bests.highest.value)} m`,
    },
    bests.longest && {
      key: "longest",
      label: t("Longest flight"),
      value: clockLabel(bests.longest.value * 1000),
    },
    bests.farthest && {
      key: "farthest",
      label: t("Farthest flight"),
      value: runDistanceLabel(bests.farthest.value, units),
    },
    bests.fastest && {
      key: "fastest",
      label: t("Top speed"),
      value: `${speedOf(bests.fastest.value, units)} ${speedUnit(units)}`,
    },
  ];
  return rows.filter((row): row is Row => row !== null);
}

type Props = {
  bests: Bests;
  units: Units;
  /** Opens the flight a best was made in, from «My activities». */
  onOpen: (id: string) => void;
};

/**
 * «Your best flights» under «Record your flight» (TASK-305 part R5b): the
 * highest, the longest, the farthest and the fastest of one's flights, each
 * with its day; a touch opens that flight. Nothing before the first best.
 */
export function FlightBests({ bests, units, onOpen }: Props) {
  if (!hasBests(bests)) {
    return null;
  }
  return (
    <View style={styles.box} testID="flight-bests">
      <Text style={styles.title} accessibilityRole="header">
        {t("Your best flights")}
      </Text>
      {bestRows(bests, units).map((row) => {
        const best = bests[row.key] as FlightBest;
        const day = dayLabel(best.started_at);
        return (
          <Tap
            key={row.key}
            style={styles.row}
            onPress={() => onOpen(best.id)}
            accessibilityRole="button"
            accessibilityLabel={[row.label, row.value, day]
              .filter((part) => part !== "")
              .join(", ")}
            testID={`flight-best-${row.key}`}
          >
            <View style={styles.rowText}>
              <Text style={styles.label}>{row.label}</Text>
              {day !== "" && <Text style={styles.day}>{day}</Text>}
            </View>
            <Text style={styles.value}>{row.value}</Text>
            <Text style={styles.arrow} importantForAccessibility="no">
              ›
            </Text>
          </Tap>
        );
      })}
    </View>
  );
}

// As «Personal bests» on the profile (PersonalBests.tsx).
const styles = StyleSheet.create({
  box: {
    gap: space.xs,
    padding: space.md,
    borderRadius: radius.lg,
    backgroundColor: color.surface,
  },
  title: {
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    minHeight: MIN_TAP_SIZE,
    paddingVertical: space.xs,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  label: {
    color: color.text,
    fontSize: fontSize.body,
  },
  day: {
    color: color.textMuted,
    fontSize: fontSize.small,
  },
  value: {
    color: color.text,
    fontSize: fontSize.heading,
    fontWeight: fontWeight.bold,
    fontVariant: ["tabular-nums"],
  },
  arrow: {
    color: color.textMuted,
    fontSize: fontSize.heading,
  },
});
