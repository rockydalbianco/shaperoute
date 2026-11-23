import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { t } from "../i18n";
import { pageTitle } from "../screens/pageTitles";
import {
  color,
  fontSize,
  fontWeight,
  MIN_TAP_SIZE,
  radius,
  space,
} from "../theme/tokens";
import { closeTopLayer, useBackCloses } from "../ui/backLayers";
import { useEdgeBack } from "../ui/EdgeBack";
import { Tap } from "../ui/Tap";
import { PlayScreen } from "./PlayScreen";

type Props = {
  /** «←»: back to «Draw», where its row is (`PlayRow`). */
  onBack: () => void;
  /** «Sign in to collect shapes.» touched: the way to the account. */
  onSignIn: () => void;
};

/**
 * The shape game over the whole app (TASK-296, ADR-0255), opened from its
 * row under the distance of «Draw» (the user's choice of 2026-10-29), by
 * the card of a shape unlocked or by a notification: «Play» and «←» on
 * top, the game's two tabs under them (`PlayScreen`).
 */
export function PlayOverlay({ onBack, onSignIn }: Props) {
  const insets = useSafeAreaInsets();
  // Android's «back» is the «←»: back to «Draw», not out of the app.
  useBackCloses(true, onBack);
  // On iOS from the left edge too: the page of «Play» on screen closes
  // first, as its own «←» (the newest on the stack), then «Play».
  const edge = useEdgeBack(() => closeTopLayer() || onBack());
  return (
    <Animated.View
      style={[
        StyleSheet.absoluteFill,
        styles.screen,
        { paddingTop: insets.top + space.sm },
        edge.style,
      ]}
      testID="play-overlay"
      {...edge.handlers}
    >
      {edge.shade}
      {/* As the title of «Messages» (MessagesOverlay.tsx). */}
      <View style={styles.titleRow}>
        <Tap
          style={styles.back}
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel={t("Back")}
        >
          <Text style={styles.backText}>←</Text>
        </Tap>
        <Text style={styles.title} accessibilityRole="header">
          {pageTitle("play")}
        </Text>
      </View>
      <PlayScreen active onSignIn={onSignIn} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: color.background,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    paddingHorizontal: space.lg,
  },
  back: {
    width: MIN_TAP_SIZE,
    height: MIN_TAP_SIZE,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: color.surfaceRaised,
    borderWidth: 1,
    borderColor: color.borderStrong,
  },
  backText: {
    color: color.text,
    fontSize: fontSize.title,
  },
  title: {
    color: color.text,
    fontSize: fontSize.title,
    fontWeight: fontWeight.bold,
  },
});
