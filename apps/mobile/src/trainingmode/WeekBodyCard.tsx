import { StyleSheet, Text, View } from "react-native";

import { BODY_BOX, MUSCLE_ZONES, type Shape } from "../gym/MuscleMap";
import { type BodySide, MUSCLE_SIDE, MUSCLES, muscleNames } from "../gym/muscles";
import { t, tLater } from "../i18n";
import type { Language } from "../i18n/languages";
import { useLanguage } from "../i18n/useLanguage";
import { color, font, fontSize, fontWeight, radius, space } from "../theme/tokens";
import { useWeekBody } from "./useWeekBody";
import {
  bodyShare,
  type Level,
  levelOf,
  musclesAt,
  type MuscleSets,
  percentOf,
} from "./weekBody";

function both(x: number, y: number, w: number, h: number, r: number): Shape[] {
  return [
    [x, y, w, h, r],
    [BODY_BOX.width - x - w, y, w, h, r],
  ];
}

/** The body as `../gym/MuscleMap`'s draws it (TASK-465): the head, the
 * trunk, the arms, the thighs, the legs. */
const BODY: readonly Shape[] = [
  [13.5, 1.5, 13, 13, 6.5],
  [10, 17, 20, 34, 5],
  ...both(2, 18, 6.5, 32, 3.25),
  ...both(10, 52, 9.5, 24, 4.75),
  ...both(11, 77, 8, 24, 4),
];

/** «62% of your body trained this week. 10 sets or more: chest. …»: what
 * the screen reader says, every look in words. */
export function weekBodyLabel(count: MuscleSets, language: Language): string {
  const parts = [
    t("{percent}% of your body trained this week.", {
      percent: String(percentOf(bodyShare(count))),
    }),
  ];
  const lines: [Level, string][] = [
    [3, tLater("10 sets or more: {muscles}.")],
    [2, tLater("5 to 9 sets: {muscles}.")],
    [1, tLater("1 to 4 sets: {muscles}.")],
  ];
  for (const [level, line] of lines) {
    const muscles = musclesAt(count, level);
    if (muscles.length > 0) {
      parts.push(
        t(line, { muscles: muscleNames(muscles, language, { capital: false }) }),
      );
    }
  }
  return parts.join(" ");
}

/** One side of the body, each muscle by its look: untouched, an outline
 * (1–4 sets), half filled (5–9), filled (10 or more). Never the colour
 * alone: the three looks differ in shape and strength. */
function WeekSide({
  side,
  count,
  height,
}: {
  side: BodySide;
  count: MuscleSets;
  height: number;
}) {
  const scale = height / BODY_BOX.height;
  const place = ([x, y, w, h, r]: Shape) => ({
    left: x * scale,
    top: y * scale,
    width: w * scale,
    height: h * scale,
    borderRadius: r * scale,
  });
  const look = (level: Level) =>
    level === 1
      ? [styles.light, { borderWidth: Math.max(1.5, scale * 1.4) }]
      : level === 2
        ? styles.half
        : styles.full;
  return (
    <View
      style={{ width: BODY_BOX.width * scale, height }}
      testID={`week-body-${side}`}
    >
      {BODY.map((shape, index) => (
        <View
          key={`body-${index}`}
          style={[
            styles.part,
            styles.body,
            { borderWidth: Math.max(1, scale * 0.7) },
            index === 0 && side === "back" && styles.hair,
            place(shape),
          ]}
        />
      ))}
      {MUSCLES.filter((muscle) => MUSCLE_SIDE[muscle] === side).flatMap((muscle) => {
        const level = levelOf(count[muscle]);
        if (level === 0) {
          return [];
        }
        return MUSCLE_ZONES[muscle].map((shape, index) => (
          <View
            key={`${muscle}-${index}`}
            style={[styles.part, look(level), place(shape)]}
            testID={index === 0 ? `week-muscle-${muscle}-${level}` : undefined}
          />
        ));
      })}
    </View>
  );
}

/**
 * The body of the week (TASK-490 part B, ADR-0398), on top of «Today» of
 * the training mode: the front and the back, each muscle by how many sets
 * it had since Monday, and how much of the body that is. The legend says
 * what each look means.
 */
export function WeekBodyCard({
  count,
  language,
  height = 104,
}: {
  count: MuscleSets;
  language: Language;
  height?: number;
}) {
  const percent = percentOf(bodyShare(count));
  return (
    <View
      style={styles.card}
      accessible
      accessibilityRole="image"
      accessibilityLabel={weekBodyLabel(count, language)}
      testID="week-body"
    >
      <Text style={styles.label}>{t("This week")}</Text>
      <View style={styles.row}>
        <View style={styles.bodies}>
          <WeekSide side="front" count={count} height={height} />
          <WeekSide side="back" count={count} height={height} />
        </View>
        <View style={styles.numbers}>
          <Text style={styles.percent} testID="week-body-percent">{`${percent}%`}</Text>
          <Text style={styles.muted}>{t("of your body trained")}</Text>
        </View>
      </View>
      <View style={styles.legend}>
        <Text style={styles.legendText}>{t("Sets")}</Text>
        <Legend mark={styles.none} text="0" />
        <Legend mark={[styles.light, styles.markLine]} text="1–4" />
        <Legend mark={styles.half} text="5–9" />
        <Legend mark={styles.full} text="10+" />
      </View>
    </View>
  );
}

function Legend({ mark, text }: { mark: object; text: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.mark, mark]} />
      <Text style={styles.legendText}>{text}</Text>
    </View>
  );
}

/** The card with the account's own week; nothing without an account, or
 * until the gym calendar has answered. */
export function WeekBody({ fetchFn }: { fetchFn?: typeof fetch }) {
  const count = useWeekBody(fetchFn);
  const language = useLanguage();
  if (count === null) {
    return null;
  }
  return <WeekBodyCard count={count} language={language} />;
}

const MARK = 12;

const styles = StyleSheet.create({
  card: {
    gap: space.sm,
    padding: space.md,
    borderRadius: radius.lg,
    backgroundColor: color.surface,
  },
  label: {
    ...font.label,
    color: color.textMuted,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space.md,
  },
  bodies: {
    flexDirection: "row",
    gap: space.md,
  },
  numbers: {
    flexShrink: 1,
    alignItems: "flex-end",
  },
  percent: {
    color: color.text,
    fontSize: fontSize.title,
    fontWeight: fontWeight.bold,
  },
  muted: {
    color: color.textMuted,
    fontSize: fontSize.small,
    textAlign: "right",
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
  light: {
    borderColor: color.muscle,
  },
  half: {
    backgroundColor: color.muscle,
    opacity: 0.5,
  },
  full: {
    backgroundColor: color.muscle,
  },
  none: {
    backgroundColor: color.surfaceRaised,
  },
  legend: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: space.md,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.xs,
  },
  mark: {
    width: MARK,
    height: MARK,
    borderRadius: MARK / 4,
  },
  markLine: {
    borderWidth: 2,
  },
  legendText: {
    color: color.textMuted,
    fontSize: fontSize.small,
  },
});
