import { AccessibilityInfo, Image, StyleSheet, Text } from "react-native";

import { selectionFeel } from "../haptics/haptics";
import { t } from "../i18n";
import { shapeName } from "../i18n/shapeNames";
import {
  color,
  fontSize,
  fontWeight,
  MIN_TAP_SIZE,
  radius,
  space,
} from "../theme/tokens";
import { glassRaise } from "../ui/glassRaise";
import { Tap } from "../ui/Tap";
import { useGlassMode } from "../ui/useGlassMode";
import { wholeDistanceLabel } from "../units/format";
import { appUnits, type Units } from "../units/units";
import type { SurprisePick } from "./surprisePick";

/** The dice, from Lucide (ISC, assets/ui/icons/LICENSE-lucide.txt) as the
 * other signs of the app are: white, coloured by `tintColor`. */
const DICES = require("../../assets/ui/icons/dices.png");

/** The pill's height: low, beside a step's title; the finger gets the
 * whole MIN_TAP_SIZE around it. */
export const PILL_HEIGHT = 32;
/** The dice's side: a line of the pill's text and a little more. */
export const PILL_ICON = 16;

type Props = {
  /** A tap: «Draw» gets a shape and a distance (useSurprise). */
  onPress: () => void;
  /** The routes near are being asked: the pill waits, dimmed. */
  busy?: boolean;
};

/**
 * «Surprise me» (TASK-448, ADR-0413; the user's choices of 2026-11-26):
 * the pill on the title row of «2 WHAT YOU DRAW», for who does not know
 * what to draw. A tap writes a shape and a distance in the page, another
 * tap another pair; nothing is drawn until «Draw route». It stands out of
 * the glass as the app's chips do (TASK-469), never yellow: the yellow is
 * the route's and the button's that draws it.
 */
export function SurprisePill({ onPress, busy = false }: Props) {
  const raise = glassRaise(useGlassMode());
  return (
    <Tap
      style={[styles.pill, raise]}
      onPress={() => {
        selectionFeel();
        onPress();
      }}
      disabled={busy}
      hitSlop={(MIN_TAP_SIZE - PILL_HEIGHT) / 2}
      accessibilityRole="button"
      accessibilityLabel={t("Surprise me")}
      accessibilityState={{ disabled: busy, busy }}
      testID="surprise-me"
    >
      {/* The label says it: the dice is not read. Waiting, the two dim:
          the press of `Tap` owns the pill's own opacity. */}
      <Image
        source={DICES}
        style={[styles.icon, busy && styles.busy]}
        accessible={false}
        importantForAccessibility="no"
        testID="surprise-me-icon"
      />
      <Text style={[styles.text, busy && styles.busy]} numberOfLines={1}>
        {t("Surprise me")}
      </Text>
    </Tap>
  );
}

/** What the pill chose, for who does not see the page change: «Heart,
 * 5 km», with the words the page already has. */
export function pickSaid(pick: SurprisePick, units: Units = appUnits()): string {
  return `${shapeName(pick.shape)}, ${wholeDistanceLabel(pick.distanceM, units)}`;
}

/** Says the pick to a screen reader. */
export function announcePick(pick: SurprisePick, units: Units = appUnits()): void {
  AccessibilityInfo.announceForAccessibility(pickSaid(pick, units));
}

const styles = StyleSheet.create({
  pill: {
    height: PILL_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    gap: space.xs,
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.borderStrong,
    backgroundColor: color.surfaceRaised,
  },
  busy: {
    opacity: 0.5,
  },
  icon: {
    width: PILL_ICON,
    height: PILL_ICON,
    tintColor: color.text,
  },
  text: {
    color: color.text,
    fontSize: fontSize.small,
    fontWeight: fontWeight.semibold,
  },
});
