import type { GymPlan, GymPlanItem } from "@shaperoute/shared-types";
import { useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { t, tLater } from "../i18n";
import { appLanguage } from "../i18n/language";
import {
  color,
  fontSize,
  fontWeight,
  MIN_TAP_SIZE,
  radius,
  space,
} from "../theme/tokens";
import { useUnits } from "../units/useUnits";
import { exerciseName } from "./catalog";
import { ExercisePicker, MAX_NAME } from "./ExercisePicker";
import { gymStyles } from "./gymStyles";
import { SetFields, type SetTexts, textsOf, valuesOfTexts } from "./SetFields";
import { type Entry, entryOf } from "./setKinds";

/** The days of the week from Monday, 1 to 7 as the API counts them. */
export const WEEK_DAYS = [
  tLater("Mon"),
  tLater("Tue"),
  tLater("Wed"),
  tLater("Thu"),
  tLater("Fri"),
  tLater("Sat"),
  tLater("Sun"),
];

/** At most this many exercises and sets an exercise (gym_plans.py). */
export const MAX_ITEMS = 30;
export const MAX_SETS = 20;

/** An exercise of the plan being written: its entry, sets and boxes. */
type Draft = { entry: Entry; sets: number; texts: SetTexts };

export type PlanDraft = { name: string; days: number[]; items: GymPlanItem[] };

/**
 * A plan written or changed (TASK-411 C, ADR-0341, the user's «Schede +
 * giorni»): a name, the days of the week, the exercises in order from the
 * catalog, each with its sets and the values aimed at (the boxes of a set,
 * each may stay empty). «Save» keeps it; «Delete plan» asks first.
 */
export function GymPlanEditor({
  plan,
  onSave,
  onDelete,
  onBack,
}: {
  /** The plan changed; null for a new one. */
  plan: GymPlan | null;
  onSave: (draft: PlanDraft) => void;
  onDelete?: () => void;
  onBack: () => void;
}) {
  const units = useUnits();
  const language = appLanguage();
  const [name, setName] = useState(plan?.name ?? "");
  const [days, setDays] = useState<number[]>(plan?.days ?? []);
  const [drafts, setDrafts] = useState<Draft[]>(() =>
    (plan?.items ?? []).map((item) => ({
      entry: entryOf(item),
      sets: item.sets,
      texts: textsOf(entryOf(item), item, units),
    })),
  );
  const [picking, setPicking] = useState(false);
  const named = name.trim().slice(0, MAX_NAME);

  if (picking) {
    return (
      <ExercisePicker
        onPick={(entry) => {
          setDrafts((before) => [...before, { entry, sets: 3, texts: {} }]);
          setPicking(false);
        }}
        onClose={() => setPicking(false)}
      />
    );
  }

  function change(index: number, next: Partial<Draft>) {
    setDrafts((before) =>
      before.map((draft, i) => (i === index ? { ...draft, ...next } : draft)),
    );
  }

  function save() {
    onSave({
      name: named,
      days: [...days].sort((a, b) => a - b),
      items: drafts.map(({ entry, sets, texts }) => ({
        ...("exercise" in entry ? { exercise: entry.exercise } : { name: entry.name }),
        kind: entry.kind,
        sets,
        ...valuesOfTexts(entry, texts, units),
      })),
    });
  }

  function askDelete() {
    if (onDelete === undefined || plan === null) {
      return;
    }
    Alert.alert(t("Delete “{name}”?", { name: plan.name }), undefined, [
      { text: t("Cancel"), style: "cancel" },
      { text: t("Delete"), style: "destructive", onPress: onDelete },
    ]);
  }

  return (
    <ScrollView
      contentContainerStyle={styles.editor}
      keyboardShouldPersistTaps="handled"
      testID="plan-editor"
    >
      <TextInput
        style={gymStyles.input}
        value={name}
        onChangeText={setName}
        placeholder={t("Plan name")}
        placeholderTextColor={color.textFaint}
        accessibilityLabel={t("Plan name")}
        maxLength={MAX_NAME}
        testID="plan-name"
      />
      <Text style={styles.label}>{t("Days")}</Text>
      <View style={styles.days}>
        {WEEK_DAYS.map((day, index) => {
          const number = index + 1;
          const on = days.includes(number);
          return (
            <Pressable
              key={day}
              style={[gymStyles.chip, styles.day, on && gymStyles.chipOn]}
              onPress={() =>
                setDays((before) =>
                  on ? before.filter((one) => one !== number) : [...before, number],
                )
              }
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              testID={`plan-day-${number}`}
            >
              <Text style={[gymStyles.chipText, on && gymStyles.chipTextOn]}>
                {t(day)}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {drafts.map((draft, index) => (
        <View key={index} style={styles.item} testID={`plan-item-${index}`}>
          <View style={styles.itemHead}>
            <Text style={[gymStyles.text, styles.itemName]}>
              {exerciseName(
                "exercise" in draft.entry
                  ? { exercise: draft.entry.exercise }
                  : { name: draft.entry.name },
                language,
              )}
            </Text>
            <Pressable
              style={styles.small}
              onPress={() =>
                setDrafts((before) => before.filter((_, i) => i !== index))
              }
              accessibilityRole="button"
              accessibilityLabel={t("Delete")}
              testID={`plan-item-remove-${index}`}
            >
              <Text style={gymStyles.chipText}>×</Text>
            </Pressable>
          </View>
          <View style={styles.sets}>
            <Text style={gymStyles.muted}>{t("Sets")}</Text>
            <Pressable
              style={styles.small}
              onPress={() => change(index, { sets: Math.max(1, draft.sets - 1) })}
              accessibilityRole="button"
              accessibilityLabel="−"
              testID={`plan-sets-less-${index}`}
            >
              <Text style={gymStyles.chipText}>−</Text>
            </Pressable>
            <Text style={styles.count} testID={`plan-sets-${index}`}>
              {draft.sets}
            </Text>
            <Pressable
              style={styles.small}
              onPress={() =>
                change(index, { sets: Math.min(MAX_SETS, draft.sets + 1) })
              }
              accessibilityRole="button"
              accessibilityLabel="+"
              testID={`plan-sets-more-${index}`}
            >
              <Text style={gymStyles.chipText}>+</Text>
            </Pressable>
          </View>
          <SetFields
            entry={draft.entry}
            texts={draft.texts}
            units={units}
            onChange={(texts) => change(index, { texts })}
          />
        </View>
      ))}
      {drafts.length < MAX_ITEMS && (
        <Pressable
          style={gymStyles.button}
          onPress={() => setPicking(true)}
          accessibilityRole="button"
          testID="plan-add-exercise"
        >
          <Text style={gymStyles.buttonText}>{t("+ Exercise")}</Text>
        </Pressable>
      )}
      <View style={gymStyles.row}>
        <Pressable
          style={gymStyles.button}
          onPress={onBack}
          accessibilityRole="button"
          testID="plan-back"
        >
          <Text style={gymStyles.buttonText}>{t("Back")}</Text>
        </Pressable>
        <Pressable
          style={[
            gymStyles.button,
            gymStyles.primary,
            (named === "" || drafts.length === 0) && gymStyles.disabled,
          ]}
          disabled={named === "" || drafts.length === 0}
          onPress={save}
          accessibilityRole="button"
          testID="plan-save"
        >
          <Text style={[gymStyles.buttonText, gymStyles.primaryText]}>{t("Save")}</Text>
        </Pressable>
      </View>
      {onDelete !== undefined && plan !== null && (
        <Pressable
          style={gymStyles.button}
          onPress={askDelete}
          accessibilityRole="button"
          testID="plan-delete"
        >
          <Text style={[gymStyles.buttonText, gymStyles.danger]}>
            {t("Delete plan")}
          </Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  editor: {
    gap: space.md,
    paddingBottom: space.xxl,
  },
  label: {
    color: color.textMuted,
    fontSize: fontSize.small,
  },
  days: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: space.xs,
  },
  day: {
    minWidth: MIN_TAP_SIZE,
    alignItems: "center",
  },
  item: {
    gap: space.sm,
    padding: space.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
  itemHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
  },
  itemName: {
    flex: 1,
    fontWeight: fontWeight.semibold,
  },
  sets: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
  },
  small: {
    minWidth: MIN_TAP_SIZE,
    minHeight: MIN_TAP_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  count: {
    minWidth: MIN_TAP_SIZE / 2,
    textAlign: "center",
    color: color.text,
    fontSize: fontSize.body,
    fontVariant: ["tabular-nums"],
  },
});
