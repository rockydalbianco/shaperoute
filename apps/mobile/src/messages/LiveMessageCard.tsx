import type { MessageLiveCard, RunActivity } from "@shaperoute/shared-types";
import { StyleSheet, Text, View } from "react-native";

import { clockLabel } from "../feed/postSections";
import { t } from "../i18n";
import { activityName } from "../social/PublicParts";
import { color, fontSize, fontWeight, radius, space } from "../theme/tokens";
import { distanceLabel } from "../units/format";

/** Going on: «LIVE · Running · 3.2 km»; over: «Finished · 42.2 km ·
 * 3:28:10»; gone or not to be seen: «Live ended» (texts approved by the
 * user on 2026-11-12). */
export function liveCardLine(card: MessageLiveCard | null): string {
  if (card === null || card.status === "stopped" || card.status === "expired") {
    return t("Live ended");
  }
  const distance = distanceLabel(card.distance_m ?? 0);
  if (card.status === "finished") {
    return t("Finished · {distance} · {time}", {
      distance,
      time: clockLabel(card.duration_s ?? 0),
    });
  }
  return t("LIVE · {sport} · {distance}", {
    sport: activityName(card.activity as RunActivity),
    distance,
  });
}

/** Whether a tap opens it: while it can still be seen. */
export function liveCardOpens(card: MessageLiveCard | null): boolean {
  return card !== null && card.status !== "stopped" && card.status !== "expired";
}

/**
 * A live share in a message (TASK-468 part B1, ADR-0381): a red dot while it
 * goes on, its line; the bubble's tap opens it in the app (LiveViewScreen).
 */
export function LiveMessageCard({ card }: { card: MessageLiveCard | null }) {
  const going = card !== null && (card.status === "live" || card.status === "paused");
  return (
    <View style={styles.card} testID="message-live">
      {going && <View style={styles.dot} />}
      <Text style={[styles.line, !liveCardOpens(card) && styles.gone]}>
        {liveCardLine(card)}
      </Text>
    </View>
  );
}

const DOT = 8;

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    paddingVertical: space.xs,
    borderRadius: radius.md,
  },
  dot: {
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    backgroundColor: color.error,
  },
  line: {
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
  gone: {
    color: color.textMuted,
    fontWeight: fontWeight.regular,
  },
});
