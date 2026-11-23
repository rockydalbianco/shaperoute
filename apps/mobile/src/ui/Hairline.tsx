import { type StyleProp, StyleSheet, View, type ViewStyle } from "react-native";

import { color } from "../theme/tokens";

/**
 * A division as thin as the screen draws (TASK-339, ADR-0293): one device
 * pixel of `color.hairline`, in place of the 1 pt `border` line. Controls
 * keep their 1 pt `borderStrong` edge: a division is sensed, a button is
 * found, in sunlight too (TASK-086).
 */
export function Hairline({ style }: { style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.line, style]} accessible={false} />;
}

const styles = StyleSheet.create({
  line: {
    alignSelf: "stretch",
    height: StyleSheet.hairlineWidth,
    backgroundColor: color.hairline,
  },
});
