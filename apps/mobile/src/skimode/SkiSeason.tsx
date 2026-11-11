import type { SkiSeason as Season } from "@shaperoute/shared-types";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { seasonOf } from "../api/skiSeason";
import { t } from "../i18n";
import { durationText } from "../route/runTime";
import { Tile } from "../screens/RunPanel";
import { speedOf } from "../screens/SnowFinishCard";
import { useDrawingsDoor } from "../social/drawingsDoor";
import { color, font, fontWeight, radius, space } from "../theme/tokens";
import { inUnits } from "../units/format";
import { speedUnit } from "../units/runFormat";
import { useUnits } from "../units/useUnits";

type Props = {
  /** Today, on the phone's clock: the tests give theirs. */
  today?: Date;
};

/**
 * The season at the top of «Days» (TASK-429 part C, ADR-0357): the metres
 * skied down in large, then the days, the kilometres of the descents, the
 * descents, the lifts, the top speed and the time on the move, from the
 * parts the phone sent with each day (GET /me/ski-season). A day saved
 * before them counts as a day only. Nothing until the API has answered, and
 * nothing in a season without a day.
 */
export function SkiSeason({ today = new Date() }: Props) {
  const { skiSeasonOf } = useDrawingsDoor();
  const units = useUnits();
  const { from, to, years } = seasonOf(today);
  const [season, setSeason] = useState<Season | null>(null);
  useEffect(() => {
    if (skiSeasonOf === undefined) {
      return;
    }
    let live = true;
    void skiSeasonOf(from, to).then((answer) => {
      if (live) {
        setSeason(answer);
      }
    });
    return () => {
      live = false;
    };
  }, [from, skiSeasonOf, to]);
  if (season === null || season.days === 0) {
    return null;
  }
  return (
    <View style={styles.card} testID="ski-season">
      <Text style={styles.title} accessibilityRole="header">
        {t("Season {years}", { years })}
      </Text>
      <View style={styles.hero} accessible>
        <Text style={styles.big}>{Math.round(season.vertical_m).toLocaleString()}</Text>
        <Text style={styles.heroLabel}>{`m · ${t("Vertical this season")}`}</Text>
      </View>
      <View style={styles.tiles}>
        <Tile label={t("Days@@ski")} value={String(season.days)} />
        <Tile
          label={t("Distance")}
          value={String(Math.round(inUnits(season.skied_m, units)))}
          unit={units}
        />
        <Tile label={t("Descents")} value={String(season.descents)} />
      </View>
      <View style={styles.tiles}>
        <Tile label={t("Lifts")} value={String(season.lifts)} />
        <Tile
          label={t("Top speed")}
          value={speedOf(season.top_mps, units)}
          unit={speedUnit(units)}
        />
        <Tile label={t("On snow")} value={durationText(season.moving_s)} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: space.md,
    padding: space.lg,
    borderRadius: radius.lg,
    backgroundColor: color.surface,
  },
  title: {
    ...font.label,
    color: color.textMuted,
  },
  hero: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: space.sm,
  },
  big: {
    ...font.display,
    fontWeight: fontWeight.bold,
    color: color.text,
  },
  heroLabel: {
    ...font.body,
    flexShrink: 1,
    color: color.textMuted,
  },
  tiles: {
    flexDirection: "row",
    gap: space.sm,
  },
});
