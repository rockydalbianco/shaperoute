import type { GamePrizesShown } from "@shaperoute/shared-types";
import { StyleSheet, Text, View } from "react-native";

import { t } from "../i18n";
import { color, fontSize, fontWeight, radius, space } from "../theme/tokens";
import { badgeName, titleName } from "./prizesText";

type Props = {
  /** What the profile's owner chose to show; null: nothing (the default). */
  shown: GamePrizesShown | null;
};

/**
 * The prizes of the shape game on a profile (TASK-423 part E2b,
 * docs/GIOCO.md §5.4): the title its owner chose, under the name, and up to
 * 3 badges. Nothing until the owner chooses: an account that chose nothing
 * has no row at all. The frame goes around the photo (`ProfileHeader`).
 */
export function GamePrizesRow({ shown }: Props) {
  if (shown === null || (shown.title === null && shown.badges.length === 0)) {
    return null;
  }
  return (
    <View style={styles.row} testID="game-prizes">
      {shown.title !== null && (
        <Text
          style={styles.title}
          accessibilityLabel={t("Title: {title}", { title: titleName(shown.title) })}
          testID="game-title"
        >
          {titleName(shown.title)}
        </Text>
      )}
      {shown.badges.length > 0 && (
        <View style={styles.badges}>
          {shown.badges.map((id) => (
            <View key={id} style={styles.badge} testID={`game-badge-${id}`}>
              <Text style={styles.badgeText}>{badgeName(id)}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: "center",
    gap: space.xs,
  },
  title: {
    color: color.accent,
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold,
  },
  badges: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: space.xs,
  },
  badge: {
    paddingHorizontal: space.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surfaceRaised,
  },
  badgeText: {
    color: color.text,
    fontSize: fontSize.label,
    fontWeight: fontWeight.semibold,
  },
});
