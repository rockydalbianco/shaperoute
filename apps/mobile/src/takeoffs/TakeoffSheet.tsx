import type {
  CompassPoint,
  FlyingHistory,
  FlyingRecord,
  FlyingSite,
  FlyingSiteDetail,
} from "@shaperoute/shared-types";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { fetchFlyingHistory, fetchFlyingSite } from "../api/flyingSites";
import { t } from "../i18n";
import type { Language } from "../i18n/languages";
import { useLanguage } from "../i18n/useLanguage";
import { openLiveView } from "../liveShare/liveViewDoor";
import { durationText } from "../route/runTime";
import { altitudeLabel } from "../ski/ResortWeather";
import { useDrawingsDoor } from "../social/drawingsDoor";
import { color, fontSize, fontWeight, MIN_TAP_SIZE, space } from "../theme/tokens";
import { nearDistanceLabel } from "../units/format";
import type { Units } from "../units/units";
import { useUnits } from "../units/useUnits";

/**
 * The card of a takeoff or a landing on the map of takeoffs (TASK-493 part
 * C, ADR-0400): its name, altitude and the way it faces, from
 * OpenStreetMap; the landings near a takeoff (the takeoffs above a landing)
 * with how far and how much lower; for a takeoff, the flights of MuW from
 * it (part B): month by month, today, who is in the air now, and the
 * records of the flights posted for everyone. Only facts: nothing says
 * whether one may fly.
 */

type Props = {
  siteId: number;
  baseUrl: string;
  /** Leaves the map: a record or a live flight opened from the card. */
  onClose: () => void;
  /** Closes the card only, back to the map. */
  onDismiss?: () => void;
  fetchFn?: typeof fetch;
};

type Loaded =
  | { kind: "loading" }
  | { kind: "failed" }
  | { kind: "ok"; detail: FlyingSiteDetail; history: FlyingHistory | null };

/** The compass points in each language's letters: W is O(uest/ovest) in
 * Italian, French and Spanish, E is O(st) in German. */
export function compassLabel(point: CompassPoint, language: Language): string {
  if (language === "it" || language === "fr" || language === "es") {
    return point.replace(/W/g, "O");
  }
  if (language === "de") {
    return point.replace(/E/g, "O");
  }
  return point;
}

export function siteName(site: FlyingSite): string {
  if (site.name !== null) {
    return site.name;
  }
  return site.kind === "takeoff" ? t("Unnamed takeoff") : t("Unnamed landing");
}

/** "2.7 km away · 800 m lower": the drop only when both altitudes are known. */
export function nearLine(from: FlyingSite, other: FlyingSite, units: Units): string {
  const distance = nearDistanceLabel(other.away_m ?? 0, units);
  if (from.ele_m === null || other.ele_m === null) {
    return distance;
  }
  const drop = Math.abs(from.ele_m - other.ele_m);
  return t("{distance} away · {drop} lower", {
    distance,
    drop: altitudeLabel(drop, units),
  });
}

/** A month's flights as a share of the busiest month, 0 to 1. */
export function barShares(months: readonly { flights: number }[]): number[] {
  const most = Math.max(0, ...months.map((m) => m.flights));
  return months.map((m) => (most === 0 ? 0 : m.flights / most));
}

export function TakeoffSheet({ siteId, baseUrl, onClose, onDismiss, fetchFn }: Props) {
  const language = useLanguage();
  const units = useUnits();
  const drawings = useDrawingsDoor();
  const [asked, setAsked] = useState(0);
  // What came back, for the site and the attempt it was asked for: another
  // one asked shows «loading» until its own answer comes.
  const [shown, setShown] = useState<{ key: string; loaded: Loaded } | null>(null);
  const key = `${siteId}-${asked}`;
  const loaded: Loaded = shown?.key === key ? shown.loaded : { kind: "loading" };

  useEffect(() => {
    let alive = true;
    (async () => {
      const detail = await fetchFlyingSite(baseUrl, siteId, { fetchFn });
      if (detail.kind !== "ok") {
        if (alive) setShown({ key, loaded: { kind: "failed" } });
        return;
      }
      let history: FlyingHistory | null = null;
      if (detail.value.site.kind === "takeoff") {
        const answer = await fetchFlyingHistory(baseUrl, siteId, { fetchFn });
        history = answer.kind === "ok" ? answer.value : null;
      }
      if (alive)
        setShown({ key, loaded: { kind: "ok", detail: detail.value, history } });
    })();
    return () => {
      alive = false;
    };
  }, [baseUrl, siteId, fetchFn, key]);

  if (loaded.kind === "loading") {
    return <View style={styles.sheet} testID="takeoff-sheet-loading" />;
  }
  if (loaded.kind === "failed") {
    return (
      <View style={styles.sheet} testID="takeoff-sheet">
        <Text style={styles.muted}>{t("The takeoffs could not be loaded.")}</Text>
        <Pressable
          style={styles.button}
          onPress={() => setAsked((n) => n + 1)}
          accessibilityRole="button"
          testID="takeoff-retry"
        >
          <Text style={styles.buttonText}>{t("Try again")}</Text>
        </Pressable>
      </View>
    );
  }

  const { site, near } = loaded.detail;
  const history = loaded.history;
  const record = (label: string, best: FlyingRecord | null, value: string) =>
    best === null ? null : (
      <Pressable
        key={label}
        style={styles.row}
        onPress={() => {
          onClose();
          drawings.open({ id: best.drawing_id });
        }}
        accessibilityRole="button"
        testID={`takeoff-record-${label}`}
      >
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>
          {value} · @{best.username}
        </Text>
      </Pressable>
    );

  return (
    <ScrollView
      style={styles.sheet}
      contentContainerStyle={styles.body}
      testID="takeoff-sheet"
    >
      <View style={styles.header}>
        <Text style={styles.title} accessibilityRole="header">
          {siteName(site)}
        </Text>
        {onDismiss && (
          <Pressable
            style={styles.dismiss}
            onPress={onDismiss}
            accessibilityRole="button"
            accessibilityLabel={t("Close")}
            testID="takeoff-dismiss"
          >
            <Text style={styles.value}>✕</Text>
          </Pressable>
        )}
      </View>
      <Text style={styles.muted}>
        {[
          site.kind === "takeoff" ? t("Takeoff") : t("Landing"),
          site.ele_m === null ? null : altitudeLabel(site.ele_m, units),
          site.official === true ? t("Official site") : null,
        ]
          .filter((part) => part !== null)
          .join(" · ")}
      </Text>
      {site.orientation.length > 0 && (
        <Text style={styles.value} testID="takeoff-faces">
          {t("Faces")}{" "}
          {site.orientation.map((p) => compassLabel(p, language)).join(", ")}
        </Text>
      )}

      <Text style={styles.heading}>
        {site.kind === "takeoff" ? t("Landings nearby") : t("Takeoffs above")}
      </Text>
      {near.length === 0 ? (
        <Text style={styles.muted}>
          {t("No landing within 15 km on OpenStreetMap.")}
        </Text>
      ) : (
        near.map((other) => (
          <View key={other.id} style={styles.row} testID={`takeoff-near-${other.id}`}>
            <Text style={styles.label}>{siteName(other)}</Text>
            <Text style={styles.value}>{nearLine(site, other, units)}</Text>
          </View>
        ))
      )}

      {history !== null && (
        <View style={styles.block} testID="takeoff-history">
          <Text style={styles.heading}>{t("Flights from here")}</Text>
          {history.few || history.months === null ? (
            <Text style={styles.muted}>{t("Few flights from here yet.")}</Text>
          ) : (
            <>
              <Text style={styles.value}>
                {t("{flights} flights by {pilots} pilots", {
                  flights: history.flights ?? 0,
                  pilots: history.pilots ?? 0,
                })}
              </Text>
              <Text style={styles.value}>
                {t("Today: {count}", { count: history.today ?? 0 })}
              </Text>
              <Text style={styles.muted}>{t("Last 12 months")}</Text>
              <View style={styles.bars} testID="takeoff-months">
                {barShares(history.months).map((share, i) => (
                  <View
                    key={history.months![i].month}
                    style={[styles.bar, { height: 4 + share * 44 }]}
                  />
                ))}
              </View>
            </>
          )}
          {history.in_air_now.count > 0 && (
            <View style={styles.block}>
              <Text style={styles.value} testID="takeoff-in-air">
                {t("In the air now: {count}", { count: history.in_air_now.count })}
              </Text>
              {history.in_air_now.shares.map((share) => (
                <Pressable
                  key={share}
                  style={styles.button}
                  onPress={() => {
                    onClose();
                    openLiveView(share);
                  }}
                  accessibilityRole="button"
                  testID={`takeoff-live-${share}`}
                >
                  <Text style={styles.buttonText}>{t("Watch live")}</Text>
                </Pressable>
              ))}
            </View>
          )}
          {(history.records.longest_s ||
            history.records.highest_m ||
            history.records.farthest_m) && (
            <View style={styles.block}>
              <Text style={styles.heading}>{t("Records")}</Text>
              {record(
                t("Longest flight"),
                history.records.longest_s,
                durationText(history.records.longest_s?.value ?? 0),
              )}
              {record(
                t("Highest"),
                history.records.highest_m,
                altitudeLabel(history.records.highest_m?.value ?? 0, units),
              )}
              {record(
                t("Farthest"),
                history.records.farthest_m,
                nearDistanceLabel(history.records.farthest_m?.value ?? 0, units),
              )}
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  sheet: {
    flexGrow: 0,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space.md,
  },
  dismiss: {
    width: MIN_TAP_SIZE,
    height: MIN_TAP_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  body: {
    gap: space.sm,
    padding: space.lg,
  },
  block: {
    gap: space.sm,
  },
  title: {
    color: color.text,
    fontSize: fontSize.heading,
    fontWeight: fontWeight.bold,
  },
  heading: {
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold,
    marginTop: space.sm,
  },
  label: {
    color: color.text,
    fontSize: fontSize.body,
    flexShrink: 1,
  },
  value: {
    color: color.text,
    fontSize: fontSize.body,
  },
  muted: {
    color: color.textMuted,
    fontSize: fontSize.body,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: space.md,
    minHeight: MIN_TAP_SIZE,
    alignItems: "center",
  },
  bars: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 4,
    height: 48,
  },
  bar: {
    flex: 1,
    backgroundColor: color.textMuted,
    borderRadius: 2,
  },
  button: {
    minHeight: MIN_TAP_SIZE,
    justifyContent: "center",
  },
  buttonText: {
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold,
  },
});
