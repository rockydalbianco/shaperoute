import type { Drawing, SkiDayPart } from "@shaperoute/shared-types";
import { useEffect, useMemo, useState } from "react";
import {
  BackHandler,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { dayLabel } from "../activities/activityText";
import type { SnowPart } from "../activities/snowDay";
import { partsOf } from "../api/skiSeason";
import { t } from "../i18n";
import { durationText } from "../route/runTime";
import { Tile } from "../screens/RunPanel";
import { speedOf } from "../screens/SnowFinishCard";
import { SkiDayLine } from "../ski/SkiDayLine";
import { useDrawingsDoor } from "../social/drawingsDoor";
import { SkiNamesList } from "../social/SkiNamesList";
import {
  color,
  font,
  fontSize,
  fontWeight,
  MIN_TAP_SIZE,
  space,
} from "../theme/tokens";
import { runDistanceLabel } from "../units/format";
import { speedUnit } from "../units/runFormat";
import { useUnits } from "../units/useUnits";
import { type SkiDaySection, SkiDaySections } from "./SkiDaySections";
import { partName } from "./skiDayLabels";
import { SkiRuns } from "./SkiRuns";

/** A saved part as «Runs» reads a part: its times on the clock of the day's
 * start, its fixes on the post's track. */
export function snowPartOf(part: SkiDayPart, startedAt: string): SnowPart {
  const start = Date.parse(startedAt);
  const at = (seconds: number | null) =>
    Number.isNaN(start) ? 0 : start + (seconds ?? 0) * 1000;
  return {
    kind: part.kind,
    n: part.n,
    leg: { from: part.from_fix ?? 0, to: part.to_fix ?? 0 },
    startMs: at(part.start_s),
    endMs: at(part.end_s ?? part.start_s),
    ms: part.moving_s * 1000,
    metres: part.metres,
    heightM: part.height_m,
    topMps: part.top_mps,
  };
}

/** The sums of a day's parts, as the end of the day counts them. */
export function sumsOf(parts: readonly SkiDayPart[]) {
  const descents = parts.filter((part) => part.kind === "descent");
  const tops = descents.flatMap((part) =>
    part.top_mps === null ? [] : [part.top_mps],
  );
  return {
    skiedM: descents.reduce((sum, part) => sum + part.metres, 0),
    verticalM: descents.reduce((sum, part) => sum + part.height_m, 0),
    descents: descents.length,
    lifts: parts.length - descents.length,
    topMps: tops.length === 0 ? null : Math.max(...tops),
  };
}

type Props = {
  day: Drawing;
  onBack: () => void;
};

/**
 * A saved day of skiing, opened from «Days» (TASK-429 part C, ADR-0357):
 * «Summary · Map · Runs» as at the end of the day, from the parts the phone
 * sent with it and the server named (GET /drawings/{id}/ski-day). «Summary»:
 * the numbers, the resort, snow and gear, the lifts and pistes taken; «Map»:
 * the day on the map, as its post opens; «Runs»: each lift and descent with
 * its name. A day saved before the parts has its kilometres and time only.
 */
export function SkiDayPage({ day, onBack }: Props) {
  const insets = useSafeAreaInsets();
  const units = useUnits();
  const { skiDayOf, open } = useDrawingsDoor();
  const [section, setSection] = useState<SkiDaySection>("summary");
  const [parts, setParts] = useState<SkiDayPart[] | null>(null);
  useEffect(() => {
    if (skiDayOf === undefined) {
      return;
    }
    let live = true;
    void skiDayOf(day.id).then((answer) => {
      if (live) {
        setParts(partsOf(answer));
      }
    });
    return () => {
      live = false;
    };
  }, [day.id, skiDayOf]);
  useEffect(() => {
    const listener = BackHandler.addEventListener("hardwareBackPress", () => {
      onBack();
      return true;
    });
    return () => listener.remove();
  }, [onBack]);

  const snowParts = useMemo(
    () => (parts ?? []).map((part) => snowPartOf(part, day.started_at)),
    [day.started_at, parts],
  );
  const names = useMemo(
    () =>
      new Map(
        (parts ?? []).map(
          (part) => [partName(part), part.name] as [string, string | null],
        ),
      ),
    [parts],
  );
  const speed = speedUnit(units);
  const sums = parts !== null && parts.length > 0 ? sumsOf(parts) : null;
  const title =
    day.place === null
      ? dayLabel(day.started_at)
      : `${dayLabel(day.started_at)} · ${day.place}`;

  function choose(next: SkiDaySection) {
    if (next === "map") {
      // The day on the map, as its post opens: «←» comes back here.
      open(day);
      return;
    }
    setSection(next);
  }

  return (
    <View style={[styles.page, { paddingTop: insets.top }]} testID="ski-day-page">
      <Pressable
        style={styles.back}
        onPress={onBack}
        accessibilityRole="button"
        testID="ski-day-back"
      >
        <Text style={styles.backText}>{`‹ ${t("Back")}`}</Text>
      </Pressable>
      <ScrollView
        contentContainerStyle={[
          styles.body,
          { paddingBottom: insets.bottom + space.xl },
        ]}
      >
        <Text style={styles.title} accessibilityRole="header">
          {title}
        </Text>
        <SkiDaySections section={section} onSection={choose} />
        {section === "runs" ? (
          <SkiRuns
            parts={snowParts}
            speedText={(mps) => `${speedOf(mps, units)} ${speed}`}
            nameOf={(part) => names.get(partName(part)) ?? null}
          />
        ) : (
          <>
            {sums === null ? (
              <View style={styles.tiles}>
                <Tile
                  label={t("Distance")}
                  value={runDistanceLabel(day.distance_m, units)}
                />
                <Tile label={t("Time")} value={durationText(day.duration_s)} />
              </View>
            ) : (
              <>
                <Text
                  style={styles.total}
                  accessibilityLabel={t("Skied: {distance}", {
                    distance: runDistanceLabel(sums.skiedM, units),
                  })}
                >
                  {runDistanceLabel(sums.skiedM, units)}
                </Text>
                <View style={styles.tiles}>
                  <Tile label={t("Descents")} value={String(sums.descents)} />
                  <Tile
                    label={t("Vertical")}
                    value={String(Math.round(sums.verticalM))}
                    unit="m"
                  />
                  <Tile
                    label={t("Top speed")}
                    value={speedOf(sums.topMps, units)}
                    unit={speed}
                  />
                </View>
                <View style={styles.tiles}>
                  <Tile label={t("Lifts")} value={String(sums.lifts)} />
                  <Tile label={t("Time")} value={durationText(day.duration_s)} />
                  <Tile
                    label={t("Total")}
                    value={runDistanceLabel(day.distance_m, units)}
                  />
                </View>
              </>
            )}
            <SkiDayLine drawingId={day.id} />
            <SkiNamesList drawingId={day.id} />
          </>
        )}
      </ScrollView>
    </View>
  );
}

// As the page of a resort (`../ski/ResortPage`): over the page it was
// opened from, «Back» at the top left.
const styles = StyleSheet.create({
  page: {
    ...StyleSheet.absoluteFill,
    backgroundColor: color.background,
  },
  back: {
    minHeight: MIN_TAP_SIZE,
    justifyContent: "center",
    paddingHorizontal: space.lg,
    alignSelf: "flex-start",
  },
  backText: {
    ...font.body,
    color: color.text,
  },
  body: {
    gap: space.md,
    paddingHorizontal: space.lg,
  },
  title: {
    ...font.heading,
    color: color.text,
  },
  total: {
    color: color.text,
    fontSize: fontSize.display,
    fontWeight: fontWeight.bold,
  },
  tiles: {
    flexDirection: "row",
    gap: space.sm,
  },
});
