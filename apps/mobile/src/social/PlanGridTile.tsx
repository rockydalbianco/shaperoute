import type { GymPlanPosted } from "@shaperoute/shared-types";
import { StyleSheet, Text, View } from "react-native";

import { postedSessions } from "../feed/PlanPostTile";
import { WEEK_DAYS } from "../gym/planLimits";
import { isRunDay } from "../gym/proposal";
import { t } from "../i18n";
import { color, font, fontWeight, radius, space } from "../theme/tokens";

export const PLAN_GRID_TILE_TEST_ID = "plan-grid-tile";

type Props = {
  plan: GymPlanPosted;
  /** The side of the square. */
  size: number;
};

/** The room around the tile's words and its week. */
const PAD = space.sm;
/** Between two days of the week. */
const DAY_GAP = 2;

/**
 * What a gym plan posted shows in a grid of drawings, where a run has its
 * line (TASK-485 part C): «Workout plan», the plan's name and its week,
 * one square a day, filled for a workout at the gym, outlined for a run or
 * a day out, faint for a rest day, as in its tile of the Feed. A screen
 * reader hears the cell's words, not the tile's.
 */
export function PlanGridTile({ plan, size }: Props) {
  const byDay = new Map(postedSessions(plan).map((one) => [one.day, one]));
  const side = Math.max(4, (size - 2 * PAD - 6 * DAY_GAP) / WEEK_DAYS.length);
  return (
    <View
      style={[styles.tile, { width: size, height: size }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      testID={PLAN_GRID_TILE_TEST_ID}
    >
      {/* Long in some languages («Piano di allenamento»): on two lines,
          not cut; the name then keeps one. */}
      <Text style={styles.kind} numberOfLines={2}>
        {t("Workout plan")}
      </Text>
      <Text style={styles.name} numberOfLines={2}>
        {plan.name}
      </Text>
      <View style={styles.week}>
        {WEEK_DAYS.map((name, i) => {
          const session = byDay.get(i + 1);
          const strength =
            session !== undefined && !isRunDay(session) && session.outing === undefined;
          return (
            <View
              key={name}
              style={[
                styles.day,
                { width: side, height: side, borderRadius: side / 4 },
                session !== undefined && (strength ? styles.gym : styles.out),
              ]}
              testID={
                session === undefined
                  ? "plan-grid-rest"
                  : strength
                    ? "plan-grid-gym"
                    : "plan-grid-out"
              }
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    justifyContent: "space-between",
    padding: PAD,
    borderRadius: radius.md,
    backgroundColor: color.surfaceRaised,
  },
  kind: {
    ...font.detail,
    color: color.textMuted,
  },
  name: {
    ...font.body,
    fontWeight: fontWeight.semibold,
    color: color.text,
  },
  week: {
    flexDirection: "row",
    gap: DAY_GAP,
  },
  day: {
    borderWidth: 1,
    borderColor: color.border,
  },
  gym: {
    borderColor: color.accent,
    backgroundColor: color.accent,
  },
  out: {
    borderColor: color.runDay,
  },
});
