import type { SleepSummary } from "@shaperoute/shared-types";
import { StyleSheet, Text, View } from "react-native";

import { SwitchRow } from "../contest/EnterSwitch";
import { t } from "../i18n";
import { color, fontSize, space } from "../theme/tokens";
import { sleepLineText } from "./sleepText";

type Props = {
  /** The night before the activity; null: nothing shows. */
  night: SleepSummary | null;
  /** «Sleep last night»: whether the post will show it. */
  shown: boolean;
  onShown: (shown: boolean) => void;
  disabled?: boolean;
};

/**
 * «Sleep last night» at the end of an activity (TASK-467 part B2), in
 * sight over «Save»: the switch, the night in a line («82 · Very good ·
 * 7 h 40 min») and, while it is on, what turning it off does. It starts on
 * (the user's choice, `SLEEP_SHOWN_DEFAULT`); off, the night stays on the
 * phone. Nothing without a night: no sleep read (every build until part
 * C), none last night, or a post nobody else sees.
 */
export function SleepRunEnd({ night, shown, onShown, disabled }: Props) {
  if (night === null) {
    return null;
  }
  return (
    <View style={styles.block} testID="sleep-run-end">
      <SwitchRow
        label={t("Sleep last night")}
        on={shown}
        onChange={onShown}
        disabled={disabled}
      />
      <Text style={styles.figures}>{sleepLineText(night)}</Text>
      {shown && (
        <Text style={styles.line}>
          {t("Shown in this post. Turn it off to keep it to yourself.")}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    gap: space.xs,
  },
  figures: {
    color: color.text,
    fontSize: fontSize.small,
  },
  line: {
    color: color.textMuted,
    fontSize: fontSize.small,
  },
});
