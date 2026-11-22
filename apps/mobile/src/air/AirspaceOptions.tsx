import { type ReactNode, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { t, tLater } from "../i18n";
import { appLanguage } from "../i18n/language";
import type { Palette } from "../theme/tokens";
import { airspacePickerAvailable, pickAirspace } from "./airspaceFile";
import { setAirspace, useAirspace } from "./airspaceStore";

/**
 * The pilot's airspace file among the flight screen's options (TASK-479
 * part E1, ADR-0388): load one from «Files», take it away, and always the
 * words the user approved on 2026-11-21 (notices 3 and 4): MuW includes no
 * airspace; what is loaded is the pilot's, with its name and day.
 */

export const NO_AIRSPACE = tLater(
  "No airspace loaded. MuW does not include airspace data.",
);
export const AIRSPACE_LOADED = tLater(
  "Data loaded by you: check the AIP and NOTAMs before you fly. · {file} · loaded {date}",
);

type Chip = (key: string, label: string, on: boolean, onPress: () => void) => ReactNode;
type Row = (title: string, chips: ReactNode) => ReactNode;

/** The day a file was loaded, in the app's language. */
export function loadedDay(ms: number): string {
  return new Date(ms).toLocaleDateString(appLanguage(), {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function AirspaceOptions({
  chip,
  row,
  palette,
}: {
  chip: Chip;
  row: Row;
  palette: Palette;
}) {
  const loaded = useAirspace();
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const load = async () => {
    setBusy(true);
    setNote(null);
    const picked = await pickAirspace();
    setBusy(false);
    if ("loaded" in picked) {
      if (!setAirspace(picked.loaded)) {
        setNote(t("MuW could not read this file."));
      }
    } else if ("error" in picked) {
      setNote(
        picked.error === "empty"
          ? t("This file has no airspace MuW can read.")
          : t("MuW could not read this file."),
      );
    }
  };
  const muted = [styles.line, { color: palette.textMuted }];
  return (
    <View style={styles.box} testID="airspace-options">
      {row(
        t("Airspace"),
        <>
          {airspacePickerAvailable()
            ? chip("load", t("Load file"), false, () => {
                if (!busy) {
                  void load();
                }
              })
            : null}
          {loaded !== null
            ? chip("remove", t("Remove"), false, () => {
                setNote(null);
                setAirspace(null);
              })
            : null}
        </>,
      )}
      {loaded === null ? (
        <Text style={muted}>{t(NO_AIRSPACE)}</Text>
      ) : (
        <>
          <Text style={[styles.line, { color: palette.text }]}>
            {t("Airspaces: {count}", { count: String(loaded.airspaces.length) })}
            {loaded.unread > 0
              ? ` · ${t("Lines not read: {n}", { n: String(loaded.unread) })}`
              : ""}
          </Text>
          <Text style={muted} testID="airspace-loaded">
            {t(AIRSPACE_LOADED, {
              file: loaded.fileName,
              date: loadedDay(loaded.loadedAtMs),
            })}
          </Text>
        </>
      )}
      {note !== null ? (
        <Text style={[styles.line, { color: palette.text }]} testID="airspace-note">
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
