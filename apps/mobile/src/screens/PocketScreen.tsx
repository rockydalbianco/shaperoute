import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { Alert, Modal, Pressable, StyleSheet, Text } from "react-native";

import { color, fontSize, space } from "../theme/tokens";

/** How long to hold the black screen to leave pocket mode, in milliseconds. */
export const HOLD_MS = 2000;

export const POCKET_WARNING_TITLE = "Pocket mode";
export const POCKET_WARNING =
  "The screen goes dark but stays on, so directions go on. " +
  "Do not lock the phone: if you press the side button, directions stop. " +
  "To come back, hold the screen for 2 seconds.";

let warned = false;

/** Forgets the warning was shown: for tests only. */
export function resetPocketWarning(): void {
  warned = false;
}

/**
 * Asks before the first pocket mode of this app run (TASK-070): locking the
 * phone stops directions, and that must be said once, before it happens.
 * Afterwards pocket mode starts straight away.
 */
export function confirmPocketMode(enter: () => void): void {
  if (warned) {
    enter();
    return;
  }
  Alert.alert(POCKET_WARNING_TITLE, POCKET_WARNING, [
    { text: "Cancel", style: "cancel" },
    {
      text: "Go dark",
      onPress: () => {
        warned = true;
        enter();
      },
    },
  ]);
}

/**
 * The black screen of pocket mode: it covers everything, ignores taps and
 * swipes, and gives the app back only to a hold of HOLD_MS. The one line of
 * text is faint and at minimum brightness it barely shows, but it is there
 * when the phone comes out of the pocket.
 */
export function PocketScreen({ on, onExit }: { on: boolean; onExit: () => void }) {
  const [holding, setHolding] = useState(false);
  return (
    <Modal
      visible={on}
      animationType="none"
      statusBarTranslucent
      // Android's back button does not leave pocket mode: only the hold does.
      onRequestClose={() => {}}
    >
      <StatusBar hidden={on} />
      <Pressable
        style={styles.screen}
        delayLongPress={HOLD_MS}
        onPressIn={() => setHolding(true)}
        onPressOut={() => setHolding(false)}
        onLongPress={() => {
          setHolding(false);
          onExit();
        }}
        accessibilityRole="button"
        accessibilityLabel="Pocket mode. Hold for 2 seconds to leave."
      >
        <Text style={styles.hint}>
          {holding ? "Keep holding…" : "Hold for 2 seconds to leave pocket mode"}
        </Text>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
    padding: space.xl,
    backgroundColor: color.background,
  },
  hint: {
    color: color.textFaint,
    fontSize: fontSize.small,
    marginBottom: space.xl,
  },
});
