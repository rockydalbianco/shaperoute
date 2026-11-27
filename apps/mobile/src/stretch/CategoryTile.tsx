import { StyleSheet, Text, View } from "react-native";

import {
  color,
  fontSize,
  fontWeight,
  MIN_TAP_SIZE,
  radius,
  space,
} from "../theme/tokens";
import { Tap } from "../ui/Tap";
import { exerciseByKey } from "./allExercises";
import type { Category } from "./categories";
import type { Exercise } from "./exercises";
import { Figure } from "./Figure";
import { FigureFront } from "./FigureFront";

/**
 * The figure doing an exercise, from the side or from the front as the
 * exercise is seen (TASK-520, ADR-0415): the one of the stretching screen,
 * at any size.
 */
export function PoseFigure({
  exercise,
  height,
  breathing = false,
}: {
  exercise: Exercise;
  height: number;
  breathing?: boolean;
}) {
  return exercise.front !== undefined ? (
    <FigureFront
      pose={exercise.front}
      breath={exercise.frontBreath}
      breathing={breathing}
      breathMs={exercise.tempoMs}
      height={height}
    />
  ) : (
    <Figure
      pose={exercise.pose}
      breath={exercise.breath}
      breathing={breathing}
      breathMs={exercise.tempoMs}
      height={height}
    />
  );
}

/** The exercise a category shows itself with: its first. */
export function faceOf(of: Category): Exercise {
  const exercise = exerciseByKey(of.exercises[0]);
  if (exercise === undefined) {
    throw new Error(`no stretch ${of.exercises[0]}`);
  }
  return exercise;
}

/** How tall the figure of a tile is, in points. */
export const TILE_FIGURE = 56;

type Props = {
  /** The category whose first exercise the figure does. */
  of: Category;
  title: string;
  /** The line under the name: its lengths, or «Before · After». */
  detail: string;
  /** The group's colour, behind the figure. */
  tint: string;
  onPress: () => void;
  /** Wide, the figure beside the words: the one card of a group of two. */
  wide?: boolean;
  testID?: string;
};

/**
 * A category on the stretching home (TASK-520): the figure in a typical
 * pose over a halo of its group's colour, the name and one line. The figure
 * is the icon. The whole tile is one button, named by its words.
 */
export function CategoryTile({
  of,
  title,
  detail,
  tint,
  onPress,
  wide = false,
  testID,
}: Props) {
  return (
    <Tap
      style={[styles.tile, wide && styles.wide]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${detail}`}
      testID={testID}
    >
      <View style={styles.stage}>
        <View style={[styles.halo, { backgroundColor: tint }]} />
        <PoseFigure exercise={faceOf(of)} height={TILE_FIGURE} />
      </View>
      <View style={wide ? styles.wideWords : styles.words}>
        <Text style={styles.title} numberOfLines={2}>
          {title}
        </Text>
        <Text style={styles.detail} numberOfLines={wide ? 2 : 1}>
          {detail}
        </Text>
      </View>
    </Tap>
  );
}

const STAGE = TILE_FIGURE + space.md;

const styles = StyleSheet.create({
  tile: {
    minHeight: MIN_TAP_SIZE,
    gap: space.sm,
    padding: space.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
  wide: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    padding: space.md,
  },
  stage: {
    height: STAGE,
    minWidth: STAGE,
    alignItems: "center",
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  // A soft disc of the group's colour: the figure stands out of it.
  halo: {
    position: "absolute",
    bottom: -STAGE / 4,
    width: STAGE,
    height: STAGE,
    borderRadius: radius.pill,
    opacity: 0.18,
  },
  words: {
    gap: space.xs / 2,
  },
  wideWords: {
    flex: 1,
    gap: space.xs,
  },
  title: {
    color: color.text,
    fontSize: fontSize.small,
    fontWeight: fontWeight.semibold,
  },
  detail: {
    color: color.textMuted,
    fontSize: fontSize.detail,
  },
});
