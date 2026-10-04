import { useEffect, useState } from "react";
import { Linking, StyleSheet, View } from "react-native";

import { type StravaActivity, type StravaOutcome, stravaProblem } from "../api/strava";
import { t } from "../i18n";
import { ConnectWithStrava, StravaLine } from "../strava/StravaParts";
import { useStrava } from "../strava/useStrava";
import { space } from "../theme/tokens";
import { PostButton } from "./PostButton";

/** What the row knows of the run on Strava. */
type Known =
  | { kind: "asking" }
  | { kind: "known"; activity: StravaActivity }
  | { kind: "sending" };

const NOT_SENT: Known = { kind: "known", activity: { status: "not_sent", url: null } };

type Props = {
  /** The saved run; null at the end of a run, before «Save». */
  runKey: string | null;
  /** The post's emoji and results, under the name on Strava. */
  caption: string | null;
};

/**
 * Strava on the post's screen (TASK-231). Strava takes no pictures from
 * other apps: the post's emoji and results go as the text of the activity,
 * when the run is sent from here. A run already on Strava keeps the text it
 * went with: «View on Strava», where the picture saved in Photos is added
 * by hand. Nothing when the API has no Strava.
 */
export function StravaPostRow({ runKey, caption }: Props) {
  const strava = useStrava();
  const { status, busy, activityOf, send } = strava;
  const connected = status.available && status.connected;
  const [known, setKnown] = useState<Known>({ kind: "asking" });
  const [problem, setProblem] = useState<string | null>(null);

  useEffect(() => {
    if (!connected || runKey === null) {
      return;
    }
    let shown = true;
    void activityOf(runKey).then((outcome) => {
      // Not known (no network): «Send to Strava» all the same, as sending
      // a run Strava has already only says where it is.
      if (shown) {
        setKnown(
          outcome?.kind === "ok"
            ? { kind: "known", activity: outcome.value }
            : NOT_SENT,
        );
      }
    });
    return () => {
      shown = false;
    };
  }, [activityOf, connected, runKey]);

  if (!status.available) {
    return null;
  }
  if (!status.connected) {
    return (
      <View style={styles.block}>
        <ConnectWithStrava busy={busy === "connecting"} onPress={strava.connect} />
        {strava.problem !== null && <StravaLine text={strava.problem} alert />}
      </View>
    );
  }
  if (runKey === null) {
    return (
      <StravaLine
        text={t(
          "To send this post to Strava, save the run, then share it from «My activities».",
        )}
      />
    );
  }

  function heard(outcome: StravaOutcome<StravaActivity> | null) {
    if (outcome === null) {
      return;
    }
    if (outcome.kind === "ok") {
      setKnown({ kind: "known", activity: outcome.value });
      return;
    }
    setKnown(NOT_SENT);
    setProblem(stravaProblem(outcome));
  }

  function sendNow(key: string) {
    setProblem(null);
    setKnown({ kind: "sending" });
    void send(key, null, caption).then(heard);
  }

  switch (known.kind) {
    case "asking":
      // Nothing to offer until the API says what Strava has.
      return null;
    case "sending":
      return (
        <View style={styles.block}>
          <PostButton text={t("Sending to Strava…")} busy />
        </View>
      );
    case "known": {
      const { activity } = known;
      if (activity.status === "sent") {
        const { url } = activity;
        return (
          <View style={styles.block}>
            {url !== null && (
              <PostButton
                text={t("View on Strava")}
                onPress={() => void Linking.openURL(url).catch(() => {})}
              />
            )}
            <StravaLine
              text={t(
                "This run is already on Strava. To add the picture there, keep it in Photos with «Save Image».",
              )}
            />
          </View>
        );
      }
      if (activity.status === "processing") {
        return (
          <View style={styles.block}>
            <StravaLine text={t("Strava is still reading this run.")} />
            <PostButton text={t("Check again")} onPress={() => sendNow(runKey)} />
          </View>
        );
      }
      return (
        <View style={styles.block}>
          <PostButton text={t("Send to Strava")} onPress={() => sendNow(runKey)} />
          {problem !== null && <StravaLine text={problem} alert />}
        </View>
      );
    }
  }
}

const styles = StyleSheet.create({
  block: {
    gap: space.sm,
  },
});
