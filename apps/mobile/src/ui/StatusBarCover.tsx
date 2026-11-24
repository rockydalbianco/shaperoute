import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { color } from "../theme/tokens";

/**
 * A band of the page's own colour over the status bar (TASK-508): a page
 * opened over the app scrolls up to the top of the screen, and its text
 * went under the clock. Laid after the scroller, it covers what passes
 * there; at the top of the page it is not seen, the page being the same
 * colour. Touches go through it, and the screen reader skips it.
 *
 * Not for a page of the tab bar: there the header stands over the status
 * bar already (`../tabs/AppHeader`).
 */
export function StatusBarCover() {
  const insets = useSafeAreaInsets();
  if (insets.top <= 0) {
    return null;
  }
  return (
    <View
      testID="status-bar-cover"
      style={[styles.cover, { height: insets.top }]}
      pointerEvents="none"
      accessible={false}
      importantForAccessibility="no-hide-descendants"
    />
  );
}

const styles = StyleSheet.create({
  cover: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: color.background,
  },
});
