import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { fitLines, type Segment } from "../activities/fitLines";
import { t } from "../i18n";
import { bearingOf } from "../map/turnedMap";
import { color, fontSize, fontWeight, radius, space } from "../theme/tokens";
import { lookColours, lookName, POST_LOOKS, type PostLook } from "./postLook";
import { postLine, type PostRun } from "./postRun";

/** A tile has the post's shape, 9 wide and 16 tall. */
const TILE_WIDTH = 54;
const TILE_HEIGHT = 96;
/** The drawing's place in the tile, as on the post (PostImage). */
const SIDE = 0.08;
const DRAWING_TOP = 0.2;
const DRAWING_BOTTOM = 0.7;
/** The line in the tile, in points. */
const LINE = 2;

type Props = {
  run: PostRun;
  /** The look the picture has. */
  look: PostLook;
  onChange: (look: PostLook) => void;
};

/** One straight piece of the drawing, as a turned View (as PostImage). */
function placed(s: Segment) {
  return {
    left: s.left,
    top: s.top - LINE / 2,
    width: s.length + LINE / 2,
    height: LINE,
    borderRadius: LINE / 2,
    transform: [{ rotate: `${s.angle}deg` }],
  };
}

/**
 * «Style» of the post's picture (TASK-450): a tile for each look, the
 * post's shape, with the run's drawing in the look's line on its ground,
 * one of them chosen; «Yellow» when the post opens.
 */
export function PostLookRow({ run, look, onChange }: Props) {
  const bearing = bearingOf(run.rotationDeg);
  const [segments] = useMemo(
    () =>
      fitLines(
        [postLine(run.track)],
        TILE_WIDTH * (1 - 2 * SIDE),
        TILE_HEIGHT * (DRAWING_BOTTOM - DRAWING_TOP),
        LINE,
        bearing,
      ),
    [run.track, bearing],
  );

  return (
    <>
      <Text style={styles.label}>{t("Style")}</Text>
      <View style={styles.tiles} accessibilityRole="radiogroup">
        {POST_LOOKS.map((each) => {
          const on = each === look;
          const colours = lookColours(each);
          return (
            <View key={each} style={styles.choice}>
              <Pressable
                style={[
                  styles.tile,
                  { backgroundColor: colours.ground },
                  on && styles.tileOn,
                ]}
                onPress={() => onChange(each)}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                accessibilityLabel={lookName(each)}
                testID={`post-look-${each}`}
              >
                <View style={styles.drawing} pointerEvents="none">
                  {segments.map((s, i) => (
                    <View
                      key={i}
                      style={[
                        styles.line,
                        placed(s),
                        { backgroundColor: colours.line },
                      ]}
                    />
                  ))}
                </View>
              </Pressable>
              <Text style={[styles.name, on && styles.nameOn]}>{lookName(each)}</Text>
            </View>
          );
        })}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  // As the labels of SharePost.
  label: {
    color: color.textMuted,
    fontSize: fontSize.small,
    fontWeight: fontWeight.semibold,
  },
  tiles: {
    flexDirection: "row",
    gap: space.md,
  },
  choice: {
    minWidth: TILE_WIDTH,
    alignItems: "center",
    gap: space.xs,
  },
  tile: {
    width: TILE_WIDTH,
    height: TILE_HEIGHT,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.hairline,
    overflow: "hidden",
  },
  tileOn: {
    borderWidth: 2,
    borderColor: color.text,
  },
  drawing: {
    position: "absolute",
    left: TILE_WIDTH * SIDE,
    top: TILE_HEIGHT * DRAWING_TOP,
    width: TILE_WIDTH * (1 - 2 * SIDE),
    height: TILE_HEIGHT * (DRAWING_BOTTOM - DRAWING_TOP),
  },
  line: {
    position: "absolute",
  },
  name: {
    color: color.textMuted,
    fontSize: fontSize.body,
  },
  nameOn: {
    color: color.text,
    fontWeight: fontWeight.semibold,
  },
});
