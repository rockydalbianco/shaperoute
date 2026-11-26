import type { ReactNode } from "react";
import { StyleSheet, Text } from "react-native";

import { t } from "../i18n";
import type { Palette } from "../theme/tokens";
import { UNIT_LABEL, type VarioUnit, varioText } from "./flightUnits";
import {
  CLIMB_FROM_CHOICES,
  SINK_BELOW_CHOICES,
  setVarioPrefs,
  useVarioPrefs,
  VOLUME_LEVEL,
  VOLUMES,
} from "./varioPrefs";

/**
 * The vario's sound among the flight screen's options (TASK-479 part C,
 * ADR-0388): on or off, from which climb the beeps, below which sink the
 * low note (or never), how loud, and the line that says the sound comes
 * after the climb. The thresholds in the pilot's vario unit; the volume in
 * percent, the same in every language.
 */

type Chip = (key: string, label: string, on: boolean, onPress: () => void) => ReactNode;
type Row = (title: string, chips: ReactNode) => ReactNode;

export function VarioSoundOptions({
  unit,
  chip,
  row,
  palette,
}: {
  unit: VarioUnit;
  chip: Chip;
  row: Row;
  palette: Palette;
}) {
  const prefs = useVarioPrefs();
  const climbText = (mps: number) => `${varioText(mps, unit)} ${UNIT_LABEL[unit]}`;
  return (
    <>
      {row(
        t("Vario sound"),
        <>
          {chip("on", t("On"), prefs.on, () => setVarioPrefs({ ...prefs, on: true }))}
          {chip("off", t("Off"), !prefs.on, () =>
            setVarioPrefs({ ...prefs, on: false }),
          )}
        </>,
      )}
      {prefs.on ? (
        <>
          {row(
            t("Beeps from"),
            CLIMB_FROM_CHOICES.map((mps) =>
              chip(String(mps), climbText(mps), prefs.climbFromMps === mps, () =>
                setVarioPrefs({ ...prefs, climbFromMps: mps }),
              ),
            ),
          )}
          {row(
            t("Sink tone below"),
            SINK_BELOW_CHOICES.map((mps) =>
              chip(
                String(mps),
                mps === null ? t("Off") : climbText(mps),
                prefs.sinkBelowMps === mps,
                () => setVarioPrefs({ ...prefs, sinkBelowMps: mps }),
              ),
            ),
          )}
          {row(
            t("Volume"),
            VOLUMES.map((volume) =>
              chip(
                volume,
                `${Math.round(VOLUME_LEVEL[volume] * 100)} %`,
                prefs.volume === volume,
                () => setVarioPrefs({ ...prefs, volume }),
              ),
            ),
          )}
          <Text style={[styles.note, { color: palette.textMuted }]}>
            {t("From GPS: the sound comes 1–2 s after the climb.")}
          </Text>
        </>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  note: { fontSize: 14 },
});
