import { StyleSheet, Text } from "react-native";

import { t } from "../i18n";
import { color, font, space } from "../theme/tokens";
import { useSleepOf } from "./sleepNow";
import { sleepLineText } from "./sleepText";

type Props = {
  drawingId: string;
  /** `sleep` of the post as its list gave it. */
  sleep: unknown;
};

/**
 * The night of a post in a line of its card in «Feed» (TASK-467 part B2):
 * «Sleep score 82 · Very good · 7 h 40 min». MuW's score, never called
 * Apple's; the stages are on the page of the post (`SleepCard`). Nothing
 * for a post without a night, with one its owner hides, and while the
 * sleep in a post is off.
 */
export function SleepLine({ drawingId, sleep }: Props) {
  const night = useSleepOf(drawingId, sleep);
  if (night === null) {
    return null;
  }
  return (
    <Text style={styles.line} testID="sleep-line">
      {`${t("Sleep score")} ${sleepLineText(night)}`}
    </Text>
  );
}

const styles = StyleSheet.create({
  line: {
    ...font.small,
    color: color.textMuted,
    paddingHorizontal: space.md,
    paddingBottom: space.md,
  },
});
