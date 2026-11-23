import { Image, type ImageSourcePropType, StyleSheet, Text, View } from "react-native";

import { color, fontSize, radius, space } from "../theme/tokens";
import type { Note, NoteTone } from "./warnings";

/** A note's sign, from Lucide (ISC, assets/ui/icons/LICENSE-lucide.txt) as
 * the bar's icons are: white, coloured by `tintColor`. */
const ICONS = {
  caution: require("../../assets/ui/icons/triangle-alert.png"),
  info: require("../../assets/ui/icons/info.png"),
} satisfies Record<NoteTone, ImageSourcePropType>;

/** The sign's side: the height of a line of the note's text. */
export const NOTE_ICON = 18;

/**
 * A warning of the engine in plain words (warnings.ts), with a sign that
 * says whether to watch for it (a triangle) or just to know it (an «i»).
 *
 * The sign's shape tells the two apart, not a colour (TASK-444): a stripe
 * in `warning` stood here, and steps along the way looked like something
 * gone wrong — on a dark screen `warning` sits right beside `error`. Hidden
 * from a screen reader: the sentence says it all.
 */
export function NoteRow({ note }: { note: Note }) {
  return (
    <View style={styles.row} testID={`note-${note.tone}`}>
      <Image
        source={ICONS[note.tone]}
        style={[styles.icon, note.tone === "caution" ? styles.caution : styles.info]}
        accessible={false}
        importantForAccessibility="no"
        testID={`note-icon-${note.tone}`}
      />
      <Text style={styles.text}>{note.text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: space.sm,
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
    borderRadius: radius.sm,
    backgroundColor: color.surfaceRaised,
  },
  icon: {
    width: NOTE_ICON,
    height: NOTE_ICON,
  },
  caution: {
    tintColor: color.text,
  },
  info: {
    tintColor: color.textMuted,
  },
  text: {
    flex: 1,
    color: color.text,
    fontSize: fontSize.small,
  },
});
