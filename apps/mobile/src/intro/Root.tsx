import { useState } from "react";
import { StyleSheet, View } from "react-native";

import App from "../../App";
import { color } from "../theme/tokens";
import { AppBoundary } from "./AppBoundary";
import { LaunchIntro } from "./LaunchIntro";
import { SavedLogoLayer } from "./SavedLogo";

/**
 * What the phone opens (TASK-179): the app, and over it the launch animation
 * until it has played once. The app starts underneath at once, so its first
 * requests run while the heart is drawn. Over the app, under the animation,
 * the logo that comes up after «Save» (TASK-212). Around it all, the screen
 * for a component that throws (TASK-256): «Try again» there starts the app
 * anew, without the animation again.
 */
export function Root() {
  const [intro, setIntro] = useState(true);
  return (
    <View style={styles.root}>
      <AppBoundary>
        <App />
        <SavedLogoLayer />
        {intro ? <LaunchIntro onDone={() => setIntro(false)} /> : null}
      </AppBoundary>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: color.background,
  },
});
