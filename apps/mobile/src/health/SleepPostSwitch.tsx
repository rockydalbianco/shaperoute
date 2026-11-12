import type { ActivitySleep } from "@shaperoute/shared-types";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { fetchActivitySleep, showActivitySleep } from "../api/sleep";
import { SwitchRow } from "../contest/EnterSwitch";
import { t } from "../i18n";
import { useFollowsDoor } from "../social/followsDoor";
import { color, font, space } from "../theme/tokens";
import { sleepPostsOn } from "./sleepModules";
import { tellSleepNow } from "./sleepNow";
import { sleepLineText } from "./sleepText";

type Props = {
  /** The post, and the key of its run in «My activities». */
  drawingId: string;
  runKey: string;
  /** The fake of the tests. */
  fetchFn?: typeof fetch;
};

/**
 * «Sleep last night» in the settings of one's own post (TASK-467 part B2):
 * the owner hides the night of a post already published, or shows it
 * again. The night and its switch are read from GET
 * /me/activities/{key}/sleep; a tap goes to the API at once (PATCH), and
 * the card and the page of the post follow (`sleepNow.ts`). Nothing for a
 * post without a night, and while the sleep in a post is off.
 */
export function SleepPostSwitch({ drawingId, runKey, fetchFn }: Props) {
  const { apiUrl, account } = useFollowsDoor();
  const token =
    account.state.status === "signedIn" ? account.state.session.token : null;
  const on = sleepPostsOn();
  const [found, setFound] = useState<{ key: string; sleep: ActivitySleep } | null>(
    null,
  );
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!on || apiUrl === null || token === null) {
      return;
    }
    let live = true;
    void fetchActivitySleep(apiUrl, token, runKey, { fetchFn }).then((outcome) => {
      if (live && outcome.kind === "ok") {
        setFound({ key: runKey, sleep: outcome.value });
      }
    });
    return () => {
      live = false;
    };
  }, [on, apiUrl, token, runKey, fetchFn]);

  if (!on || apiUrl === null || token === null) {
    return null;
  }
  // Kept with the run it is of: another post shows none until its own.
  const sleep = found !== null && found.key === runKey ? found.sleep : null;
  if (sleep === null) {
    return null;
  }

  async function onShown(shown: boolean) {
    if (apiUrl === null || token === null) {
      return;
    }
    setSaving(true);
    setFailed(false);
    const outcome = await showActivitySleep(apiUrl, token, runKey, shown, { fetchFn });
    setSaving(false);
    if (outcome.kind !== "ok") {
      setFailed(true);
      return;
    }
    setFound({ key: runKey, sleep: outcome.value });
    const { shown: now, ...night } = outcome.value;
    tellSleepNow(drawingId, now ? night : null);
  }

  return (
    <View style={styles.block} testID="post-sleep-switch">
      <SwitchRow
        label={t("Sleep last night")}
        on={sleep.shown}
        onChange={(shown) => void onShown(shown)}
        disabled={saving}
      />
      <Text style={styles.figures}>{sleepLineText(sleep)}</Text>
      {sleep.shown && (
        <Text style={styles.line}>
          {t("Shown in this post. Turn it off to keep it to yourself.")}
        </Text>
      )}
      {failed && (
        <Text style={styles.problem} accessibilityRole="alert">
          {t("Something went wrong on our side. Try again in a moment.")}
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
    ...font.small,
    color: color.text,
  },
  line: {
    ...font.small,
    color: color.textMuted,
  },
  problem: {
    ...font.small,
    color: color.error,
  },
});
