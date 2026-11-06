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
import { VIDEO_EMOJI } from "./videoEdit";

type Props = {
  /** «Along the way» or «At the end», already in the app's language. */
  title: string;
  emoji: string | null;
  onChange: (emoji: string | null) => void;
  /** Tells the two rows apart in tests: `${testID}-🎆`, `${testID}-none`. */
  testID: string;
};

/**
 * One of the two emoji rows of «Edit video» (TASK-408, ADR-0339): «—» for
 * none, then the video's emoji, one of them chosen, in a row that scrolls
 * sideways as «Character» does. Along the way it pops
 * where the line passes; at the end it bursts around the whole drawing.
 */
export function VideoEmojiRow({ title, emoji, onChange, testID }: Props) {
  const choices: (string | null)[] = [null, ...VIDEO_EMOJI];
  return (
    <View style={styles.block}>
      <Text style={styles.title}>{title}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
        accessibilityRole="radiogroup"
        accessibilityLabel={title}
      >
        {choices.map((choice) => {
          const on = choice === emoji;
          return (
            <Pressable
              key={choice ?? "none"}
              style={[styles.tile, on && styles.tileOn]}
              onPress={() => onChange(choice)}
              accessibilityRole="radio"
              accessibilityLabel={choice ?? t("Nothing")}
              accessibilityState={{ checked: on }}
              testID={`${testID}-${choice ?? "none"}`}
            >
              <Text style={choice === null ? styles.none : styles.emoji}>
                {choice ?? "—"}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    gap: space.xs,
  },
  title: {
    color: color.text,
    fontSize: fontSize.small,
  },
  row: {
    gap: space.xs,
  },
  tile: {
    width: MIN_TAP_SIZE,
    height: MIN_TAP_SIZE,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
  tileOn: {
    borderColor: color.text,
    backgroundColor: color.surfaceRaised,
  },
  emoji: {
    fontSize: fontSize.title,
  },
  none: {
    color: color.textMuted,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
});
