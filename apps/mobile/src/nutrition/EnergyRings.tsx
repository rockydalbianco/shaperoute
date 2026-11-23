import { StyleSheet, View } from "react-native";

import { color, space } from "../theme/tokens";
import type { RingShares } from "./dayRings";
import { Ring } from "./Ring";

/** The outer ring's side and the line of both, in points. */
export const RINGS_SIZE = 112;
const STROKE = 11;
const INNER_SIZE = RINGS_SIZE - 2 * (STROKE + space.xs);

type Props = {
  shares: RingShares;
};

/**
 * The two rings of a day (TASK-489 part H): outside what the body used,
 * inside what was eaten, on one scale (`dayRings.ts`). The user's own
 * target, when there is one, is a notch across the ring of «Eaten».
 *
 * In the colours of the text, not in a green and a red: neither ring is
 * good or bad, and yellow stays the route's.
 */
export function EnergyRings({ shares }: Props) {
  return (
    <View style={styles.rings} testID="diary-rings">
      <Ring
        size={RINGS_SIZE}
        stroke={STROKE}
        share={shares.used}
        colour={color.textMuted}
        track={color.border}
        testID="diary-ring-used"
      />
      <View style={styles.inner}>
        <Ring
          size={INNER_SIZE}
          stroke={STROKE}
          share={shares.eaten}
          colour={color.text}
          track={color.border}
          testID="diary-ring-eaten"
        />
        {shares.target !== null && (
          <View
            style={[
              styles.turn,
              { transform: [{ rotate: `${Math.round(shares.target * 360)}deg` }] },
            ]}
            importantForAccessibility="no-hide-descendants"
            accessibilityElementsHidden
            testID="diary-ring-target"
          >
            <View style={styles.notch} />
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  rings: {
    width: RINGS_SIZE,
    height: RINGS_SIZE,
  },
  inner: {
    position: "absolute",
    top: (RINGS_SIZE - INNER_SIZE) / 2,
    left: (RINGS_SIZE - INNER_SIZE) / 2,
    width: INNER_SIZE,
    height: INNER_SIZE,
  },
  turn: {
    position: "absolute",
    top: 0,
    left: 0,
    width: INNER_SIZE,
    height: INNER_SIZE,
    alignItems: "center",
  },
  // A cut across the ring, in the card's own colour.
  notch: {
    width: 2,
    height: STROKE,
    backgroundColor: color.surface,
  },
});
