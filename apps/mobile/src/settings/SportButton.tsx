import { useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { headerGlass } from "../bell/BellButton";
import { t } from "../i18n";
import { fontSize, MIN_TAP_SIZE, space } from "../theme/tokens";
import { useGlassMode } from "../ui/useGlassMode";
import { saveSport, type Sport, SPORTS, type SportOption } from "./sport";
import { SportMenu } from "./SportMenu";
import { useSport } from "./useSport";

type Props = {
  /** The sports of the menu; the app's own unless a test says otherwise. */
  sports?: readonly SportOption[];
};

/**
 * The sport, at the left of the way to «Profile» (TASK-205, ADR-0165): the
 * emoji of the one chosen, and a tap opens the sport panel under it
 * (`SportMenu`: small tiles three to a row, by family, since TASK-512). The
 * choice is the one of «Settings» (saveSport), so the two always agree and
 * «Draw» follows at once; a sport not ready says «Soon».
 */
export function SportButton({ sports = SPORTS }: Props) {
  const sport = useSport();
  const [open, setOpen] = useState(false);
  const [top, setTop] = useState<number | null>(null);
  const button = useRef<View>(null);
  const current = sports.find((option) => option.id === sport) ?? sports[0];

  function openMenu() {
    button.current?.measureInWindow((_x, y, _w, h) => setTop(y + h + space.xs));
    setOpen(true);
  }

  function choose(chosen: Sport) {
    saveSport(chosen);
    setOpen(false);
  }

  const mode = useGlassMode();

  return (
    <>
      <Pressable
        ref={button}
        style={[styles.button, headerGlass(mode)]}
        onPress={openMenu}
        accessibilityRole="button"
        accessibilityLabel={t("Sport, {sport}", { sport: t(current.name) })}
        accessibilityHint={t("Changes the sport")}
        accessibilityState={{ expanded: open }}
      >
        <Text style={styles.buttonEmoji}>{current.emoji}</Text>
      </Pressable>
      <SportMenu
        open={open}
        sports={sports}
        chosen={sport}
        onChoose={choose}
        onClose={() => setOpen(false)}
        top={top}
      />
    </>
  );
}

// The button as the one of «Profile» (`../screens/ProfileLayer`).
const styles = StyleSheet.create({
  button: {
    width: MIN_TAP_SIZE,
    height: MIN_TAP_SIZE,
    alignItems: "center",
    justifyContent: "center",
    // Its face: a circle of glass, as the bell's (TASK-469 A5, `headerGlass`).
  },
  buttonEmoji: {
    fontSize: fontSize.input + space.xs,
  },
});
