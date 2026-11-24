import type { ReactNode } from "react";

import { t, tLater } from "../i18n";
import {
  LD_CHOICES,
  setGlidePrefs,
  useGlidePrefs,
  WIND_CHOICES,
  type WindChoice,
} from "./glidePrefs";

/**
 * The glide's choices among the flight screen's options (TASK-479 part
 * D3): the glide ratio the heights are worked out with, and the wind,
 * estimated in the air or none.
 */

export const LD_ROW = tLater("Glide ratio used");
export const WIND_ROW = tLater("Wind used");
export const WIND_NAME: Readonly<Record<WindChoice, string>> = {
  estimated: tLater("Estimated"),
  none: tLater("No wind"),
};

type Chip = (key: string, label: string, on: boolean, onPress: () => void) => ReactNode;
type Row = (title: string, chips: ReactNode) => ReactNode;

export function GlideOptions({ chip, row }: { chip: Chip; row: Row }) {
  const prefs = useGlidePrefs();
  return (
    <>
      {row(
        t(LD_ROW),
        LD_CHOICES.map((ld) =>
          chip(`ld-${ld}`, String(ld), prefs.ld === ld, () =>
            setGlidePrefs({ ...prefs, ld }),
          ),
        ),
      )}
      {row(
        t(WIND_ROW),
        WIND_CHOICES.map((wind) =>
          chip(`wind-${wind}`, t(WIND_NAME[wind]), prefs.wind === wind, () =>
            setGlidePrefs({ ...prefs, wind }),
          ),
        ),
      )}
    </>
  );
}
