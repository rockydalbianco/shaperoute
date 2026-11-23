import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { gymStyles } from "../gym/gymStyles";
import { t, tLater } from "../i18n";
import { useLanguage } from "../i18n/useLanguage";
import {
  color,
  font,
  fontSize,
  fontWeight,
  MIN_TAP_SIZE,
  radius,
  space,
} from "../theme/tokens";
import { Tap } from "../ui/Tap";
import { AddFoodSheet, NutritionSheet } from "./AddFoodSheet";
import { plannedIntake } from "./intake";
import { type LocalDay, type Weekday, weekdayOf, WEEKDAYS } from "./localDay";
import { kcalLabel, MealCard } from "./MealCard";
import {
  type Meal,
  MEALS,
  type Portion,
  withGrams,
  withoutPortion,
  withPortion,
} from "./plan";
import { copyPlanDay, useNutrition, writePlanDay } from "./useNutrition";

// In English; shown with t() in the app's language. The names the
// activities already use.
const DAYS: { readonly [D in Weekday]: string } = {
  mon: tLater("Mon"),
  tue: tLater("Tue"),
  wed: tLater("Wed"),
  thu: tLater("Thu"),
  fri: tLater("Fri"),
  sat: tLater("Sat"),
  sun: tLater("Sun"),
};

/** «Mon», in the app's language. */
export function weekdayName(weekday: Weekday): string {
  return t(DAYS[weekday]);
}

type Props = {
  /** The phone's day, now: the plan opens on its day of the week. */
  today: LocalDay;
};

/** The portion the sheet is open on: a new one for a meal, or one touched. */
type Open = { meal: Meal; index: number | null };

/**
 * «My plan» (TASK-489 part B, ADR-0397, the user's choice «a week of
 * meals»): for each day of the week, four meals with foods and grams, as
 * the user decided them or as their dietitian wrote them. A day is copied
 * over another with «Copy this day to…». MuW writes nothing here and
 * changes nothing: there is no plan until the user writes one.
 */
export function PlanView({ today }: Props) {
  const language = useLanguage();
  const nutrition = useNutrition();
  const [weekday, setWeekday] = useState<Weekday>(weekdayOf(today));
  const [open, setOpen] = useState<Open | null>(null);
  const [shown, setShown] = useState<Open>({ meal: "breakfast", index: null });
  const [copying, setCopying] = useState(false);

  const meals = nutrition.plan[weekday];
  const planned = plannedIntake(nutrition.plan, weekday);
  // The sheet keeps what it was opened on while it goes down.
  const sheet = open ?? shown;
  const touched =
    sheet.index === null ? null : (meals[sheet.meal][sheet.index] ?? null);

  function show(next: Open) {
    setShown(next);
    setOpen(next);
  }

  function write(portion: Portion) {
    if (open === null) {
      return;
    }
    writePlanDay(
      weekday,
      open.index === null
        ? withPortion(meals, open.meal, portion)
        : withGrams(meals, open.meal, open.index, portion.grams),
    );
    setOpen(null);
  }

  function remove() {
    if (open !== null && open.index !== null) {
      writePlanDay(weekday, withoutPortion(meals, open.meal, open.index));
    }
    setOpen(null);
  }

  return (
    <View style={styles.plan} testID="nutrition-plan">
      <View style={styles.week}>
        {WEEKDAYS.map((day) => (
          <Tap
            key={day}
            style={[styles.day, day === weekday && styles.dayOn]}
            onPress={() => setWeekday(day)}
            accessibilityRole="button"
            accessibilityState={{ selected: day === weekday }}
            testID={`plan-day-${day}`}
          >
            <Text style={styles.dayText}>{weekdayName(day)}</Text>
          </Tap>
        ))}
      </View>
      <View style={styles.head}>
        <Text style={styles.title} accessibilityRole="header">
          {weekdayName(weekday)}
        </Text>
        <Text style={styles.total} testID="plan-kcal">
          {planned === null ? "—" : kcalLabel(planned.kcal)}
        </Text>
      </View>

      {MEALS.map((meal) => (
        <MealCard
          key={meal}
          meal={meal}
          portions={meals[meal]}
          language={language}
          onAdd={() => show({ meal, index: null })}
          onPortion={(index) => show({ meal, index })}
        />
      ))}

      {planned !== null && (
        <Tap
          style={[gymStyles.button, styles.copy]}
          onPress={() => setCopying(true)}
          accessibilityRole="button"
          testID="plan-copy"
        >
          <Text style={gymStyles.buttonText}>{t("Copy this day to…")}</Text>
        </Tap>
      )}
      <Text style={styles.small}>
        {t("This is the plan you write. MuW never changes it.")}
      </Text>

      <AddFoodSheet
        visible={open !== null}
        meal={sheet.meal}
        portion={touched}
        ownFoods={nutrition.ownFoods.foods}
        language={language}
        onPortion={write}
        onRemove={remove}
        onClose={() => setOpen(null)}
      />
      <NutritionSheet
        visible={copying}
        onClose={() => setCopying(false)}
        testID="plan-copy-sheet"
      >
        <View style={styles.sheet}>
          <Text style={styles.title} accessibilityRole="header">
            {t("Copy this day to…")}
          </Text>
          <View style={styles.week}>
            {WEEKDAYS.filter((day) => day !== weekday).map((day) => (
              <Tap
                key={day}
                style={styles.day}
                onPress={() => {
                  copyPlanDay(weekday, day);
                  setCopying(false);
                }}
                accessibilityRole="button"
                testID={`plan-copy-${day}`}
              >
                <Text style={styles.dayText}>{weekdayName(day)}</Text>
              </Tap>
            ))}
          </View>
          <Tap
            style={[gymStyles.button, styles.copy]}
            onPress={() => setCopying(false)}
            accessibilityRole="button"
          >
            <Text style={gymStyles.buttonText}>{t("Cancel")}</Text>
          </Tap>
        </View>
      </NutritionSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  plan: {
    gap: space.md,
  },
  week: {
    flexDirection: "row",
    gap: space.xs,
  },
  day: {
    flex: 1,
    minHeight: MIN_TAP_SIZE,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
  // The day shown: a stronger edge, never yellow (that is the route's).
  dayOn: {
    borderWidth: 2,
    borderColor: color.text,
    backgroundColor: color.surfaceRaised,
  },
  dayText: {
    color: color.text,
    fontSize: fontSize.small,
    fontWeight: fontWeight.medium,
  },
  head: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: space.sm,
  },
  title: {
    ...font.heading,
    color: color.text,
  },
  total: {
    ...font.body,
    color: color.textMuted,
  },
  copy: {
    flex: 0,
  },
  small: {
    ...font.small,
    color: color.textMuted,
  },
  sheet: {
    gap: space.md,
  },
});
