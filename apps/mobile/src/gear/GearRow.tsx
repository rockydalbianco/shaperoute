import type { Gear } from "@shaperoute/shared-types";
import { Image, StyleSheet, Text, View } from "react-native";

import { gearPhotoSource } from "../api/gear";
import { t } from "../i18n";
import { color, fontSize, fontWeight, radius, space } from "../theme/tokens";
import { Tap } from "../ui/Tap";
import { useUnits } from "../units/useUnits";
import { gearSubtitle, gearTitle, lookOf, pastLimit, totalsLabel } from "./gearKinds";
import type { GearApi } from "./GearSetting";

type Props = {
  item: Gear;
  token: string;
  api: Pick<GearApi, "baseUrl" | "key">;
  onPress: () => void;
  testID?: string;
};

/**
 * An item in a list (TASK-486, ADR-0393): its photo or its kind's emoji,
 * its name, brand and model, its totals, and «Past its limit» to its owner.
 * The page of «Gear» (part B) and the profile (part D) show it.
 */
export function GearRow({ item, token, api, onPress, testID }: Props) {
  const units = useUnits();
  const look = lookOf(item.kind);
  const title = gearTitle(item);
  const totals = totalsLabel(item, units);
  const past = pastLimit(item);
  return (
    <Tap
      style={styles.row}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={[
        title,
        gearSubtitle(item),
        totals,
        past ? t("Past its limit") : "",
      ]
        .filter(Boolean)
        .join(", ")}
      testID={testID}
    >
      {item.photo_url !== undefined && api.baseUrl !== null ? (
        <Image
          style={styles.photo}
          source={gearPhotoSource(api.baseUrl, token, item.photo_url, api.key)}
          resizeMode="cover"
          accessibilityIgnoresInvertColors
        />
      ) : (
        <View style={styles.photo}>
          <Text style={styles.emoji}>{look.emoji}</Text>
        </View>
      )}
      <View style={styles.words}>
        <Text style={styles.name} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.sub} numberOfLines={1}>
          {gearSubtitle(item)}
        </Text>
        <Text style={styles.totals}>{totals}</Text>
        {past && <Text style={styles.limit}>{t("Past its limit")}</Text>}
      </View>
      <Text style={styles.arrow}>›</Text>
    </Tap>
  );
}

const PHOTO_SIDE = 64;

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    padding: space.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
  photo: {
    width: PHOTO_SIDE,
    height: PHOTO_SIDE,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: color.surfaceRaised,
  },
  emoji: {
    fontSize: fontSize.input + space.md,
  },
  words: {
    flex: 1,
    gap: 2,
  },
  name: {
    color: color.text,
    fontSize: fontSize.input,
    fontWeight: fontWeight.semibold,
  },
  sub: {
    color: color.textMuted,
    fontSize: fontSize.small,
  },
  totals: {
    color: color.text,
    fontSize: fontSize.body,
  },
  limit: {
    color: color.error,
    fontSize: fontSize.small,
    fontWeight: fontWeight.semibold,
  },
  arrow: {
    color: color.textMuted,
    fontSize: fontSize.input,
  },
});
