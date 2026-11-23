import { Image, type ImageStyle, type StyleProp, StyleSheet } from "react-native";

/**
 * One column of pixels, clear at the top and `color.scrim` at 82 % at the
 * bottom along a smooth curve (`tools/ui_scrim.py` draws it).
 */
const SHADE = require("../../assets/ui/scrim.png");

type Props = {
  /** How far up the photo the dark reaches, in points. */
  height: number;
  style?: StyleProp<ImageStyle>;
};

/**
 * The dark that rises from the bottom of a photo so the words over it read
 * (TASK-339, ADR-0293). An image stretched to the box, not a gradient
 * library: nothing native, the same in both tones, since words on a photo
 * are light whatever the tone. Lies over the photo and under the words.
 */
export function Scrim({ height, style }: Props) {
  return (
    <Image
      source={SHADE}
      resizeMode="stretch"
      style={[styles.scrim, { height }, style]}
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no"
    />
  );
}

const styles = StyleSheet.create({
  scrim: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
  },
});
