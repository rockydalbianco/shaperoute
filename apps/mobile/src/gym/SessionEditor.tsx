import type { GymPlanItem } from "@shaperoute/shared-types";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { t } from "../i18n";
import { appLanguage } from "../i18n/language";
import {
  color,
  font,
  fontSize,
  fontWeight,
  MIN_TAP_SIZE,
  radius,
  space,
} from "../theme/tokens";
import { useUnits } from "../units/useUnits";
import { exerciseName, gymExercise } from "./catalog";
import { ExercisePicker } from "./ExercisePicker";
import { MAX_ITEMS, MAX_SETS } from "./planLimits";
import { groupName } from "./groups";
import { SetFields, type SetTexts, textsOf, valuesOfTexts } from "./SetFields";
import { type Entry, entryOf } from "./setKinds";

/** «4 × 10», «3 × 0:45», «4 ×»: an exercise's sets and what each is. */
export function setsLabel(item: GymPlanItem): string {
  if (item.reps !== undefined) {
    return `${item.sets} × ${item.reps}`;
  }
  if (item.duration_s !== undefined) {
    const minutes = Math.floor(item.duration_s / 60);
    const seconds = String(item.duration_s % 60).padStart(2, "0");
    return `${item.sets} × ${minutes}:${seconds}`;
  }
  return `${item.sets} ×`;
}

function itemOf(entry: Entry, sets: number, values: Partial<GymPlanItem>): GymPlanItem {
  return {
    ...("exercise" in entry ? { exercise: entry.exercise } : { name: entry.name }),
    kind: entry.kind,
    sets,
    ...values,
  };
}

/**
 * The exercises of a workout of a plan, in order (the guide's step «Your
 * plan», the user's mockup of 2026-11-10): a row each with its number, its
 * name, its muscle group and its sets × reps; touched, it opens under it to
 * change its sets and the values aimed at, move it, swap it or take it
 * away. «Add exercise» opens the grid of the catalog.
 */
export function SessionEditor({
  items,
  onChange,
}: {
  items: GymPlanItem[];
  onChange: (items: GymPlanItem[]) => void;
}) {
  const units = useUnits();
  const language = appLanguage();
  // The row open, and the boxes being typed in it.
  const [open, setOpen] = useState<number | null>(null);
  const [texts, setTexts] = useState<SetTexts>({});
  // «add» for a new exercise, a row's index to swap it.
  const [picking, setPicking] = useState<"add" | number | null>(null);

  if (picking !== null) {
    return (
      <ExercisePicker
        onPick={(entry) => {
          if (picking === "add") {
            onChange([...items, itemOf(entry, 3, {})]);
          } else {
            const before = items[picking];
            onChange(
              items.map((item, i) =>
                i === picking ? itemOf(entry, before.sets, {}) : item,
              ),
            );
            setOpen(null);
          }
          setPicking(null);
        }}
        onClose={() => setPicking(null)}
      />
    );
  }

  function toggle(index: number) {
    if (open === index) {
      setOpen(null);
      return;
    }
    setOpen(index);
    setTexts(textsOf(entryOf(items[index]), items[index], units));
  }

  function change(index: number, next: GymPlanItem) {
    onChange(items.map((item, i) => (i === index ? next : item)));
  }

  function move(index: number, by: number) {
    const to = index + by;
    if (to < 0 || to >= items.length) {
      return;
    }
    const next = [...items];
    [next[index], next[to]] = [next[to], next[index]];
    onChange(next);
    setOpen(to);
  }

  return (
    <View style={styles.card} testID="session-editor">
      {items.map((item, index) => {
        const name = exerciseName(item, language);
        const known =
          item.exercise === undefined ? undefined : gymExercise(item.exercise);
        const entry = entryOf(item);
        return (
          <View key={`${index}-${item.exercise ?? item.name}`}>
            {index > 0 && <View style={styles.rule} />}
            <Pressable
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}
              onPress={() => toggle(index)}
              accessibilityRole="button"
              accessibilityState={{ expanded: open === index }}
              accessibilityLabel={`${name}, ${setsLabel(item)}`}
              testID={`session-item-${index}`}
            >
              <Text style={styles.number} importantForAccessibility="no">
                {index + 1}
              </Text>
              <View style={styles.names}>
                <Text style={styles.name} numberOfLines={1}>
                  {name}
                </Text>
                {known !== undefined && (
                  <Text style={styles.group}>{groupName(known.group, language)}</Text>
                )}
              </View>
              <Text style={styles.pill}>{setsLabel(item)}</Text>
            </Pressable>
            {open === index && (
              <View style={styles.open} testID={`session-item-open-${index}`}>
                <View style={styles.sets}>
                  <Text style={styles.label}>{t("Sets")}</Text>
                  <Pressable
                    style={styles.round}
                    onPress={() =>
                      change(index, { ...item, sets: Math.max(1, item.sets - 1) })
                    }
                    accessibilityRole="button"
                    accessibilityLabel="−"
                    testID={`session-sets-less-${index}`}
                  >
                    <Text style={styles.roundText}>−</Text>
                  </Pressable>
                  <Text style={styles.count} testID={`session-sets-${index}`}>
                    {item.sets}
                  </Text>
                  <Pressable
                    style={styles.round}
                    onPress={() =>
                      change(index, {
                        ...item,
                        sets: Math.min(MAX_SETS, item.sets + 1),
                      })
                    }
                    accessibilityRole="button"
                    accessibilityLabel="+"
                    testID={`session-sets-more-${index}`}
                  >
                    <Text style={styles.roundText}>+</Text>
                  </Pressable>
                </View>
                <SetFields
                  entry={entry}
                  texts={texts}
                  units={units}
                  onChange={(next) => {
                    setTexts(next);
                    change(
                      index,
                      itemOf(entry, item.sets, valuesOfTexts(entry, next, units)),
                    );
                  }}
                />
                <View style={styles.actions}>
                  <Pressable
                    style={[styles.action, index === 0 && styles.off]}
                    disabled={index === 0}
                    onPress={() => move(index, -1)}
                    accessibilityRole="button"
                    accessibilityLabel={t("Move up")}
                    testID={`session-up-${index}`}
                  >
                    <Text style={styles.actionText}>↑</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.action, index === items.length - 1 && styles.off]}
                    disabled={index === items.length - 1}
                    onPress={() => move(index, 1)}
                    accessibilityRole="button"
                    accessibilityLabel={t("Move down")}
                    testID={`session-down-${index}`}
                  >
                    <Text style={styles.actionText}>↓</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.action, styles.wide]}
                    onPress={() => setPicking(index)}
                    accessibilityRole="button"
                    testID={`session-swap-${index}`}
                  >
                    <Text style={styles.actionText}>{t("Swap")}</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.action, styles.wide]}
                    onPress={() => {
                      onChange(items.filter((_, i) => i !== index));
                      setOpen(null);
                    }}
                    accessibilityRole="button"
                    testID={`session-remove-${index}`}
                  >
                    <Text style={[styles.actionText, styles.danger]}>
                      {t("Remove")}
                    </Text>
                  </Pressable>
                </View>
              </View>
            )}
          </View>
        );
      })}
      {items.length < MAX_ITEMS && (
        <>
          {items.length > 0 && <View style={styles.rule} />}
          <Pressable
            style={({ pressed }) => [styles.add, pressed && styles.pressed]}
            onPress={() => setPicking("add")}
            accessibilityRole="button"
            testID="session-add"
          >
            <Text style={styles.addText}>{`+  ${t("Add exercise")}`}</Text>
          </Pressable>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
    overflow: "hidden",
  },
  rule: {
    height: 1,
    backgroundColor: color.surfaceRaised,
  },
  row: {
    minHeight: MIN_TAP_SIZE + space.md,
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    paddingHorizontal: space.md,
    paddingVertical: space.md,
  },
  pressed: {
    opacity: 0.7,
  },
  number: {
    width: 22,
    textAlign: "center",
    color: color.textFaint,
    fontSize: fontSize.small,
  },
  names: {
    flex: 1,
    gap: 2,
  },
  name: {
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
  group: {
    ...font.small,
    color: color.textMuted,
  },
  pill: {
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
    fontVariant: ["tabular-nums"],
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: radius.md,
    backgroundColor: color.surfaceRaised,
    overflow: "hidden",
  },
  open: {
    gap: space.md,
    paddingHorizontal: space.md,
    paddingBottom: space.md,
  },
  sets: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
  },
  label: {
    ...font.small,
    flex: 1,
    color: color.textMuted,
  },
  round: {
    width: MIN_TAP_SIZE,
    height: MIN_TAP_SIZE,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: MIN_TAP_SIZE / 2,
    borderWidth: 1,
    borderColor: color.borderStrong,
  },
  roundText: {
    color: color.text,
    fontSize: fontSize.heading,
  },
  count: {
    minWidth: 28,
    textAlign: "center",
    color: color.text,
    fontSize: fontSize.heading,
    fontWeight: fontWeight.semibold,
    fontVariant: ["tabular-nums"],
  },
  actions: {
    flexDirection: "row",
    gap: space.sm,
  },
  action: {
    minWidth: MIN_TAP_SIZE,
    minHeight: MIN_TAP_SIZE,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.border,
  },
  wide: {
    flex: 1,
  },
  off: {
    opacity: 0.35,
  },
  actionText: {
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
  danger: {
    color: color.error,
  },
  add: {
    minHeight: MIN_TAP_SIZE + space.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  addText: {
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
});
