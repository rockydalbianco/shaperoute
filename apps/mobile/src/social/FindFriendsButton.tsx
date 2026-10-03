import { Pressable, StyleSheet, Text, View } from "react-native";

import { t } from "../i18n";
import { color, fontSize, MIN_TAP_SIZE, radius, space } from "../theme/tokens";
import { usePeopleDoor } from "./peopleDoor";

/** The side of the lens's glass. */
const GLASS = 13;
/** The thickness of its rim and of its handle. */
const RIM = 2;

/**
 * The way to the search for members, at the top of «Feed» (TASK-215, asked
 * by the user): a lens and «Find friends», shaped like the field it opens.
 */
export function FindFriendsButton() {
  const { open } = usePeopleDoor();
  return (
    <Pressable
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      onPress={open}
      accessibilityRole="button"
      accessibilityLabel={t("Find friends")}
    >
      <Lens />
      <Text style={styles.text}>{t("Find friends")}</Text>
    </Pressable>
  );
}

/** A magnifying glass, drawn: the app has no icons (no react-native-svg). */
function Lens() {
  return (
    <View style={styles.lens}>
      <View style={styles.glass} />
      <View style={styles.handle} />
    </View>
  );
}

const styles = StyleSheet.create({
  // Neutral, as every control that is not the route's (docs/UI.md, «Il tema»).
  button: {
    minHeight: MIN_TAP_SIZE,
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
  pressed: {
    backgroundColor: color.surfaceRaised,
  },
  text: {
    color: color.textMuted,
    fontSize: fontSize.body,
  },
  lens: {
    width: GLASS + RIM * 2,
    height: GLASS + RIM * 2,
  },
  glass: {
    width: GLASS,
    height: GLASS,
    borderRadius: radius.pill,
    borderWidth: RIM,
    borderColor: color.textMuted,
  },
  // Out of the glass, down to the right.
  handle: {
    position: "absolute",
    right: 0,
    bottom: RIM / 2,
    width: RIM,
    height: GLASS / 2,
    borderRadius: RIM / 2,
    backgroundColor: color.textMuted,
    transform: [{ rotate: "-45deg" }],
  },
});
