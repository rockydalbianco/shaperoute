import type { Gear, OutfitItem } from "@shaperoute/shared-types";
import { StyleSheet, Text, View } from "react-native";

import { t } from "../i18n";
import { FilterChip } from "../search/FilterChip";
import { color, fontSize, space } from "../theme/tokens";
import { gearTitle, lookOf } from "./gearKinds";
import { GEAR_ON } from "./gearOn";
import type { GearApi } from "./GearSetting";
import { useMyGear } from "./GearPicker";

/** The kinds of gear worn on the feet: «Shoes» on a photo. */
const ON_THE_FEET: ReadonlySet<string> = new Set([
  "shoes",
  "boots",
  "climbing_shoes",
  "ski_boots",
]);

/**
 * What a tag on a photo says an item of gear is: shoes of every kind are
 * «Shoes», a backpack and a watch are themselves, the rest «Other»
 * (decided by the agent on the user's behalf, TASK-486 part F: a photo has
 * fewer kinds than the gear, and «Other» never says something wrong).
 */
export function outfitItemOf(kind: string): OutfitItem {
  if (ON_THE_FEET.has(kind)) {
    return "shoes";
  }
  return kind === "backpack" || kind === "watch" ? kind : "other";
}

/** What a tag takes from an item: its kind, brand and model, and its id. */
export function tagOfGear(item: Gear): {
  item: OutfitItem;
  brand: string;
  model: string;
  gearId: string;
} {
  return {
    item: outfitItemOf(item.kind),
    brand: item.brand,
    model: item.model ?? "",
    gearId: item.id,
  };
}

type Props = {
  /** The item the tag is now; null when none. */
  chosen: string | null;
  /** An item chosen, or null when the chosen one is touched again. */
  onChoose: (item: Gear | null) => void;
  /** For the tests: the API, its fake fetch and key, and GEAR_ON. */
  api?: Partial<GearApi>;
  on?: boolean;
};

/**
 * «From my gear» in the form of a tagged item (TASK-486 part F, ADR-0393):
 * a chip for each item in use, and the chosen one even if retired; one
 * chosen fills the kind, brand and model, and the tag keeps the item, whose
 * dot then opens it. Touched again, the tag lets it go and keeps what was
 * written. Nothing without items, or with GEAR_ON off.
 */
export function GearTagChoice({ chosen, onChoose, api, on = GEAR_ON }: Props) {
  const gear = useMyGear(api, on);
  const shown = (gear ?? []).filter((item) => !item.retired || item.id === chosen);
  if (shown.length === 0) {
    return null;
  }
  return (
    <View style={styles.block} testID="gear-tag-choice">
      <Text style={styles.label}>{t("From my gear")}</Text>
      <View style={styles.chips}>
        {shown.map((item) => (
          <FilterChip
            key={item.id}
            label={`${lookOf(item.kind).emoji} ${gearTitle(item)}`}
            selected={item.id === chosen}
            onPress={() => onChoose(item.id === chosen ? null : item)}
            testID={`gear-tag-${item.id}`}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    gap: space.xs,
  },
  // As the form's labels (`OutfitTagEditor`).
  label: {
    color: color.textMuted,
    fontSize: fontSize.small,
    marginTop: space.xs,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: space.xs,
  },
});
