import type { GymPlanTarget } from "@shaperoute/shared-types";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { decimal, t } from "../i18n";
import type { Sport } from "../settings/sport";
import {
  color,
  font,
  fontSize,
  fontWeight,
  MIN_TAP_SIZE,
  radius,
  space,
} from "../theme/tokens";
import {
  beyondDraw,
  DRAW_MAX_M,
  doneLine,
  drawDistanceM,
  goToOuting,
  outingTitle,
} from "./outingDay";
import { usePlanReminders } from "./planReminder";
import { type TodayWorkout, todayPlans, useKeptPlans } from "./plans";

/**
 * «Today» of a day out of a plan (TASK-461 B and C, ADR-0371; rows F and
 * G of the canvas, approved 2026-11-11): «Oggi: lungo · 45 km», where it
 * leads («Verso i 60 km, settimana 7 di 10»), «Draw» with the day's km or,
 * beyond what «Draw» draws, «Registra libero» first; a climb day asks for
 * at least its metres of climb. In «Draw» of the day's sport (`sport`), or
 * in the gym's page, where it turns «Draw» to that sport.
 */

/** «60 km», «1000 m». */
function targetText(target: GymPlanTarget): string {
  if (target.climb_m !== undefined) {
    return `${target.climb_m} m`;
  }
  const km = (target.distance_m ?? 0) / 1000;
  return `${Number.isInteger(km) ? String(km) : decimal(km)} km`;
}

function kmText(metres: number): string {
  const km = metres / 1000;
  return metres < 1000
    ? `${metres} m`
    : `${Number.isInteger(km) ? String(km) : decimal(km)} km`;
}

/** The day out of today of the plans, in `sport`'s «Draw». */
export function PlanTodayCard({
  sport,
  onRecord,
}: {
  sport: Sport;
  /** «Registra libero»: the recording without a route of «Draw». */
  onRecord?: () => void;
}) {
  const plans = useKeptPlans();
  usePlanReminders();
  const today = todayPlans(plans).find((one) => one.outing?.sport === sport);
  return today === undefined ? null : <OutingToday today={today} onRecord={onRecord} />;
}

/** The card of a day out; without `onRecord`, its button goes to the
 * day's sport in «Draw» (the gym's page). */
export function OutingToday({
  today,
  onRecord,
}: {
  today: TodayWorkout;
  onRecord?: () => void;
}) {
  const outing = today.outing;
  if (outing === undefined) {
    return null;
  }
  const where =
    today.target !== undefined && today.week !== null && today.weeks !== null
      ? t("Toward {target}, week {n} of {total}.", {
          target: targetText(today.target),
          n: String(today.week),
          total: String(today.weeks),
        })
      : today.plan;
  const draw = drawDistanceM(outing);
  const here = onRecord !== undefined;
  const climb = outing.kind === "climb" && outing.climb_m !== undefined;
  const far = beyondDraw(outing);

  function button(label: string, onPress: () => void, testID: string, main: boolean) {
    return (
      <Pressable
        style={({ pressed }) => [
          main ? styles.start : styles.ghost,
          pressed && styles.pressed,
        ]}
        onPress={onPress}
        accessibilityRole="button"
        testID={testID}
      >
        <Text style={main ? styles.startText : styles.ghostText}>{label}</Text>
      </Pressable>
    );
  }

  const record = () => {
    goToOuting(outing);
    onRecord?.();
  };
  const drawIt = () => goToOuting(outing);

  let body;
  if (!here) {
    body = button(
      t("Go to the day · {amount}", {
        amount: draw === null ? outingTitle(outing).split(" · ")[1] : kmText(draw),
      }),
      drawIt,
      "plan-today-go",
      true,
    );
  } else if (climb) {
    // «Cerca almeno 600 m di salita»: the hike drawn with its km, or free.
    body = (
      <>
        <Text style={styles.strong}>
          {t("Look for at least {m} m of climb", { m: String(outing.climb_m) })}
        </Text>
        <Text style={styles.muted}>
          {draw === null
            ? t("Record freely and see how much climb is left.")
            : t(
                "Draw draws the hike with its km ({km}); the climb depends on where you start. Or record freely and see how much climb is left.",
                { km: kmText(draw) },
              )}
        </Text>
        {draw !== null &&
          button(
            t("Draw the hike · {km}", { km: kmText(draw) }),
            drawIt,
            "plan-today-draw",
            true,
          )}
        {button(
          t("Record freely · {amount}", { amount: `${outing.climb_m} m` }),
          record,
          "plan-today-record",
          draw === null,
        )}
      </>
    );
  } else if (far && draw !== null) {
    // Longer than «Draw» draws: «Registra libero» first.
    const max = kmText(DRAW_MAX_M[outing.sport]);
    const amount = kmText(outing.distance_m ?? 0);
    body = (
      <>
        <Text style={styles.strong}>{t("Draw draws {max} at most", { max })}</Text>
        <Text style={styles.muted}>
          {t(
            "Record freely and see how much is left to {amount}, or draw {max} of shape and do the rest freely.",
            { amount, max },
          )}
        </Text>
        {button(
          t("Record freely · {amount}", { amount }),
          record,
          "plan-today-record",
          true,
        )}
        {button(t("Draw {max}", { max }), drawIt, "plan-today-draw", false)}
      </>
    );
  } else if (draw !== null) {
    body = (
      <>
        {button(
          t("Draw {max}", { max: kmText(draw) }),
          drawIt,
          "plan-today-draw",
          true,
        )}
        {button(t("Record freely"), record, "plan-today-record", false)}
      </>
    );
  } else {
    // Intervals, a brisk walk by the clock: no shape to draw.
    body = button(t("Record freely"), record, "plan-today-record", true);
  }

  return (
    <View style={styles.box} testID="plan-today">
      <Text style={styles.title} accessibilityRole="header">
        {t("Today: {day}", { day: outingTitle(outing) })}
      </Text>
      <Text style={styles.muted}>{where}</Text>
      {body}
      <Text style={styles.small}>{doneLine(outing)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    gap: space.sm,
    padding: space.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
  title: {
    ...font.heading,
    color: color.text,
  },
  strong: {
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
  muted: {
    color: color.textMuted,
    fontSize: fontSize.small,
  },
  small: {
    color: color.textFaint,
    fontSize: fontSize.small,
  },
  start: {
    minHeight: MIN_TAP_SIZE,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
    backgroundColor: color.accent,
  },
  startText: {
    color: color.onAccent,
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold,
  },
  ghost: {
    minHeight: MIN_TAP_SIZE,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.border,
  },
  ghostText: {
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
  pressed: {
    opacity: 0.7,
  },
});
