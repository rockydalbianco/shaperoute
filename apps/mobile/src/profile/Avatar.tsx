import { StyleSheet, Text, View } from "react-native";

import { color, fontWeight, radius } from "../theme/tokens";

/** How much of the circle the letter takes. */
const LETTER_SHARE = 0.42;

type Props = {
  /** Who it is: the first letter stands for them. */
  name: string;
  /** The side of the circle. */
  size: number;
};

/** Who is signed in, in a circle: the first letter of the name (TASK-177). */
export function Avatar({ name, size }: Props) {
  return (
    <View style={[styles.circle, { width: size, height: size }]}>
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
