import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import {
  initialWindowMetrics,
  SafeAreaProvider,
  SafeAreaView,
} from "react-native-safe-area-context";

import { t } from "../i18n";
import { color, fontSize, fontWeight, MIN_TAP_SIZE, space } from "../theme/tokens";
import { NutritionPage } from "./NutritionPage";

type Props = {
  open: boolean;
  onClose: () => void;
};

/**
 * The «Nutrition» page in a window of its own, over what opened it
 * (TASK-489, ADR-0397): the tile of the sport panel (part B) and the
 * profile (part D2) open the same page. Closed, what was under it is there
 * again.
 */
export function NutritionWindow({ open, onClose }: Props) {
  return (
    <Modal
      visible={open}
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      {/* Its own edges, and mounted with the page: each opening starts
          on today. */}
      {open && (
        <SafeAreaProvider initialMetrics={initialWindowMetrics}>
          <SafeAreaView style={styles.page} edges={["top", "left", "right"]}>
            <View style={styles.bar}>
              <Pressable
                style={styles.close}
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel={t("Close")}
                testID="nutrition-close"
              >
                <Text style={styles.closeMark}>✕</Text>
              </Pressable>
            </View>
            <NutritionPage />
          </SafeAreaView>
        </SafeAreaProvider>
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: color.background,
  },
  bar: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: space.sm,
  },
  close: {
    width: MIN_TAP_SIZE,
    height: MIN_TAP_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  closeMark: {
    color: color.textMuted,
    fontSize: fontSize.input,
    fontWeight: fontWeight.semibold,
  },
});
