import { type ReactNode, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { t, tLater } from "../i18n";
import { appLanguage } from "../i18n/language";
import type { Palette } from "../theme/tokens";
import { airspacePickerAvailable } from "./airspaceFile";
import { loadedDay } from "./AirspaceOptions";
import { pickTask, pickWaypoints } from "./waypointFile";
import { setTask, setWaypoints, useTask, useWaypoints } from "./waypointStore";

/**
 * The pilot's waypoints and task among the flight screen's options
 * (TASK-479 part D1, ADR-0388): load each from «Files», take it away, and
 * what was read: how many waypoints and landings, the lines not read; the
 * task's turnpoints and its first start. Always the file's name and day.
 * The task is flown in part D2.
 */

export const WAYPOINTS_COUNT = tLater("Waypoints: {count} · Landings: {landings}");
export const TASK_COUNT = tLater("Turnpoints: {count}");
export const FIRST_START = tLater("First start: {time}");
export const FILE_LINE = tLater("{file} · loaded {date}");
export const NO_WAYPOINTS = tLater("This file has no waypoint MuW can read.");
export const NOT_A_TASK = tLater("This file is not a task MuW can read.");

type Chip = (key: string, label: string, on: boolean, onPress: () => void) => ReactNode;
type Row = (title: string, chips: ReactNode) => ReactNode;

/** A gate «HH:MM:SSZ» (UTC) as the phone's time of day on `dayMs`. */
export function gateTime(gate: string, dayMs: number): string | null {
  const match = /^(\d{1,2}):(\d{2})(?::(\d{2}))?Z?$/.exec(gate.trim());
  if (match === null) {
    return null;
  }
  const day = new Date(dayMs);
  const at = Date.UTC(
    day.getUTCFullYear(),
    day.getUTCMonth(),
    day.getUTCDate(),
    Number(match[1]),
    Number(match[2]),
    Number(match[3] ?? 0),
  );
  return new Date(at).toLocaleTimeString(appLanguage(), {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function WaypointOptions({
  chip,
  row,
  palette,
  nowMs = Date.now(),
}: {
  chip: Chip;
  row: Row;
  palette: Palette;
  nowMs?: number;
}) {
  const waypoints = useWaypoints();
  const task = useTask();
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const unreadable = () => t("MuW could not read this file.");
  const loadWaypoints = async () => {
    setBusy(true);
    setNote(null);
    const picked = await pickWaypoints();
    setBusy(false);
    if ("loaded" in picked) {
      if (!setWaypoints(picked.loaded)) {
        setNote(unreadable());
      }
    } else if ("error" in picked) {
      setNote(picked.error === "empty" ? t(NO_WAYPOINTS) : unreadable());
    }
  };
  const loadTask = async () => {
    setBusy(true);
    setNote(null);
    const picked = await pickTask();
    setBusy(false);
    if ("loaded" in picked) {
      if (!setTask(picked.loaded)) {
        setNote(unreadable());
      }
    } else if ("error" in picked) {
      setNote(picked.error === "notTask" ? t(NOT_A_TASK) : unreadable());
    }
  };
  const picker = airspacePickerAvailable();
  const muted = [styles.line, { color: palette.textMuted }];
  const text = [styles.line, { color: palette.text }];
  const firstGate = task?.task.start?.gates[0];
  const firstStart = firstGate === undefined ? null : gateTime(firstGate, nowMs);
  return (
    <View style={styles.box} testID="waypoint-options">
      {row(
        t("Waypoints"),
        <>
          {picker
            ? chip("load-waypoints", t("Load file"), false, () => {
                if (!busy) {
                  void loadWaypoints();
                }
              })
            : null}
          {waypoints !== null
            ? chip("remove-waypoints", t("Remove"), false, () => {
                setNote(null);
                setWaypoints(null);
              })
            : null}
        </>,
      )}
      {waypoints !== null ? (
        <>
          <Text style={text}>
            {t(WAYPOINTS_COUNT, {
              count: String(waypoints.waypoints.length),
              landings: String(waypoints.waypoints.filter((one) => one.landing).length),
            })}
            {waypoints.unread > 0
              ? ` · ${t("Lines not read: {n}", { n: String(waypoints.unread) })}`
              : ""}
          </Text>
          <Text style={muted} testID="waypoints-file">
            {t(FILE_LINE, {
              file: waypoints.fileName,
              date: loadedDay(waypoints.loadedAtMs),
            })}
          </Text>
        </>
      ) : null}
      {row(
        t("Task"),
        <>
          {picker
            ? chip("load-task", t("Load file"), false, () => {
                if (!busy) {
                  void loadTask();
                }
              })
            : null}
          {task !== null
            ? chip("remove-task", t("Remove"), false, () => {
                setNote(null);
                setTask(null);
              })
            : null}
        </>,
      )}
      {task !== null ? (
        <>
          <Text style={text}>
            {t(TASK_COUNT, { count: String(task.task.turnpoints.length) })}
            {firstStart !== null ? ` · ${t(FIRST_START, { time: firstStart })}` : ""}
          </Text>
          <Text style={muted} testID="task-file">
            {t(FILE_LINE, { file: task.fileName, date: loadedDay(task.loadedAtMs) })}
          </Text>
        </>
      ) : null}
      {note !== null ? (
        <Text style={text} testID="waypoint-note">
          {note}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { gap: 8 },
  line: { fontSize: 14 },
});
