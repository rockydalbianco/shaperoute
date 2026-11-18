import type { Direction } from "@shaperoute/shared-types";
import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { apiUrl } from "../api/apiUrl";
import { requestDirections } from "../api/routeDirections";
import type { Keepable } from "../favorites/favoriteRoute";
import { useFavoritesDoor } from "../favorites/favoritesDoor";
import { t } from "../i18n";
import { isPlacedFree } from "../snow/snow";
import { color, fontSize, MIN_TAP_SIZE, radius, space } from "../theme/tokens";
import { type WatchLink, watchLink } from "./watchLink";
import { MAX_WATCH_POINTS, routeToSendOf, watchRouteOf } from "./watchRoute";

/** A watch as text, not as an emoji: the app has no icons. */
export const WATCH_GLYPH = "⌚︎";

/** How long «Sent to your watch» stays, in ms. */
export const SENT_MS = 3000;

type Props = {
  /** The route on the map, as the heart keeps it; null while there is none. */
  route: Keepable | null;
  link?: WatchLink | null;
  baseUrl?: string | null;
  fetchFn?: typeof fetch;
  now?: () => number;
};

type Sending = "idle" | "sending" | "sent" | "failed";

/**
 * «Send to watch» under the heart (TASK-370 part B3a, ADR-0314, the
 * user's choice «Pulsante e preferiti»): the route on the map goes to the
 * Apple Watch, to be followed there without the phone. Its directions are
 * asked for as a run asks for them at its start, none on the water; the
 * route goes with transferUserInfo, so it arrives also when the watch is
 * away or asleep. Shown only with a watch paired that has the app, and for
 * a route the watch can keep.
 */
export function SendToWatchButton({
  route,
  link = watchLink(),
  baseUrl = apiUrl(),
  fetchFn,
  now = Date.now,
}: Props) {
  const favorites = useFavoritesDoor();
  const [ready, setReady] = useState(false);
  // What was sent, for which route: a new route on the map has sent nothing.
  const [sent, setSent] = useState<{ id: string | null; state: Sending }>({
    id: null,
    state: "idle",
  });
  const sending: Sending = sent.id === (route?.id ?? null) ? sent.state : "idle";
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let open = true;
    link
      ?.ready()
      .then((answer) => {
        if (open) {
          setReady(answer);
        }
      })
      .catch(() => {});
    return () => {
      open = false;
    };
  }, [link]);

  useEffect(
    () => () => {
      if (timer.current !== null) {
        clearTimeout(timer.current);
      }
    },
    [],
  );

  if (
    link === null ||
    !ready ||
    route === null ||
    route.request.points.length < 2 ||
    route.request.points.length > MAX_WATCH_POINTS
  ) {
    return null;
  }
  const kept = route;
  const watch = link;

  function show(state: Sending) {
    setSent({ id: kept.id, state });
    if (timer.current !== null) {
      clearTimeout(timer.current);
    }
    timer.current = setTimeout(() => setSent({ id: kept.id, state: "idle" }), SENT_MS);
  }

  async function directionsOf(): Promise<readonly Direction[] | null> {
    // No turns on the water or the snow (TASK-413 B).
    if (isPlacedFree(kept.request.activity)) {
      return [];
    }
    if (baseUrl === null) {
      return null;
    }
    const outcome = await requestDirections(baseUrl, kept.request.points, { fetchFn });
    return outcome.kind === "directions" ? outcome.directions : null;
  }

  async function send() {
    setSent({ id: kept.id, state: "sending" });
    const directions = await directionsOf();
    const made =
      directions === null ? null : watchRouteOf(routeToSendOf(kept, directions));
    if (made === null) {
      show("failed");
      return;
    }
    watch.transfer({
      type: "route",
      route: made,
      favorite: favorites.has(kept.id),
      at: now(),
    });
    show("sent");
  }

  return (
    <View style={styles.column} pointerEvents="box-none">
      <Pressable
        style={({ pressed }) => [styles.round, pressed && styles.pressed]}
        onPress={() => void send()}
        disabled={sending === "sending"}
        accessibilityRole="button"
        accessibilityLabel={t("Send to watch")}
        accessibilityState={{ busy: sending === "sending" }}
      >
        <Text style={styles.glyph}>{WATCH_GLYPH}</Text>
      </Pressable>
      {(sending === "sent" || sending === "failed") && (
        <Text style={styles.note} accessibilityLiveRegion="polite">
          {t(
            sending === "sent"
              ? "Sent to your watch"
              : "No connection. Check the network and try again.",
          )}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  column: {
    alignItems: "flex-end",
    gap: space.xs,
  },
  // As the heart and «Send to a friend» above it (FavoriteHeart.tsx).
  round: {
    width: MIN_TAP_SIZE,
    height: MIN_TAP_SIZE,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.borderStrong,
    backgroundColor: color.surfaceRaised,
  },
  glyph: {
    color: color.text,
    fontSize: fontSize.title,
  },
  pressed: {
    opacity: 0.6,
  },
  note: {
    maxWidth: 200,
    paddingHorizontal: space.sm,
    paddingVertical: space.xs,
    borderRadius: radius.md,
    backgroundColor: color.surfaceRaised,
    color: color.text,
    fontSize: fontSize.small,
    textAlign: "right",
  },
});
