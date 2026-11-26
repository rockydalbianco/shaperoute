import type { ReactNode } from "react";
import { ScrollView, StyleSheet, Text } from "react-native";

import { GymDrawGuide } from "../gym/GymDrawGuide";
import { t } from "../i18n";
import { withoutRouteIcon } from "../screens/RunNoRouteButton";
import { withoutRouteLabel } from "../settings/sport";
import { useHeaderScroll, useUnderHeader } from "../tabs/headerScroll";
import { useTabBarRoom } from "../tabs/tabBarRoom";
import { color, font, space } from "../theme/tokens";
import { TrainingCoachRow } from "./TrainingCoachRow";
import { WeekBody } from "./WeekBodyCard";

type Props = {
  /** «Start workout»: the workout at the gym the app always had. */
  onStart: () => void;
  /** What stands under the title: the gym of «Draw» unless a test says
   * otherwise. */
  guide?: ReactNode;
};

/**
 * «Today», the first page of the training mode (TASK-490 part A, ADR-0398):
 * the gym of «Draw» as it is (`GymDrawGuide`: today's plan or «Start
 * workout», the month, the plans, «How it works»). On top, with an
 * account, the body of the week (part B, `WeekBody`) and the Coach's line
 * that opens its page (part C, `TrainingCoachRow`). Only what is for now
 * (part E, the user's choice of 2026-11-24): today's card, without «New
 * plan», the month, the plans or the help, which are in «Workouts».
 */
export function TrainingTodayPage({ onStart, guide }: Props) {
  const headerScroll = useHeaderScroll();
  // Under a floating header the page goes on showing behind it (TASK-469 B3).
  const underHeader = useUnderHeader();
  const barRoom = useTabBarRoom();
  return (
    <ScrollView
      {...headerScroll}
      style={[styles.page, underHeader]}
      contentContainerStyle={[styles.content, { paddingBottom: space.xxl + barRoom }]}
      keyboardShouldPersistTaps="handled"
      testID="training-today"
    >
      <Text style={styles.title} accessibilityRole="header">
        {t("Today")}
      </Text>
      <WeekBody />
      <TrainingCoachRow />
      {guide ?? (
        <GymDrawGuide
          onStart={onStart}
          startLabel={withoutRouteLabel("gym")}
          startIcon={withoutRouteIcon("gym")}
          hint={t("No route in the gym: MuW times your workout.")}
          todayOnly
        />
      )}
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
});
