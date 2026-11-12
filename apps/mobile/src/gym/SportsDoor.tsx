import type { GymPlanGoal, GymPlanSession } from "@shaperoute/shared-types";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { t, tLater } from "../i18n";
import {
  color,
  font,
  fontSize,
  fontWeight,
  MIN_TAP_SIZE,
  radius,
  space,
} from "../theme/tokens";
import { type Equipment, isBodyweightDay } from "./bodyweight";
import { ExerciseFigure } from "./ExerciseFigure";
import { MOVES } from "./moves";
import { isGymDay, isRunDay, proposedDays, proposedRunDays } from "./proposal";

/**
 * «Cosa vuoi allenare?» (TASK-461 A2, ADR-0371): the door of «New plan»,
 * the user's mockup E0 of 2026-11-11 and choice «Almeno due, sempre»: a
 * plan mixes at least two sports, so two are chosen before going on. Gym,
 * bodyweight and running are here; a distance and the mountain come next
 * («Presto»).
 */

/** The sports a plan of the guide mixes. */
export const PLAN_SPORTS = ["gym", "body", "run"] as const;
export type PlanSport = (typeof PLAN_SPORTS)[number];

/** A plan mixes at least this many. */
export const MIN_PLAN_SPORTS = 2;

/** The sports chosen when the door opens, as the mockup E0. */
export const DOOR_CHOSEN: readonly PlanSport[] = ["body", "run"];

/** How many days a week each sport has. */
export type SportCounts = Readonly<Record<PlanSport, number>>;

/** The days the guide proposes for the sports chosen: three of the gym or
 * of bodyweight and two runs; two each when both the gym and bodyweight. */
export function countsFor(chosen: readonly PlanSport[]): SportCounts {
  const gym = chosen.includes("gym");
  const body = chosen.includes("body");
  return {
    gym: gym ? (body ? 2 : 3) : 0,
    body: body ? (gym ? 2 : 3) : 0,
    run: chosen.includes("run") ? (gym && body ? 1 : 2) : 0,
  };
}

export const DOOR_COUNTS = countsFor(DOOR_CHOSEN);

/** The days of the week of each sport for `counts`: the gym's (or
 * bodyweight's) with a day of rest between, the others on the free days,
 * Tuesday and Saturday first («Già alternati, col riposo in mezzo»). */
export function spreadDays(
  chosen: readonly PlanSport[],
  counts: SportCounts,
): Record<PlanSport, number[]> {
  const count = (sport: PlanSport) => (chosen.includes(sport) ? counts[sport] : 0);
  const first: PlanSport = chosen.includes("gym") ? "gym" : "body";
  const primary = count(first) > 0 ? proposedDays(count(first)) : [];
  const second = first === "gym" ? proposedRunDays(count("body"), primary) : [];
  const run = proposedRunDays(count("run"), [...primary, ...second]);
  return {
    gym: first === "gym" ? primary : [],
    body: first === "body" ? primary : second,
    run,
  };
}

/** The sports of a plan's days. */
export function sportsOf(sessions: readonly GymPlanSession[]): PlanSport[] {
  return PLAN_SPORTS.filter((sport) =>
    sessions.some(
      sport === "gym" ? isGymDay : sport === "body" ? isBodyweightDay : isRunDay,
    ),
  );
}

/** What a proposal was made for: proposed again when it changes. */
export function proposalKey(
  goal: GymPlanGoal,
  equipment: Equipment,
  sports: readonly PlanSport[],
): string {
  return `${goal}|${equipment}|${sports.join(",")}`;
}

const OPTIONS: readonly { sport: PlanSport; title: string; line: string }[] = [
  { sport: "gym", title: tLater("Gym"), line: tLater("With weights and machines") },
  {
    sport: "body",
    title: tLater("Bodyweight"),
    line: tLater("At home or in the park, no equipment"),
  },
  { sport: "run", title: tLater("Running"), line: tLater("Easy, intervals, long") },
];

const SOON: readonly { key: string; badge: string; title: string; line: string }[] = [
  {
    key: "distance",
    badge: "KM",
    title: tLater("Toward a distance"),
    line: tLater("Running, walking, cycling, swimming"),
  },
  {
    key: "mountain",
    badge: "▲",
    title: tLater("Mountains"),
    line: tLater("Hikes and trips, more climb each week"),
  },
];

const ICON = 44;

export function SportsDoor({
  chosen,
  onToggle,
}: {
  chosen: readonly PlanSport[];
  onToggle: (sport: PlanSport) => void;
}) {
  return (
    <>
      <View style={styles.heading}>
        <Text style={styles.title} accessibilityRole="header">
          {t("What do you want to train?")}
        </Text>
        <Text style={styles.lead}>
          {t(
            "Choose at least two: a plan always mixes two sports. Then we guide you in 5 steps.",
          )}
        </Text>
      </View>
      {OPTIONS.map((one) => {
        const on = chosen.includes(one.sport);
        const run = one.sport === "run";
        return (
          <Pressable
            key={one.sport}
            style={({ pressed }) => [
              styles.option,
              on && (run ? styles.optionRun : styles.optionOn),
              pressed && styles.pressed,
            ]}
            onPress={() => onToggle(one.sport)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: on }}
            testID={`door-${one.sport}`}
          >
            <View style={styles.icon}>
              {run ? (
                <Text style={styles.runBadge}>RUN</Text>
              ) : (
                <ExerciseFigure
                  move={one.sport === "gym" ? MOVES.bench : MOVES.push_up}
                  size={ICON - space.xs}
                  still
                />
              )}
            </View>
            <View style={styles.optionText}>
              <Text style={styles.optionTitle}>{t(one.title)}</Text>
              <Text style={styles.optionLine}>{t(one.line)}</Text>
            </View>
            <View style={[styles.box, on && (run ? styles.boxRun : styles.boxOn)]}>
              {on && <Text style={styles.boxText}>✓</Text>}
            </View>
          </Pressable>
        );
      })}
      {SOON.map((one) => (
        <View
          key={one.key}
          style={styles.option}
          accessibilityState={{ disabled: true }}
          testID={`door-${one.key}`}
        >
          <View style={styles.icon}>
            <Text style={styles.soonBadge}>{one.badge}</Text>
          </View>
          <View style={styles.optionText}>
            <Text style={[styles.optionTitle, styles.muted]}>{t(one.title)}</Text>
            <Text style={[styles.optionLine, styles.faint]}>{t(one.line)}</Text>
          </View>
          <Text style={styles.soon}>{t("Soon@@door")}</Text>
        </View>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  heading: {
    gap: space.xs,
    marginBottom: space.xs,
  },
  // As the guide's other steps.
  title: {
    color: color.text,
    fontSize: 28,
    lineHeight: 33,
    fontWeight: fontWeight.bold,
    letterSpacing: -0.5,
  },
  lead: {
    ...font.body,
    color: color.textMuted,
  },
  option: {
    minHeight: MIN_TAP_SIZE + space.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
  optionOn: {
    borderWidth: 2,
    borderColor: color.accent,
  },
  optionRun: {
    borderWidth: 2,
    borderColor: color.runDay,
  },
  pressed: {
    opacity: 0.7,
  },
  icon: {
    width: ICON,
    height: ICON,
    borderRadius: radius.md,
    backgroundColor: color.surfaceRaised,
    alignItems: "center",
    justifyContent: "center",
  },
  runBadge: {
    color: color.runDay,
    fontSize: fontSize.small,
    fontWeight: fontWeight.bold,
  },
  soonBadge: {
    color: color.borderStrong,
    fontSize: fontSize.small,
    fontWeight: fontWeight.bold,
  },
  optionText: {
    flex: 1,
    gap: 2,
  },
  optionTitle: {
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
  optionLine: {
    color: color.textMuted,
    fontSize: fontSize.small,
  },
  muted: {
    color: color.textMuted,
  },
  faint: {
    color: color.textFaint,
  },
  box: {
    width: 22,
    height: 22,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: color.borderStrong,
    alignItems: "center",
    justifyContent: "center",
  },
  boxOn: {
    borderColor: color.accent,
    backgroundColor: color.accent,
  },
  boxRun: {
    borderColor: color.runDay,
    backgroundColor: color.runDay,
  },
  boxText: {
    color: color.onAccent,
    fontSize: fontSize.small,
    fontWeight: fontWeight.bold,
  },
  soon: {
    color: color.textMuted,
    fontSize: fontSize.small,
    paddingHorizontal: space.sm,
    paddingVertical: space.xs,
    borderRadius: radius.md,
    backgroundColor: color.surfaceRaised,
    overflow: "hidden",
  },
});
