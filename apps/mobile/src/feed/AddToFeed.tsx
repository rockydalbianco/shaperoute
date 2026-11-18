import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AddPastActivity } from "../imports/AddPastActivity";
import { filePickerAvailable, type PickFile } from "../imports/pickActivityFile";
import { t } from "../i18n";
import {
  color,
  fontSize,
  fontWeight,
  MIN_TAP_SIZE,
  radius,
  space,
} from "../theme/tokens";
import { SheetModal } from "../ui/SheetModal";

type Props = {
  /** The fakes of the tests: whether the app was built with the file
   * picker, and the picker. */
  available?: boolean;
  pickFile?: PickFile;
};

/**
 * The «+» at the right of the Feed's bar (TASK-476): a sheet «Add activity»
 * with what an account can add to the Feed from outside the app. Today
 * «From a file», the GPX, TCX or FIT of another app, as «Add past activity»
 * of «My activities» (TASK-312, docs/IMPORTAZIONI.md): read on the phone,
 * then the form of the end of a run, marked «Imported». The sheet closes
 * once the run is kept, or the form discarded. In an app built without the
 * file picker there is nothing to add, and there is no «+».
 */
export function AddToFeed({ available = filePickerAvailable(), pickFile }: Props) {
  const [open, setOpen] = useState(false);
  const insets = useSafeAreaInsets();
  if (!available) {
    return null;
  }
  const close = () => setOpen(false);
  return (
    <>
      <Pressable
        style={({ pressed }) => [styles.plus, pressed && styles.pressed]}
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={t("Add activity")}
        hitSlop={space.xs}
        testID="feed-add"
      >
        <Text style={styles.plusText}>+</Text>
      </Pressable>
      <SheetModal visible={open} onRequestClose={close} dim testID="feed-add-sheet">
        <Pressable
          style={[styles.backdrop, { minHeight: insets.top + space.xl }]}
          onPress={close}
          accessible={false}
          importantForAccessibility="no"
          testID="feed-add-backdrop"
        />
        <View style={styles.sheet}>
          <View style={styles.head}>
            <Text style={styles.title} accessibilityRole="header">
              {t("Add activity")}
            </Text>
            <Pressable
              style={({ pressed }) => [styles.close, pressed && styles.pressed]}
              onPress={close}
              accessibilityRole="button"
              accessibilityLabel={t("Close")}
              testID="feed-add-close"
            >
              <Text style={styles.closeText}>✕</Text>
            </Pressable>
          </View>
          <ScrollView
            contentContainerStyle={[
              styles.content,
              { paddingBottom: insets.bottom + space.lg },
            ]}
            keyboardShouldPersistTaps="handled"
            automaticallyAdjustKeyboardInsets
          >
            <AddPastActivity opened onDone={close} pickFile={pickFile} />
          </ScrollView>
        </View>
      </SheetModal>
    </>
  );
}

const styles = StyleSheet.create({
  plus: {
    width: MIN_TAP_SIZE,
    height: MIN_TAP_SIZE,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: color.surface,
  },
  pressed: {
    opacity: 0.6,
  },
  plusText: {
    color: color.text,
    fontSize: fontSize.title,
    fontWeight: fontWeight.medium,
  },
  backdrop: {
    flexGrow: 1,
  },
  // Up to the top less the status bar: the form of a run is long. The
  // app's sheet: its radius, one physical pixel at the top (TASK-339 D).
  sheet: {
    flexShrink: 1,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: color.hairline,
    backgroundColor: color.surface,
  },
  head: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingLeft: space.lg,
    paddingRight: space.sm,
    paddingTop: space.sm,
  },
  title: {
    color: color.text,
    fontSize: fontSize.title,
    fontWeight: fontWeight.semibold,
  },
  close: {
    width: MIN_TAP_SIZE,
    height: MIN_TAP_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  closeText: {
    color: color.textMuted,
    fontSize: fontSize.body,
  },
  content: {
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
  },
});
