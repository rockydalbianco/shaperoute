import {
  type GymPlanItem,
  type GymPlanPosted,
  type GymPlanSession,
  MAX_GYM_PLANS,
} from "@shaperoute/shared-types";
import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import { useActivitiesDoor } from "../activities/activitiesDoor";
import { exerciseName } from "../gym/catalog";
import { kgText } from "../gym/GymPlanWizard";
import { gymStyles } from "../gym/gymStyles";
import { outingTitle } from "../gym/outingDay";
import { WEEK_DAYS } from "../gym/planLimits";
import { plansOf } from "../gym/plans";
import { dayLetter, goalOf, isRunDay } from "../gym/proposal";
import { runTitle } from "../gym/runDay";
import { type PlanSport, sportOfSession, sportsOf } from "../gym/SportsDoor";
import { t, tLater, tPlural } from "../i18n";
import type { Language } from "../i18n/languages";
import { color, font, fontWeight, MIN_TAP_SIZE, radius, space } from "../theme/tokens";
import { Tap } from "../ui/Tap";
import { PlanCopy, PlanPostDetail } from "./PlanPostDetail";

/**
 * A gym plan posted, in the Feed (TASK-485 part B, ADR-0394, the user's
 * «Riquadro + dettaglio» of 2026-11-21): «Workout plan», «{name} ·
 * {goal}», «4 days a week · 8 weeks», the plan's sports and its week with
 * the letter of each workout; the author's line, optional, above. Tapped,
 * the plan opens whole (PlanPostDetail); «Use this plan» copies it, but
 * not on one's own post.
 */

/** The sports of the door, as «New plan» names them (SportsDoor.tsx). */
const SPORT_NAMES: Readonly<Record<PlanSport, string>> = {
  gym: tLater("Gym"),
  body: tLater("Bodyweight"),
  run: tLater("Running"),
  walk: tLater("Walking and hiking"),
  bike: tLater("Cycling"),
  swim: tLater("Swimming and paddling"),
  mountain: tLater("Mountains"),
};

/** The workouts of the plan's first week, by day: a plan without weeks
 * has its one workout on each of its days. */
export function postedSessions(plan: GymPlanPosted): GymPlanSession[] {
  const sessions =
    plan.program?.sessions ??
    plan.days.map((day) => ({ day, name: plan.name, items: plan.items }));
  return [...sessions].sort((a, b) => a.day - b.day);
}

/** «Lift and run · Get back in shape»: the name, and the goal when the
 * guide made it. */
export function planTitle(plan: GymPlanPosted): string {
  const goal = plan.program?.goal;
  return goal === undefined ? plan.name : `${plan.name} · ${t(goalOf(goal).title)}`;
}

/** «4 days a week · 8 weeks». */
export function planWeekLine(plan: GymPlanPosted): string {
  const days = new Set(postedSessions(plan).map((one) => one.day)).size;
  const weeks = plan.program?.weeks ?? 1;
  return `${tPlural(days, "{count} day a week", "{count} days a week")} · ${tPlural(
    weeks,
    "{count} week",
    "{count} weeks",
  )}`;
}

/** «Gym · Running»: the sports of its days, in the door's order. */
export function planSports(plan: GymPlanPosted): string {
  return sportsOf(postedSessions(plan))
    .map((sport) => t(SPORT_NAMES[sport]))
    .join(" · ");
}

function clock(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(Math.round(seconds % 60)).padStart(2, "0")}`;
}

/** «Bench press 4 × 10 · 60 kg», «Plank 3 × 0:45»: an exercise of the plan
 * with its sets, what each aims at and its kg (the user's «Anche i kg»). */
export function planItemText(item: GymPlanItem, language: Language): string {
  const name = exerciseName(item, language);
  const each =
    item.reps !== undefined
      ? String(item.reps)
      : item.duration_s !== undefined
        ? clock(item.duration_s)
        : item.distance_m !== undefined
          ? `${item.distance_m} m`
          : null;
  const sets = each === null ? `${item.sets} ×` : `${item.sets} × ${each}`;
  const kg =
    item.load_kg !== undefined && item.load_kg > 0
      ? ` · ${kgText(item.load_kg)} kg`
      : "";
  return `${name} ${sets}${kg}`;
}

/** «A · Mon», a workout's letter and day; «Thu — Long run · 8 km» for a
 * run or a day out, which have a name of their own. */
export function sessionHeading(
  sessions: GymPlanSession[],
  session: GymPlanSession,
): string {
  const day = t(WEEK_DAYS[session.day - 1]);
  if (session.run !== undefined) {
    return `${day} — ${runTitle(session.run)}`;
  }
  if (session.outing !== undefined) {
    return `${day} — ${outingTitle(session.outing)}`;
  }
  return `${dayLetter(sessions, session.day)} · ${day}`;
}

type TileProps = {
  plan: GymPlanPosted;
  /** The author's line; null or absent: none. */
  description?: string | null;
  width: number;
  /** Opens the plan whole; without it the tile is not a button. */
  onOpen?: () => void;
  /** «Use this plan»; absent on one's own post and before «Post». */
  onUse?: () => void;
};

export function PlanPostTile({
  plan,
  description = null,
  width,
  onOpen,
  onUse,
}: TileProps) {
  const sessions = postedSessions(plan);
  const byDay = new Map(sessions.map((one) => [one.day, one]));
  const label = [
    t("Workout plan"),
    planTitle(plan),
    planWeekLine(plan),
    planSports(plan),
  ].join(". ");
  const body = (
    <>
      <Text style={styles.kind}>{t("Workout plan").toUpperCase()}</Text>
      <Text style={styles.title}>{planTitle(plan)}</Text>
      <Text style={gymStyles.muted}>{planWeekLine(plan)}</Text>
      <Text style={gymStyles.muted} testID="plan-tile-sports">
        {planSports(plan)}
      </Text>
      <View
        style={styles.week}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        {WEEK_DAYS.map((name, i) => {
          const session = byDay.get(i + 1);
          const strength =
            session !== undefined && !isRunDay(session) && session.outing === undefined;
          return (
            <View key={name} style={styles.day}>
              <View
                style={[
                  styles.box,
                  session !== undefined && (strength ? styles.boxGym : styles.boxOut),
                ]}
                testID={session === undefined ? "plan-tile-rest" : "plan-tile-day"}
              >
                <Text style={[styles.letter, strength && styles.letterGym]}>
                  {session === undefined
                    ? ""
                    : strength
                      ? dayLetter(sessions, session.day)
                      : sportMark(session)}
                </Text>
              </View>
              <Text style={styles.dayName}>{t(name)}</Text>
            </View>
          );
        })}
      </View>
    </>
  );
  return (
    <View style={[styles.tile, { width }]} testID="plan-tile">
      {description !== null && description.trim() !== "" && (
        <Text style={gymStyles.text} testID="plan-tile-line">
          {description}
        </Text>
      )}
      {onOpen === undefined ? (
        <View style={styles.card} accessible accessibilityLabel={label}>
          {body}
        </View>
      ) : (
        <Tap
          style={styles.card}
          onPress={onOpen}
          accessibilityRole="button"
          accessibilityLabel={label}
          testID="plan-tile-open"
        >
          {body}
        </Tap>
      )}
      {onUse !== undefined && (
        <Pressable
          style={({ pressed }) => [
            gymStyles.button,
            gymStyles.primary,
            pressed && styles.pressed,
          ]}
          onPress={onUse}
          accessibilityRole="button"
          testID="plan-tile-use"
        >
          <Text style={[gymStyles.buttonText, gymStyles.primaryText]}>
            {t("Use this plan")}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

/** The first letter of the sport of a day without a letter: a run, a day
 * out. */
function sportMark(session: GymPlanSession): string {
  return t(SPORT_NAMES[sportOfSession(session)]).charAt(0).toUpperCase();
}

/**
 * The post in the Feed: the tile, the plan whole when tapped, and the
 * guide when «Use this plan» is pressed; once saved, «Added to your
 * plans» under it. With 20 plans already the guide does not open.
 */
export function PlanPost({
  plan,
  description,
  mine,
  drawingId,
  width,
}: {
  plan: GymPlanPosted;
  description: string | null;
  /** One's own: no «Use this plan». */
  mine: boolean;
  /** What the others open it with: one's own is deleted by it. */
  drawingId: string;
  width: number;
}) {
  const owner = useActivitiesDoor().owner ?? null;
  const [open, setOpen] = useState(false);
  const [copying, setCopying] = useState(false);
  const [added, setAdded] = useState(false);
  function onUse() {
    if (owner !== null && plansOf(owner).length >= MAX_GYM_PLANS) {
      Alert.alert(t("You already have 20 plans: delete one to add this."));
      return;
    }
    setCopying(true);
  }
  const copy = copying ? (
    <PlanCopy
      plan={plan}
      onDone={(saved) => {
        setCopying(false);
        if (saved) {
          setOpen(false);
          setAdded(true);
        }
      }}
    />
  ) : null;
  return (
    <>
      <PlanPostTile
        plan={plan}
        description={description}
        width={width}
        onOpen={() => setOpen(true)}
        onUse={mine ? undefined : onUse}
      />
      {added && (
        <Text style={gymStyles.muted} accessibilityRole="alert" testID="plan-added">
          {t("Added to your plans")}
        </Text>
      )}
      <PlanPostDetail
        visible={open}
        plan={plan}
        mine={mine}
        drawingId={drawingId}
        onUse={mine ? undefined : onUse}
        onClose={() => setOpen(false)}
      >
        {copy}
      </PlanPostDetail>
      {!open && copy}
    </>
  );
}

const styles = StyleSheet.create({
  tile: {
    gap: space.sm,
  },
  card: {
    gap: space.xs,
    padding: space.lg,
    borderRadius: radius.card,
    backgroundColor: color.surfaceRaised,
  },
  kind: {
    ...font.label,
    color: color.textMuted,
  },
  title: {
    ...font.heading,
    color: color.text,
  },
  week: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: space.sm,
  },
  day: {
    alignItems: "center",
    gap: space.xs,
  },
  box: {
    width: MIN_TAP_SIZE * 0.75,
    height: MIN_TAP_SIZE * 0.75,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.border,
  },
  boxGym: {
    borderColor: color.accent,
    backgroundColor: color.accent,
  },
  boxOut: {
    borderColor: color.runDay,
  },
  letter: {
    ...font.body,
    fontWeight: fontWeight.semibold,
    color: color.runDay,
  },
  letterGym: {
    color: color.onAccent,
  },
  dayName: {
    ...font.detail,
    color: color.textMuted,
  },
  pressed: {
    opacity: 0.6,
  },
});
