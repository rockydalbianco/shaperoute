import { type ReactNode, useEffect, useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { color, radius, space } from "../theme/tokens";
import { SheetModal } from "../ui/SheetModal";

type Props = {
  visible: boolean;
  /** A tap over the sheet, or Android's back. */
  onClose: () => void;
  testID?: string;
  children: ReactNode;
};

/**
 * A sheet from the bottom over a run of «My activities» (TASK-456): its
 * menu, or the form of its post. The screen behind darkens, and a tap on
 * it closes the sheet. It is as high as what it holds, never higher than
 * the screen under the status bar; with the keyboard up it stands on the
 * keyboard, and what it holds gets shorter.
 */
export function ActivitySheet({ visible, onClose, testID, children }: Props) {
  return (
    <SheetModal visible={visible} onRequestClose={onClose} dim testID={testID}>
      <Body onClose={onClose} testID={testID}>
        {children}
      </Body>
    </SheetModal>
  );
}

/** Mounted with the sheet: the insets and the keyboard are asked for only
 * while it is open. */
function Body({ onClose, testID, children }: Omit<Props, "visible">) {
  const insets = useSafeAreaInsets();
  const typing = useKeyboardShown();
  return (
    <KeyboardAvoidingView
      style={[styles.fill, { paddingTop: insets.top }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* What a screen reader finds is the sheet's own way out. */}
      <Pressable
        style={styles.backdrop}
        onPress={onClose}
        accessible={false}
        importantForAccessibility="no"
        testID={testID === undefined ? undefined : `${testID}-backdrop`}
      />
      <View
        style={[
          styles.sheet,
          { paddingBottom: (typing ? 0 : insets.bottom) + space.sm },
        ]}
      >
        {children}
      </View>
    </KeyboardAvoidingView>
  );
}

/** True while the keyboard is up: the sheet's bottom is then its top. */
function useKeyboardShown(): boolean {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    // iOS says it before it moves, Android only after.
    const ios = Platform.OS === "ios";
    const up = Keyboard.addListener(ios ? "keyboardWillShow" : "keyboardDidShow", () =>
      setShown(true),
    );
    const down = Keyboard.addListener(
      ios ? "keyboardWillHide" : "keyboardDidHide",
      () => setShown(false),
    );
    return () => {
      up.remove();
      down.remove();
    };
  }, []);
  return shown;
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  // Clear: the darkening is the sheet's own (SheetModal, `dim`).
  backdrop: {
    flex: 1,
  },
  // Gets shorter before it leaves the screen: what it holds scrolls.
  sheet: {
    flexShrink: 1,
    gap: space.sm,
    padding: space.lg,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    borderTopWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
});
