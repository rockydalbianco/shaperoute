import { Pressable, StyleSheet, Text } from "react-native";

import {
  color,
  fontSize,
  fontWeight,
  MIN_TAP_SIZE,
  radius,
  space,
} from "../theme/tokens";

type Props = {
  text: string;
  onPress?: () => void;
  /** The yellow of the main action (ADR-0046): one per screen. */
  main?: boolean;
  /** Working: shown, not pressable. */
  busy?: boolean;
};

/** A button of the post's screen (TASK-231), as the cards' buttons. */
export function PostButton({ text, onPress, main = false, busy = false }: Props) {
  return (
    <Pressable
      style={[styles.button, main && styles.main, busy && styles.busy]}
      onPress={onPress}
      disabled={busy}
      accessibilityRole="button"
      accessibilityState={{ disabled: busy, busy }}
    >
      <Text style={[styles.text, main && styles.mainText]}>{text}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flex: 1,
    minHeight: MIN_TAP_SIZE,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: space.lg,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.borderStrong,
    backgroundColor: color.surfaceRaised,
  },
  main: {
    borderColor: color.accent,
    backgroundColor: color.accent,
  },
  busy: {
    opacity: 0.6,
  },
  text: {
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
  mainText: {
    color: color.onAccent,
  },
});
