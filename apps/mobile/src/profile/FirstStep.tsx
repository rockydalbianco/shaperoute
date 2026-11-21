import { StyleSheet, View } from "react-native";

import { t } from "../i18n";
import { color, radius } from "../theme/tokens";
import { EmptyState } from "../ui/EmptyState";
import { HEART } from "../ui/outlines";
import type { ProfileTotals } from "./ProfileStats";

/**
 * How much an account did, as its own «Profile» knows it: nothing yet,
 * something, or not known while its numbers are on their way.
 */
export type ProfileStage = "new" | "active" | "unknown";

/**
 * The stage of one's own profile (TASK-457): `activities` is how many runs
 * «My activities» has, null until its list has come; `totals` the totals of
 * the profile, null until they have come (or from an API without them).
 * Anything above zero is «active» at once; «new» only when both are known
 * and say nothing was done, so a profile with runs never shows the invite
 * while it loads, and a new one never shows its zeros.
 */
export function profileStage(
  activities: number | null,
  totals: ProfileTotals | null,
): ProfileStage {
  const moved =
    totals !== null &&
    (totals.distance_m > 0 || totals.climb_m > 0 || totals.reactions > 0);
  if (moved || (activities !== null && activities > 0)) {
    return "active";
  }
  return activities === 0 && totals !== null ? "new" : "unknown";
}

type Props = {
  /** Opens «Explore»; left out, the card has its words alone. */
  onExplore?: () => void;
};

/**
 * The first step of a new profile (TASK-457, the user's choice of
 * 2026-11-12): where the totals and the week would count zeros, one card
 * that says what to do first and leads to «Explore». It goes with the first
 * activity (`profileStage`).
 */
export function FirstStep({ onExplore }: Props) {
  return (
    <View style={styles.card}>
      <EmptyState
        outline={HEART}
        title={t("Your first drawing")}
        message={t("Start from a route that already draws a shape near you.")}
        action={onExplore && { label: t("Find a route near you"), onPress: onExplore }}
        testID="first-step"
      />
    </View>
  );
}

// A box on the surface, as the totals it stands for (ProfileStats.tsx).
const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
});
