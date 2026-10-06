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
 * What to know before going out on the water (TASK-191), the text the user
 * approved: the engine knows the shore, not the water's rules nor its
 * weather, and promises nothing of either.
 */
export const NOTICE_TITLE = tLater("Before you paddle");
export const NOTICE_LINES = [
  tLater("Wear a life jacket."),
  tLater("Check the weather and the wind before you go out."),
  tLater(
    "Follow the local rules: swimming areas, boat lanes, harbours. MuW does not know them.",
  ),
  tLater(
    "The route stays within 1 km of the shore. That does not make it safe or allowed.",
  ),
] as const;

/**
 * The safety notice over the whole screen, before the first «Start» on the
 * water on this phone (usePaddleNotice, in safetyNotice.ts): «I understand»
 * starts, «Not now» goes back to the route.
 */
export function PaddleNotice({
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
            🛶
          </Text>
          <Text style={styles.title} accessibilityRole="header">
            {t(NOTICE_TITLE)}
          </Text>
          {NOTICE_LINES.map((line) => (
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
