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
import { WatchTourButton } from "../tour/GuideRow";
import { AboutPage } from "./AboutPage";
import { aboutName } from "./AboutRows";
import type { AboutId } from "./documents";

type Props = {
  id: AboutId;
  /** Back to the page it was opened from, as it was left. */
  onBack: () => void;
  /** Its name over it, when not its row's in «Settings»: «Guide». */
  name?: string;
  /** «Watch the tour» over the text (TASK-266); none when absent. */
  onTour?: () => void;
};

/**
 * A text of «ABOUT» over «Settings» (TASK-184, ADR-0205): «←», the name of
 * its row, and the text, which scrolls on its own. «Settings» stays under
 * it as it was left, the rows near the foot still on screen at the way
 * back: one scroll for both would open the text at its end.
 */
export function AboutScreen({ id, onBack, name, onTour }: Props) {
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
          {name ?? t(aboutName(id))}
        </Text>
      </View>
      {onTour && <WatchTourButton onWatch={onTour} />}
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
