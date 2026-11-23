import type { Gear } from "@shaperoute/shared-types";
import { useState } from "react";
import { Modal, ScrollView, StyleSheet, Text, View } from "react-native";
import {
  initialWindowMetrics,
  SafeAreaProvider,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { t } from "../i18n";
import { color, fontSize, fontWeight, MIN_TAP_SIZE, space } from "../theme/tokens";
import { Tap } from "../ui/Tap";
import { GearEditor } from "./GearEditor";
import { GearRow } from "./GearRow";
import type { GearApi } from "./GearSetting";

type Props = {
  visible: boolean;
  onClose: () => void;
  gear: Gear[];
  /** Reads the list again, after an item is saved or deleted. */
  onChanged: () => void;
  token: string;
  api: GearApi;
  onSessionEnded: () => void;
};

/** Which item the editor holds: a new one, or one of the list. */
type Editing = { kind: "new" } | { kind: "item"; item: Gear } | null;

/**
 * The page of «Gear» (TASK-486 part B, ADR-0393): the items in use, then
 * the retired ones, each with its photo or its kind's emoji, its name and
 * its totals; «Add» on top. A tap opens the item to change it.
 */
export function GearPage({ visible, onClose, ...rest }: Props) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      {visible && (
        <SafeAreaProvider initialMetrics={initialWindowMetrics}>
          <Page onClose={onClose} {...rest} />
        </SafeAreaProvider>
      )}
    </Modal>
  );
}

function Page({
  onClose,
  gear,
  onChanged,
  token,
  api,
  onSessionEnded,
}: Omit<Props, "visible">) {
  const insets = useSafeAreaInsets();
  const [editing, setEditing] = useState<Editing>(null);
  const inUse = gear.filter((item) => !item.retired);
  const retired = gear.filter((item) => item.retired);
  return (
    <View style={[styles.page, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Tap style={styles.back} onPress={onClose} accessibilityRole="button">
          <Text style={styles.backText}>{t("Back")}</Text>
        </Tap>
        <Text style={styles.title} accessibilityRole="header">
          {t("Gear")}
        </Text>
        <Tap
          style={styles.add}
          onPress={() => setEditing({ kind: "new" })}
          accessibilityRole="button"
        >
          <Text style={styles.addText}>{t("Add")}</Text>
        </Tap>
      </View>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + space.xl },
        ]}
      >
        {gear.length === 0 && (
          <Text style={styles.intro}>
            {t(
              "Add your shoes, your bike, your skis and everything you use. Each activity you take them on adds to their kilometres and hours.",
            )}
          </Text>
        )}
        {inUse.map((item) => (
          <GearRow
            key={item.id}
            item={item}
            token={token}
            api={api}
            onPress={() => setEditing({ kind: "item", item })}
          />
        ))}
        {retired.length > 0 && (
          <Text style={styles.label} accessibilityRole="header">
            {t("Retired")}
          </Text>
        )}
        {retired.map((item) => (
          <GearRow
            key={item.id}
            item={item}
            token={token}
            api={api}
            onPress={() => setEditing({ kind: "item", item })}
          />
        ))}
      </ScrollView>
      <GearEditor
        visible={editing !== null}
        item={editing?.kind === "item" ? editing.item : null}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          onChanged();
        }}
        token={token}
        api={api}
        onSessionEnded={onSessionEnded}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: color.background,
  },
  header: {
    minHeight: MIN_TAP_SIZE + space.sm,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: space.md,
    gap: space.md,
  },
  back: {
    minHeight: MIN_TAP_SIZE,
    justifyContent: "center",
  },
  backText: {
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
  title: {
    flex: 1,
    color: color.text,
    fontSize: fontSize.input,
    fontWeight: fontWeight.bold,
  },
  add: {
    minHeight: MIN_TAP_SIZE,
    justifyContent: "center",
  },
  addText: {
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
  content: {
    gap: space.md,
    padding: space.md,
  },
  intro: {
    color: color.textMuted,
    fontSize: fontSize.body,
  },
  label: {
    marginTop: space.md,
    color: color.textMuted,
    fontSize: fontSize.label,
    fontWeight: fontWeight.semibold,
    letterSpacing: 1.2,
  },
});
