import type { GymPlanItem, GymPlanSession, GymProgram } from "@shaperoute/shared-types";
import { StyleSheet, Text, View } from "react-native";

import { t } from "../i18n";
import type { Language } from "../i18n/languages";
import { color, font, fontSize, fontWeight, space } from "../theme/tokens";
import { exerciseName } from "./catalog";
import { kgText } from "./GymPlanWizard";
import { gymStyles } from "./gymStyles";
import { MuscleMap } from "./MuscleMap";
import { type Muscle, musclesOf, type Worked } from "./muscles";
import { outingTitle } from "./outingDay";
import { WEEK_DAYS } from "./planLimits";
import { isoDay } from "./plans";
import { sessionOn } from "./program";
import { dayLetter } from "./proposal";
import { runTitle } from "./runDay";
import { setsLabel } from "./SessionEditor";
import { SPORT_BADGES, sportOfSession } from "./SportsDoor";

/** The exercises the card lists; «+ 2 more» for the others. */
export const SHOWN_ITEMS = 3;

/** How far ahead the next workout is looked for: a plan starts today or
 * next Monday, and has a workout every week. */
const LOOK_AHEAD_DAYS = 14;

/** The plan's next workout: today's, unless it is done already, or the
 * first day after with one; `ahead` days from today. */
export type Coming = { session: GymPlanSession; ahead: number };

export function nextWorkout(
  program: GymProgram,
  now: Date,
  doneToday: boolean,
): Coming | null {
  for (let ahead = doneToday ? 1 : 0; ahead <= LOOK_AHEAD_DAYS; ahead++) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + ahead, 12);
    const found = sessionOn(program, date);
    if (found !== null) {
      return { session: found.session, ahead };
    }
  }
  return null;
}

/** «Today · B», «Tomorrow · Run», «Fri · C». */
export function comingTitle(program: GymProgram, coming: Coming, now: Date): string {
  const { session, ahead } = coming;
  const when =
    ahead === 0
      ? t("Today")
      : ahead === 1
        ? t("Tomorrow")
        : t(WEEK_DAYS[isoDay(new Date(now.getTime() + ahead * 86_400_000)) - 1]);
  const what =
    session.run !== undefined
      ? t("Run")
      : session.outing !== undefined
        ? SPORT_BADGES[sportOfSession(session)]
        : dayLetter(program.sessions, session.day);
  return `${when} · ${what}`;
}

/** «4 × 10 · 65 kg», «3 × 0:45». */
export function itemValues(item: GymPlanItem): string {
  return item.load_kg === undefined
    ? setsLabel(item)
    : `${setsLabel(item)} · ${kgText(item.load_kg)} kg`;
}

/** What the workout works: the main muscles of its exercises, and those
 * that help and are not main in another; null without a known exercise. */
export function workedBy(items: readonly GymPlanItem[]): Worked | null {
  const primary: Muscle[] = [];
  const secondary: Muscle[] = [];
  for (const item of items) {
    const worked = item.exercise === undefined ? null : musclesOf(item.exercise);
    for (const muscle of worked?.primary ?? []) {
      if (!primary.includes(muscle)) {
        primary.push(muscle);
      }
    }
    for (const muscle of worked?.secondary ?? []) {
      if (!secondary.includes(muscle)) {
        secondary.push(muscle);
      }
    }
  }
  return primary.length === 0
    ? null
    : { primary, secondary: secondary.filter((one) => !primary.includes(one)) };
}

/**
 * The next workout in a plan's card of «My plans» (TASK-506 C, the user's
 * choice of 2026-11-23): when and which, its name, the first exercises
 * with this week's values and «+ 2 more», the small body with what it
 * works; a run or a day out in one line.
 */
export function NextWorkout({
  program,
  coming,
  now,
  language,
}: {
  program: GymProgram;
  coming: Coming;
  now: Date;
  language: Language;
}) {
  const { session } = coming;
  const worked = workedBy(session.items);
  const shown = session.items.slice(0, SHOWN_ITEMS);
  const more = session.items.length - shown.length;
  const line =
    session.run !== undefined
      ? runTitle(session.run)
      : session.outing !== undefined
        ? outingTitle(session.outing)
        : null;
  return (
    <View style={styles.next} testID="gym-plan-next">
      <View style={styles.head}>
        {worked !== null && (
          <MuscleMap worked={worked} height={64} language={language} />
        )}
        <View style={styles.titles}>
          <Text style={styles.title} testID="gym-plan-next-title">
            {comingTitle(program, coming, now)}
          </Text>
          <Text style={gymStyles.muted} numberOfLines={1}>
            {line ?? session.name}
          </Text>
        </View>
      </View>
      {shown.map((item, i) => (
        <View key={i} style={styles.item} testID={`gym-plan-next-item-${i}`}>
          <Text style={styles.name} numberOfLines={1}>
            {exerciseName(item, language)}
          </Text>
          <Text style={styles.values}>{itemValues(item)}</Text>
        </View>
      ))}
      {more > 0 && (
        <Text style={gymStyles.muted}>
          {more === 1 ? t("+ 1 more") : t("+ {n} more", { n: String(more) })}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  next: {
    gap: space.sm,
    paddingTop: space.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: color.border,
  },
  head: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
  },
  titles: {
    flex: 1,
    gap: 2,
  },
  title: {
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold,
  },
  item: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: space.md,
  },
  name: {
    ...font.small,
    flex: 1,
    color: color.text,
  },
  values: {
    ...font.small,
    color: color.text,
    fontVariant: ["tabular-nums"],
  },
});
