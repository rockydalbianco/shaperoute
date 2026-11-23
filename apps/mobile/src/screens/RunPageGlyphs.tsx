import { StyleSheet, View } from "react-native";

import type { RunPage } from "../navigation/runPage";

/** The thickness of every stroke. */
const STROKE = 2;
/** The side of the square each drawing fits in. */
export const GLYPH_SIDE = 18;

/**
 * The small drawings over the names of the run's three pages (TASK-431,
 * ADR-0359), made of Views as the app's other glyphs are: it has no icons
 * and no SVG. Each is hidden from the screen reader: the tab says its name.
 */
export function RunPageGlyph({ page, tint }: { page: RunPage; tint: string }) {
  return (
    <View
      testID={`run-page-glyph-${page}`}
      style={styles.box}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {page === "compass" ? (
        <CompassGlyph tint={tint} />
      ) : page === "map" ? (
        <MapGlyph tint={tint} />
      ) : (
        <DataGlyph tint={tint} />
      )}
    </View>
  );
}

/** A dial with its needle, a thin diamond pointing north-east. */
function CompassGlyph({ tint }: { tint: string }) {
  return (
    <View style={[styles.dial, { borderColor: tint }]}>
      <View style={styles.needleTurn}>
        <View style={[styles.needle, { backgroundColor: tint }]} />
      </View>
    </View>
  );
}

/** A map folded in three, the middle panel a step lower. */
function MapGlyph({ tint }: { tint: string }) {
  return (
    <View style={styles.folds}>
      <View style={[styles.fold, { borderColor: tint }]} />
      <View style={[styles.fold, styles.foldMiddle, { borderColor: tint }]} />
      <View style={[styles.fold, { borderColor: tint }]} />
    </View>
  );
}

/** Three bars, rising: the numbers. */
function DataGlyph({ tint }: { tint: string }) {
  return (
    <View style={styles.bars}>
      {[0.45, 0.75, 1].map((height) => (
        <View
          key={height}
          style={[styles.bar, { height: GLYPH_SIDE * height, backgroundColor: tint }]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    width: GLYPH_SIDE,
    height: GLYPH_SIDE,
    alignItems: "center",
    justifyContent: "center",
  },
  dial: {
    width: GLYPH_SIDE,
    height: GLYPH_SIDE,
    borderRadius: GLYPH_SIDE / 2,
    borderWidth: STROKE,
    alignItems: "center",
    justifyContent: "center",
  },
  // The needle turned north-east…
  needleTurn: {
    transform: [{ rotate: "45deg" }],
  },
  // …a square turned on its corner and pressed thin: a diamond.
  needle: {
    width: 8,
    height: 8,
    transform: [{ scaleX: 0.45 }, { rotate: "45deg" }],
  },
  folds: {
    flexDirection: "row",
    height: GLYPH_SIDE,
    alignItems: "flex-start",
  },
  fold: {
    width: GLYPH_SIDE / 3,
    height: GLYPH_SIDE - 3,
    borderWidth: STROKE,
    marginLeft: -STROKE / 2,
  },
  foldMiddle: {
    marginTop: 3,
  },
  bars: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: GLYPH_SIDE,
    gap: 3,
  },
  bar: {
    width: 4,
    borderRadius: 1,
  },
});
