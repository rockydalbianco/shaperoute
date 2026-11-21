import { StyleSheet, View } from "react-native";

import type { Palette } from "../../theme/tokens";
import type { Assistant } from "../thermal";

/**
 * The thermal assistant (TASK-479 part B1): the last minute of the track
 * around the pilot, north up, each point bright where it climbed and
 * faint where it sank, the best climb ringed. A picture of where the
 * climb was, not a direction to fly.
 */

/** The picture shows at least this far around the pilot, metres. */
const MIN_REACH_M = 60;
/** And at most this far: older points beyond it are left out. */
const MAX_REACH_M = 400;
/** Climbs from this much are drawn at full size. */
const FULL_CLIMB_MPS = 3;

export function ThermalAssistant({
  assistant,
  size,
  palette,
}: {
  assistant: Assistant;
  size: number;
  palette: Palette;
}) {
  const far = assistant.points.reduce(
    (most, point) => Math.max(most, Math.abs(point.x), Math.abs(point.y)),
    0,
  );
  const reach = Math.min(MAX_REACH_M, Math.max(MIN_REACH_M, far * 1.1));
  const half = size / 2;
  const scale = half / reach;
  const place = (x: number, y: number) => ({
    left: half + x * scale,
    top: half - y * scale,
  });
  return (
    <View style={{ width: size, height: size }} testID="thermal-assistant">
      <View
        style={[
          styles.ring,
          {
            width: size,
            height: size,
            borderRadius: half,
            borderColor: palette.border,
          },
        ]}
      />
      {assistant.points.map((point, index) => {
        if (Math.abs(point.x) > reach || Math.abs(point.y) > reach) {
          return null;
        }
        const climb = point.varioMps ?? 0;
        const dot = climb > 0 ? 4 + Math.min(1, climb / FULL_CLIMB_MPS) * 8 : 3;
        const at = place(point.x, point.y);
        return (
          <View
            key={index}
            style={[
              styles.dot,
              {
                left: at.left - dot / 2,
                top: at.top - dot / 2,
                width: dot,
                height: dot,
                borderRadius: dot / 2,
                backgroundColor: climb > 0 ? palette.accent : palette.textFaint,
              },
            ]}
          />
        );
      })}
      {assistant.best !== null ? (
        <View
          testID="thermal-best"
          style={[
            styles.best,
            {
              left: place(assistant.best.x, assistant.best.y).left - 12,
              top: place(assistant.best.x, assistant.best.y).top - 12,
              borderColor: palette.text,
            },
          ]}
        />
      ) : null}
      <View
        style={[
          styles.you,
          {
            left: half - 7,
            top: half - 7,
            backgroundColor: palette.you,
            borderColor: palette.background,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  ring: { position: "absolute", borderWidth: 1 },
  dot: { position: "absolute" },
  best: {
    position: "absolute",
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
  },
  you: { position: "absolute", width: 14, height: 14, borderRadius: 7, borderWidth: 2 },
});
