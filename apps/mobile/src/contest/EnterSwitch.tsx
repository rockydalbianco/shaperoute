import type { DrawingDetail, ThemedContest } from "@shaperoute/shared-types";
import { useState } from "react";
import { StyleSheet, Switch, Text, View } from "react-native";

import { sessionEnded } from "../account/messages";
import type { DrawingEntry } from "../api/drawings";
import { t } from "../i18n";
import { useLanguage } from "../i18n/useLanguage";
import { useFollowsDoor } from "../social/followsDoor";
import { color, fontSize, fontWeight, MIN_TAP_SIZE, space } from "../theme/tokens";
import { entryProblem, setContestEntry, themedOf, themeText } from "./contestApi";
import {
  enteredIn,
  type KeptContest,
  markEntered,
  useContestKept,
} from "./contestKept";

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
  const contest = enterable(kept, Date.now());
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

/**
 * The same switch on the account's own post, opened whole (TASK-343 part B):
 * it enters or withdraws at once. Only a drawing that can take part has it:
 * for everyone, recorded by the app, published during the challenge.
 */
export function PostEntry({ drawing }: { drawing: DrawingDetail }) {
  const { apiUrl, account } = useFollowsDoor();
  const kept = useContestKept();
  const language = useLanguage();
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const { state } = account;
  const session = state.status === "signedIn" ? state.session : null;
  const publicId = session?.user.public_id ?? null;
  const contest = enterable(kept, Date.now());
  if (
    contest === null ||
    apiUrl === null ||
    session === null ||
    publicId !== drawing.author.public_id ||
    drawing.visibility !== "everyone" ||
    (drawing.source !== undefined && drawing.source !== "muw") ||
    drawing.published_at === null ||
    Date.parse(drawing.published_at) < Date.parse(contest.starts_at) ||
    Date.parse(drawing.published_at) > Date.parse(contest.ends_at)
  ) {
    return null;
  }
  const { id: contestId } = contest;
  const { token } = session;
  const baseUrl = apiUrl;
  async function change(entered: boolean) {
    setBusy(true);
    setProblem(null);
    const outcome = await setContestEntry(
      baseUrl,
      token,
      contestId,
      drawing.id,
      entered,
    );
    setBusy(false);
    if (outcome.kind === "ok") {
      markEntered(contestId, drawing.id, entered);
    } else if (sessionEnded(outcome)) {
      account.sessionEnded(token);
    } else {
      setProblem(entryProblem(outcome));
    }
  }
  return (
    <View style={styles.block}>
      <SwitchRow
        label={t("Enter “{theme}”", {
          theme: themeText(contest.theme, language).title,
        })}
        on={enteredIn(kept, publicId).includes(drawing.id)}
        onChange={(entered) => void change(entered)}
        disabled={busy}
      />
      {problem !== null && (
        <Text style={styles.problem} accessibilityRole="alert">
          {problem}
        </Text>
      )}
    </View>
  );
}

function SwitchRow({
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
  block: {
    gap: space.xs,
  },
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
  problem: {
    color: color.error,
    fontSize: fontSize.small,
  },
});
