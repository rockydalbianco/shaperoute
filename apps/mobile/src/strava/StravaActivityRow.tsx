import { useEffect, useState } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";

import type { ActivityDetail } from "../api/activities";
import { type StravaActivity, type StravaOutcome, stravaProblem } from "../api/strava";
import { t } from "../i18n";
import {
  color,
  fontSize,
  fontWeight,
  MIN_TAP_SIZE,
  radius,
  space,
} from "../theme/tokens";
import { ConnectWithStrava, StravaLine, StravaName } from "./StravaParts";
import { automaticName } from "./stravaName";
import { useStrava } from "./useStrava";

/** What the row knows of the run on Strava. */
type Known =
  | { kind: "asking" }
  | { kind: "known"; activity: StravaActivity }
  | { kind: "sending" };

const NOT_SENT: Known = { kind: "known", activity: { status: "not_sent", url: null } };

/**
 * Strava on a run of «My activities» (TASK-187), on its card: «View on
 * Strava» once it is there, «Send to Strava» with its name before. Nothing
 * when the API has no Strava; «Connect with Strava» before the athlete is.
 */
export function StravaActivityRow({ activity }: { activity: ActivityDetail }) {
  const strava = useStrava();
  const { status, busy, activityOf, send } = strava;
  const connected = status.available && status.connected;
  const [known, setKnown] = useState<Known>({ kind: "asking" });
  const [problem, setProblem] = useState<string | null>(null);
  const [name, setName] = useState("");

  useEffect(() => {
    if (!connected) {
      return;
    }
    let shown = true;
    void activityOf(activity.id).then((outcome) => {
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
  }, [activity.id, activityOf, connected]);

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

  function sendNow() {
    setProblem(null);
    setKnown({ kind: "sending" });
    void send(activity.id, name.trim() === "" ? null : name.trim()).then(heard);
  }

  switch (known.kind) {
    case "asking":
      // Nothing to offer until the API says what Strava has.
      return null;
    case "sending":
      return (
        <View style={styles.block}>
          <Button text={t("Sending to Strava…")} disabled />
        </View>
      );
    case "known":
      if (known.activity.status === "sent") {
        const { url } = known.activity;
        return (
          <View style={styles.block}>
            {url !== null ? (
              <Button
                text={t("View on Strava")}
                onPress={() => void Linking.openURL(url).catch(() => {})}
              />
            ) : (
              <StravaLine text={t("This run is on Strava.")} />
            )}
          </View>
        );
      }
      if (known.activity.status === "processing") {
        return (
          <View style={styles.block}>
            <StravaLine text={t("Strava is still reading this run.")} />
            <Button text={t("Check again")} onPress={sendNow} />
          </View>
        );
      }
      return (
        <View style={styles.block}>
          <StravaName
            value={name}
            onChange={setName}
            automatic={automaticName(activity)}
          />
          <Button text={t("Send to Strava")} onPress={sendNow} />
          {problem !== null && <StravaLine text={problem} alert />}
        </View>
      );
  }
}

/** Neutral, as the other buttons of the card: the orange is «Connect»'s. */
function Button({
  text,
  onPress,
  disabled = false,
}: {
  text: string;
  onPress?: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      style={[styles.button, disabled && styles.busy]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled, busy: disabled }}
    >
      <Text style={styles.buttonText}>{text}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  block: {
    gap: space.sm,
    paddingTop: space.xs,
  },
  button: {
    minHeight: MIN_TAP_SIZE,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: space.xl,
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
  busy: {
    opacity: 0.6,
  },
});
