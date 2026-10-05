import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { t } from "../i18n";
import {
  color,
  fontSize,
  fontWeight,
  MIN_TAP_SIZE,
  radius,
  space,
} from "../theme/tokens";
import { AboutPage } from "./AboutPage";
import { aboutName } from "./AboutRows";
import type { AboutId } from "./documents";

type Props = {
  id: AboutId;
  /** Back to «Settings», as it was left. */
  onBack: () => void;
};

/**
 * A text of «ABOUT» over «Settings» (TASK-184, ADR-0205): «←», the name of
 * its row, and the text, which scrolls on its own. «Settings» stays under
 * it as it was left, the rows near the foot still on screen at the way
 * back: one scroll for both would open the text at its end.
 */
export function AboutScreen({ id, onBack }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={[StyleSheet.absoluteFill, styles.screen]}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: insets.top + space.lg,
          paddingBottom: insets.bottom + space.xl,
        },
      ]}
    >
      <View style={styles.titleRow}>
        <Pressable
          style={styles.back}
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel={t("Back")}
        >
          <Text style={styles.backText}>←</Text>
        </Pressable>
        <Text style={styles.title} accessibilityRole="header">
          {t(aboutName(id))}
        </Text>
      </View>
      <AboutPage id={id} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: color.background,
  },
  content: {
    paddingHorizontal: space.lg,
    gap: space.xl,
  },
  // As the title of «Profile» (`../screens/ProfileScreen`).
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
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
