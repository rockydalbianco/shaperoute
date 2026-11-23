import { ScrollView, StyleSheet, Text } from "react-native";

import { t } from "../i18n";
import { useHeaderScroll } from "../tabs/headerScroll";
import { color, font, space } from "../theme/tokens";
import { DiaryView } from "./DiaryView";
import { type LocalDay, localDayOf } from "./localDay";
import { NutritionNotice } from "./NutritionNotice";
import { seeNotice, useNutrition } from "./useNutrition";

type Props = {
  /** The phone's day, now; a test gives its own. */
  today?: LocalDay;
};

/**
 * «Nutrition» (TASK-489 part B, ADR-0397): the page where the user writes
 * what they eat and sees its calories. The first time it shows «Before you
 * start» and nothing else; after «I understand», the diary of the day. One
 * line stays at the bottom: every number is an estimate, and MuW gives no
 * diets.
 *
 * It takes no props it needs: the sport panel opens it in a page of its
 * own (NutritionTile.tsx) and the «Food» tab of the training mode mounts
 * it as it is (TASK-490 D). Nothing it shows leaves the phone.
 */
export function NutritionPage({ today }: Props) {
  const headerScroll = useHeaderScroll();
  const { settings } = useNutrition();
  return (
    <ScrollView
      {...headerScroll}
      style={styles.page}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      testID="nutrition-page"
    >
      <Text style={styles.title} accessibilityRole="header">
        {t("Nutrition")}
      </Text>
      {settings.noticeSeen ? (
        <>
          <DiaryView today={today ?? localDayOf(new Date())} />
          <Text style={styles.small}>
            {t("Estimates only. MuW does not provide diets or medical advice.")}
          </Text>
        </>
      ) : (
        <NutritionNotice onUnderstood={seeNotice} />
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
  small: {
    ...font.small,
    color: color.textMuted,
  },
});
