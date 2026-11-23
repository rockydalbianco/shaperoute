import type { Gear } from "@shaperoute/shared-types";
import { useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { gearPhotoSource } from "../api/gear";
import { t } from "../i18n";
import { ReportMenu } from "../social/ReportMenu";
import { color, font, radius, space } from "../theme/tokens";
import { SheetModal } from "../ui/SheetModal";
import { useUnits } from "../units/useUnits";
import { gearSubtitle, gearTitle, lookOf, totalsLabel } from "./gearKinds";

type Props = {
  item: Gear;
  /** Whose it is, for «Report» and «Block»; null: one's own, no «…». */
  owner: { public_id: string; username: string } | null;
  apiUrl: string;
  token: string;
  onSessionEnded: (token: string) => void;
  onClose: () => void;
  /** The fake fetch of the tests. */
  fetchFn?: typeof fetch;
  apiKey?: string | null;
};

/** "March 2025": the month an item was bought, in the phone's language. */
export function boughtLabel(day: string): string {
  const [year, month] = day.split("-").map(Number);
  if (!Number.isFinite(year) || !Number.isFinite(month)) {
    return day;
  }
  return new Date(Date.UTC(year, month - 1, 15)).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/**
 * The sheet of an item (TASK-486 part D, ADR-0393), as the sheet of a
 * tagged item: its photo, its name, brand and model, its totals, when it
 * was bought and its owner's note. Read only: an item changes in
 * «Settings», «Gear». The others can report it, or block its owner. The
 * profile opens it; the post detail (part E) and a tag (part F) will too.
 */
export function GearSheet({
  item,
  owner,
  apiUrl,
  token,
  onSessionEnded,
  onClose,
  fetchFn,
  apiKey,
}: Props) {
  const insets = useSafeAreaInsets();
  const units = useUnits();
  // Down first, then gone (TASK-388 C3), as the app's other sheets.
  const [open, setOpen] = useState(true);
  const close = () => setOpen(false);
  const look = lookOf(item.kind);
  return (
    <SheetModal visible={open} onRequestClose={close} onHidden={onClose}>
      <Pressable
        style={styles.backdrop}
        onPress={close}
        accessible={false}
        importantForAccessibility="no"
        testID="gear-sheet-backdrop"
      />
      <View
        style={[styles.sheet, { paddingBottom: insets.bottom + space.lg }]}
        testID="gear-sheet"
      >
        <View style={styles.top}>
          <Text style={styles.small}>
            {`${look.emoji} ${t(look.name)}`}
            {item.retired ? ` · ${t("Retired")}` : ""}
          </Text>
          {owner !== null && (
            <ReportMenu
              apiUrl={apiUrl}
              token={token}
              target={{ kind: "gear", id: item.id }}
              person={owner}
              onSessionEnded={onSessionEnded}
              fetchFn={fetchFn}
              apiKey={apiKey}
            />
          )}
        </View>
        {item.photo_url !== undefined && (
          <Image
            style={styles.photo}
            source={gearPhotoSource(apiUrl, token, item.photo_url, apiKey)}
            resizeMode="cover"
            accessibilityIgnoresInvertColors
            testID="gear-sheet-photo"
          />
        )}
        <Text style={styles.title} accessibilityRole="header">
          {gearTitle(item)}
        </Text>
        {item.name !== undefined && (
          <Text style={styles.body}>{gearSubtitle(item)}</Text>
        )}
        <Text style={styles.body}>{totalsLabel(item, units)}</Text>
        {item.bought_on !== undefined && (
          <View style={styles.line}>
            <Text style={styles.small}>{t("Bought")}</Text>
            <Text style={styles.body}>{boughtLabel(item.bought_on)}</Text>
          </View>
        )}
        {item.note !== undefined && (
          <View style={styles.line}>
            <Text style={styles.small}>{t("Note")}</Text>
            <Text style={styles.body}>{item.note}</Text>
          </View>
        )}
      </View>
    </SheetModal>
  );
}

const PHOTO_HEIGHT = 180;

// As the sheet of a tagged item (`social/outfit/OutfitTagSheet`).
const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
  },
  sheet: {
    gap: space.sm,
    padding: space.lg,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: color.hairline,
    backgroundColor: color.surface,
  },
  top: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  photo: {
    width: "100%",
    height: PHOTO_HEIGHT,
    borderRadius: radius.md,
    backgroundColor: color.surfaceRaised,
  },
  title: {
    ...font.cardTitle,
    color: color.text,
  },
  body: {
    ...font.body,
    color: color.text,
  },
  small: {
    ...font.small,
    color: color.textMuted,
  },
  line: {
    gap: 2,
  },
});
