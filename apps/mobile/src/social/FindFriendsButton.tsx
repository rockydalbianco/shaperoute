import { Pressable, StyleSheet, View } from "react-native";

import { t } from "../i18n";
import { color, MIN_TAP_SIZE, radius } from "../theme/tokens";
import { usePeopleDoor } from "./peopleDoor";

/** The side of the lens's glass. */
const GLASS = 15;
/** The thickness of its rim and of its handle. */
const RIM = 2;

/**
 * The way to the search for members, at the top of «Feed» (TASK-215, asked
 * by the user): only a lens, in a circle like the button of «Profile»
 * (TASK-219, the user's choice). VoiceOver reads «Find friends».
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
  // As the button of «Profile» (ProfileLayer.tsx).
  button: {
    width: MIN_TAP_SIZE,
    height: MIN_TAP_SIZE,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.borderStrong,
    backgroundColor: color.surfaceRaised,
  },
  pressed: {
    backgroundColor: color.surface,
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
    borderColor: color.text,
  },
  // Out of the glass, down to the right.
  handle: {
    position: "absolute",
    right: 0,
    bottom: RIM / 2,
    width: RIM,
    height: GLASS / 2,
    borderRadius: RIM / 2,
    backgroundColor: color.text,
    transform: [{ rotate: "-45deg" }],
  },
});
