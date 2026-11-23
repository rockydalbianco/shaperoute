import { Pressable, StyleSheet, Text, View } from "react-native";

import { gymStyles } from "../gym/gymStyles";
import { t } from "../i18n";
import type { Language } from "../i18n/languages";
import { color, font, radius, space } from "../theme/tokens";
import { type Tip, tipKey } from "./rules";
import { tipText } from "./tipText";

type Props = {
  tip: Tip;
  language: Language;
  /** «Apply to plan» (or «Add to Mon»): only for a tip that changes the
   * plan. */
  onApply: () => void;
  /** «OK» and «Not now»: the tip goes for a week. */
  onPutOff: () => void;
};

/**
 * One Coach tip (TASK-491 part B, ADR-0399): what to do, what was seen,
 * the study it comes from, and its buttons. A tip that changes the plan
 * has «Apply to plan» and «Not now»; the others «OK».
 */
export function TipCard({ tip, language, onApply, onPutOff }: Props) {
  const text = tipText(tip, language);
  const id = tipKey(tip);
  return (
    <View style={styles.card} testID={`tip-${id}`}>
      <Text style={styles.title} accessibilityRole="header">
        {text.title}
      </Text>
      <Text style={styles.body}>{text.body}</Text>
      <Text style={styles.why}>{text.why}</Text>
      <View style={text.apply === null ? gymStyles.row : styles.stack}>
        {text.apply === null ? (
          <Pressable
            style={gymStyles.button}
            onPress={onPutOff}
            accessibilityRole="button"
            testID={`tip-ok-${id}`}
          >
            <Text style={gymStyles.buttonText}>{t("OK")}</Text>
          </Pressable>
        ) : (
          <>
            <Pressable
              style={[gymStyles.button, gymStyles.primary]}
              onPress={onApply}
              accessibilityRole="button"
              testID={`tip-apply-${id}`}
            >
              <Text style={[gymStyles.buttonText, gymStyles.primaryText]}>
                {text.apply}
              </Text>
            </Pressable>
            <Pressable
              style={gymStyles.button}
              onPress={onPutOff}
              accessibilityRole="button"
              testID={`tip-later-${id}`}
            >
              <Text style={gymStyles.buttonText}>{t("Not now")}</Text>
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: space.sm,
    padding: space.md,
    borderRadius: radius.lg,
    backgroundColor: color.surface,
  },
  title: {
    ...font.cardTitle,
    color: color.text,
  },
  body: {
    ...font.body,
    color: color.text,
  },
  why: {
    ...font.small,
    color: color.textMuted,
  },
  // «Apply to plan» over «Not now»: each button the card's width, so the
  // longer words of other languages fit on one line.
  stack: {
    gap: space.sm,
  },
});
