import { Pressable, StyleSheet, Text, View } from "react-native";

import { t } from "../i18n";
import { color, fontSize, fontWeight, MIN_TAP_SIZE, space } from "../theme/tokens";
import {
  LINE_COLOURS,
  type LineColour,
  lineColourName,
  lineColourOf,
} from "./videoEdit";

type Props = {
  line: LineColour;
  onChange: (line: LineColour) => void;
};

/**
 * «Line colour» in «Edit video» (TASK-408, ADR-0339): a round swatch for
 * each colour the video's line can take, the chosen one ringed; the yellow
 * of a route when the post opens. The swatches show the colours as the
 * dark map draws them; each has its name for VoiceOver.
 */
export function LineColourRow({ line, onChange }: Props) {
  return (
    <>
      <Text style={styles.label}>{t("Line colour")}</Text>
      <View style={styles.row} accessibilityRole="radiogroup">
        {LINE_COLOURS.map((choice) => {
          const on = choice === line;
          return (
            <Pressable
              key={choice}
              style={[styles.ring, on && styles.ringOn]}
              onPress={() => onChange(choice)}
              accessibilityRole="radio"
              accessibilityLabel={lineColourName(choice)}
              accessibilityState={{ checked: on }}
              testID={`line-${choice}`}
            >
              <View
                style={[
                  styles.swatch,
                  { backgroundColor: lineColourOf(choice, color) },
                ]}
              />
            </Pressable>
          );
        })}
      </View>
    </>
  );
}

const SWATCH = MIN_TAP_SIZE - 10;

const styles = StyleSheet.create({
  label: {
    color: color.textMuted,
    fontSize: fontSize.small,
    fontWeight: fontWeight.semibold,
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: space.sm,
  },
  ring: {
    width: MIN_TAP_SIZE,
    height: MIN_TAP_SIZE,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: MIN_TAP_SIZE / 2,
    borderWidth: 2,
    borderColor: "transparent",
  },
  ringOn: {
    borderColor: color.text,
  },
  swatch: {
    width: SWATCH,
    height: SWATCH,
    borderRadius: SWATCH / 2,
    borderWidth: 1,
    borderColor: color.borderStrong,
  },
});
