import type { DrawingDetail } from "@shaperoute/shared-types";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { dayLabel } from "../activities/activityText";
import { t } from "../i18n";
import {
  color,
  fontSize,
  fontWeight,
  MIN_TAP_SIZE,
  radius,
  space,
} from "../theme/tokens";
import { runDistanceLabel } from "../units/format";
import { useUnits } from "../units/useUnits";
import { DrawingComments } from "./DrawingComments";
import { DrawingReactions } from "./DrawingReactions";

type Props = {
  drawing: DrawingDetail;
  /** Back to «Profile», where it was opened. */
  onBack: () => void;
};

/**
 * A drawing on the map (TASK-117), under it: its title (without one, the
 * day it was run), the day and the km (the miles with «Miles», TASK-182).
 * Never the score (TASK-241, the user's choice), nor the time of day: the
 * others see the drawing, not when somebody runs. Its comments open from a
 * button (TASK-120), and
 * next to it are its reactions (TASK-119).
 */
export function DrawingCard({ drawing, onBack }: Props) {
  const day = dayLabel(drawing.started_at);
  const units = useUnits();
  // A super like goes with a comment: the comments are asked for again.
  const [superLikes, setSuperLikes] = useState(0);
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={styles.words}>
          <Text style={styles.title}>{drawing.title ?? day}</Text>
          {drawing.title !== null && <Text style={styles.message}>{day}</Text>}
          <Text style={styles.facts}>
            {runDistanceLabel(drawing.distance_m, units)}
          </Text>
        </View>
      </View>
      <DrawingReactions
        drawingId={drawing.id}
        onSuperLiked={() => setSuperLikes((count) => count + 1)}
        beside={<DrawingComments key={superLikes} drawingId={drawing.id} />}
      />
      <Pressable style={styles.button} onPress={onBack} accessibilityRole="button">
        <Text style={styles.buttonText}>{t("Back to the profile")}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: space.sm,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
  },
  words: {
    flex: 1,
    gap: 2,
  },
  title: {
    color: color.text,
    fontSize: fontSize.input,
    fontWeight: fontWeight.semibold,
  },
  message: {
    color: color.textMuted,
    fontSize: fontSize.small,
  },
  facts: {
    color: color.text,
    fontSize: fontSize.input,
    fontWeight: fontWeight.semibold,
  },
  button: {
    minHeight: MIN_TAP_SIZE,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.borderStrong,
    backgroundColor: color.surfaceRaised,
  },
  buttonText: {
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
});
