import { type StyleProp, StyleSheet, type TextStyle, View } from "react-native";

import { CountUp } from "../nutrition/CountUp";
import { Ring } from "../nutrition/Ring";
import { color, font } from "../theme/tokens";

/** The ring's side and its line, in points, unless told. */
export const RING_STAT_SIZE = 72;
export const RING_STAT_STROKE = 7;

type Props = {
  /** 0 to 1: how far round the ring goes. */
  share: number;
  /** The number in the middle; null for none («—»). */
  value: number | null;
  /** How the number is written; whole numbers by default. */
  format?: (value: number) => string;
  /** The section's colour: the ring's line. */
  colour: string;
  /** What the ring says, whole, for screen readers («Profile 78% complete»). */
  label: string;
  size?: number;
  stroke?: number;
  /** The number's own look, over the app's card title. */
  valueStyle?: StyleProp<TextStyle>;
  testID?: string;
};

/**
 * A ring that fills with its number counting in the middle (TASK-523,
 * ADR-0417): the ring and the count of «Nutrition» (TASK-489 part H), used
 * as they are, for every page. The ring's track is `border`, on which every
 * section's colour keeps 3:1. Screen readers are told `label` once, never
 * the numbers on the way; with «Reduce Motion» both are there at once.
 */
export function RingStat({
  share,
  value,
  format,
  colour,
  label,
  size = RING_STAT_SIZE,
  stroke = RING_STAT_STROKE,
  valueStyle,
  testID,
}: Props) {
  return (
    <View
      style={{ width: size, height: size }}
      accessible
      accessibilityRole="image"
      accessibilityLabel={label}
      testID={testID}
    >
      <Ring
        size={size}
        stroke={stroke}
        share={share}
        colour={colour}
        track={color.border}
        testID={testID === undefined ? undefined : `${testID}-ring`}
      />
      <View style={[StyleSheet.absoluteFill, styles.middle]} pointerEvents="none">
        <CountUp
          value={value}
          format={format}
          style={[styles.value, valueStyle]}
          testID={testID === undefined ? undefined : `${testID}-value`}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  middle: {
    alignItems: "center",
    justifyContent: "center",
  },
  value: {
    ...font.cardTitle,
    color: color.text,
    fontVariant: ["tabular-nums"],
  },
});
