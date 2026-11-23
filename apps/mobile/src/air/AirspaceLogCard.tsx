import { useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { t, tLater } from "../i18n";
import { appLanguage } from "../i18n/language";
import type { Track } from "../navigation/trackRecorder";
import {
  color,
  fontSize,
  fontWeight,
  MIN_TAP_SIZE,
  radius,
  space,
} from "../theme/tokens";
import type { Units } from "../units/units";
import { AIRSPACE_LOADED, loadedDay } from "./AirspaceOptions";
import { type AirWindow, airspaceLog, type LogEntry } from "./airspaceLog";
import { useAirspace } from "./airspaceStore";
import { FL_LINE } from "./airspaceText";
import { distanceText, distanceUnit } from "./flightUnits";

/**
 * The airspace log at the end of a flight (TASK-479 part E3, ADR-0388):
 * one line on the finish card, so «Save» and «Discard» stay on the screen,
 * that opens the times the flight was inside a volume of the pilot's file.
 * Worked out here on the phone; it is never saved to the server nor shown
 * in the Feed. No file loaded: nothing at all. Never a word saying the
 * flight was free of airspace, or legal: only what the file and the track
 * say.
 */

export const INSIDE_COUNT = tLater("Inside your airspaces: {count}");
export const NONE_INSIDE = tLater("No fix inside the volumes of your file.");
export const LOG_LINE = tLater("{from}–{to} · {name} ({class}) · {min} min");
export const DEEPEST_LINE = tLater(
  "Deepest: {dist} from the edge, {height} from floor or ceiling",
);
export const PHONE_ONLY = tLater("Only on your phone: not in the Feed.");

function clock(ms: number): string {
  return new Date(ms).toLocaleTimeString(appLanguage(), {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** One time inside, as its two lines. */
export function logLines(entry: LogEntry, units: Units): [string, string] {
  const minutes = Math.max(1, Math.round((entry.toMs - entry.fromMs) / 60_000));
  const first = t(LOG_LINE, {
    from: clock(entry.fromMs),
    to: clock(entry.toMs),
    name: entry.airspace.name,
    class: entry.airspace.class,
    min: String(minutes),
  });
  const height = entry.limitM === null ? "—" : `${Math.round(entry.limitM)} m`;
  const second = t(DEEPEST_LINE, {
    dist: `${distanceText(entry.edgeM, units)} ${distanceUnit(entry.edgeM, units)}`,
    height,
  });
  return [first, entry.approx ? `${second} ≈` : second];
}

export function AirspaceLogCard({
  track,
  windows,
  units,
}: {
  track: Track;
  /** The parts in the air; null: all of the track. */
  windows: readonly AirWindow[] | null;
  units: Units;
}) {
  const loaded = useAirspace();
  const [open, setOpen] = useState(false);
  const log = useMemo(
    () => (loaded === null ? [] : airspaceLog(track, loaded.airspaces, windows)),
    [loaded, track, windows],
  );
  if (loaded === null) {
    return null;
  }
  const approx = log.some((entry) => entry.approx);
  return (
    <>
      <Pressable
        style={styles.row}
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        testID="airspace-log-row"
      >
        <Text style={styles.label}>{t("Airspace")}</Text>
        <Text style={styles.value} numberOfLines={2}>
          {log.length === 0
            ? t(NONE_INSIDE)
            : t(INSIDE_COUNT, { count: String(log.length) })}{" "}
          ›
        </Text>
      </Pressable>
      <Modal
        visible={open}
        animationType="slide"
        transparent
        onRequestClose={() => setOpen(false)}
      >
        <View style={styles.backdrop}>
          <View style={styles.sheet} testID="airspace-log">
            <Text style={styles.title}>{t("Airspace")}</Text>
            <ScrollView contentContainerStyle={styles.list}>
              {log.length === 0 ? (
                <Text style={styles.entry}>{t(NONE_INSIDE)}</Text>
              ) : (
                log.map((entry, index) => {
                  const [first, second] = logLines(entry, units);
                  return (
                    <View key={index} style={styles.item} testID="airspace-log-entry">
                      <Text style={styles.entry}>{first}</Text>
                      <Text style={styles.muted}>{second}</Text>
                    </View>
                  );
                })
              )}
              {approx ? <Text style={styles.muted}>{t(FL_LINE)}</Text> : null}
              <Text style={styles.muted}>{t(PHONE_ONLY)}</Text>
              <Text style={styles.muted} testID="airspace-log-notice">
                {t(AIRSPACE_LOADED, {
                  file: loaded.fileName,
                  date: loadedDay(loaded.loadedAtMs),
                })}
              </Text>
            </ScrollView>
            <Pressable
              style={styles.button}
              onPress={() => setOpen(false)}
              accessibilityRole="button"
            >
              <Text style={styles.buttonText}>{t("Close")}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: MIN_TAP_SIZE,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: space.md,
    paddingHorizontal: space.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.borderStrong,
    backgroundColor: color.surfaceRaised,
  },
  label: { color: color.textMuted, fontSize: fontSize.body },
  value: {
    flexShrink: 1,
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
    textAlign: "right",
  },
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: color.shadow,
  },
  sheet: {
    maxHeight: "80%",
    gap: space.md,
    padding: space.lg,
    paddingBottom: space.xl,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    backgroundColor: color.surface,
  },
  title: { color: color.text, fontSize: fontSize.title, fontWeight: fontWeight.bold },
  list: { gap: space.md },
  item: { gap: space.xs },
  entry: {
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
  muted: { color: color.textMuted, fontSize: fontSize.small },
  button: {
    minHeight: MIN_TAP_SIZE,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: radius.pill,
    backgroundColor: color.accent,
  },
  buttonText: {
    color: color.onAccent,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
});
