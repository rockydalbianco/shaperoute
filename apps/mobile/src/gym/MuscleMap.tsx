import { StyleSheet, Text, View } from "react-native";

import type { Language } from "../i18n/languages";
import { color, fontSize, fontWeight, space } from "../theme/tokens";
import {
  type BodySide,
  type Muscle,
  MUSCLE_SIDE,
  muscleNames,
  musclesLabel,
  muscleWord,
  sideOf,
  type Worked,
} from "./muscles";

/** A rounded block of the body: x, y, width, height and the radius of its
 * corners, in the box's units. */
export type Shape = readonly [number, number, number, number, number];

/** The box a body is drawn in. */
export const BODY_BOX = { width: 40, height: 104 } as const;

/** A block and its mirror on the other half of the body. */
function both(x: number, y: number, w: number, h: number, r: number): Shape[] {
  return [
    [x, y, w, h, r],
    [BODY_BOX.width - x - w, y, w, h, r],
  ];
}

/** The body, the same from the front and from the back: the head first. */
const BODY: readonly Shape[] = [
  [13.5, 1.5, 13, 13, 6.5],
  [10, 17, 20, 34, 5],
  ...both(2, 18, 6.5, 32, 3.25),
  ...both(10, 52, 9.5, 24, 4.75),
  ...both(11, 77, 8, 24, 4),
];

/** Where each muscle is on its side of the body. */
export const MUSCLE_ZONES: Readonly<Record<Muscle, readonly Shape[]>> = {
  chest: both(11, 18.5, 8.5, 10.5, 4),
  shoulders: both(1.5, 17, 7.5, 8.5, 3.75),
  biceps: both(2, 26.5, 6.5, 10, 3.25),
  forearms: both(2, 37.5, 6.5, 12.5, 3.25),
  abs: [[14.5, 30.5, 11, 19, 3]],
  obliques: both(10.5, 31, 3.5, 17, 1.75),
  quads: both(10, 52, 9.5, 24, 4.75),
  adductors: both(16, 53, 3.6, 15, 1.8),
  traps: [[13, 17.5, 14, 8.5, 4]],
  rear_delts: both(1.5, 17, 7.5, 8.5, 3.75),
  triceps: both(2, 26.5, 6.5, 10, 3.25),
  lats: both(10.5, 26.5, 9, 13, 4),
  lower_back: [[13, 40, 14, 6.5, 3]],
  glutes: both(10, 47, 9.5, 10.5, 4.75),
  abductors: both(8.5, 46, 4, 10, 2),
  hamstrings: both(10, 58, 9.5, 18, 4.75),
  calves: both(11, 78, 8, 14, 4),
};

/** One side of the body, `height` tall: hollow, the main muscles of that
 * side filled and, with `also`, those that help with an outline. */
function Body({
  side,
  worked,
  height,
  also,
}: {
  side: BodySide;
  worked: Worked;
  height: number;
  also: boolean;
}) {
  const scale = height / BODY_BOX.height;
  const place = ([x, y, w, h, r]: Shape) => ({
    left: x * scale,
    top: y * scale,
    width: w * scale,
    height: h * scale,
    borderRadius: r * scale,
  });
  const here = (muscles: readonly Muscle[]) =>
    muscles.filter((muscle) => MUSCLE_SIDE[muscle] === side);
  const zones = (muscles: readonly Muscle[], kind: "main" | "also", style: object) =>
    here(muscles).flatMap((muscle) =>
      MUSCLE_ZONES[muscle].map((shape, index) => (
        <View
          key={`${kind}-${muscle}-${index}`}
          style={[styles.part, style, place(shape)]}
          testID={index === 0 ? `muscle-${kind}-${muscle}` : undefined}
        />
      )),
    );
  return (
    <View
      style={{ width: BODY_BOX.width * scale, height }}
      testID={`muscle-body-${side}`}
    >
      {BODY.map((shape, index) => (
        <View
          key={`body-${index}`}
          style={[
            styles.part,
            styles.body,
            { borderWidth: Math.max(1, scale * 0.7) },
            // The back of the head is hair: filled, so the two sides differ.
            index === 0 && side === "back" && styles.hair,
            place(shape),
          ]}
        />
      ))}
      {also &&
        zones(worked.secondary, "also", [
          styles.also,
          { borderWidth: Math.max(1.5, scale * 1.4) },
        ])}
      {zones(worked.primary, "main", styles.main)}
    </View>
  );
}

/**
 * The muscles an exercise works, on a body drawn beside its figure
 * (TASK-465, ADR-0376, the user's «B, sagoma accanto»). Small, one side:
 * where the first main muscle is, the main ones filled. With `detail`, in
 * the guide, the front and the back with their names under them, and the
 * muscles that help with an outline: filled or outlined, never the colour
 * alone. It does not move. The screen reader says the names, unless
 * `labelled` is off because the words beside it say them already.
 */
export function MuscleMap({
  worked,
  height,
  language,
  detail = false,
  labelled = true,
  testID,
}: {
  worked: Worked;
  height: number;
  language: Language;
  detail?: boolean;
  labelled?: boolean;
  testID?: string;
}) {
  const sides: readonly BodySide[] = detail ? ["front", "back"] : [sideOf(worked)];
  const said = labelled
    ? ({
        accessible: true,
        accessibilityRole: "image",
        accessibilityLabel: musclesLabel(worked, language, { secondary: detail }),
      } as const)
    : ({
        accessibilityElementsHidden: true,
        importantForAccessibility: "no-hide-descendants",
      } as const);
  return (
    <View style={styles.map} testID={testID} {...said}>
      {sides.map((side) => (
        <View key={side} style={styles.side}>
          <Body side={side} worked={worked} height={height} also={detail} />
          {detail && <Text style={styles.sideName}>{muscleWord(side, language)}</Text>}
        </View>
      ))}
    </View>
  );
}

/**
 * The names of what an exercise works, under its bodies in the guide: the
 * main muscles beside a filled mark, those that help beside an outlined
 * one, as they are drawn. One element for the screen reader.
 */
export function MuscleCaption({
  worked,
  language,
  testID,
}: {
  worked: Worked;
  language: Language;
  testID?: string;
}) {
  return (
    <View
      style={styles.caption}
      accessible
      accessibilityLabel={musclesLabel(worked, language)}
      testID={testID}
    >
      <View style={styles.line}>
        <View style={[styles.mark, styles.main]} />
        <Text style={styles.mainNames}>{muscleNames(worked.primary, language)}</Text>
      </View>
      {worked.secondary.length > 0 && (
        <View style={styles.line}>
          <View style={[styles.mark, styles.also, styles.markAlso]} />
          <Text style={styles.alsoNames}>
            {`${muscleWord("also", language)}: ${muscleNames(worked.secondary, language, { capital: false })}`}
          </Text>
        </View>
      )}
    </View>
  );
}

const MARK = 12;

const styles = StyleSheet.create({
  map: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: space.md,
  },
  side: {
    alignItems: "center",
    gap: space.xs,
  },
  sideName: {
    color: color.textMuted,
    fontSize: fontSize.label,
  },
  part: {
    position: "absolute",
  },
  body: {
    borderColor: color.borderStrong,
  },
  hair: {
    backgroundColor: color.borderStrong,
  },
  main: {
    backgroundColor: color.muscle,
  },
  also: {
    borderColor: color.muscle,
  },
  caption: {
    alignSelf: "stretch",
    gap: space.xs,
    paddingHorizontal: space.md,
  },
  line: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: space.sm,
  },
  mark: {
    width: MARK,
    height: MARK,
    borderRadius: MARK / 2,
  },
  markAlso: {
    borderWidth: 2,
  },
  mainNames: {
    flexShrink: 1,
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
  alsoNames: {
    flexShrink: 1,
    color: color.textMuted,
    fontSize: fontSize.small,
  },
});
