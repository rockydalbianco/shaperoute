import Constants from "expo-constants";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { t } from "../i18n";
import { shareGpx } from "../route/shareGpx";
import {
  color,
  fontSize,
  fontWeight,
  MIN_TAP_SIZE,
  radius,
  space,
} from "../theme/tokens";
import type { FlightFix } from "./flightArchive";
import { flightGpxFileName, flightGpxOf } from "./flightGpx";
import { igcFileName, igcOf } from "./igcWrite";

/**
 * «Export IGC» and «Export GPX» of a flight (TASK-479 part F1, ADR-0388):
 * the file written on the phone from the flight's fixes and handed to the
 * share sheet (Files, AirDrop, Mail, a flight app). MuW sends it nowhere.
 * Under the buttons, always, the line approved with the warnings: the IGC
 * is not signed.
 */

/** Shares a file's text; false when the phone has no share sheet. */
export type ShareFile = (text: string, fileName: string) => Promise<boolean>;

/** The share sheet with an IGC file: no type every phone knows, so plain
 * data with its name. */
export const shareIgc: ShareFile = async (text, fileName) => {
  if (!(await Sharing.isAvailableAsync())) {
    return false;
  }
  const file = new File(Paths.cache, fileName);
  file.create({ overwrite: true });
  file.write(text);
  await Sharing.shareAsync(file.uri, {
    mimeType: "application/octet-stream",
    UTI: "public.data",
    dialogTitle: t("Export IGC"),
  });
  return true;
};

const shareFlightGpx: ShareFile = async (text, fileName) =>
  (await shareGpx(text, fileName)) === "shared";

type Props = {
  fixes: FlightFix[];
  /** The phone's share sheet, or a test's. */
  shareIgcFile?: ShareFile;
  shareGpxFile?: ShareFile;
  /** MuW's version, for the IGC header. */
  version?: string;
};

export function FlightExport({
  fixes,
  shareIgcFile = shareIgc,
  shareGpxFile = shareFlightGpx,
  version = Constants.expoConfig?.version ?? "0",
}: Props) {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  if (fixes.length < 2) {
    return null;
  }

  async function share(kind: "igc" | "gpx") {
    setBusy(true);
    setFailed(false);
    try {
      const shared =
        kind === "igc"
          ? await shareIgcFile(igcOf(fixes, { version }), igcFileName(fixes))
          : await shareGpxFile(flightGpxOf(fixes, "MuW"), flightGpxFileName(fixes));
      setFailed(!shared);
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.export} testID="flight-export">
      <View style={styles.buttons}>
        {(["igc", "gpx"] as const).map((kind) => (
          <Pressable
            key={kind}
            style={[styles.button, busy && styles.dim]}
            onPress={() => void share(kind)}
            disabled={busy}
            accessibilityRole="button"
            accessibilityState={{ disabled: busy }}
            testID={`flight-export-${kind}`}
          >
            <Text style={styles.buttonText}>
              {kind === "igc" ? t("Export IGC") : t("Export GPX")}
            </Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.note}>
        {t("Not signed: competitions and online contests may not accept it.")}
      </Text>
      {failed && <Text style={styles.note}>{t("Something went wrong.")}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  export: {
    gap: space.xs,
  },
  buttons: {
    flexDirection: "row",
    gap: space.sm,
  },
  button: {
    flex: 1,
    minHeight: MIN_TAP_SIZE,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.borderStrong,
    backgroundColor: color.surfaceRaised,
  },
  dim: {
    opacity: 0.5,
  },
  buttonText: {
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
  note: {
    color: color.textMuted,
    fontSize: fontSize.small,
  },
});
