import { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";

import { t } from "../i18n";
import {
  color,
  fontSize,
  fontWeight,
  MIN_TAP_SIZE,
  radius,
  space,
} from "../theme/tokens";
import type { VideoEdit } from "./videoEdit";
import { withVideoWords } from "./videoWords";

type Props = {
  edit: VideoEdit;
  onChange: (edit: VideoEdit) => void;
};

/**
 * «Describe your video» at the top of «Edit video» (TASK-408, ADR-0339,
 * part D; the user's choice 9): the runner writes the video they want,
 * and once the field is done the phone reads the words (`videoWords`) and
 * fills the sheet's rows with them, which can still be changed by hand.
 * A word the table does not know is skipped, with no error; nothing goes
 * to the network.
 */
export function DescribeVideo({ edit, onChange }: Props) {
  const [text, setText] = useState("");
  return (
    <View style={styles.block}>
      <Text style={styles.label}>{t("Describe your video")}</Text>
      <TextInput
        style={styles.input}
        value={text}
        onChangeText={setText}
        onEndEditing={() => {
          if (text.trim().length > 0) {
            onChange(withVideoWords(edit, text));
          }
        }}
        placeholder={t("a horse at night, fireworks at the end")}
        placeholderTextColor={color.textFaint}
        accessibilityLabel={t("Describe your video")}
        keyboardAppearance="dark"
        returnKeyType="done"
        autoCorrect={false}
        testID="describe-video"
      />
      <Text style={styles.hint}>
        {t("An animal, colours, emoji, the ending. Read on your phone.")}
      </Text>
    </View>
  );
}

// As the fields of the settings' pages.
const styles = StyleSheet.create({
  block: {
    gap: space.xs,
  },
  label: {
    color: color.textMuted,
    fontSize: fontSize.small,
    fontWeight: fontWeight.semibold,
  },
  input: {
    minHeight: MIN_TAP_SIZE,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.md,
    backgroundColor: color.background,
    fontSize: fontSize.input,
    color: color.text,
  },
  hint: {
    color: color.textMuted,
    fontSize: fontSize.small,
  },
});
