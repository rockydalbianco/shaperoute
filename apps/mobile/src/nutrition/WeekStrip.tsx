import { useEffect, useState } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";

import { t } from "../i18n";
import { color, font, MIN_TAP_SIZE, radius, space } from "../theme/tokens";
import { springTo } from "../ui/motion";
import { Tap } from "../ui/Tap";
import { useReduceMotion } from "../ui/useReduceMotion";
import { intakeOf } from "./intake";
import { type LocalDay, weekdayOf, weekOf } from "./localDay";
import { weekdayName } from "./PlanView";
import { useDaysEnergy } from "./useDayEnergy";
import { useNutrition } from "./useNutrition";
import { weekLabel } from "./weekText";

/** How tall the tallest column is, in points. */
const TALL = 48;

/** A day of the strip: its two numbers, null when there is none. */
export type StripDay = {
  day: LocalDay;
  eaten: number | null;
  used: number | null;
};

/** The heights of the columns, 0 to 1: the largest number of the week is
 * the tallest column, so the days compare at a glance. */
export function stripHeights(
  days: readonly StripDay[],
): { eaten: number; used: number }[] {
  const tallest = Math.max(
    0,
    ...days.flatMap((day) => [day.eaten ?? 0, day.used ?? 0]),
  );
  return days.map((day) =>
    tallest <= 0
      ? { eaten: 0, used: 0 }
      : { eaten: (day.eaten ?? 0) / tallest, used: (day.used ?? 0) / tallest },
  );
}

type Props = {
  /** The day the diary is on: its week is shown, and it is marked. */
  day: LocalDay;
  today: LocalDay;
  now: Date;
  onDay: (day: LocalDay) => void;
};

/**
 * The week under the diary (TASK-489 part H): a day to a pair of columns,
 * what was eaten beside what the body used, Monday to Sunday. A touch on a
 * day takes the diary there. The same week as «Calorie balance» on the
 * profile, read the same way from this phone; the days after today cannot
 * be opened, as in the diary.
 */
export function WeekStrip({ day, today, now, onDay }: Props) {
  const nutrition = useNutrition();
  const week = weekOf(day);
  const energies = useDaysEnergy(week, now);
  const days: StripDay[] = week.map((each, index) => ({
    day: each,
    eaten: intakeOf(nutrition.mealsOn(each))?.kcal ?? null,
    used: each > today ? null : (energies[index].used?.used ?? null),
  }));
  const heights = stripHeights(days);

  return (
    <View style={styles.card} testID="diary-week">
      <Text style={styles.title} accessibilityRole="header">
        {weekLabel(week, today)}
      </Text>
      <View style={styles.days}>
        {days.map((each, index) => {
          const later = each.day > today;
          const name = `${weekdayName(weekdayOf(each.day))} ${Number(each.day.slice(8))}`;
          const said = later
            ? name
            : [
                name,
                `${t("Eaten")} ${each.eaten ?? "—"}`,
                `${t("Used (est.)")} ${each.used ?? "—"}`,
              ].join(", ");
          return (
            <Tap
              key={each.day}
              style={[styles.day, each.day === day && styles.chosen]}
              onPress={() => onDay(each.day)}
              disabled={later}
              accessibilityRole="button"
              accessibilityLabel={said}
              accessibilityState={{ disabled: later, selected: each.day === day }}
              testID={`diary-week-${each.day}`}
            >
              <View style={styles.pair}>
                <Column share={heights[index].eaten} colour={color.text} />
                <Column share={heights[index].used} colour={color.textMuted} />
              </View>
              <Text style={[styles.name, later && styles.later]}>
                {weekdayName(weekdayOf(each.day))}
              </Text>
            </Tap>
          );
        })}
      </View>
    </View>
  );
}

/** A column that grows from its foot to `share` of the tallest. */
function Column({ share, colour }: { share: number; colour: string }) {
  const still = useReduceMotion();
  const [at] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (still) {
      at.setValue(share);
      return;
    }
    const going = springTo(at, share, "smooth");
    going.start();
    return () => going.stop();
  }, [at, share, still]);
  return (
    <Animated.View
      style={[styles.column, { backgroundColor: colour, transform: [{ scaleY: at }] }]}
    />
  );
}

const WIDE = space.sm - 1;

const styles = StyleSheet.create({
  card: {
    gap: space.sm,
    padding: space.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
  title: {
    ...font.small,
    color: color.textMuted,
  },
  days: {
    flexDirection: "row",
  },
  day: {
    flex: 1,
    minHeight: MIN_TAP_SIZE,
    alignItems: "center",
    gap: space.xs,
    paddingVertical: space.xs,
    borderRadius: radius.md,
    borderWidth: 1,
    // The card's own colour: the rim shows only on the day chosen.
    borderColor: color.surface,
  },
  chosen: {
    borderColor: color.borderStrong,
  },
  pair: {
    height: TALL,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: space.xs / 2,
  },
  column: {
    width: WIDE,
    height: TALL,
    borderRadius: WIDE / 2,
    transformOrigin: "center bottom",
  },
  name: {
    ...font.small,
    color: color.textMuted,
  },
  later: {
    opacity: 0.4,
  },
});
