import { useState } from "react";
import { StyleSheet, View } from "react-native";

import App from "../../App";
import { color } from "../theme/tokens";
import { LaunchIntro } from "./LaunchIntro";

/**
 * What the phone opens (TASK-179): the app, and over it the launch animation
 * until it has played once. The app starts underneath at once, so its first
 * requests run while the heart is drawn.
 */
export function Root() {
  const [intro, setIntro] = useState(true);
  return (
    <View style={styles.root}>
      <App />
      {intro ? <LaunchIntro onDone={() => setIntro(false)} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: color.background,
  },
});
