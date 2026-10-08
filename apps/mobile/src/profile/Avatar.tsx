import { Image, StyleSheet, Text, View } from "react-native";

import { color, fontWeight, radius } from "../theme/tokens";

/** How much of the circle the letter takes. */
const LETTER_SHARE = 0.42;

type Props = {
  /** Who it is: the first letter stands for them. */
  name: string;
  /** The side of the circle. */
  size: number;
  /** Their picture (TASK-178); null or left out: the letter. */
  photo?: string | null;
};

/**
 * Who is signed in, in a circle: their picture, or the first letter of the
 * name without one (TASK-177, TASK-178).
 */
export function Avatar({ name, size, photo = null }: Props) {
  const side = { width: size, height: size };
  if (photo !== null) {
    return (
      <Image
        source={{ uri: photo }}
        style={[styles.circle, side]}
        testID="avatar-photo"
        // A photo keeps its colours when the phone inverts the screen.
        accessibilityIgnoresInvertColors
      />
    );
  }
  return (
    <View style={[styles.circle, side]}>
      <Text style={[styles.letter, { fontSize: Math.round(size * LETTER_SHARE) }]}>
        {name.charAt(0).toUpperCase()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  // Neutral, as the button that opens «Profile»: the yellow is the route's.
  circle: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: color.borderStrong,
    backgroundColor: color.surfaceRaised,
  },
  letter: {
    color: color.text,
    fontWeight: fontWeight.bold,
  },
});
