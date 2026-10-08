import { StyleSheet, Text, View } from "react-native";

import { color, fontSize, fontWeight, radius, space } from "../theme/tokens";

/** The most the badge counts: beyond it, «9+». */
export const BADGE_MAX = 9;

/** The height of the badge, and its width with one digit. */
const SIDE = space.lg + space.xs / 2;

type Props = {
  /** How many ask to follow the account and wait for an answer. */
  count: number;
};

/**
 * The red number at the top right of the way to «Profile» (TASK-239): how
 * many ask to follow the account. Nothing when nobody does. It is not read
 * on its own: the button it sits on says it.
 */
export function RequestsBadge({ count }: Props) {
  if (count <= 0) {
    return null;
  }
  return (
    <View style={styles.badge} testID="requests-badge" pointerEvents="none">
      <Text style={styles.text} allowFontScaling={false}>
        {count > BADGE_MAX ? `${BADGE_MAX}+` : String(count)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  // Over the edge of the circle, as the badge of an app's icon.
  badge: {
    position: "absolute",
    top: -space.xs,
    right: -space.xs,
    minWidth: SIDE,
    height: SIDE,
    paddingHorizontal: space.xs / 2,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.background,
    backgroundColor: color.badge,
  },
  text: {
    color: color.onBadge,
    fontSize: fontSize.label,
    fontWeight: fontWeight.bold,
    lineHeight: fontSize.label + space.xs / 2,
  },
});
