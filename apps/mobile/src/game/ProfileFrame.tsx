import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import { color, gamePrize } from "../theme/tokens";
import { ShapeOutline } from "./ShapeOutline";

type Props = {
  /** The collection whose frame it is: its colour. */
  collection: string;
  /** The outline of its hardest shape, small at the bottom right. */
  outline: readonly (readonly [number, number])[];
  size: number;
  /** Got: in the collection's colour; not yet: grey. */
  got: boolean;
  /** What the ring holds: the photo of the profile, or nothing. */
  children?: ReactNode;
  /** Where the badge with the outline sits; on a profile, left, away from
   * the «+» of one's own photo. */
  badgeSide?: "left" | "right";
  testID?: string;
};

/** The ring is this share of the frame's side. */
const RING_SHARE = 0.07;
/** The badge with the outline is this share of the frame's side. */
const BADGE_SHARE = 0.34;

/** The colour of a collection's frame; the accent for one the app does not
 * know yet. */
export function frameColor(collection: string): string {
  const frames: Record<string, string> = gamePrize.frame;
  return frames[collection] ?? color.accent;
}

/**
 * The frame of a collection (TASK-423 part E, docs/GIOCO.md §5.4): a ring in
 * the collection's colour around the photo of the profile, with the outline
 * of its hardest shape in a small round badge. Never alone: its collection
 * is named beside it.
 */
export function ProfileFrame({
  collection,
  outline,
  size,
  got,
  children,
  badgeSide = "right",
  testID,
}: Props) {
  const tint = got ? frameColor(collection) : color.border;
  const ring = Math.max(2, Math.round(size * RING_SHARE));
  const badge = Math.round(size * BADGE_SHARE);
  return (
    <View style={{ width: size, height: size }} testID={testID}>
      <View
        style={[
          styles.ring,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: ring,
            borderColor: tint,
          },
        ]}
      >
        {children}
      </View>
      <View
        style={[
          styles.badge,
          badgeSide === "left" ? { left: 0 } : { right: 0 },
          {
            width: badge,
            height: badge,
            borderRadius: badge / 2,
            borderColor: tint,
          },
        ]}
      >
        <ShapeOutline
          outline={outline}
          size={badge * 0.62}
          color={got ? tint : color.textFaint}
          thickness={2}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  ring: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    backgroundColor: color.surfaceRaised,
  },
  badge: {
    position: "absolute",
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    backgroundColor: color.surface,
  },
});
