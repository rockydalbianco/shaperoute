import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { t, tPlural } from "../i18n";
import { color, fontSize, fontWeight, space } from "../theme/tokens";
import { Tap } from "../ui/Tap";
import { awayNumber } from "../units/format";
import type { Units } from "../units/units";
import type { CatalogState, FarRow } from "./catalogList";
import { cityName, type RecommendedRoute } from "./recommendedRoutes";

/**
 * «Farther away» (TASK-420): every drawing of the catalog that «Near you»
 * does not show, city after city from the nearest, two per row. These are
 * the rows of the page's list; what is above them is its header.
 */

type HeaderProps = {
  /** How many the catalog has beyond «Near you». */
  count: number;
};

/** "FARTHER AWAY" with the count: the section's label. */
export function FarHeader({ count }: HeaderProps) {
  return (
    <View style={styles.header}>
      <Text style={styles.label}>{t("FARTHER AWAY")}</Text>
      <Text style={styles.detail}>
        {tPlural(count, "{count} drawing · by city", "{count} drawings · by city")}
      </Text>
    </View>
  );
}

type CityProps = { city: string; awayM: number; count: number; units: Units };

/** "ROVERETO · 22 km · 8": a city's label over its cards. */
export function FarCityLabel({ city, awayM, count, units }: CityProps) {
  return (
    <View style={styles.city}>
      <Text style={styles.label} accessibilityRole="header">
        {cityName(city).toUpperCase()}
      </Text>
      {/* "22 km · 8", "190 km · 37": whole kilometres from ten on. */}
      <Text
        style={styles.detail}
      >{`${awayNumber(awayM, units)} ${units} · ${count}`}</Text>
    </View>
  );
}

type PairProps = {
  routes: RecommendedRoute[];
  /** The card of a route, as «Near you» draws it. */
  card: (route: RecommendedRoute) => ReactNode;
};

/** Up to two cards side by side. */
export function FarPair({ routes, card }: PairProps) {
  return <View style={styles.pair}>{routes.map((route) => card(route))}</View>;
}

type RowProps = {
  row: FarRow;
  units: Units;
  card: (route: RecommendedRoute) => ReactNode;
};

export function FarRowView({ row, units, card }: RowProps) {
  return row.kind === "city" ? (
    <FarCityLabel city={row.city} awayM={row.away_m} count={row.count} units={units} />
  ) : (
    <FarPair routes={row.routes} card={card} />
  );
}

type FooterProps = {
  status: CatalogState["status"];
  more: boolean;
  onRetry: () => void;
};

/** Under the last row: more on the way, or what went wrong, with a way to
 * try again. Nothing once every drawing is there. */
export function FarFooter({ status, more, onRetry }: FooterProps) {
  if (status === "failed") {
    return (
      <Tap style={styles.footer} onPress={onRetry} accessibilityRole="button">
        <Text style={styles.problem}>{t("The rest could not load.")}</Text>
        <Text style={styles.retry}>{t("Try again")}</Text>
      </Tap>
    );
  }
  if (status === "loading" || more) {
    return (
      <View style={styles.footer}>
        <Text style={styles.detail}>{t("Loading more…")}</Text>
      </View>
    );
  }
  return null;
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: space.sm,
    marginTop: space.md,
  },
  city: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: space.sm,
    marginTop: space.xs,
  },
  // As the labels of the sections of «Explore» (NearbyTowns).
  label: {
    color: color.textMuted,
    fontSize: fontSize.label,
    fontWeight: fontWeight.semibold,
    letterSpacing: 1.2,
  },
  detail: {
    color: color.textFaint,
    fontSize: fontSize.detail,
  },
  pair: {
    flexDirection: "row",
    gap: space.md,
  },
  footer: {
    alignItems: "center",
    paddingVertical: space.md,
    gap: space.xs,
  },
  problem: {
    color: color.textMuted,
    fontSize: fontSize.small,
  },
  retry: {
    color: color.text,
    fontSize: fontSize.small,
    fontWeight: fontWeight.semibold,
  },
});
