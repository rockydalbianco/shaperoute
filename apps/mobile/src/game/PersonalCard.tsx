import type { GamePersonalStanding } from "@shaperoute/shared-types";
import { StyleSheet, Text, View } from "react-native";

import { color, fontSize, fontWeight, radius, space } from "../theme/tokens";
import type { Units } from "../units/units";
import {
  challengeName,
  challengeWhat,
  medalName,
  standingText,
  stepShares,
  tiersText,
} from "./personalText";

type Props = {
  standing: GamePersonalStanding;
  units: Units;
};

const BAR_HEIGHT = 6;

/**
 * One personal challenge of the week or the month (TASK-423 part D,
 * docs/GIOCO.md §6.6): its name and the medal reached, what counts, the
 * three steps (bronze, silver, gold) on one bar, and where the account is.
 */
export function PersonalCard({ standing, units }: Props) {
  const name = challengeName(standing.id);
  const what = challengeWhat(standing.id, units);
  const steps = tiersText(standing, units);
  const medal = medalName(standing.tier);
  const where = standingText(standing, units);
  const label = [name, medal, what, steps, where]
    .filter((part) => part !== "")
    .join(", ");
  return (
    <View
      style={styles.card}
      accessible
      accessibilityLabel={label}
      testID={`personal-${standing.id}`}
    >
      <View style={styles.line}>
        <Text style={styles.name} numberOfLines={1}>
          {name}
        </Text>
        {medal !== "" && <Text style={styles.medal}>{medal}</Text>}
      </View>
      {what !== "" && <Text style={styles.muted}>{what}</Text>}
      <View style={styles.steps}>
        {stepShares(standing).map((share, n) => (
          <View key={n} style={styles.track}>
            <View style={[styles.fill, { width: `${Math.round(share * 100)}%` }]} />
          </View>
        ))}
      </View>
      <View style={styles.line}>
        <Text style={styles.where} numberOfLines={1}>
          {where}
        </Text>
        <Text style={styles.faint} numberOfLines={1}>
          {steps}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: space.md,
    borderRadius: radius.lg,
    backgroundColor: color.surface,
    gap: space.xs,
  },
  line: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: space.sm,
  },
  name: {
    flex: 1,
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold,
  },
  medal: {
    color: color.accent,
    fontSize: fontSize.label,
    fontWeight: fontWeight.bold,
  },
  muted: {
    color: color.textMuted,
    fontSize: fontSize.small,
  },
  steps: {
    flexDirection: "row",
    gap: space.xs,
    marginVertical: space.xs,
  },
  track: {
    flex: 1,
    height: BAR_HEIGHT,
    borderRadius: BAR_HEIGHT / 2,
    backgroundColor: color.border,
    overflow: "hidden",
  },
  fill: {
    height: BAR_HEIGHT,
    backgroundColor: color.accent,
  },
  where: {
    flex: 1,
    color: color.text,
    fontSize: fontSize.small,
    fontWeight: fontWeight.semibold,
  },
  faint: {
    color: color.textFaint,
    fontSize: fontSize.label,
  },
});
