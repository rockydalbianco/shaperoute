import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { t } from "../i18n";
import {
  color,
  fontSize,
  fontWeight,
  MIN_TAP_SIZE,
  radius,
  space,
} from "../theme/tokens";
import {
  type Character,
  CHARACTERS,
  characterEmoji,
  characterName,
} from "./videoCharacter";

type Props = {
  /** The animal that runs the line in the video; null for none. */
  character: Character | null;
  onChange: (character: Character | null) => void;
};

/**
 * «Character» in «Share your run» (TASK-408, ADR-0339): «No animal» and the
 * animals, one of them chosen, in a row that scrolls sideways. «No animal»
 * is chosen when the post opens: the video is the one of before.
 */
export function CharacterRow({ character, onChange }: Props) {
  const choices: (Character | null)[] = [null, ...CHARACTERS];
  return (
    <>
      <Text style={styles.label}>{t("Character")}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
        accessibilityRole="radiogroup"
      >
        {choices.map((choice) => {
          const on = choice === character;
          const name = choice === null ? t("No animal") : characterName(choice);
          return (
            <Pressable
              key={choice ?? "none"}
              style={[styles.tile, on && styles.tileOn]}
              onPress={() => onChange(choice)}
              accessibilityRole="radio"
              accessibilityLabel={name}
              accessibilityState={{ checked: on }}
              testID={`character-${choice ?? "none"}`}
            >
              <View
                importantForAccessibility="no-hide-descendants"
                accessibilityElementsHidden
              >
                <Text style={styles.emoji}>
                  {choice === null ? "—" : characterEmoji(choice)}
                </Text>
              </View>
              <Text style={[styles.name, on && styles.nameOn]} numberOfLines={2}>
                {name}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </>
  );
}

// As the chips of «Music», as tiles.
const styles = StyleSheet.create({
  label: {
    color: color.textMuted,
    fontSize: fontSize.small,
    fontWeight: fontWeight.semibold,
  },
  row: {
    gap: space.sm,
  },
  tile: {
    width: MIN_TAP_SIZE * 1.6,
    minHeight: MIN_TAP_SIZE * 1.6,
    alignItems: "center",
    justifyContent: "center",
    gap: space.xs,
    paddingHorizontal: space.xs,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.borderStrong,
  },
  tileOn: {
    borderColor: color.text,
    backgroundColor: color.surfaceRaised,
  },
  emoji: {
    fontSize: fontSize.title,
    color: color.text,
  },
  name: {
    color: color.textMuted,
    fontSize: fontSize.small,
    textAlign: "center",
  },
  nameOn: {
    color: color.text,
    fontWeight: fontWeight.semibold,
  },
});
