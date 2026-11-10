import { type ReactNode, useEffect } from "react";
import { BackHandler, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { t } from "../i18n";
import { MessagesPage } from "../tabs/MessagesPage";
import { color, font, MIN_TAP_SIZE, space } from "../theme/tokens";

type Props = {
  onBack: () => void;
  /** The list of the conversations: the app's own unless a test says otherwise. */
  children?: ReactNode;
};

/**
 * «Messages» in the ski mode (TASK-429 part A, ADR-0357): no tab of the
 * bar, so the button of the header opens them over the app, and «Back», or
 * the phone's back, comes back to the page it was opened from. Inside, the
 * page of the tab as it is.
 */
export function SkiMessages({ onBack, children }: Props) {
  const insets = useSafeAreaInsets();
  useEffect(() => {
    const listener = BackHandler.addEventListener("hardwareBackPress", () => {
      onBack();
      return true;
    });
    return () => listener.remove();
  }, [onBack]);
  return (
    <View style={[styles.page, { paddingTop: insets.top }]} testID="ski-messages-page">
      <Pressable
        style={styles.back}
        onPress={onBack}
        accessibilityRole="button"
        testID="ski-messages-back"
      >
        <Text style={styles.backText}>{`‹ ${t("Back")}`}</Text>
      </Pressable>
      <View style={styles.list}>{children ?? <MessagesPage active />}</View>
    </View>
  );
}

// As the page of a resort (`../ski/ResortPage`): «Back» at the top left.
const styles = StyleSheet.create({
  page: {
    ...StyleSheet.absoluteFill,
    backgroundColor: color.background,
  },
  back: {
    minHeight: MIN_TAP_SIZE,
    justifyContent: "center",
    paddingHorizontal: space.lg,
    alignSelf: "flex-start",
  },
  backText: {
    ...font.body,
    color: color.text,
  },
  list: {
    flex: 1,
  },
});
