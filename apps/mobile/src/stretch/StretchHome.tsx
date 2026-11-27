import { useEffect, useState } from "react";
import { Animated, Easing, ScrollView, StyleSheet, Text, View } from "react-native";

import { t } from "../i18n";
import { startCategorySession } from "../stretchSport/StretchSessionHost";
import { color, fontSize, fontWeight, space, tracking } from "../theme/tokens";
import { useReduceMotion } from "../ui/useReduceMotion";
import type { Category, CategoryGroup } from "./categories";
import { CategoryPage } from "./CategoryPage";
import { MOMENT_ICONS, SPORT_ICONS } from "./categoryIcons";
import {
  categoriesOf,
  categoryName,
  GROUPS,
  lengthsLine,
  pairOf,
  SPORT_NAMES,
} from "./categoryText";
import { CategoryTile } from "./CategoryTile";
import { category, compose } from "./compose";
import { choiceFor, useChoices } from "./stretchChoices";
import { todayCategory } from "./today";
import { TodayCard } from "./TodayCard";

/** How long each part of the home takes to come in, and how far apart. */
export const ENTER_MS = 320;
export const ENTER_GAP_MS = 70;

type Props = {
  /** The moment «Today» is asked for; now, unless a test says. */
  now?: Date;
};

/** A group's title in its colour, with what it holds beside it. */
function GroupTitle({ group }: { group: (typeof GROUPS)[number] }) {
  return (
    <View style={styles.groupTitle}>
      <Text
        style={[styles.groupName, { color: color.stretch[group.key] }]}
        accessibilityRole="header"
      >
        {t(group.title)}
      </Text>
      <Text style={styles.groupHint}>{t(group.hint)}</Text>
    </View>
  );
}

/**
 * The stretching home (TASK-520, ADR-0415), in «Draw» for the sport
 * «Stretching», in place of the three routines of before: «Today» with the
 * routine for this moment, then every category by group — the body's
 * areas, the moments of the day, the sports with their before and after,
 * intimacy, and the rest. Each group has a colour of its own
 * (`color.stretch`); the figure in a typical pose is a category's icon. A
 * tile opens the category's page. The parts come in one after the other;
 * with «Reduce Motion» on they are there at once.
 *
 * The routines someone made (TASK-466 part E, «My routines») go between
 * «Today» and the groups: that part mounts them there.
 */
export function StretchHome({ now }: Props) {
  const choices = useChoices();
  const reduced = useReduceMotion();
  const [open, setOpen] = useState<string | null>(null);
  // The proposal of the moment the home was opened: it does not change
  // under the finger at ten o'clock sharp.
  const [today] = useState(() => category(todayCategory(now ?? new Date())));
  const routine = compose(today, choiceFor(today, choices));

  const [entered] = useState(() => GROUPS.map(() => new Animated.Value(0)));
  const [first] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const parts = [first, ...entered];
    if (reduced) {
      parts.forEach((part) => part.setValue(1));
      return;
    }
    const coming = Animated.stagger(
      ENTER_GAP_MS,
      parts.map((part) =>
        Animated.timing(part, {
          toValue: 1,
          duration: ENTER_MS,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ),
    );
    coming.start();
    return () => coming.stop();
  }, [entered, first, reduced]);
  const coming = (part: Animated.Value) => ({
    opacity: part,
    transform: [
      {
        translateY: part.interpolate({
          inputRange: [0, 1],
          outputRange: [space.lg, 0],
        }),
      },
    ],
  });

  const tile = (of: Category, title: string, detail: string, wide = false) => (
    <CategoryTile
      key={of.key}
      of={of}
      title={title}
      detail={detail}
      tint={color.stretch[of.group]}
      icon={MOMENT_ICONS[of.key] ?? SPORT_ICONS[pairOf(of.key)?.of ?? ""]}
      onPress={() => setOpen(of.key)}
      wide={wide}
      testID={`stretch-tile-${of.key}`}
    />
  );
  const plain = (group: CategoryGroup) =>
    categoriesOf(group).map((of) => (
      <View key={of.key} style={styles.third}>
        {tile(of, categoryName(of.key), lengthsLine(of))}
      </View>
    ));
  const whens = `${t("Before")} · ${t("After")}`;

  return (
    <View style={styles.home} testID="stretch-home">
      <Animated.View style={coming(first)}>
        <TodayCard
          of={today}
          routine={routine}
          tint={color.stretch[today.group]}
          onStart={() =>
            startCategorySession(today.key, routine.choice.minutes, routine.exercises)
          }
          onSee={() => setOpen(today.key)}
        />
      </Animated.View>

      {GROUPS.map((group, i) => (
        <Animated.View key={group.key} style={[styles.group, coming(entered[i])]}>
          <GroupTitle group={group} />
          {group.key === "moments" ? (
            // A row that scrolls to the side: the seven moments of the day.
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.row}
            >
              {categoriesOf("moments").map((of) => (
                <View key={of.key} style={styles.moment}>
                  {tile(of, categoryName(of.key), lengthsLine(of))}
                </View>
              ))}
            </ScrollView>
          ) : group.key === "sports" ? (
            // One tile for each sport: its «Before» and «After» are inside.
            <View style={styles.grid}>
              {Object.keys(SPORT_NAMES).map((sport) => (
                <View key={sport} style={styles.half}>
                  {tile(category(`${sport}_after`), t(SPORT_NAMES[sport]), whens)}
                </View>
              ))}
            </View>
          ) : group.key === "intimacy" ? (
            // One wide card for the two: «Before» and «After» are inside.
            tile(
              category("intimacy_before"),
              whens,
              lengthsLine(category("intimacy_before")),
              true,
            )
          ) : (
            <View style={styles.grid}>{plain(group.key)}</View>
          )}
        </Animated.View>
      ))}

      <Text style={styles.stop}>{t("Stop if it hurts.")}</Text>
      {open !== null && (
        <CategoryPage key={open} categoryKey={open} onClose={() => setOpen(null)} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  home: {
    gap: space.xl,
  },
  group: {
    gap: space.md,
  },
  groupTitle: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: space.sm,
  },
  groupName: {
    fontSize: fontSize.heading,
    fontWeight: fontWeight.bold,
    letterSpacing: tracking.heading,
  },
  groupHint: {
    flex: 1,
    color: color.textMuted,
    fontSize: fontSize.small,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -space.xs,
    rowGap: space.sm,
  },
  third: {
    width: "33.333%",
    paddingHorizontal: space.xs,
  },
  half: {
    width: "50%",
    paddingHorizontal: space.xs,
  },
  row: {
    gap: space.sm,
  },
  moment: {
    width: 132,
  },
  stop: {
    color: color.textFaint,
    fontSize: fontSize.small,
    textAlign: "center",
  },
});
