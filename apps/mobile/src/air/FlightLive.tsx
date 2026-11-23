import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { t } from "../i18n";
import { useLiveShare } from "../liveShare/liveShareStore";
import { climbM } from "../navigation/runMetrics";
import { openPause, type Track } from "../navigation/trackRecorder";
import { NO_NUMBER, Tile, TICK_MS, useNow } from "../screens/RunPanel";
import { color, font, radius, space } from "../theme/tokens";
import { paceLabel, runDistanceLabel } from "../units/format";
import { useUnits } from "../units/useUnits";
import { flightNow } from "./flight";
import { flightParts, type PhaseKind, phaseNow } from "./flightParts";
import { FlightPhaseSwitch } from "./FlightPhaseSwitch";
import { FlightScreen, GLOVE_TARGET } from "./FlightScreen";
import { markPhase, usePhaseMarks } from "./phaseMarks";
import { useFlightScreen } from "./useFlightScreen";
import { useAirspaceAlert } from "./useAirspaceAlert";
import { useVarioSound } from "./useVarioSound";

/**
 * A flight as it goes (TASK-305 part R2, ADR-0375), over the numbers of the
 * recording: the altitude, the vario (+ climbing, − sinking), the highest
 * altitude so far and the metres climbed. The time, the distance and the
 * speed are the recording's, under it. In metres, as the ski tour's height;
 * two to a row, as the ski tour's: «Max altitude» is cut short three
 * abreast.
 *
 * A race on foot and in the air (TASK-305 part R6b): over them «On foot |
 * In the air», what the app sees now, and a touch corrects it. On foot the
 * part's distance, its metres climbed, the altitude and the pace.
 *
 * The flight screen (TASK-479 part B1, ADR-0388): it opens by itself at the
 * take-off, over everything; «Flight screen» here opens it again. Its
 * take-off is the start of the last part in the air.
 */

/** "+1.2", "-0.8", "0.0". */
export function varioText(mps: number | null): string {
  if (mps === null) {
    return NO_NUMBER;
  }
  const tenths = Math.round(mps * 10);
  const text = (Math.abs(tenths) / 10).toFixed(1);
  return tenths > 0 ? `+${text}` : tenths < 0 ? `-${text}` : text;
}

function metresText(metres: number | null): string {
  return metres === null ? NO_NUMBER : String(Math.round(metres));
}

export function FlightLive({ track, live }: { track: Track; live: boolean }) {
  const paused = openPause(track) !== null;
  // The vario goes quiet when the fixes stop: the clock ticks to tell.
  const now = useNow(live && !paused, TICK_MS);
  const at = live ? now : (track.fixes[track.fixes.length - 1]?.timeMs ?? 0);
  const flight = flightNow(track, at);
  // Once per fix, not once per second.
  const climbed = useMemo(() => climbM(track), [track]);
  const units = useUnits();
  const flightMs = track.fixes[0]?.timeMs ?? null;
  const marks = usePhaseMarks(flightMs);
  const phase = phaseNow(track, marks);
  const parts = useMemo(() => flightParts(track, marks), [track, marks]);
  const part = parts[parts.length - 1] ?? null;
  const takeoffMs =
    [...parts].reverse().find((one) => one.kind === "air")?.startMs ?? null;
  const flightScreen = useFlightScreen(phase, live);
  // The vario's sound (TASK-479 part C), with the flight screen closed too.
  useVarioSound({ track, nowMs: now, sounding: live && !paused && phase === "air" });
  // The airspace warning's sound (TASK-479 part E2), the same way.
  useAirspaceAlert({ track, nowMs: now, sounding: live && !paused && phase === "air" });
  const sharing = useLiveShare().kind === "sharing";
  const screen = live ? (
    <>
      <Pressable
        accessibilityRole="button"
        onPress={flightScreen.show}
        style={styles.open}
        testID="flight-screen-open"
      >
        <Text style={styles.openText}>{t("Flight screen")}</Text>
      </Pressable>
      {/* Mounted only while open: nothing worked out behind the map. */}
      {flightScreen.open ? (
        <FlightScreen
          visible
          onClose={flightScreen.hide}
          track={track}
          live={live}
          takeoffMs={takeoffMs}
          sharingLive={sharing}
        />
      ) : null}
    </>
  ) : null;
  const correct = (kind: PhaseKind) => {
    if (flightMs !== null) {
      markPhase(flightMs, Date.now(), kind);
    }
  };
  const switcher =
    live && flightMs !== null ? (
      <FlightPhaseSwitch phase={phase} onChange={correct} />
    ) : null;
  if (phase === "foot" && part !== null && part.kind === "foot") {
    return (
      <View style={styles.box} testID="flight-live">
        {switcher}
        {screen}
        <View style={styles.row}>
          <Tile label={t("Distance")} value={runDistanceLabel(part.metres, units)} />
          <Tile label={t("Elev. gain")} value={metresText(part.climbM)} unit="m" />
        </View>
        <View style={styles.row}>
          <Tile label={t("Altitude")} value={metresText(flight.altM)} unit="m" />
          <Tile
            label={t("Avg pace")}
            value={paceLabel(part.metres, part.movingMs, units) ?? NO_NUMBER}
          />
        </View>
      </View>
    );
  }
  return (
    <View style={styles.box} testID="flight-live">
      {switcher}
      {screen}
      <View style={styles.row}>
        <Tile label={t("Altitude")} value={metresText(flight.altM)} unit="m" />
        <Tile label={t("Vario")} value={varioText(flight.varioMps)} unit="m/s" />
      </View>
      <View style={styles.row}>
        <Tile label={t("Max altitude")} value={metresText(flight.maxAltM)} unit="m" />
        <Tile label={t("Elev. gain")} value={metresText(climbed)} unit="m" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    gap: space.sm,
    padding: space.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.borderStrong,
    backgroundColor: color.surfaceRaised,
  },
  row: {
    flexDirection: "row",
    gap: space.sm,
  },
  open: {
    minHeight: GLOVE_TARGET,
    borderRadius: radius.md,
    backgroundColor: color.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  openText: {
    ...font.cardTitle,
    color: color.onAccent,
  },
});
