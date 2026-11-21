import { StyleSheet, Text, View } from "react-native";

import { fontWeight, type Palette } from "../../theme/tokens";

/**
 * The drawings of direction on the flight screen (TASK-479 part B1): a
 * dial with north turned as the track turns it, and an arrow at a bearing.
 * Plain views, no drawing library.
 */

/** A dial `size` across with north at `northDeg` on screen (0 = up). */
export function Dial({
  size,
  northDeg,
  palette,
}: {
  size: number;
  northDeg: number;
  palette: Palette;
}) {
  return (
    <View
      style={[
        styles.dial,
        { width: size, height: size, borderRadius: size / 2, borderColor: palette.borderStrong },
      ]}
    >
      <View
        style={[
          StyleSheet.absoluteFill,
          styles.centre,
          { transform: [{ rotate: `${northDeg}deg` }] },
        ]}
      >
        <Text
          style={[styles.north, { color: palette.north, fontSize: Math.max(12, size * 0.2), top: size * 0.04 }]}
        >
          N
        </Text>
      </View>
      {/* The way the pilot goes: always up. */}
      <View style={[styles.heading, { height: size * 0.32, backgroundColor: palette.text }]} />
    </View>
  );
}

/** An arrow `size` tall pointing at `deg` on screen (0 = up). */
export function Arrow({ size, deg, color }: { size: number; deg: number; color: string }) {
  return (
    <View
      style={[styles.centre, { width: size, height: size, transform: [{ rotate: `${deg}deg` }] }]}
      testID="flight-arrow"
    >
      <Text style={{ color, fontSize: size * 0.9, lineHeight: size, includeFontPadding: false }}>↑</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  dial: {
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  centre: {
    alignItems: "center",
    justifyContent: "center",
  },
  north: {
    position: "absolute",
    fontWeight: fontWeight.bold,
  },
  heading: {
    width: 3,
    borderRadius: 2,
  },
});
