import type { ThemedContest } from "@shaperoute/shared-types";
import { StyleSheet, Switch, Text, View } from "react-native";

import type { DrawingEntry } from "../api/drawings";
import { t } from "../i18n";
import { useLanguage } from "../i18n/useLanguage";
import { color, fontSize, fontWeight, MIN_TAP_SIZE, space } from "../theme/tokens";
import { themedOf, themeText } from "./contestApi";
import { type KeptContest, useContestKept } from "./contestKept";
import { useClock } from "./useClock";

/**
 * The monthly challenge that takes entries now on the phone's clock: begun,
 * not ended, not closed. Null without one, as with an API with no themes.
 */
export function enterable(
  kept: KeptContest | null,
  nowMs: number,
): ThemedContest | null {
  const contest = kept === null ? null : themedOf(kept.contest);
  if (
    contest === null ||
    contest.closed_at !== null ||
    nowMs < Date.parse(contest.starts_at) ||
    nowMs >= Date.parse(contest.ends_at)
  ) {
    return null;
  }
  return contest;
}

type Props = {
  entry: DrawingEntry | undefined;
  onEntry: (entry: DrawingEntry) => void;
  disabled?: boolean;
};

/**
 * «Enter “{theme}”» in the form of a drawing (TASK-343 part B,
 * docs/CONCORSI.md §15), under «Who can see it»: the form shows it only for
 * «Everyone» and a run recorded by the app, and it shows only while a
 * challenge takes entries. It changes the choice: the call goes after the
 * drawing is saved, also from the queue of `drawingOutbox`.
 */
export function EnterSwitch({ entry, onEntry, disabled }: Props) {
  const kept = useContestKept();
  const language = useLanguage();
  const contest = enterable(kept, useClock());
  if (contest === null) {
    return null;
  }
  return (
    <SwitchRow
      label={t("Enter “{theme}”", { theme: themeText(contest.theme, language).title })}
      on={entry?.contest === contest.id && entry.entered}
      onChange={(entered) => onEntry({ contest: contest.id, entered })}
      disabled={disabled}
    />
  );
}

/** The switch and what it says, in the form and on a post. */
export function SwitchRow({
  label,
  on,
  onChange,
  disabled,
}: {
  label: string;
  on: boolean;
  onChange: (on: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Switch
        value={on}
        onValueChange={onChange}
        disabled={disabled}
        accessibilityLabel={label}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space.md,
    minHeight: MIN_TAP_SIZE,
  },
  label: {
    flex: 1,
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
});
