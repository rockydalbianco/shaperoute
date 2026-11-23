import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { MONTHS } from "../activities/activityText";
import { t } from "../i18n";
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
import { signedKcal } from "./activityEnergy";
import type { BalanceKind } from "./dayBalance";
import { intakeOf } from "./intake";
import { addDays, type LocalDay, localDayOf, weekdayOf, weekOf } from "./localDay";
import { NUTRITION_ON } from "./nutritionOn";
import { weekdayName } from "./PlanView";
import { useDaysEnergy } from "./useDayEnergy";
import { useNutrition } from "./useNutrition";
import { todayLeftOut, type WeekRow, weekRows, weekTotal } from "./weekBalance";

export const OWN_BALANCE_TEST_ID = "own-balance";

/** «16 Nov»: a day with its month, as the profile writes a day. */
function dayAndMonth(day: LocalDay): string {
  const [, month, date] = day.split("-").map(Number);
  return t("{day} {month}", { day: String(date), month: t(MONTHS[month - 1]) });
}

/** «This week» for the week of `today`, else «16 Nov – 22 Nov». */
export function weekLabel(days: readonly LocalDay[], today: LocalDay): string {
  return days.includes(today)
    ? t("This week")
    : `${dayAndMonth(days[0])} – ${dayAndMonth(days[days.length - 1])}`;
}

/** «Mon 23». */
function rowDay(day: LocalDay): string {
  return `${weekdayName(weekdayOf(day))} ${Number(day.slice(8))}`;
}

function kindWord(kind: BalanceKind | null): string | null {
  return kind === "surplus" ? t("Surplus") : kind === "deficit" ? t("Deficit") : null;
}

type Props = {
  /** The moment; a test gives its own. */
  now?: Date;
};

/**
 * «Calorie balance» on one's own «Profile» (TASK-489 part D, ADR-0397):
 * the week, a day to a row, with what was eaten, what the body used and the
 * balance between them, and what the week adds up to. Read from the diary
 * and the activities on this phone at every look: nothing of it goes to the
 * API, so nobody else can see it, and the card says so.
 *
 * Not there while «Nutrition» is off, and not before its notice was read:
 * the profile of who does not count calories stays as it was. Nothing is
 * read from the phone in the first case.
 */
export function OwnBalance({ now }: Props) {
  return NUTRITION_ON ? <Card now={now} /> : null;
}

function Card({ now }: Props) {
  const nutrition = useNutrition();
  const at = now ?? new Date();
  const today = localDayOf(at);
  const [inWeek, setInWeek] = useState<LocalDay>(today);
  const days = weekOf(inWeek);
  // Nothing is asked of the list before the notice of «Nutrition» was read.
  const energies = useDaysEnergy(nutrition.settings.noticeSeen ? days : [], at);
  if (!nutrition.settings.noticeSeen) {
    return null;
  }
  const rows = weekRows(
    energies,
    (day) => intakeOf(nutrition.mealsOn(day))?.kcal ?? null,
  );
  // While the activities are on their way no day has its balance: no total.
  const waiting = energies.some((energy) => energy.hub === "loading");
  const total = waiting ? null : weekTotal(rows);
  const current = days.includes(today);
  const word = kindWord(total?.kind ?? null);

  return (
    <View style={styles.box} testID={OWN_BALANCE_TEST_ID}>
      <View style={styles.head}>
        <Text style={styles.title} accessibilityRole="header">
          {t("Calorie balance")}
        </Text>
        <Text style={styles.note}>{t("Only you see this")}</Text>
      </View>
      <View style={styles.weeks}>
        <Tap
          style={styles.arrow}
          onPress={() => setInWeek(addDays(inWeek, -7))}
          accessibilityRole="button"
          accessibilityLabel={t("Previous week")}
          testID="balance-previous"
        >
          <Text style={styles.arrowMark}>‹</Text>
        </Tap>
        <Text style={styles.week} testID="balance-week">
          {weekLabel(days, today)}
        </Text>
        <Tap
          style={[styles.arrow, current && styles.off]}
          onPress={() => setInWeek(addDays(inWeek, 7))}
          disabled={current}
          accessibilityRole="button"
          accessibilityLabel={t("Next week")}
          accessibilityState={{ disabled: current }}
          testID="balance-next"
        >
          <Text style={styles.arrowMark}>›</Text>
        </Tap>
      </View>
      <View style={styles.row} importantForAccessibility="no-hide-descendants">
        <Text style={styles.day} />
        <Text style={styles.heading}>{t("Eaten")}</Text>
        <Text style={styles.heading}>{t("Used")}</Text>
        <Text style={styles.heading}>{t("Balance")}</Text>
      </View>
      {rows.map((row) => (
        <Row key={row.day} row={row} />
      ))}
      <Hairline />
      <View
        style={styles.row}
        accessible
        accessibilityLabel={[
          t("Week total"),
          total === null
            ? "—"
            : `${t("Eaten")} ${total.eaten}, ${t("Used")} ${total.used}, ${t("Balance")} ${signedKcal(total.balance)}`,
          word,
        ]
          .filter((part) => part !== null)
          .join(", ")}
        testID="balance-total"
      >
        <Text style={[styles.day, styles.strong]}>{t("Week total")}</Text>
        <Text style={[styles.number, styles.strong]}>{total?.eaten ?? "—"}</Text>
        <Text style={[styles.number, styles.strong]}>{total?.used ?? "—"}</Text>
        <Text style={[styles.number, styles.strong]}>
          {total === null ? "—" : signedKcal(total.balance)}
        </Text>
      </View>
      {word !== null && (
        <Text style={styles.word} importantForAccessibility="no">
          {word}
        </Text>
      )}
      {todayLeftOut(rows) && (
        <Text style={styles.note}>
          {t("Today is not in the total until the day is over.")}
        </Text>
      )}
      <Text style={styles.note}>
        {t("Estimates only. MuW does not provide diets or medical advice.")}
      </Text>
    </View>
  );
}

function Row({ row }: { row: WeekRow }) {
  const day = rowDay(row.day);
  const soFar = row.soFar && row.balance !== null ? t("so far") : null;
  const said =
    row.eaten === null || row.used === null || row.balance === null
      ? [day, "—"]
      : [
          day,
          soFar,
          `${t("Eaten")} ${row.eaten}`,
          `${t("Used")} ${row.used}`,
          `${t("Balance")} ${signedKcal(row.balance)}`,
          kindWord(row.kind),
        ];
  return (
    <View
      style={styles.row}
      accessible
      accessibilityLabel={said.filter((part) => part !== null).join(", ")}
      testID={`balance-${row.day}`}
    >
      <Text style={styles.day} numberOfLines={1}>
        {day}
        {soFar !== null && <Text style={styles.soFar}>{` · ${soFar}`}</Text>}
      </Text>
      <Text style={styles.number}>{row.eaten ?? "—"}</Text>
      <Text style={styles.number}>{row.used ?? "—"}</Text>
      <Text style={styles.number}>
        {row.balance === null ? "—" : signedKcal(row.balance)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  // As the other boxes of the profile (Vo2MaxRow.tsx).
  box: {
    gap: space.xs,
    padding: space.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
  head: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: space.sm,
  },
  title: {
    ...font.heading,
    flexShrink: 1,
    color: color.text,
  },
  note: {
    color: color.textMuted,
    fontSize: fontSize.small,
  },
  weeks: {
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
  week: {
    ...font.body,
    color: color.text,
  },
  row: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: space.xs,
    paddingVertical: space.xs,
  },
  day: {
    flex: 3,
    color: color.text,
    fontSize: fontSize.small,
  },
  soFar: {
    color: color.textMuted,
    fontSize: fontSize.small,
  },
  heading: {
    flex: 2,
    textAlign: "right",
    color: color.textMuted,
    fontSize: fontSize.small,
  },
  // Surplus and deficit in the same colour: words, not a judgement.
  number: {
    flex: 2,
    textAlign: "right",
    color: color.text,
    fontSize: fontSize.small,
    fontVariant: ["tabular-nums"],
  },
  strong: {
    fontWeight: fontWeight.semibold,
  },
  word: {
    textAlign: "right",
    color: color.textMuted,
    fontSize: fontSize.small,
  },
});
