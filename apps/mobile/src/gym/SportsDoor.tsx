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
import { isRunDay, proposedDays, proposedRunDays } from "./proposal";

/**
 * «Cosa vuoi allenare?» (TASK-461 A2, ADR-0371): the door of «New plan»,
 * the user's mockup E0 of 2026-11-11 and choice «Almeno due, sempre»: a
 * plan mixes at least two sports, so two are chosen before going on. Gym,
 * bodyweight and running are here; a distance and the mountain come next
 * («Presto»).
 */

/** The sports a plan of the guide mixes. */
export const PLAN_SPORTS = [
  "gym",
  "body",
  "run",
  "walk",
  "bike",
  "swim",
  "mountain",
] as const;
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
  // The sports with a distance or a climb (TASK-461 B and C): two days for
  // the first chosen, one for each other.
  const endurance = chosen.filter((one) => ENDURANCE_SPORTS.includes(one));
  const enduranceCount = (sport: PlanSport) =>
    !chosen.includes(sport) ? 0 : endurance[0] === sport ? (gym && body ? 1 : 2) : 1;
  return {
    gym: gym ? (body ? 2 : 3) : 0,
    body: body ? (gym ? 2 : 3) : 0,
    run: enduranceCount("run"),
    walk: enduranceCount("walk"),
    bike: enduranceCount("bike"),
    swim: enduranceCount("swim"),
    mountain: enduranceCount("mountain"),
  };
}

/** The sports with a distance or a climb, the first chosen leads to the
 * plan's target (the user's «Più d'uno» of 2026-11-12). */
export const ENDURANCE_SPORTS: readonly PlanSport[] = [
  "run",
  "walk",
  "bike",
  "swim",
  "mountain",
];

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
  const spread: Record<PlanSport, number[]> = {
    gym: first === "gym" ? primary : [],
    body: first === "body" ? primary : second,
    run: [],
    walk: [],
    bike: [],
    swim: [],
    mountain: [],
  };
  // The sports with a distance in the order chosen, each on free days.
  let taken = [...primary, ...second];
  for (const sport of chosen.filter((one) => ENDURANCE_SPORTS.includes(one))) {
    spread[sport] = proposedRunDays(count(sport), taken);
    taken = [...taken, ...spread[sport]];
  }
  return spread;
}

/** The sports of a plan's days. */
export function sportsOf(sessions: readonly GymPlanSession[]): PlanSport[] {
  return PLAN_SPORTS.filter((sport) =>
    sessions.some((one) => sportOfSession(one) === sport),
  );
}

/** The door's sport of a day of a plan. */
export function sportOfSession(session: GymPlanSession): PlanSport {
  if (isRunDay(session)) {
    return "run";
  }
  switch (session.outing?.sport) {
    case undefined:
      return isBodyweightDay(session) ? "body" : "gym";
    case "walk":
      return "walk";
    case "hike":
      return session.outing.kind === "climb" ? "mountain" : "walk";
    case "bike":
    case "gravel":
    case "mtb":
      return "bike";
    case "swim":
    case "paddle":
      return "swim";
  }
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
  { sport: "run", title: tLater("Running"), line: tLater("Toward 5, 10, 21 or 42 km") },
  {
    sport: "walk",
    title: tLater("Walking and hiking"),
    line: tLater("Toward 10, 15, 20, 30 km"),
  },
  {
    sport: "bike",
    title: tLater("Cycling"),
    line: tLater("Road, gravel, MTB · toward 30–150 km"),
  },
  {
    sport: "swim",
    title: tLater("Swimming and paddling"),
    line: tLater("Pool or open water"),
  },
  {
    sport: "mountain",
    title: tLater("Mountains"),
    line: tLater("Hikes and trips, more climb each week"),
  },
];

/** The mark of each sport of the door, in its square. */
export const SPORT_BADGES: Readonly<Record<PlanSport, string>> = {
  gym: "GYM",
  body: "BODY",
  run: "RUN",
  walk: "WALK",
  bike: "BIKE",
  swim: "SWIM",
  mountain: "▲",
};

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
        // The sports with a distance in the run's blue (TASK-461 B, C).
        const run = ENDURANCE_SPORTS.includes(one.sport);
        const strength = one.sport === "gym" || one.sport === "body";
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
              {!strength ? (
                <Text style={styles.runBadge}>{SPORT_BADGES[one.sport]}</Text>
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
});
