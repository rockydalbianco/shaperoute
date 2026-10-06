import { useEffect, useState } from "react";
import { Linking, StyleSheet, View } from "react-native";

import { type StravaActivity, stravaProblem } from "../api/strava";
import { t } from "../i18n";
import { ConnectWithStrava, StravaLine } from "../strava/StravaParts";
import { useStrava } from "../strava/useStrava";
import { space } from "../theme/tokens";
import { PostButton } from "./PostButton";

/** What the row knows of the run on Strava; `was` is what it knew before a
 * sending, to go back to when the sending fails. */
type Known =
  | { kind: "asking" }
  | { kind: "known"; activity: StravaActivity }
  | { kind: "sending"; was: StravaActivity };

const NOT_SENT: StravaActivity = { status: "not_sent", url: null };

type Props = {
  /** The saved run; null at the end of a run, before «Save». */
  runKey: string | null;
  /** The run is on Strava with this post's text (TASK-258). */
  onSent?: () => void;
  /** The post's emoji and results, over the text on Strava. */
  caption: string | null;
};

/**
 * Strava on the post's screen (TASK-231). Strava takes no pictures from
 * other apps: the post's emoji and results go as the text of the activity.
 * «Send to Strava» sends the run with it; on a run already there, «Update on
 * Strava» puts it over the text it went with. The picture, kept in Photos,
 * is added there by hand. Nothing when the API has no Strava.
 */
export function StravaPostRow({ runKey, caption, onSent }: Props) {
  const strava = useStrava();
  const { status, busy, activityOf, send } = strava;
  const connected = status.available && status.connected;
  const [known, setKnown] = useState<Known>({ kind: "asking" });
  const [problem, setProblem] = useState<string | null>(null);
  const [updated, setUpdated] = useState(false);

  useEffect(() => {
    if (!connected || runKey === null) {
      return;
    }
    let shown = true;
    void activityOf(runKey).then((outcome) => {
      // Not known (no network): «Send to Strava» all the same, as sending
      // a run Strava has already only says where it is.
      if (shown) {
        setKnown({
          kind: "known",
          activity: outcome?.kind === "ok" ? outcome.value : NOT_SENT,
        });
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

  function sendNow(key: string, was: StravaActivity) {
    const updating = was.status === "sent";
    setProblem(null);
    setUpdated(false);
    setKnown({ kind: "sending", was });
    void send(key, null, caption).then((outcome) => {
      if (outcome === null) {
        setKnown({ kind: "known", activity: was });
        return;
      }
      if (outcome.kind === "ok") {
        setKnown({ kind: "known", activity: outcome.value });
        setUpdated(updating);
        onSent?.();
        return;
      }
      setKnown({ kind: "known", activity: updating ? was : NOT_SENT });
      setProblem(
        updating && outcome.kind === "api_error" && outcome.code === "invalid_request"
          ? t(
              "Strava did not let Sgrava change this activity. Change its text on Strava.",
            )
          : stravaProblem(outcome),
      );
    });
  }

  const picture = (
    <StravaLine
      text={t(
        "Strava takes no pictures from other apps: keep this one in Photos with «Save Image» and add it there.",
      )}
    />
  );

  switch (known.kind) {
    case "asking":
      // Nothing to offer until the API says what Strava has.
      return null;
    case "sending":
      return (
        <View style={styles.block}>
          <PostButton text={t("Sending to Strava…")} busy />
          {picture}
        </View>
      );
    case "known": {
      const { activity } = known;
      if (activity.status === "sent") {
        const { url } = activity;
        return (
          <View style={styles.block}>
            {caption !== null && (
              <PostButton
                text={t("Update on Strava")}
                onPress={() => sendNow(runKey, activity)}
              />
            )}
            {url !== null && (
              <PostButton
                text={t("View on Strava")}
                onPress={() => void Linking.openURL(url).catch(() => {})}
              />
            )}
            {updated && (
              <StravaLine
                text={t("The activity on Strava has this post's text now.")}
              />
            )}
            {problem !== null && <StravaLine text={problem} alert />}
            {picture}
          </View>
        );
      }
      if (activity.status === "processing") {
        return (
          <View style={styles.block}>
            <StravaLine text={t("Strava is still reading this run.")} />
            <PostButton
              text={t("Check again")}
              onPress={() => sendNow(runKey, activity)}
            />
            {picture}
          </View>
        );
      }
      return (
        <View style={styles.block}>
          <PostButton
            text={t("Send to Strava")}
            onPress={() => sendNow(runKey, activity)}
          />
          {problem !== null && <StravaLine text={problem} alert />}
          {picture}
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
