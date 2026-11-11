import { StyleSheet, Text, View } from "react-native";

import type { SnowPart } from "../activities/snowDay";
import { t } from "../i18n";
import { durationText } from "../route/runTime";
import { color, font, fontWeight, radius, space } from "../theme/tokens";
import { Hairline } from "../ui/Hairline";
import { partName } from "./skiDayLabels";

/** A stop between two parts this long is a line of its own. */
export const STOP_MS = 10 * 60_000;

/** "09:12": a moment on the phone's clock. */
export function clockOf(ms: number): string {
  const when = new Date(ms);
  return `${String(when.getHours()).padStart(2, "0")}:${String(
    when.getMinutes(),
  ).padStart(2, "0")}`;
}

/** A row of «Runs»: a part of the day, or a long stop between two. */
export type RunsRow =
  { kind: "part"; part: SnowPart } | { kind: "stop"; minutes: number; key: string };

/** The rows of `parts`, with a line for each stop of STOP_MS or more. */
export function runsRows(parts: readonly SnowPart[]): RunsRow[] {
  return parts.flatMap((part, at): RunsRow[] => {
    const before = parts[at - 1];
    const stopped = before === undefined ? 0 : part.startMs - before.endMs;
    const row: RunsRow = { kind: "part", part };
    return stopped >= STOP_MS
      ? [
          { kind: "stop", minutes: Math.round(stopped / 60_000), key: `stop-${at}` },
          row,
        ]
      : [row];
  });
}

type Props = {
  parts: readonly SnowPart[];
  /** A speed in metres a second as the end of the day writes it, with its
   * unit: "68.4 km/h". */
  speedText: (mps: number) => string;
  /** The name of a part's lift or piste, for a saved day whose names the
   * server found (TASK-429 part C); null when it has none. Without it, as
   * at the end of the day, the parts have no names. */
  nameOf?: (part: SnowPart) => string | null;
};

/**
 * «Runs», the day one part at a time (TASK-429 part B, ADR-0357): each lift
 * and each descent with its number, as on the map, when it began, how long
 * it took, the metres up or down, and a descent's top speed; a long stop as
 * a line between. A saved day's parts have the names of their lifts and
 * pistes (part C, `nameOf`).
 */
export function SkiRuns({ parts, speedText, nameOf }: Props) {
  return (
    <View style={styles.list} testID="ski-runs">
      {runsRows(parts).map((row, at) => (
        <View key={row.kind === "stop" ? row.key : partName(row.part)}>
          {at > 0 && <Hairline />}
          {row.kind === "stop" ? (
            <Text style={styles.stop}>
              {t("Stopped {minutes} min", { minutes: row.minutes })}
            </Text>
          ) : (
            <PartRow part={row.part} speedText={speedText} nameOf={nameOf} />
          )}
        </View>
      ))}
    </View>
  );
}

function PartRow({
  part,
  speedText,
  nameOf,
}: {
  part: SnowPart;
  speedText: (mps: number) => string;
  nameOf?: (part: SnowPart) => string | null;
}) {
  const lift = part.kind === "lift";
  const name = nameOf?.(part) ?? null;
  // A lift says what it is; a descent of a saved day says its piste, or
  // that it had none; at the end of the day a descent is its time.
  const title = lift
    ? (name ?? t("Lift"))
    : nameOf === undefined
      ? null
      : (name ?? t("Piste without a name"));
  const when = `${clockOf(part.startMs)} · ${durationText(part.ms / 1000)}`;
  const height = `${lift ? "+" : "−"}${Math.round(part.heightM)} m`;
  return (
    <View style={styles.row} accessible testID={`ski-run-${partName(part)}`}>
      <View
        style={[
          styles.badge,
          { backgroundColor: lift ? color.ski.lift : color.ski.descent },
        ]}
      >
        <Text style={styles.badgeText}>{partName(part)}</Text>
      </View>
      <View style={styles.words}>
        {title !== null && <Text style={styles.name}>{title}</Text>}
        <Text style={title !== null ? styles.detail : styles.name}>{when}</Text>
      </View>
      <View style={styles.numbers}>
        <Text style={styles.height}>{height}</Text>
        {!lift && part.topMps !== null && (
          <Text style={styles.detail}>
            {t("{speed} top", { speed: speedText(part.topMps) })}
          </Text>
        )}
      </View>
    </View>
  );
}

/** The badge of a part: a pill, as the dot of its number on the map. */
const BADGE_HEIGHT = 22;

const styles = StyleSheet.create({
  list: {
    borderRadius: radius.lg,
    backgroundColor: color.surface,
    paddingHorizontal: space.md,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    paddingVertical: space.sm,
  },
  badge: {
    minWidth: BADGE_HEIGHT + space.xs,
    height: BADGE_HEIGHT,
    paddingHorizontal: space.xs,
    borderRadius: BADGE_HEIGHT / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    ...font.detail,
    fontWeight: fontWeight.bold,
    color: color.ski.onLine,
  },
  words: {
    flex: 1,
    gap: space.xs / 2,
  },
  name: {
    ...font.body,
    color: color.text,
  },
  detail: {
    ...font.small,
    color: color.textMuted,
  },
  numbers: {
    alignItems: "flex-end",
    gap: space.xs / 2,
  },
  height: {
    ...font.body,
    fontWeight: fontWeight.semibold,
    color: color.text,
  },
  stop: {
    ...font.small,
    color: color.textMuted,
    paddingVertical: space.sm,
  },
});
