import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { dayLabel } from "../activities/activityText";
import { gymStyles } from "../gym/gymStyles";
import { t } from "../i18n";
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
import { Hairline } from "../ui/Hairline";
import { Tap } from "../ui/Tap";
import { balanceOf, signedKcal } from "./activityEnergy";
import { AddFoodSheet } from "./AddFoodSheet";
import { EnergySheet } from "./EnergySheet";
import { intakeOf, plannedIntake } from "./intake";
import { addDays, type LocalDay, startOf, weekdayOf } from "./localDay";
import { MealCard } from "./MealCard";
import { leftKcal } from "./ownTarget";
import {
  type Meal,
  MEALS,
  type Portion,
  withGrams,
  withoutPortion,
  withPortion,
} from "./plan";
import { TargetSheet } from "./TargetSheet";
import { useDayEnergy } from "./useDayEnergy";
import { useNutrition, writeDay, writeDayAsPlanned, writeTarget } from "./useNutrition";

/** «Today», «Yesterday», or the day as the activities write it
 * («Fri 2 Oct 2026»). */
export function diaryDayLabel(day: LocalDay, today: LocalDay): string {
  if (day === today) {
    return t("Today");
  }
  if (day === addDays(today, -1)) {
    return t("Yesterday");
  }
  return dayLabel(startOf(day)?.toISOString() ?? "");
}

type Props = {
  /** The phone's day, now. */
  today: LocalDay;
  /** The moment, for the rest counted so far today; a test gives its own. */
  now?: Date;
};

/** The portion the sheet is open on: a new one for a meal, or one touched. */
type Open = { meal: Meal; index: number | null };

/**
 * «Diary» (TASK-489 part B, ADR-0397): what the user ate on a day, meal by
 * meal, with the calories estimated for each portion and for the day. On
 * top, «Eaten», «Used (est.)» and «Balance». «Used (est.)» is the rest of
 * the body and the activities of the private list that began that day
 * (part C1); a tap opens what it is made of, where the user can write
 * their own numbers. Today the rest is counted up to now, and the page
 * says so. «Balance» is eaten less used, with its sign and «Surplus» or
 * «Deficit»: words, not a judgement, and none for a day with nothing
 * written. «My daily target» is there only if the user wrote one, with
 * what is «Left» of it.
 *
 * «Eaten as planned» writes the whole day as the plan has it for that day
 * of the week. It is offered while the day has nothing written, so that it
 * never takes away what the user wrote by hand.
 *
 * The days after today cannot be written: a diary says what was eaten.
 */
export function DiaryView({ today, now }: Props) {
  const language = useLanguage();
  const nutrition = useNutrition();
  const [day, setDay] = useState<LocalDay>(today);
  const [open, setOpen] = useState<Open | null>(null);
  const [shown, setShown] = useState<Open>({ meal: "breakfast", index: null });
  const [targetOpen, setTargetOpen] = useState(false);
  const [energyOpen, setEnergyOpen] = useState(false);
  const energy = useDayEnergy(day, now ?? new Date());

  const meals = nutrition.mealsOn(day);
  const eaten = intakeOf(meals);
  const target = nutrition.settings.target;
  const left = leftKcal(target, eaten?.kcal ?? null);
  const balance = balanceOf(eaten?.kcal ?? null, energy);
  const used = energy.used === null ? "—" : String(energy.used.used);
  const last = day >= today;
  const asPlanned =
    eaten === null && plannedIntake(nutrition.plan, weekdayOf(day)) !== null;
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
    writeDay(
      day,
      open.index === null
        ? withPortion(meals, open.meal, portion)
        : withGrams(meals, open.meal, open.index, portion.grams),
    );
    setOpen(null);
  }

  function remove() {
    if (open !== null && open.index !== null) {
      writeDay(day, withoutPortion(meals, open.meal, open.index));
    }
    setOpen(null);
  }

  return (
    <View style={styles.diary} testID="nutrition-diary">
      <View style={styles.days}>
        <Tap
          style={styles.arrow}
          onPress={() => setDay(addDays(day, -1))}
          accessibilityRole="button"
          accessibilityLabel={t("Previous day")}
          testID="diary-previous"
        >
          <Text style={styles.arrowMark}>‹</Text>
        </Tap>
        <Text style={styles.day} accessibilityRole="header" testID="diary-day">
          {diaryDayLabel(day, today)}
        </Text>
        <Tap
          style={[styles.arrow, last && styles.off]}
          onPress={() => setDay(addDays(day, 1))}
          disabled={last}
          accessibilityRole="button"
          accessibilityLabel={t("Next day")}
          accessibilityState={{ disabled: last }}
          testID="diary-next"
        >
          <Text style={styles.arrowMark}>›</Text>
        </Tap>
      </View>

      <View style={styles.card}>
        <View style={styles.numbers}>
          <Figure
            label={t("Eaten")}
            value={eaten === null ? "—" : String(eaten.kcal)}
          />
          <Tap
            style={styles.number}
            onPress={() => setEnergyOpen(true)}
            accessibilityRole="button"
            accessibilityLabel={`${t("Used (est.)")}, ${used}`}
            testID="diary-used"
          >
            <Text style={styles.numberLabel}>{`${t("Used (est.)")} ›`}</Text>
            <Text style={styles.numberValue}>{used}</Text>
          </Tap>
          <Figure
            label={t("Balance")}
            value={balance === null ? "—" : signedKcal(balance.balance)}
            note={
              balance === null || balance.kind === "even"
                ? undefined
                : balance.kind === "surplus"
                  ? t("Surplus")
                  : t("Deficit")
            }
          />
        </View>
        {energy.soFar && (
          <Text style={styles.soFar} testID="diary-so-far">
            {t("Today the energy at rest is counted up to now.")}
          </Text>
        )}
        <Hairline />
        <Tap
          style={styles.target}
          onPress={() => setTargetOpen(true)}
          accessibilityRole="button"
          testID="diary-target"
        >
          {target === null || left === null ? (
            <Text style={styles.link}>{t("Set my daily target")}</Text>
          ) : (
            <>
              <Text style={styles.targetText}>
                {`${t("My daily target")} ${target} ${t("(set by you)")}`}
              </Text>
              <Text style={styles.targetText} testID="diary-left">
                {`${t("Left")} ${left}`}
              </Text>
            </>
          )}
        </Tap>
      </View>

      {asPlanned && (
        <Tap
          style={[gymStyles.button, styles.planned]}
          onPress={() => writeDayAsPlanned(day)}
          accessibilityRole="button"
          testID="diary-as-planned"
        >
          <Text style={gymStyles.buttonText}>{t("Eaten as planned")}</Text>
        </Tap>
      )}

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
      <TargetSheet
        visible={targetOpen}
        target={target}
        onTarget={(kcal) => {
          writeTarget(kcal);
          setTargetOpen(false);
        }}
        onClose={() => setTargetOpen(false)}
      />
      <EnergySheet
        visible={energyOpen}
        energy={energy}
        onClose={() => setEnergyOpen(false)}
      />
    </View>
  );
}

function Figure({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  /** A word under the number: «Surplus», «Deficit». */
  note?: string;
}) {
  return (
    <View
      style={styles.number}
      accessible
      accessibilityLabel={[label, value, note].filter(Boolean).join(", ")}
    >
      <Text style={styles.numberLabel}>{label}</Text>
      <Text style={styles.numberValue}>{value}</Text>
      {note !== undefined && <Text style={styles.numberLabel}>{note}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  diary: {
    gap: space.md,
  },
  days: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  arrow: {
    width: MIN_TAP_SIZE,
    height: MIN_TAP_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  arrowMark: {
    color: color.text,
    fontSize: fontSize.heading,
    fontWeight: fontWeight.medium,
  },
  off: {
    opacity: 0.4,
  },
  day: {
    ...font.cardTitle,
    color: color.text,
  },
  card: {
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
  numbers: {
    flexDirection: "row",
    paddingBottom: space.md,
  },
  number: {
    flex: 1,
    alignItems: "center",
    gap: space.xs / 2,
  },
  numberLabel: {
    ...font.small,
    color: color.textMuted,
  },
  numberValue: {
    ...font.heading,
    color: color.text,
  },
  soFar: {
    ...font.small,
    color: color.textMuted,
    paddingBottom: space.md,
  },
  target: {
    minHeight: MIN_TAP_SIZE,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space.md,
  },
  targetText: {
    ...font.small,
    color: color.textMuted,
  },
  link: {
    ...font.body,
    color: color.text,
    textDecorationLine: "underline",
  },
  planned: {
    flex: 0,
  },
});
