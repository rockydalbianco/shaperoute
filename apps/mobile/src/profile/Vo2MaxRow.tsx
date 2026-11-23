import type { Vo2Max } from "@shaperoute/shared-types";
import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { MONTHS } from "../activities/activityText";
import { t } from "../i18n";
import { color, font, fontSize, fontWeight, radius, space } from "../theme/tokens";
import { distanceName } from "./PersonalBests";

/** «3 Nov»: the day of `measured_on` (YYYY-MM-DD), never moved by a time zone. */
export function measuredDay(measuredOn: string): string {
  const [, month, day] = measuredOn.split("-").map(Number);
  const name = MONTHS[month - 1];
  if (name === undefined || !Number.isInteger(day)) {
    return "";
  }
  return t("{day} {month}", { day: String(day), month: t(name) });
}

/**
 * The line under «VO₂ max»: «Apple Watch · 3 Nov», «Health Connect · 3 Nov»,
 * or «Estimate from your 10K» on one's own profile and «Estimate from their
 * 10K» on another's (the user's choice, 2026-11-05).
 */
export function vo2maxSourceText(vo2max: Vo2Max, own: boolean): string {
  if (vo2max.source !== "estimate") {
    const name = vo2max.source === "apple_health" ? "Apple Watch" : "Health Connect";
    const day = measuredDay(vo2max.measured_on);
    return day === "" ? name : `${name} · ${day}`;
  }
  if (vo2max.from_distance === null) {
    return "";
  }
  const distance = distanceName({ sport: "running", distance: vo2max.from_distance });
  return own
    ? t("Estimate from your {distance}", { distance })
    : t("Estimate from their {distance}", { distance });
}

type Props = {
  vo2max: Vo2Max;
  /** On one's own profile: «your» in the estimate's line. */
  own?: boolean;
  /** Under the row, in its box: what the owner alone sees (`OwnVo2Max`). */
  children?: ReactNode;
};

/**
 * The VO₂ max of a profile (TASK-397, ADR-0332), under the personal bests:
 * «VO₂ max» with where it comes from, and the number in ml/kg/min. The API
 * sends it only after its owner's yes.
 */
export function Vo2MaxRow({ vo2max, own = false, children }: Props) {
  const source = vo2maxSourceText(vo2max, own);
  const unit = "ml/kg/min";
  const said = [t("VO₂ max"), `${vo2max.value} ${unit}`, source]
    .filter((part) => part !== "")
    .join(", ");
  return (
    <View style={styles.box} testID="vo2max">
      <View style={styles.row} accessible accessibilityLabel={said}>
        <View style={styles.rowText}>
          <Text style={styles.title}>{t("VO₂ max")}</Text>
          {source !== "" && <Text style={styles.source}>{source}</Text>}
        </View>
        <Text style={styles.value}>{String(vo2max.value)}</Text>
        <Text style={styles.unit}>{unit}</Text>
      </View>
      {children}
    </View>
  );
}

// As the personal bests over it (PersonalBests.tsx): a box on the surface.
const styles = StyleSheet.create({
  box: {
    gap: space.sm,
    padding: space.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
  row: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: space.xs,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  title: {
    ...font.heading,
    color: color.text,
  },
  source: {
    color: color.textMuted,
    fontSize: fontSize.small,
  },
  value: {
    color: color.text,
    fontSize: fontSize.display,
    fontWeight: fontWeight.bold,
    fontVariant: ["tabular-nums"],
  },
  unit: {
    color: color.textMuted,
    fontSize: fontSize.small,
  },
});
