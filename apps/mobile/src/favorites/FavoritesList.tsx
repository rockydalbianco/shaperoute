import { useEffect } from "react";
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";

import type { Favorite } from "../api/favorites";
import { cardWidth, RouteCard } from "../explore/RouteCard";
import { t, tLater } from "../i18n";
import {
  color,
  fontSize,
  fontWeight,
  MIN_TAP_SIZE,
  radius,
  space,
} from "../theme/tokens";
import { useUnits } from "../units/useUnits";
import { HEART_EMPTY, HEART_KEPT } from "./FavoriteHeart";
import { favoriteHeading, favoritePlace, favoriteTitle } from "./favoriteRoute";
import { useFavoritesDoor } from "./favoritesDoor";

// In English; shown with t() in the app's language (TASK-210).
const MONTHS = [
  tLater("Jan"),
  tLater("Feb"),
  tLater("Mar"),
  tLater("Apr"),
  tLater("May"),
  tLater("Jun"),
  tLater("Jul"),
  tLater("Aug"),
  tLater("Sep"),
  tLater("Oct"),
  tLater("Nov"),
  tLater("Dec"),
];

/** "Kept 2 Oct 2026", on the phone's clock; "" for a date that is not one. */
export function keptOn(createdAt: string): string {
  const when = new Date(createdAt);
  if (Number.isNaN(when.getTime())) {
    return "";
  }
  return t("Kept {day} {month} {year}", {
    day: String(when.getDate()),
    month: t(MONTHS[when.getMonth()]),
    year: String(when.getFullYear()),
  });
}

function detailOf(favorite: Favorite, opening: boolean): string {
  if (opening) {
    return t("Opening…");
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
  // The cards are written again when «Settings» changes the units (TASK-182).
  useUnits();
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
                accessibilityLabel={t("{title}, open on the map", {
                  title: favoriteHeading(favorite),
                })}
              />
              <Pressable
                style={styles.remove}
                onPress={() => favorites.remove(favorite.id)}
                accessibilityRole="button"
                accessibilityLabel={t("Remove {title} from favorites", {
                  title: favoriteTitle(favorite),
                })}
                hitSlop={space.sm}
              >
                <Text style={styles.heart}>{HEART_KEPT}</Text>
              </Pressable>
            </View>
          ))}
        </View>
      ) : favorites.status === "loading" ? (
        <Text style={styles.message}>{t("Loading your favorites…")}</Text>
      ) : favorites.status === "failed" ? (
        <>
          <Text style={styles.message}>{t("Your favorites could not load.")}</Text>
          <Pressable style={styles.button} onPress={refresh} accessibilityRole="button">
            <Text style={styles.buttonText}>{t("Try again")}</Text>
          </Pressable>
        </>
      ) : (
        <Text style={styles.message}>
          {t("No favorites yet. Tap {heart} on a route on the map to keep it here.", {
            heart: HEART_EMPTY,
          })}
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
