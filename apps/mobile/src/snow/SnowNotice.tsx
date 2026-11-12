import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { t, tLater } from "../i18n";

import {
  color,
  fontSize,
  fontWeight,
  MIN_TAP_SIZE,
  radius,
  space,
} from "../theme/tokens";

/**
 * What to know before snowshoeing (TASK-413 B), the text the user approved
 * (choice 4, 2026-11-08): the engine keeps off steep slopes, woods, pistes
 * and rock, but knows neither the avalanche bulletin nor the weather, nor all
 * the local rules, and promises nothing of them.
 */
export const SNOW_NOTICE_TITLE = tLater("Before you head out on snowshoes");
export const SNOW_NOTICE_LINES = [
  tLater(
    "Check the avalanche bulletin and the weather before you go. MuW does not know them.",
  ),
  tLater(
    "The route avoids slopes over 25°, woods, pistes and rock. That does not make it safe: an avalanche can come from above.",
  ),
  tLater(
    "Stay off the pistes and follow the local rules: parks, reserves, wildlife quiet zones, private land. MuW does not know them all.",
  ),
  tLater(
    "Never go alone, tell someone where you are going, and turn back if the snow or the weather changes.",
  ),
] as const;

/**
 * The avalanche notice over the whole screen, before the first «Start» on
 * snowshoes on this phone (useSnowNotice, in safetyNotice.ts): «I
 * understand» starts, «Not now» goes back to the route. As the swim's
 * (TASK-323 C) and the paddle's (TASK-191).
 */
export function SnowNotice({
  visible,
  onAccept,
  onDismiss,
}: {
  visible: boolean;
  onAccept: () => void;
  onDismiss: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal
      visible={visible}
      animationType="fade"
      statusBarTranslucent
      // Android's back button is «Not now».
      onRequestClose={onDismiss}
    >
      <View
        style={[
          styles.screen,
          {
            paddingTop: insets.top + space.xl,
            paddingBottom: insets.bottom + space.lg,
          },
        ]}
      >
        <View style={styles.words}>
          <Text style={styles.emoji} accessibilityElementsHidden>
            ❄️
          </Text>
          <Text style={styles.title} accessibilityRole="header">
            {t(SNOW_NOTICE_TITLE)}
          </Text>
          {SNOW_NOTICE_LINES.map((line) => (
            <View key={line} style={styles.line}>
              <Text style={styles.bullet} accessibilityElementsHidden>
                •
              </Text>
              <Text style={styles.text}>{t(line)}</Text>
            </View>
          ))}
        </View>
        <View style={styles.buttons}>
          <Pressable
            style={styles.accept}
            onPress={onAccept}
            accessibilityRole="button"
          >
            <Text style={styles.acceptText}>{t("I understand")}</Text>
          </Pressable>
          <Pressable
            style={styles.dismiss}
            onPress={onDismiss}
            accessibilityRole="button"
          >
            <Text style={styles.dismissText}>{t("Not now")}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: "space-between",
    paddingHorizontal: space.xl,
    backgroundColor: color.background,
  },
  words: {
    gap: space.md,
  },
  emoji: {
    fontSize: fontSize.title * 2,
  },
  title: {
    color: color.text,
    fontSize: fontSize.title,
    fontWeight: fontWeight.bold,
    marginBottom: space.sm,
  },
  line: {
    flexDirection: "row",
    gap: space.sm,
  },
  bullet: {
    color: color.textMuted,
    fontSize: fontSize.input,
  },
  text: {
    flex: 1,
    color: color.text,
    fontSize: fontSize.input,
    lineHeight: fontSize.input * 1.4,
  },
  buttons: {
    gap: space.sm,
  },
  // Yellow as «Start», which it is the first time.
  accept: {
    minHeight: MIN_TAP_SIZE + space.md,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.lg,
    backgroundColor: color.accent,
  },
  // Dark on yellow: white does not reach the contrast minimum (ADR-0046).
  acceptText: {
    color: color.onAccent,
    fontWeight: fontWeight.bold,
    fontSize: fontSize.input,
  },
  dismiss: {
    minHeight: MIN_TAP_SIZE,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.borderStrong,
    backgroundColor: color.surfaceRaised,
  },
  dismissText: {
    color: color.text,
    fontWeight: fontWeight.bold,
  },
});
