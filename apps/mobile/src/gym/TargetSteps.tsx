import type { GymProgram } from "@shaperoute/shared-types";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { dayLabel } from "../activities/activityText";
import { fetchActivities } from "../api/activities";
import { decimal, t, tLater } from "../i18n";
import { useFollowsDoor } from "../social/followsDoor";
import {
  color,
  font,
  fontSize,
  fontWeight,
  MIN_TAP_SIZE,
  radius,
  space,
} from "../theme/tokens";
import { type Best, lastMonthOutings, longestOf, mostClimbOf } from "./outingHistory";
import type { PlanSport } from "./SportsDoor";
import { FROM_ZERO_CLIMB_M, FROM_ZERO_M, type TargetPlan } from "./targetPlan";
import {
  MAX_TARGET_WEEKS,
  type TargetSport,
  distanceStep,
  ladderOf,
  ladderValue,
  isLightWeek,
} from "./targetWeeks";

/**
 * The guide's steps toward a target (TASK-461 B and C, ADR-0371; rows F
 * and G of the canvas «Schede palestra guidate», approved by the user on
 * 2026-11-11): where to get to («Dove vuoi arrivare?», «Che gita vuoi
 * fare?»), where one is today («Dove sei oggi?», «Quanta salita fai
 * oggi?»), when («Per quando?») and the plan's ladder («Verso i 10 km»).
 */

/** The sports of the door that lead to a target, in the door's order. */
export const ENDURANCE: readonly PlanSport[] = [
  "run",
  "walk",
  "bike",
  "swim",
  "mountain",
];

export function isEndurance(sport: PlanSport): boolean {
  return ENDURANCE.includes(sport);
}

/** What the plan leads to: a distance, a hike's climb, or nothing. */
export type Aim =
  | { kind: "distance"; metres: number }
  | { kind: "climb"; metres: number }
  | { kind: "keepFit" };

/** The sport of the target's days, from the door's sport. */
export function targetSportOf(door: PlanSport, paddle: boolean): TargetSport {
  switch (door) {
    case "walk":
      return "walk";
    case "bike":
      return "bike";
    case "swim":
      return paddle ? "paddle" : "swim";
    case "mountain":
      return "hike";
    default:
      return "run";
  }
}

/** The targets offered, in metres (the approved chips). */
export const GOAL_CHIPS_M: Readonly<Record<TargetSport | "climb", readonly number[]>> =
  {
    run: [5000, 10_000, 21_097, 42_195],
    walk: [10_000, 15_000, 20_000, 30_000],
    hike: [10_000, 15_000, 20_000, 30_000],
    bike: [30_000, 60_000, 100_000, 150_000],
    gravel: [30_000, 60_000, 100_000, 150_000],
    mtb: [30_000, 60_000, 100_000, 150_000],
    swim: [1000, 2000, 3000, 5000],
    paddle: [5000, 10_000, 20_000, 30_000],
    climb: [500, 1000, 1500, 2000],
  };

/** The first aim offered for a door's sport. */
export function firstAim(door: PlanSport, paddle: boolean): Aim {
  if (door === "mountain") {
    return { kind: "climb", metres: 1000 };
  }
  return { kind: "distance", metres: GOAL_CHIPS_M[targetSportOf(door, paddle)][1] };
}

/** «10 km», «21,1 km», «800 m». */
export function metresText(metres: number): string {
  if (metres < 1000) {
    return `${metres} m`;
  }
  const km = Math.round(metres / 100) / 10;
  return `${Number.isInteger(km) ? String(km) : decimal(km)} km`;
}

/** The aim as it reads: «10 km», «1000 m». */
export function aimText(aim: Aim): string {
  return aim.kind === "keepFit"
    ? ""
    : aim.kind === "climb"
      ? `${aim.metres} m`
      : metresText(aim.metres);
}

const HISTORY_FROM: Readonly<Record<TargetSport, string>> = {
  run: tLater("Already written from your runs: {amount} on {day}."),
  walk: tLater("Already written from your walks: {amount} on {day}."),
  hike: tLater("Already written from your hikes: {amount} on {day}."),
  bike: tLater("Already written from your rides: {amount} on {day}."),
  gravel: tLater("Already written from your rides: {amount} on {day}."),
  mtb: tLater("Already written from your rides: {amount} on {day}."),
  swim: tLater("Already written from your swims: {amount} on {day}."),
  paddle: tLater("Already written from your paddles: {amount} on {day}."),
};

function Option({
  title,
  line,
  on,
  onPress,
  testID,
}: {
  title: string;
  line?: string;
  on: boolean;
  onPress: () => void;
  testID: string;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.option,
        on && styles.optionOn,
        pressed && styles.pressed,
      ]}
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected: on }}
      testID={testID}
    >
      <View style={styles.optionText}>
        <Text style={styles.optionTitle}>{title}</Text>
        {line !== undefined && <Text style={styles.optionLine}>{line}</Text>}
      </View>
      <View style={[styles.tick, on && styles.tickOn]}>
        {on && <Text style={styles.tickText}>✓</Text>}
      </View>
    </Pressable>
  );
}

function Chip({
  label,
  on,
  onPress,
  testID,
}: {
  label: string;
  on: boolean;
  onPress: () => void;
  testID: string;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.chip,
        on && styles.optionOn,
        pressed && styles.pressed,
      ]}
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected: on }}
      testID={testID}
    >
      <Text style={styles.chipText}>{label}</Text>
    </Pressable>
  );
}

function Stepper({
  value,
  onLess,
  onMore,
  testID,
}: {
  value: string;
  onLess: () => void;
  onMore: () => void;
  testID: string;
}) {
  return (
    <View style={styles.stepper}>
      <Pressable
        style={({ pressed }) => [styles.round, pressed && styles.pressed]}
        onPress={onLess}
        accessibilityRole="button"
        accessibilityLabel={t("Less")}
        testID={`${testID}-less`}
      >
        <Text style={styles.roundText}>−</Text>
      </Pressable>
      <Text style={styles.stepValue} testID={`${testID}-value`}>
        {value}
      </Text>
      <Pressable
        style={({ pressed }) => [styles.round, pressed && styles.pressed]}
        onPress={onMore}
        accessibilityRole="button"
        accessibilityLabel={t("More")}
        testID={`${testID}-more`}
      >
        <Text style={styles.roundText}>+</Text>
      </Pressable>
    </View>
  );
}

function Heading({ title, line }: { title: string; line?: string }) {
  return (
    <View style={styles.heading}>
      <Text style={styles.title} accessibilityRole="header">
        {title}
      </Text>
      {line !== undefined && <Text style={styles.lead}>{line}</Text>}
    </View>
  );
}

/** «Dove vuoi arrivare?» / «Che gita vuoi fare?». */
export function TargetGoalPage({
  door,
  aim,
  onAim,
  paddle,
  onPaddle,
  pool,
  onPool,
}: {
  door: PlanSport;
  aim: Aim;
  onAim: (aim: Aim) => void;
  paddle: boolean;
  onPaddle: (paddle: boolean) => void;
  pool: boolean;
  onPool: (pool: boolean) => void;
}) {
  const mountain = door === "mountain";
  const sport = targetSportOf(door, paddle);
  const chips = GOAL_CHIPS_M[mountain ? "climb" : sport];
  const other = aim.kind !== "keepFit" && !chips.includes(aim.metres);
  const [otherOpen, setOtherOpen] = useState(other);
  const step = mountain ? 100 : distanceStep(sport) * 2;
  const value = aim.kind === "keepFit" ? chips[1] : aim.metres;
  const set = (metres: number) =>
    onAim(mountain ? { kind: "climb", metres } : { kind: "distance", metres });
  return (
    <>
      {mountain ? (
        <Heading
          title={t("What trip do you want to do?")}
          line={t("How much climb in one day. The plan takes you there.")}
        />
      ) : (
        <Heading
          title={t("Where do you want to get to?")}
          line={t("The distance of the plan's last day.")}
        />
      )}
      {door === "swim" && (
        <View style={styles.chips}>
          <Chip
            label={t("Swimming")}
            on={!paddle}
            onPress={() => onPaddle(false)}
            testID="target-swim"
          />
          <Chip
            label={t("Paddling")}
            on={paddle}
            onPress={() => onPaddle(true)}
            testID="target-paddle"
          />
        </View>
      )}
      <View style={styles.chips}>
        {chips.map((metres) => (
          <Chip
            key={metres}
            label={mountain ? `${metres} m` : metresText(metres)}
            on={aim.kind !== "keepFit" && aim.metres === metres && !otherOpen}
            onPress={() => {
              setOtherOpen(false);
              set(metres);
            }}
            testID={`target-chip-${metres}`}
          />
        ))}
        <Chip
          label={t("Other@@target")}
          on={otherOpen && aim.kind !== "keepFit"}
          onPress={() => {
            setOtherOpen(true);
            set(value);
          }}
          testID="target-other"
        />
      </View>
      {otherOpen && aim.kind !== "keepFit" && (
        <Stepper
          value={mountain ? `${aim.metres} m` : metresText(aim.metres)}
          onLess={() => set(Math.max(mountain ? 100 : 1000, aim.metres - step))}
          onMore={() => set(Math.min(mountain ? 5000 : 300_000, aim.metres + step))}
          testID="target-amount"
        />
      )}
      {mountain ? (
        <Text style={styles.small}>
          {t("Of climb uphill. 1000 m is, for example, a hut high above the village.")}
        </Text>
      ) : (
        <Option
          title={t("Just keep fit")}
          line={t("A plan that stays the same, with no target day")}
          on={aim.kind === "keepFit"}
          onPress={() => onAim({ kind: "keepFit" })}
          testID="target-keep-fit"
        />
      )}
      {sport === "swim" && (
        <>
          <Text style={styles.label}>{t("Where do you swim?").toUpperCase()}</Text>
          <View style={styles.chips}>
            <Chip
              label={t("Pool")}
              on={pool}
              onPress={() => onPool(true)}
              testID="target-pool"
            />
            <Chip
              label={t("Open water")}
              on={!pool}
              onPress={() => onPool(false)}
              testID="target-open-water"
            />
          </View>
        </>
      )}
    </>
  );
}

/** The best of the last month of the account in the sport: null while it
 * is read or when there is none. */
export function useLastMonthBest(
  sport: TargetSport,
  climb: boolean,
  enabled: boolean,
): Best | null {
  const { apiUrl, account } = useFollowsDoor();
  const token =
    account.state.status === "signedIn" ? account.state.session.token : null;
  const [best, setBest] = useState<Best | null>(null);
  useEffect(() => {
    if (!enabled || apiUrl === null || token === null) {
      return;
    }
    let live = true;
    const now = new Date();
    void lastMonthOutings((cursor) => fetchActivities(apiUrl, token, cursor), now).then(
      (outings) => {
        if (live) {
          setBest(climb ? mostClimbOf(outings, now) : longestOf(outings, sport, now));
        }
      },
    );
    return () => {
      live = false;
    };
  }, [apiUrl, token, sport, climb, enabled]);
  return best;
}

/** «Dove sei oggi?» / «Quanta salita fai oggi?»: the level, or from zero. */
export function TargetLevelPage({
  sport,
  climb,
  level,
  onLevel,
  best,
}: {
  sport: TargetSport;
  climb: boolean;
  level: number | null;
  onLevel: (level: number | null) => void;
  best: Best | null;
}) {
  const zero = climb ? FROM_ZERO_CLIMB_M : FROM_ZERO_M[sport];
  const step = climb ? 50 : distanceStep(sport);
  const shown = level ?? zero;
  return (
    <>
      {climb ? (
        <Heading
          title={t("How much climb do you do today?")}
          line={t("The most of the last month, in one outing.")}
        />
      ) : (
        <Heading
          title={t("Where are you today?")}
          line={t("The longest you did in the last month without stopping.")}
        />
      )}
      <View style={[styles.levelBox, level !== null && styles.optionOn]}>
        <Stepper
          value={climb ? `${shown} m` : metresText(shown)}
          onLess={() => onLevel(Math.max(step, shown - step))}
          onMore={() => onLevel(shown + step)}
          testID="target-level"
        />
        {best !== null && (
          <Text style={styles.small} testID="target-history">
            {climb
              ? t("Already written from your hikes: {amount} on {day}.", {
                  amount: `${best.metres} m`,
                  day: dayLabel(best.started_at),
                })
              : t(HISTORY_FROM[sport], {
                  amount: metresText(best.metres),
                  day: dayLabel(best.started_at),
                })}
          </Text>
        )}
      </View>
      <Option
        title={t("I'm starting from zero")}
        line={
          climb
            ? t("Starting from 200 m, on easy trails")
            : sport === "run"
              ? t("Starting with walk-run: 1′ running and 2′ walking")
              : t("Starting from {amount}", { amount: metresText(zero) })
        }
        on={level === null}
        onPress={() => onLevel(null)}
        testID="target-zero"
      />
    </>
  );
}

/** When: ready by itself, or by a date. */
export type When = { ready: true } | { ready: false; on: string };

/** «Per quando?»: the weeks the plan counts, or a date; too near, the
 * weeks needed and where the weeks there are lead. */
export function TargetWhenPage({
  aim,
  when,
  onWhen,
  result,
  dateIn,
  onReach,
}: {
  aim: Aim;
  when: When;
  onWhen: (when: When) => void;
  result: TargetPlan | null;
  /** The Sunday `weeks` weeks from the start, YYYY-MM-DD. */
  dateIn: (weeks: number) => string;
  onReach: (metres: number) => void;
}) {
  const weeks =
    result?.kind === "plan"
      ? result.program.weeks
      : result?.kind === "short"
        ? result.needed
        : null;
  const firstDate = dateIn(Math.min(MAX_TARGET_WEEKS, weeks ?? 10));
  const date = when.ready ? firstDate : when.on;
  const shift = (by: number) => {
    const [y, m, d] = date.split("-").map(Number);
    const next = new Date(y, m - 1, d + by * 7);
    const iso = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-${String(next.getDate()).padStart(2, "0")}`;
    onWhen({ ready: false, on: iso });
  };
  return (
    <>
      <Heading title={t("By when?")} />
      <Option
        title={t("When I'm ready")}
        line={
          weeks === null
            ? t("The plan counts the weeks by itself")
            : t("The plan counts the weeks by itself: {n} weeks", { n: String(weeks) })
        }
        on={when.ready}
        onPress={() => onWhen({ ready: true })}
        testID="target-when-ready"
      />
      <Option
        title={t("A date")}
        line={t("A race, an outing: {day}", { day: dayLabel(`${date}T12:00:00`) })}
        on={!when.ready}
        onPress={() => onWhen({ ready: false, on: date })}
        testID="target-when-date"
      />
      {!when.ready && (
        <Stepper
          value={dayLabel(`${date}T12:00:00`)}
          onLess={() => shift(-1)}
          onMore={() => shift(1)}
          testID="target-date"
        />
      )}
      {result?.kind === "short" && (
        <View style={styles.warning} testID="target-short">
          <Text style={styles.optionTitle}>
            {result.needed === null
              ? t("In {have} weeks you get to {reach}.", {
                  have: String(result.have),
                  reach: metresText(result.reachable),
                })
              : t("For {target} you need {needed} weeks, you have {have}.", {
                  target: aimText(aim),
                  needed: String(result.needed),
                  have: String(result.have),
                })}
          </Text>
          <View style={styles.chips}>
            <Chip
              label={t("Get to {reach}", { reach: metresText(result.reachable) })}
              on={false}
              onPress={() => onReach(result.reachable)}
              testID="target-reach"
            />
            {result.needed !== null && !when.ready && (
              <Chip
                label={t("Move the date")}
                on={false}
                onPress={() =>
                  onWhen({ ready: false, on: dateIn(result.needed ?? 10) })
                }
                testID="target-move-date"
              />
            )}
          </View>
        </View>
      )}
      {result?.kind === "far" && (
        <Text style={styles.small} testID="target-far">
          {t("At most {n} weeks: choose a nearer date.", {
            n: String(MAX_TARGET_WEEKS),
          })}
        </Text>
      )}
    </>
  );
}

/** «Verso i 10 km»: the weeks of the ladder, the target's last. */
export function TargetLadder({ program, aim }: { program: GymProgram; aim: Aim }) {
  const ladder = ladderOf(program);
  if (ladder === null || aim.kind === "keepFit") {
    return null;
  }
  const weeks = Array.from({ length: ladder.weeks }, (_, i) => i + 1);
  const top = ladderValue(ladder, ladder.weeks);
  return (
    <View style={styles.ladder} testID="target-ladder">
      <Heading
        title={t("Toward {target}", { target: aimText(aim) })}
        line={
          aim.kind === "climb"
            ? t(
                "{n} weeks. The climb grows by a tenth, every 4th lighter, the last day is the trip.",
                {
                  n: String(ladder.weeks),
                },
              )
            : t(
                "{n} weeks. The long one grows by a tenth, every 4th lighter, the last day is the race.",
                {
                  n: String(ladder.weeks),
                },
              )
        }
      />
      <View style={styles.bars}>
        {weeks.map((week) => (
          <View key={week} style={styles.barColumn}>
            <View
              style={[
                styles.bar,
                { height: `${Math.round((ladderValue(ladder, week) / top) * 100)}%` },
                isLightWeek(week, ladder.weeks) && styles.barLight,
              ]}
            />
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  heading: {
    gap: space.xs,
    marginBottom: space.xs,
  },
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
  label: {
    color: color.textMuted,
    fontSize: fontSize.label,
    fontWeight: fontWeight.semibold,
    letterSpacing: 1.2,
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
    backgroundColor: color.surfaceRaised,
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
  tick: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: color.border,
    alignItems: "center",
    justifyContent: "center",
  },
  tickOn: {
    borderColor: color.accent,
    backgroundColor: color.accent,
  },
  tickText: {
    color: color.onAccent,
    fontSize: fontSize.small,
    fontWeight: fontWeight.bold,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: space.sm,
  },
  chip: {
    minHeight: MIN_TAP_SIZE,
    minWidth: 72,
    paddingHorizontal: space.md,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
  chipText: {
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
  },
  round: {
    width: MIN_TAP_SIZE,
    height: MIN_TAP_SIZE,
    borderRadius: MIN_TAP_SIZE / 2,
    borderWidth: 1,
    borderColor: color.border,
    alignItems: "center",
    justifyContent: "center",
  },
  roundText: {
    color: color.text,
    fontSize: fontSize.heading,
    fontWeight: fontWeight.semibold,
  },
  stepValue: {
    flex: 1,
    textAlign: "center",
    color: color.text,
    fontSize: fontSize.heading,
    fontWeight: fontWeight.bold,
  },
  levelBox: {
    gap: space.sm,
    padding: space.md,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
  small: {
    color: color.textMuted,
    fontSize: fontSize.small,
  },
  warning: {
    gap: space.sm,
    padding: space.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.borderStrong,
    backgroundColor: color.surfaceRaised,
  },
  ladder: {
    gap: space.sm,
  },
  bars: {
    height: 64,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 3,
  },
  barColumn: {
    flex: 1,
    height: "100%",
    justifyContent: "flex-end",
  },
  bar: {
    borderRadius: 3,
    backgroundColor: color.accent,
  },
  barLight: {
    backgroundColor: color.borderStrong,
  },
  pressed: {
    opacity: 0.7,
  },
});
