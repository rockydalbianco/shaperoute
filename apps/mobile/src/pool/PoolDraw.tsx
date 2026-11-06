import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { t, tLater } from "../i18n";
import { Segmented } from "../screens/Segmented";
import { StepTitle } from "../screens/StepTitle";
import {
  color,
  fontSize,
  fontWeight,
  MIN_TAP_SIZE,
  radius,
  space,
} from "../theme/tokens";
import {
  POOL_LENGTHS_M,
  savePlace,
  savePoolLength,
  type SwimPlace,
  usePoolChoice,
} from "./poolChoice";
import { parsePoolLength } from "./poolSwim";
import { startPoolSwim } from "./usePoolSwim";

/** «Open water» or «Pool» (TASK-400 part B, ADR-0334, point 1). */
const PLACES: { value: SwimPlace; label: string }[] = [
  { value: "open_water", label: tLater("Open water") },
  { value: "pool", label: tLater("Pool") },
];

/** A pool's metres as written: 25, 33.33. */
export function metresLabel(metres: number): string {
  return `${Number(metres.toFixed(2))} m`;
}

/**
 * Where the swim is, at the top of «Draw» with «Swim» (TASK-400 part B):
 * «Open water», as before, or «Pool». The last chosen comes back.
 */
export function SwimPlaceChoice({ place }: { place: SwimPlace }) {
  return (
    <Segmented
      options={PLACES.map((option) => ({ ...option, label: t(option.label) }))}
      value={place}
      onChange={savePlace}
    />
  );
}

/**
 * «Draw» for a swim in a pool (TASK-400 part B, the user's choices of
 * 2026-11-05/06): no start, no shape, no distance; the pool, 25 m, 50 m or
 * «Other» from 10 to 100 m, and the yellow «Start swim». A pool out of
 * 10–100 m stays not valid, and «Start swim» waits for one. The last pool
 * chosen comes back.
 */
export function PoolDraw() {
  const { poolLengthM } = usePoolChoice();
  const listed = POOL_LENGTHS_M.includes(poolLengthM);
  const [other, setOther] = useState(!listed);
  const [text, setText] = useState(listed ? "" : String(poolLengthM));
  const written = parsePoolLength(text);
  const chosen = other ? written : poolLengthM;

  function pick(metres: number) {
    setOther(false);
    savePoolLength(metres);
  }

  function write(next: string) {
    setText(next);
    const metres = parsePoolLength(next);
    if (metres !== null) {
      savePoolLength(metres);
    }
  }

  return (
    <View style={styles.card} testID="pool-draw">
      <StepTitle number={1} label={t("Pool length")} />
      <View style={styles.row}>
        {POOL_LENGTHS_M.map((metres) => {
          const on = !other && poolLengthM === metres;
          return (
            <Pressable
              key={metres}
              style={[styles.chip, on && styles.chipOn]}
              onPress={() => pick(metres)}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              testID={`pool-${metres}`}
            >
              <Text style={[styles.chipText, on && styles.chipTextOn]}>
                {metresLabel(metres)}
              </Text>
            </Pressable>
          );
        })}
        <Pressable
          style={[styles.chip, other && styles.chipOn]}
          onPress={() => setOther(true)}
          accessibilityRole="radio"
          accessibilityState={{ checked: other }}
          testID="pool-other"
        >
          <Text style={[styles.chipText, other && styles.chipTextOn]}>
            {t("Other")}
          </Text>
        </Pressable>
      </View>
      {other && (
        <TextInput
          style={[styles.input, text !== "" && written === null && styles.invalid]}
          value={text}
          onChangeText={write}
          placeholder={t("Length in meters")}
          placeholderTextColor={color.textMuted}
          accessibilityLabel={t("Length in meters")}
          keyboardType="decimal-pad"
          maxLength={6}
          testID="pool-other-metres"
        />
      )}
      <Pressable
        style={({ pressed }) => [
          styles.start,
          chosen === null && styles.disabled,
          pressed && styles.pressed,
        ]}
        disabled={chosen === null}
        onPress={() => {
          if (chosen !== null) {
            startPoolSwim(chosen);
          }
        }}
        accessibilityRole="button"
        accessibilityState={{ disabled: chosen === null }}
        testID="start-pool-swim"
      >
        <Text style={styles.startText}>{`🏊 ${t("Start swim")}`}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: space.md,
    padding: space.md,
    borderRadius: radius.lg,
    backgroundColor: color.surface,
  },
  row: {
    flexDirection: "row",
    gap: space.sm,
  },
  chip: {
    flex: 1,
    minHeight: MIN_TAP_SIZE,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.borderStrong,
    backgroundColor: color.surfaceRaised,
  },
  chipOn: {
    borderColor: color.text,
    backgroundColor: color.text,
  },
  chipText: {
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
  chipTextOn: {
    color: color.background,
  },
  input: {
    minHeight: MIN_TAP_SIZE,
    paddingHorizontal: space.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.borderStrong,
    backgroundColor: color.surfaceRaised,
    color: color.text,
    fontSize: fontSize.input,
  },
  invalid: {
    borderColor: color.error,
  },
  start: {
    minHeight: MIN_TAP_SIZE,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
    backgroundColor: color.accent,
  },
  startText: {
    color: color.onAccent,
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold,
  },
  disabled: {
    opacity: 0.4,
  },
  pressed: {
    opacity: 0.85,
  },
});
