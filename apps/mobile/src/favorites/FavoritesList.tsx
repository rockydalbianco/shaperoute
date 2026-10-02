import { useEffect } from "react";
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";

import type { Favorite } from "../api/favorites";
import { cardWidth, RouteCard } from "../explore/RouteCard";
import {
  color,
  fontSize,
  fontWeight,
  MIN_TAP_SIZE,
  radius,
  space,
} from "../theme/tokens";
import { HEART_EMPTY, HEART_KEPT } from "./FavoriteHeart";
import { favoriteHeading, favoritePlace, favoriteTitle } from "./favoriteRoute";
import { useFavoritesDoor } from "./favoritesDoor";

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/** "Kept 2 Oct 2026", on the phone's clock; "" for a date that is not one. */
export function keptOn(createdAt: string): string {
  const when = new Date(createdAt);
  if (Number.isNaN(when.getTime())) {
    return "";
  }
  return `Kept ${when.getDate()} ${MONTHS[when.getMonth()]} ${when.getFullYear()}`;
}

function detailOf(favorite: Favorite, opening: boolean): string {
  if (opening) {
    return "Opening…";
  }
  return favoritePlace(favorite) ?? keptOn(favorite.created_at);
}

type Props = {
  /** The room on each side of the list, taken from the screen's width. */
  margin: number;
};

/**
 * «Favorites» in «Profile» (TASK-171): the routes the account keeps, as the
 * cards of «Explore», two a row, the newest first. A card opens its route
 * on the map; its heart removes it.
 */
export function FavoritesList({ margin }: Props) {
  const favorites = useFavoritesDoor();
  const { width } = useWindowDimensions();
  const card = cardWidth(width - 2 * margin);
  const { refresh, clearProblem } = favorites;
  // As it is on the API now: another phone of the account may have changed it.
  useEffect(() => {
    clearProblem();
    refresh();
  }, [clearProblem, refresh]);

  return (
    <View style={styles.list}>
      {favorites.problem !== null && (
        <Text style={styles.problem} accessibilityRole="alert">
          {favorites.problem}
        </Text>
      )}
      {favorites.list.length > 0 ? (
        <View style={styles.grid}>
          {favorites.list.map((favorite) => (
            <View key={favorite.id} style={{ width: card }}>
              <RouteCard
                width={card}
                line={favorite.preview}
                title={favoriteHeading(favorite)}
                detail={detailOf(favorite, favorites.opening === favorite.id)}
                match={favorite.similarity}
                onPress={() => favorites.open(favorite)}
                accessibilityLabel={`${favoriteHeading(favorite)}, open on the map`}
              />
              <Pressable
                style={styles.remove}
                onPress={() => favorites.remove(favorite.id)}
                accessibilityRole="button"
                accessibilityLabel={`Remove ${favoriteTitle(favorite)} from favorites`}
                hitSlop={space.sm}
              >
                <Text style={styles.heart}>{HEART_KEPT}</Text>
              </Pressable>
            </View>
          ))}
        </View>
      ) : favorites.status === "loading" ? (
        <Text style={styles.message}>Loading your favorites…</Text>
      ) : favorites.status === "failed" ? (
        <>
          <Text style={styles.message}>Your favorites could not load.</Text>
          <Pressable style={styles.button} onPress={refresh} accessibilityRole="button">
            <Text style={styles.buttonText}>Try again</Text>
          </Pressable>
        </>
      ) : (
        <Text style={styles.message}>
          {`No favorites yet. Tap ${HEART_EMPTY} on a route on the map to keep it here.`}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: space.md,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: space.md,
  },
  // Over the drawing, opposite the match: neutral, as every control that is
  // not the route's.
  remove: {
    position: "absolute",
    top: space.sm,
    left: space.sm,
    width: MIN_TAP_SIZE - space.sm,
    height: MIN_TAP_SIZE - space.sm,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.background,
  },
  heart: {
    color: color.text,
    fontSize: fontSize.input,
  },
  message: {
    color: color.textMuted,
    fontSize: fontSize.body,
  },
  problem: {
    color: color.error,
    fontSize: fontSize.body,
  },
  button: {
    minHeight: MIN_TAP_SIZE,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: color.surfaceRaised,
    borderWidth: 1,
    borderColor: color.borderStrong,
  },
  buttonText: {
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
});
