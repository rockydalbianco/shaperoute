import type { SkiDay } from "@shaperoute/shared-types";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { t } from "../i18n";
import { useDrawingsDoor } from "../social/drawingsDoor";
import { color, font, fontWeight, space } from "../theme/tokens";
import { SNOW_LABELS } from "./DayChoices";

type Props = {
  /** The post of a day of skiing. */
  drawingId: string;
};

/**
 * «Resort», «Snow» and «Gear» on the post of a day of skiing (TASK-406 part
 * D2, ADR-0338), for whoever can see the post (the privacy line approved on
 * 2026-11-08). Only what the skier gave: nothing while they come, for a day
 * without them, or when the API does not give them.
 */
export function SkiDayLine({ drawingId }: Props) {
  const { skiDayOf } = useDrawingsDoor();
  const [day, setDay] = useState<{ id: string; day: SkiDay } | null>(null);
  useEffect(() => {
    if (skiDayOf === undefined) {
      return;
    }
    let live = true;
    void skiDayOf(drawingId).then((found) => {
      if (live && found !== null) {
        setDay({ id: drawingId, day: found });
      }
    });
    return () => {
      live = false;
    };
  }, [drawingId, skiDayOf]);
  const shown = day !== null && day.id === drawingId ? day.day : null;
  if (shown === null) {
    return null;
  }
  const rows: { label: string; value: string }[] = [
    ...(shown.resort !== null
      ? [{ label: t("Resort"), value: shown.resort.name }]
      : []),
    ...(shown.snow !== null
      ? [{ label: t("Snow"), value: t(SNOW_LABELS[shown.snow]) }]
      : []),
    ...(shown.gear !== null ? [{ label: t("Gear"), value: shown.gear }] : []),
  ];
  if (rows.length === 0) {
    return null;
  }
  return (
    <View style={styles.rows} testID="ski-day">
      {rows.map((row) => (
        <View
          key={row.label}
          style={styles.row}
          accessible
          accessibilityLabel={`${row.label}: ${row.value}`}
        >
          <Text style={styles.label}>{row.label}</Text>
          <Text style={styles.value}>{row.value}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  rows: {
    gap: space.xs,
  },
  row: {
    flexDirection: "row",
    gap: space.sm,
  },
  label: {
    ...font.small,
    fontWeight: fontWeight.semibold,
    color: color.textMuted,
  },
  value: {
    ...font.small,
    flex: 1,
    color: color.text,
  },
});
