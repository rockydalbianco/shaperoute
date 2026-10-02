import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

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
 * runs.
 */
export function RunEnd({ onSave, onDiscard }: Props) {
  const { signedIn, signIn } = useActivitiesDoor();
  // «Discard» asks first, here: a run thrown away does not come back.
  const [confirming, setConfirming] = useState(false);
  const [failed, setFailed] = useState(false);
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
          onPress={() => setFailed(!onSave())}
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
