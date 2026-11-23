import type { Gear } from "@shaperoute/shared-types";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { sessionEnded } from "../account/messages";
import { fetchPostGear } from "../api/postGear";
import { t } from "../i18n";
import { useFollowsDoor } from "../social/followsDoor";
import { color, font, MIN_TAP_SIZE } from "../theme/tokens";
import { Tap } from "../ui/Tap";
import { distanceLabel } from "../units/format";
import type { Units } from "../units/units";
import { useUnits } from "../units/useUnits";
import { gearTitle, hoursLabel, lookOf } from "./gearKinds";
import { GEAR_ON } from "./gearOn";
import { GearSheet } from "./GearSheet";

type Props = {
  /** The post. */
  drawingId: string;
  /** Who posted it, for «Report» and «Block» on an item that is not one's own. */
  author: { public_id: string; username: string };
  /** For the tests: the fake fetch, the API's key, and GEAR_ON. */
  fetchFn?: typeof fetch;
  apiKey?: string | null;
  on?: boolean;
};

/** "412 km", "12 h": what an item has done, the kind's measure only. */
export function measureLabel(
  item: Pick<Gear, "kind" | "totals">,
  units: Units,
): string {
  return lookOf(item.kind).measure === "distance"
    ? distanceLabel(item.totals.distance_m, units)
    : hoursLabel(item.totals.duration_s);
}

/**
 * The gear of a post (TASK-486 part E, ADR-0393, the user's choice 6), in
 * its detail and never on the Feed card: a small line an item, «👟 Pegasus
 * 41 · 412 km», that opens the item's sheet. The items «Hide from profile»
 * are not there (the API leaves them out). Nothing while they come, for a
 * post without gear, from an API of before (404), or with GEAR_ON off.
 */
export function PostGear({ drawingId, author, fetchFn, apiKey, on = GEAR_ON }: Props) {
  const { apiUrl, account } = useFollowsDoor();
  const { state, sessionEnded: onSessionEnded } = account;
  const token = state.status === "signedIn" ? state.session.token : null;
  const me =
    state.status === "signedIn" ? (state.session.user.public_id ?? null) : null;
  const units = useUnits();
  const asked = `${token} ${drawingId}`;
  // The gear of one post, asked with one token.
  const [answer, setAnswer] = useState<{ asked: string; gear: Gear[] } | null>(null);
  const [opened, setOpened] = useState<Gear | null>(null);

  useEffect(() => {
    if (!on || apiUrl === null || token === null) {
      return;
    }
    let live = true;
    void fetchPostGear(apiUrl, token, drawingId, { fetchFn, key: apiKey }).then(
      (outcome) => {
        if (!live) {
          return;
        }
        if (outcome.kind === "ok" && outcome.value !== null) {
          setAnswer({ asked, gear: outcome.value });
        } else if (sessionEnded(outcome)) {
          onSessionEnded(token);
        }
      },
    );
    return () => {
      live = false;
    };
  }, [apiKey, apiUrl, asked, drawingId, fetchFn, on, onSessionEnded, token]);

  const gear = on && answer?.asked === asked ? answer.gear : [];
  if (apiUrl === null || token === null || gear.length === 0) {
    return null;
  }
  return (
    <View style={styles.list} testID="post-gear">
      {gear.map((item) => {
        const look = lookOf(item.kind);
        const title = gearTitle(item);
        const measure = measureLabel(item, units);
        return (
          <Tap
            key={item.id}
            style={styles.line}
            onPress={() => setOpened(item)}
            accessibilityRole="button"
            accessibilityLabel={`${t(look.name)}, ${title}, ${measure}`}
            testID={`post-gear-${item.id}`}
          >
            <Text style={styles.text} numberOfLines={1}>
              {`${look.emoji} ${title} · ${measure}`}
            </Text>
          </Tap>
        );
      })}
      {opened !== null && (
        <GearSheet
          item={opened}
          owner={author.public_id === me ? null : author}
          apiUrl={apiUrl}
          token={token}
          onSessionEnded={onSessionEnded}
          onClose={() => setOpened(null)}
          fetchFn={fetchFn}
          apiKey={apiKey}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    alignItems: "flex-start",
  },
  line: {
    minHeight: MIN_TAP_SIZE,
    justifyContent: "center",
  },
  text: {
    ...font.small,
    color: color.textMuted,
  },
});
