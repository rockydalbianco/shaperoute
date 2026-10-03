import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { titleOf } from "../api/drawings";
import { showSavedLogo } from "../intro/SavedLogo";
import {
  DrawingTitle,
  PUBLIC_AT_END,
  PublicLine,
  PublicSwitch,
} from "../social/PublicParts";
import { loadSendToStrava, saveSendToStrava } from "../strava/stravaChoice";
import { StravaRunEnd } from "../strava/StravaRunEnd";
import { useStrava } from "../strava/useStrava";
import {
  color,
  fontSize,
  fontWeight,
  MIN_TAP_SIZE,
  radius,
  space,
} from "../theme/tokens";
import { SIGN_IN_TO_KEEP_RUNS, useActivitiesDoor } from "./activitiesDoor";

type Props = {
  /** «Save»: the run goes to «My activities». False when it could not even
   * be kept on the phone: the screen stays, and says so. */
  onSave: () => boolean;
  /** «Discard», after a yes: the run is gone for good. */
  onDiscard: () => void;
};

/**
 * The way out of a run that ended, under its card (TASK-172): with an
 * account, «Save» keeps it in «My activities» and «Discard» throws it
 * away, after asking. Nothing is saved without «Save». Without an account
 * the card keeps its «Done», and a line here says how to keep the next
 * runs. With Strava connected, «Send to Strava» over them sends the run
 * there too, with «Save» (TASK-187). Over all of them «Public» and the
 * run's «Title» (TASK-117): with «Save» the run becomes a drawing in the
 * profile, and the title names it, on Strava too.
 */
export function RunEnd({ onSave, onDiscard }: Props) {
  const { signedIn, signIn, toStrava, toDrawing } = useActivitiesDoor();
  const strava = useStrava();
  // «Discard» asks first, here: a run thrown away does not come back.
  const [confirming, setConfirming] = useState(false);
  const [failed, setFailed] = useState(false);
  // As it was left at the end of the last run (the user's choice).
  const [send, setSend] = useState(loadSendToStrava);
  // Off at every run, whatever the last one chose (the user's choice):
  // publishing by mistake costs more than forgetting to.
  const [publicOn, setPublicOn] = useState(false);
  const [title, setTitle] = useState("");

  function save() {
    const typed = titleOf(title);
    const sending = strava.status.available && strava.status.connected && send;
    toStrava(sending ? { name: typed } : null);
    toDrawing(publicOn || typed !== null ? { title: typed, public: publicOn } : null);
    const kept = onSave();
    setFailed(!kept);
    if (kept) {
      // The Sgrava logo, over the app, says the run is kept (TASK-212).
      showSavedLogo();
    }
  }

  if (!signedIn) {
    return (
      <Pressable style={styles.tap} onPress={signIn} accessibilityRole="button">
        <Text style={[styles.line, styles.link]}>{SIGN_IN_TO_KEEP_RUNS}</Text>
      </Pressable>
    );
  }
  if (confirming) {
    return (
      <View style={styles.end}>
        <Text style={styles.question}>Discard this run? It will not be saved.</Text>
        <View style={styles.buttons}>
          <Pressable
            style={styles.button}
            onPress={() => setConfirming(false)}
            accessibilityRole="button"
          >
            <Text style={styles.buttonText}>Keep it</Text>
          </Pressable>
          <Pressable
            style={[styles.button, styles.danger]}
            onPress={onDiscard}
            accessibilityRole="button"
          >
            <Text style={[styles.buttonText, styles.dangerText]}>Discard run</Text>
          </Pressable>
        </View>
      </View>
    );
  }
  return (
    <View style={styles.end}>
      <PublicSwitch on={publicOn} onChange={setPublicOn} />
      {publicOn && <PublicLine text={PUBLIC_AT_END} />}
      <DrawingTitle value={title} onChange={setTitle} />
      <StravaRunEnd
        strava={strava}
        send={send}
        onSend={(on) => {
          setSend(on);
          saveSendToStrava(on);
        }}
      />
      {failed && (
        <Text style={styles.problem} accessibilityRole="alert">
          This run could not be kept on the phone. Try again.
        </Text>
      )}
      <View style={styles.buttons}>
        <Pressable
          style={styles.button}
          onPress={() => setConfirming(true)}
          accessibilityRole="button"
        >
          <Text style={[styles.buttonText, styles.dangerText]}>Discard</Text>
        </Pressable>
        <Pressable
          style={styles.button}
          onPress={save}
          accessibilityRole="button"
          accessibilityLabel="Save to My activities"
        >
          <Text style={styles.buttonText}>Save</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  end: {
    gap: space.sm,
    paddingTop: space.md,
  },
  buttons: {
    flexDirection: "row",
    gap: space.sm,
  },
  // Neutral, as every button of the end of a run: the yellow is the
  // route's (docs/UI.md, «Il tema»).
  button: {
    flex: 1,
    minHeight: MIN_TAP_SIZE,
    alignItems: "center",
    justifyContent: "center",
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
  danger: {
    borderColor: color.error,
  },
  dangerText: {
    color: color.error,
  },
  question: {
    color: color.text,
    fontSize: fontSize.body,
  },
  problem: {
    color: color.error,
    fontSize: fontSize.small,
  },
  tap: {
    minHeight: MIN_TAP_SIZE,
    justifyContent: "center",
  },
  line: {
    paddingTop: space.sm,
    color: color.textMuted,
    fontSize: fontSize.small,
  },
  link: {
    color: color.text,
    textDecorationLine: "underline",
  },
});
