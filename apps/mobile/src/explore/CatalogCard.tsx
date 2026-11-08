import type { LatLon } from "@shaperoute/shared-types";
import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { HEART_EMPTY, HEART_KEPT } from "../favorites/FavoriteHeart";
import { turnedLine } from "../feed/turnedLine";
import { t } from "../i18n";
import { metresBetween } from "../map/coordinates";
import { bearingOf } from "../map/turnedMap";
import {
  color,
  font,
  fontSize,
  fontWeight,
  MIN_TAP_SIZE,
  radius,
  route as routeLine,
  space,
} from "../theme/tokens";
import { Tap } from "../ui/Tap";
import { distanceLabel, nearDistanceLabel } from "../units/format";
import type { Units } from "../units/units";
import { type CatalogRoute, countryName } from "./catalog";
import { cityName, routeTitle } from "./recommendedRoutes";
import { thumbSegments } from "./RouteThumb";
import { useTapNotSwipe } from "./useTapNotSwipe";

/** How tall the drawing is, for how wide: as the cards of «Explore». */
const DRAWING_RATIO = 0.78;
const LINE_WIDTH = 2.5;
const DRAWING_PAD = space.md;

type Props = {
  route: CatalogRoute;
  width: number;
  units: Units;
  /** Where the user is, for "450 m away"; without it the card says none. */
  near: LatLon | null;
  /** True when the route is among the favorites: the heart is full. */
  kept: boolean;
  /** A tap on the card: the route on the map. */
  onOpen: (route: CatalogRoute) => void;
  /** «Start»: the route on the map, ready to start. */
  onStart: (route: CatalogRoute) => void;
  /** The heart: keeps the route, or lets it go. */
  onHeart: (route: CatalogRoute) => void;
};

/** "Heart · 10.2 km", as the cards of «Best near you» say it. */
export function catalogTitle(route: CatalogRoute, units: Units): string {
  const name = routeTitle(route);
  return `${name.charAt(0).toUpperCase()}${name.slice(1)} · ${distanceLabel(route.route_m, units)}`;
}

/** "Trento · Italy · 450 m away"; without a country or a start, less. */
export function catalogDetail(
  route: CatalogRoute,
  near: LatLon | null,
  units: Units,
): string {
  const parts = [cityName(route.city)];
  if (route.country !== "") {
    parts.push(countryName(route.country));
  }
  if (near !== null) {
    parts.push(awayText(Math.round(metresBetween(near, route.start)), units));
  }
  return parts.join(" · ");
}

/** "450 m away", as the cards of «Best near you» (ExploreScreen.awayText,
 * not imported: that screen imports this card). */
function awayText(metres: number, units: Units): string {
  return t("{distance} away", { distance: nearDistanceLabel(metres, units) });
}

/**
 * A route of the catalog as a card (TASK-420, ADR-0348): the drawing in
 * yellow on the map's dark, its likeness in one corner and the heart in
 * the other, then what it is and where, and «Start». Two stand side by
 * side, as the cards of «Best near you» (ADR-0135); no map under the line:
 * there are hundreds. A tap opens the route; a finger that slides does not
 * (`useTapNotSwipe`). The drawing is turned back upright when its shape
 * was turned (TASK-232).
 */
export function CatalogCard({
  route,
  width,
  units,
  near,
  kept,
  onOpen,
  onStart,
  onHeart,
}: Props) {
  const height = Math.round(width * DRAWING_RATIO);
  const segments = useMemo(
    () =>
      thumbSegments(
        turnedLine(route.preview, bearingOf(route.rotation_deg)),
        width,
        height,
        DRAWING_PAD,
      ),
    [route.preview, route.rotation_deg, width, height],
  );
  const tap = useTapNotSwipe(() => onOpen(route));
  const title = catalogTitle(route, units);
  const detail = catalogDetail(route, near, units);
  return (
    <Tap
      style={[styles.card, { width }]}
      onPressIn={tap.onPressIn}
      onPress={tap.onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${detail}`}
      testID="catalog-card"
    >
      <View style={[styles.drawing, { width, height }]} testID="catalog-card-drawing">
        {segments.map((s, i) => (
          <View
            key={i}
            style={[
              styles.segment,
              {
                left: s.left,
                top: s.top - LINE_WIDTH / 2,
                width: s.length + LINE_WIDTH / 2,
                transform: [{ rotate: `${s.angle}deg` }],
              },
            ]}
          />
        ))}
        <View style={styles.match}>
          <Text style={styles.matchText}>{`${Math.round(route.similarity * 100)}%`}</Text>
        </View>
        <Pressable
          style={styles.heart}
          onPress={() => onHeart(route)}
          accessibilityRole="button"
          accessibilityLabel={t(kept ? "Remove from favorites" : "Add to favorites")}
          accessibilityState={{ selected: kept }}
          hitSlop={space.sm}
          testID="catalog-card-heart"
        >
          <Text style={[styles.heartText, kept && styles.heartKept]}>
            {kept ? HEART_KEPT : HEART_EMPTY}
          </Text>
        </Pressable>
      </View>
      <View style={styles.words}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.detail} numberOfLines={1}>
          {detail}
        </Text>
        <Tap
          style={styles.start}
          onPress={() => onStart(route)}
          accessibilityRole="button"
          accessibilityLabel={`${t("Start")}: ${title}`}
          testID="catalog-card-start"
        >
          <Text style={styles.startText}>{t("Start")}</Text>
        </Tap>
      </View>
    </Tap>
  );
}

const styles = StyleSheet.create({
  // The large radius and no border, as every card with a drawing (ADR-0293).
  card: {
    borderRadius: radius.xl,
    backgroundColor: color.surface,
    overflow: "hidden",
  },
  drawing: {
    backgroundColor: color.map.background,
  },
  segment: {
    position: "absolute",
    height: LINE_WIDTH,
    backgroundColor: routeLine.color,
    borderRadius: LINE_WIDTH / 2,
  },
  match: {
    position: "absolute",
    top: space.sm,
    left: space.sm,
    paddingHorizontal: space.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
    backgroundColor: color.surfaceRaised,
  },
  matchText: {
    color: color.text,
    fontSize: fontSize.detail,
    fontWeight: fontWeight.semibold,
  },
  heart: {
    position: "absolute",
    top: 0,
    right: 0,
    width: MIN_TAP_SIZE,
    height: MIN_TAP_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  heartText: {
    color: color.text,
    fontSize: fontSize.heading,
  },
  // Kept: the route's own yellow, the one thing of the card besides the line.
  heartKept: {
    color: color.accent,
  },
  words: {
    paddingHorizontal: space.md,
    paddingTop: space.sm,
    paddingBottom: space.md,
    gap: 2,
  },
  title: {
    ...font.cardTitle,
    fontSize: fontSize.body,
    color: color.text,
  },
  detail: {
    ...font.detail,
    color: color.textMuted,
  },
  start: {
    alignSelf: "flex-start",
    marginTop: space.sm,
    minHeight: 32,
    paddingHorizontal: space.lg,
    justifyContent: "center",
    borderRadius: radius.pill,
    backgroundColor: color.accent,
  },
  // Dark on yellow (ADR-0046).
  startText: {
    color: color.onAccent,
    fontSize: fontSize.small,
    fontWeight: fontWeight.bold,
  },
});
