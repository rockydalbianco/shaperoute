import { PROFILE_BADGES, type ProfileBadge } from "@shaperoute/shared-types";
import { StyleSheet, Text, View } from "react-native";

import { t } from "../i18n";
import { color, font, fontSize, fontWeight, radius, space } from "../theme/tokens";
import { wholeDistanceLabel } from "../units/format";
import type { Units } from "../units/units";
import { useUnits } from "../units/useUnits";
import { BADGE_ICONS, badgeText, LONG_DRAWING_M } from "./BadgeRow";

/** A badge still to earn: closed, said by its shape and not by a colour. */
const LOCK = "🔒";

/** How a badge is earned, as the API counts it (badges.py), in the app's units. */
export function badgeHow(badge: ProfileBadge, units: Units): string {
  switch (badge) {
    case "first_drawing":
      return t("Record a run with MuW and publish its drawing.");
    case "ten_drawings":
      return t("Publish 10 drawings of runs recorded with MuW.");
    case "long_drawing":
      return t("Publish the drawing of a run of {distance} or more.", {
        distance: wholeDistanceLabel(LONG_DRAWING_M, units),
      });
  }
}

type Props = {
  /** The badges the account earned; null from an API older than TASK-341. */
  badges: readonly ProfileBadge[] | null;
};

/**
 * «Badges» on one's own profile (TASK-457, the user's choice of
 * 2026-11-12): every badge of the drawings with the line that says how it
 * is earned, the ones still to earn behind a lock. Under the name only the
 * earned ones are left (`BadgeRow`), as the others see them. Nothing from
 * an API that does not say the badges.
 */
export function BadgesSection({ badges }: Props) {
  const units = useUnits();
  if (badges === null) {
    return null;
  }
  const earned = new Set(badges);
  return (
    <View style={styles.box} testID="badges-section">
      <Text style={styles.title} accessibilityRole="header">
        {t("Badges")}
      </Text>
      {PROFILE_BADGES.map((badge) => {
        const has = earned.has(badge);
        const name = badgeText(badge, units);
        const how = badgeHow(badge, units);
        return (
          <View
            key={badge}
            style={styles.row}
            testID={`badges-${badge}`}
            accessible
            accessibilityLabel={`${
              has ? name : t("Not earned yet: {badge}", { badge: name })
            }. ${how}`}
          >
            <View style={styles.circle}>
              <Text style={styles.icon}>{has ? BADGE_ICONS[badge] : LOCK}</Text>
            </View>
            <View style={styles.words}>
              <Text style={styles.name}>{name}</Text>
              <Text style={styles.how}>{how}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

/** The side of the circle behind a badge's sign. */
const CIRCLE = space.xl + space.md;

// A box on the surface, as the personal bests (PersonalBests.tsx).
const styles = StyleSheet.create({
  box: {
    gap: space.md,
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
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
  },
  circle: {
    width: CIRCLE,
    height: CIRCLE,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
    backgroundColor: color.surfaceRaised,
  },
  icon: {
    fontSize: fontSize.body,
  },
  words: {
    flex: 1,
    gap: 2,
  },
  name: {
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
  how: {
    color: color.textMuted,
    fontSize: fontSize.small,
  },
});
