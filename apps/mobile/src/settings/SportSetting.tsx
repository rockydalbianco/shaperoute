import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { t } from "../i18n";
import {
  color,
  fontSize,
  fontWeight,
  MIN_TAP_SIZE,
  radius,
  space,
} from "../theme/tokens";
import { Tap } from "../ui/Tap";
import { useSettingsGroup } from "./settingsGroup";
import { loadSport, saveSport, type Sport, SPORTS, type SportOption } from "./sport";
import { SportMenu } from "./SportMenu";

type Props = {
  /** The sports to show; the app's own unless a test says otherwise. */
  sports?: readonly SportOption[];
};

/**
 * «Sport» in «Settings»: what the routes are for. One row since TASK-512
 * (ADR-0420, the user's choice), the sport chosen at its end: a tap opens
 * the same panel as the header's sport button (`SportMenu`), so the rest of
 * «Settings» is not pushed down by a row per sport. A sport the Route
 * Engine cannot draw yet says «Soon» there and takes no tap. The choice
 * stays on the phone.
 */
export function SportSetting({ sports = SPORTS }: Props) {
  const group = useSettingsGroup();
  const [chosen, setChosen] = useState<Sport>(() => loadSport(sports));
  const [open, setOpen] = useState(false);
  const current = sports.find((option) => option.id === chosen) ?? sports[0];
  const choose = (sport: Sport) => {
    setChosen(sport);
    saveSport(sport);
    setOpen(false);
  };
  return (
    <View style={styles.section}>
      <Text style={styles.label}>{t("SPORT")}</Text>
      <Tap
        style={[styles.row, group]}
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={t("Sport, {sport}", { sport: t(current.name) })}
        accessibilityHint={t("Changes the sport")}
        accessibilityState={{ expanded: open }}
        testID="sport-setting-row"
      >
        <Text style={styles.emoji}>{current.emoji}</Text>
        <Text style={styles.rowText}>{t("Sport")}</Text>
        <Text style={styles.value} numberOfLines={1}>
          {t(current.name)}
        </Text>
        <Text style={styles.arrow}>›</Text>
      </Tap>
      {/* Hung where the header's button hangs it: the same panel. */}
      <SportMenu
        open={open}
        sports={sports}
        chosen={chosen}
        onChoose={choose}
        onClose={() => setOpen(false)}
      />
    </View>
  );
}

// A row of «Settings» that opens, as «Blocked people»
// (`../social/BlockedPeople`): an emoji, the name, the arrow.
const styles = StyleSheet.create({
  section: {
    gap: space.lg,
  },
  label: {
    color: color.textMuted,
    fontSize: fontSize.label,
    fontWeight: fontWeight.semibold,
    letterSpacing: 1.2,
  },
  row: {
    minHeight: MIN_TAP_SIZE + space.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    paddingHorizontal: space.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
  emoji: {
    fontSize: fontSize.input + space.xs,
  },
  rowText: {
    flex: 1,
    color: color.text,
    fontSize: fontSize.input,
    fontWeight: fontWeight.medium,
  },
  value: {
    flexShrink: 1,
    color: color.textMuted,
    fontSize: fontSize.input,
  },
  arrow: {
    color: color.textMuted,
    fontSize: fontSize.title,
  },
});
