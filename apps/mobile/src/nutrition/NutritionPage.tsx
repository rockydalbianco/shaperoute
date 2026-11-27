import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { t } from "../i18n";
import { Segmented } from "../screens/Segmented";
import { useHeaderScroll, useUnderHeader } from "../tabs/headerScroll";
import { useTabBarRoom } from "../tabs/tabBarRoom";
import { color, font, MIN_TAP_SIZE, space } from "../theme/tokens";
import { Tap } from "../ui/Tap";
import { DiaryView } from "./DiaryView";
import { HowWeCalculate } from "./HowWeCalculate";
import { type LocalDay, localDayOf } from "./localDay";
import { NutritionWelcome } from "./NutritionWelcome";
import { PlanView } from "./PlanView";
import { useNutrition } from "./useNutrition";

type Props = {
  /** The phone's day, now; a test gives its own. */
  today?: LocalDay;
};

/**
 * «Nutrition» (TASK-489 part B, ADR-0397): the page where the user writes
 * what they eat and sees its calories. The first time it shows its door
 * (NutritionWelcome.tsx, part J), with «Before you start» as its second
 * step, and nothing else; after it, two views: «Diary», what
 * was eaten on a day, and «My plan», the week the user wrote. One line
 * stays at the bottom: every number is an estimate, and MuW gives no diets;
 * «How we calculate» says where the numbers come from.
 *
 * It takes no props it needs: the sport panel opens it in a page of its
 * own (NutritionTile.tsx) and the «Food» tab of the training mode mounts
 * it as it is (TASK-490 D). Nothing it shows leaves the phone.
 */
export function NutritionPage({ today }: Props) {
  const headerScroll = useHeaderScroll();
  // Under a floating header the page goes on showing behind it (TASK-469 B3).
  const underHeader = useUnderHeader();
  const barRoom = useTabBarRoom();
  const { settings } = useNutrition();
  const [view, setView] = useState<"diary" | "plan">("diary");
  const [how, setHow] = useState(false);
  // The door (part J): the first time, and again from «How it works». It
  // stays until its last step, though the rules are read on the way.
  const [door, setDoor] = useState(!settings.noticeSeen);
  const day = today ?? localDayOf(new Date());
  return (
    <ScrollView
      {...headerScroll}
      style={[styles.page, underHeader]}
      contentContainerStyle={[styles.content, { paddingBottom: space.xxl + barRoom }]}
      keyboardShouldPersistTaps="handled"
      testID="nutrition-page"
    >
      <Text style={styles.title} accessibilityRole="header">
        {t("Nutrition")}
      </Text>
      {door ? (
        <NutritionWelcome onDone={() => setDoor(false)} />
      ) : (
        <>
          <Segmented
            options={[
              { value: "diary", label: t("Diary") },
              { value: "plan", label: t("My plan") },
            ]}
            value={view}
            onChange={setView}
          />
          {view === "diary" ? <DiaryView today={day} /> : <PlanView today={day} />}
          <View>
            <Text style={styles.small}>
              {t("Estimates only. MuW does not provide diets or medical advice.")}
            </Text>
            <Tap
              style={styles.link}
              onPress={() => setHow(true)}
              accessibilityRole="button"
              testID="nutrition-how"
            >
              <Text style={styles.linkText}>{t("How we calculate")}</Text>
            </Tap>
            <Tap
              style={styles.link}
              onPress={() => setDoor(true)}
              accessibilityRole="button"
              testID="nutrition-how-it-works"
            >
              <Text style={styles.linkText}>{t("How it works")}</Text>
            </Tap>
          </View>
          <HowWeCalculate visible={how} onClose={() => setHow(false)} />
        </>
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
  link: {
    minHeight: MIN_TAP_SIZE,
    justifyContent: "center",
    alignSelf: "flex-start",
  },
  linkText: {
    ...font.small,
    color: color.text,
    textDecorationLine: "underline",
  },
});
