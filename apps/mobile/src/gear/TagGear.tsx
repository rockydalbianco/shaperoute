import type { Gear } from "@shaperoute/shared-types";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { sessionEnded } from "../account/messages";
import { fetchGearItem } from "../api/gearItem";
import { t } from "../i18n";
import { color, font, MIN_TAP_SIZE } from "../theme/tokens";
import { Tap } from "../ui/Tap";
import { distanceLabel } from "../units/format";
import { useUnits } from "../units/useUnits";
import { gearTitle, hoursLabel, lookOf } from "./gearKinds";
import { GEAR_ON } from "./gearOn";
import { GearSheet } from "./GearSheet";

type Props = {
  /** The item of gear the tag is. */
  gearId: string;
  /** Whose it is, for «Report» and «Block»; null: one's own, no «…». */
  owner: { public_id: string; username: string } | null;
  apiUrl: string;
  token: string;
  onSessionEnded: (token: string) => void;
  /** For the tests: the fake fetch, the API's key, and GEAR_ON. */
  fetchFn?: typeof fetch;
  apiKey?: string | null;
  on?: boolean;
};

/**
 * The item of gear a tagged item is (TASK-486 part F, ADR-0393), in the
 * sheet of its dot: a small line, «👟 The red ones · 412 km», that opens
 * the item's sheet; «Shop» stays as it is. Nothing while it comes, for an
 * item one does not see (the API sends its id only to whoever does, and
 * answers 404 to the others), or with GEAR_ON off.
 */
export function TagGear({
  gearId,
  owner,
  apiUrl,
  token,
  onSessionEnded,
  fetchFn,
  apiKey,
  on = GEAR_ON,
}: Props) {
  const units = useUnits();
  const asked = `${token} ${gearId}`;
  const [answer, setAnswer] = useState<{ asked: string; item: Gear } | null>(null);
  const [opened, setOpened] = useState(false);

  useEffect(() => {
    if (!on) {
      return;
    }
    let live = true;
    void fetchGearItem(apiUrl, token, gearId, { fetchFn, key: apiKey }).then(
      (outcome) => {
        if (!live) {
          return;
        }
        if (outcome.kind === "ok" && outcome.value !== null) {
          setAnswer({ asked, item: outcome.value });
        } else if (sessionEnded(outcome)) {
          onSessionEnded(token);
        }
      },
    );
    return () => {
      live = false;
    };
  }, [apiKey, apiUrl, asked, fetchFn, gearId, on, onSessionEnded, token]);

  const item = on && answer?.asked === asked ? answer.item : null;
  if (item === null) {
    return null;
  }
  const look = lookOf(item.kind);
  const title = gearTitle(item);
  const measure =
    look.measure === "distance"
      ? distanceLabel(item.totals.distance_m, units)
      : hoursLabel(item.totals.duration_s);
  return (
    <View testID="tag-gear">
      <Tap
        style={styles.line}
        onPress={() => setOpened(true)}
        accessibilityRole="button"
        accessibilityLabel={`${t(look.name)}, ${title}, ${measure}`}
        testID="tag-gear-line"
      >
        <Text style={styles.text} numberOfLines={1}>
          {`${look.emoji} ${title} · ${measure}`}
        </Text>
      </Tap>
      {opened && (
        <GearSheet
          item={item}
          owner={owner}
          apiUrl={apiUrl}
          token={token}
          onSessionEnded={onSessionEnded}
          onClose={() => setOpened(false)}
          fetchFn={fetchFn}
          apiKey={apiKey}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  line: {
    minHeight: MIN_TAP_SIZE,
    justifyContent: "center",
    alignSelf: "flex-start",
  },
  text: {
    ...font.small,
    color: color.textMuted,
  },
});
