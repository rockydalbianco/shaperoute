import { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";

import { readNumber } from "../body/bodyUnits";
import { gymStyles } from "../gym/gymStyles";
import { t } from "../i18n";
import { color, font, MIN_TAP_SIZE, space } from "../theme/tokens";
import { Tap } from "../ui/Tap";
import { NutritionSheet } from "./AddFoodSheet";
import { EstimateBox } from "./EstimateBox";
import { TARGET_KCAL, targetOf } from "./ownTarget";
import { useNutrition } from "./useNutrition";
import { useUsualUse } from "./useUsualUse";

type Props = {
  visible: boolean;
  /** The target as it is now; null with none. */
  target: number | null;
  /** The number the user wrote, or null for «Remove target». */
  onTarget: (kcal: number | null) => void;
  onClose: () => void;
};

/**
 * «My daily target» (TASK-489 part B, ADR-0397, the user's choice of
 * 2026-11-23): the kilocalories a day the user writes, their own number or
 * the one their dietitian gave them. The field starts empty. Since part J
 * MuW's estimate can be looked at under it (EstimateBox.tsx): closed until
 * asked for, and never written unless the user says «Use this number».
 */
export function TargetSheet({ visible, target, onTarget, onClose }: Props) {
  return (
    <NutritionSheet visible={visible} onClose={onClose} testID="target-sheet">
      <Body target={target} onTarget={onTarget} onClose={onClose} />
    </NutritionSheet>
  );
}

function Body({ target, onTarget, onClose }: Omit<Props, "visible">) {
  const [text, setText] = useState(target === null ? "" : String(target));
  const { purpose } = useNutrition().settings;
  // One moment while the sheet is open: not counted again at every key.
  const [moment] = useState(() => new Date());
  const usedPerDay = useUsualUse(moment);
  const typed = readNumber(text);
  const kcal = typed === null ? null : targetOf(typed);
  return (
    <View style={styles.body}>
      <Text style={styles.title} accessibilityRole="header">
        {t("My daily target")}
      </Text>
      <Text style={styles.label}>{t("kcal a day")}</Text>
      <TextInput
        style={gymStyles.input}
        value={text}
        onChangeText={setText}
        keyboardType="number-pad"
        maxLength={String(TARGET_KCAL.max).length}
        placeholderTextColor={color.textFaint}
        keyboardAppearance="dark"
        returnKeyType="done"
        autoFocus
        accessibilityLabel={t("kcal a day")}
        testID="target-input"
      />
      <Text style={styles.hint}>
        {t("Best: write your own number, or your dietitian's.")}
      </Text>
      <EstimateBox
        purpose={purpose}
        usedPerDay={usedPerDay}
        onUse={(estimate) => setText(String(estimate))}
      />
      <View style={gymStyles.row}>
        <Tap style={gymStyles.button} onPress={onClose} accessibilityRole="button">
          <Text style={gymStyles.buttonText}>{t("Cancel")}</Text>
        </Tap>
        <Tap
          style={[gymStyles.button, kcal === null && gymStyles.disabled]}
          onPress={() => kcal !== null && onTarget(kcal)}
          disabled={kcal === null}
          accessibilityRole="button"
          accessibilityState={{ disabled: kcal === null }}
          testID="target-save"
        >
          <Text style={gymStyles.buttonText}>{t("Save")}</Text>
        </Tap>
      </View>
      {target !== null && (
        <Tap
          style={styles.remove}
          onPress={() => onTarget(null)}
          accessibilityRole="button"
          testID="target-remove"
        >
          <Text style={styles.removeText}>{t("Remove target")}</Text>
        </Tap>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    gap: space.sm,
  },
  title: {
    ...font.heading,
    color: color.text,
  },
  label: {
    ...font.small,
    color: color.textMuted,
    marginTop: space.xs,
  },
  hint: {
    ...font.small,
    color: color.textMuted,
    marginBottom: space.sm,
  },
  remove: {
    alignSelf: "center",
    justifyContent: "center",
    minHeight: MIN_TAP_SIZE,
  },
  removeText: {
    ...font.body,
    color: color.text,
    textDecorationLine: "underline",
  },
});
