import type { ResortSnow as Snow } from "@shaperoute/shared-types";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { t } from "../i18n";
import { useDrawingsDoor } from "../social/drawingsDoor";
import { color, font, fontWeight, space } from "../theme/tokens";
import { SNOW_LABELS } from "./DayChoices";

/** «Powder ×3 · Groomed ×1»: the most marked first, as the API gives them. */
export function snowLine(snow: Snow): string {
  return snow.snow
    .map(({ snow: type, days }) =>
      t("{snow} ×{days}", { snow: t(SNOW_LABELS[type]), days }),
    )
    .join(" · ");
}

/**
 * «Snow today» on a resort's page (TASK-406 part D3, ADR-0338): the snow the
 * members marked at the end of their days there in the last 24 hours, from
 * the posts the reader sees, as numbers only (the user's choice, question
 * 1). Nothing when nobody marked one, or when the API does not say.
 */
export function ResortSnow({ resortId }: { resortId: string }) {
  const { resortSnowOf } = useDrawingsDoor();
  const [read, setRead] = useState<{ id: string; snow: Snow } | null>(null);
  useEffect(() => {
    if (resortSnowOf === undefined) {
      return;
    }
    let live = true;
    void resortSnowOf(resortId).then((snow) => {
      if (live && snow !== null) {
        setRead({ id: resortId, snow });
      }
    });
    return () => {
      live = false;
    };
  }, [resortId, resortSnowOf]);
  const snow = read !== null && read.id === resortId ? read.snow : null;
  if (snow === null || snow.snow.length === 0) {
    return null;
  }
  return (
    <View style={styles.snow} testID="resort-snow">
      <Text style={styles.title} accessibilityRole="header">
        {t("Snow today")}
      </Text>
      <Text style={styles.line}>{snowLine(snow)}</Text>
      <Text style={styles.note}>
        {t("Marked by the members in the last 24 hours.")}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  snow: {
    gap: space.xs,
  },
  title: {
    ...font.heading,
    color: color.text,
  },
  line: {
    ...font.body,
    fontWeight: fontWeight.semibold,
    color: color.text,
  },
  note: {
    ...font.small,
    color: color.textMuted,
  },
});
