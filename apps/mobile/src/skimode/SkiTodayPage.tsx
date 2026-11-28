import type { ReactNode } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { t } from "../i18n";
import { withoutRouteIcon } from "../screens/RunNoRouteButton";
import { withoutRouteLabel } from "../settings/sport";
import { DayResort } from "../ski/DayResort";
import { SportIcon } from "../sportSigns/SportIcon";
import { useHeaderScroll, useUnderHeader } from "../tabs/headerScroll";
import { useTabBarRoom } from "../tabs/tabBarRoom";
import {
  color,
  font,
  fontSize,
  fontWeight,
  MIN_TAP_SIZE,
  radius,
  space,
} from "../theme/tokens";
import { Tap } from "../ui/Tap";

type Props = {
  /** «Record your day»: the recording the app always had. */
  onRecord: () => void;
  /** Where the resort of the day is: the real one unless a test says otherwise. */
  resort?: ReactNode;
};

/**
 * «Today», the first page of the ski mode (TASK-429 part A, ADR-0357): the
 * resort of the day with its weather (`DayResort`, as the day's recording
 * shows it) and «Record your day». The numbers live, the season in short
 * and the friends come with parts B and C.
 */
export function SkiTodayPage({ onRecord, resort = <DayResort /> }: Props) {
  const headerScroll = useHeaderScroll();
  // Under a floating header the page goes on showing behind it (TASK-469 B3).
  const underHeader = useUnderHeader();
  // The page goes on under the tab bar: its room at the end (TASK-469 B2a).
  const barRoom = useTabBarRoom();
  return (
    <ScrollView
      {...headerScroll}
      style={[styles.page, underHeader]}
      contentContainerStyle={[styles.content, { paddingBottom: space.xxl + barRoom }]}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title} accessibilityRole="header">
        {t("Today")}
      </Text>
      <View style={styles.card}>{resort}</View>
      <Tap
        style={styles.record}
        onPress={onRecord}
        accessibilityRole="button"
        accessibilityLabel={withoutRouteLabel("ski")}
        testID="ski-record"
      >
        <SportIcon
          activity={withoutRouteIcon("ski")}
          size={fontSize.heading}
          tint={color.onAccent}
        />
        <Text style={styles.recordText}>{withoutRouteLabel("ski")}</Text>
      </Tap>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: color.background,
  },
  content: {
    gap: space.lg,
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
    paddingBottom: space.xxl,
  },
  title: {
    ...font.title,
    color: color.text,
  },
  card: {
    borderRadius: radius.lg,
    backgroundColor: color.surface,
    paddingVertical: space.xs,
  },
  // The only big control of the page, so in the brand's yellow: in the ski
  // mode there is no route to say it, and the day is what the yellow lines
  // of its map will draw (ADR-0357).
  record: {
    minHeight: MIN_TAP_SIZE + space.xl,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: space.sm,
    borderRadius: radius.pill,
    backgroundColor: color.accent,
  },
  recordText: {
    color: color.onAccent,
    fontSize: fontSize.heading,
    fontWeight: fontWeight.bold,
  },
});
