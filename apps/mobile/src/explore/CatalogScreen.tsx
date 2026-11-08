import type { LatLon } from "@shaperoute/shared-types";
import { useCallback, useMemo, useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { exploredKeepable } from "../favorites/favoriteRoute";
import { activityName } from "../social/PublicParts";
import { useFavoritesDoor } from "../favorites/favoritesDoor";
import { t, tLater } from "../i18n";
import { TAB_ICON_SIZE } from "../tabs/TabBar";
import {
  color,
  fontSize,
  fontWeight,
  MIN_TAP_SIZE,
  radius,
  space,
} from "../theme/tokens";
import { Tap } from "../ui/Tap";
import { wholeDistanceLabel } from "../units/format";
import { useUnits } from "../units/useUnits";
import {
  asRecommended,
  CATALOG,
  type CatalogRoute,
  catalogCounts,
  categoryName,
  countryName,
} from "./catalog";
import { CatalogFilterSheet, Chip } from "./CatalogFilterSheet";
import { CatalogGrid } from "./CatalogGrid";
import {
  type CatalogFilter,
  type CatalogOrder,
  filterCatalog,
  NO_FILTER,
  orderCatalog,
  searchCatalog,
} from "./catalogFilters";
import { cityName, fetchRecommendedRoute, type RecommendedRoute } from "./recommendedRoutes";

const LENS = require("../../assets/ui/tabs/search.png");

const ORDERS: readonly { order: CatalogOrder; label: string }[] = [
  { order: "nearest", label: tLater("Nearest") },
  { order: "best", label: tLater("Best") },
  { order: "shortest", label: tLater("Shortest") },
];

type Props = {
  apiUrl: string | null;
  /** Where the user is, or the city chosen: «Nearest» and "450 m away". */
  near: LatLon | null;
  onBack: () => void;
  /** A card touched: the route on the map, as every route of «Explore». */
  onOpen: (route: RecommendedRoute) => void;
  /** «Start» on a card; left out, as `onOpen`: the map has «Start». */
  onStart?: (route: RecommendedRoute) => void;
  /** The catalog; injected in tests. */
  routes?: readonly CatalogRoute[];
  /** Injected in tests. */
  fetchFn?: typeof fetch;
};

/**
 * «Catalog» (TASK-420, ADR-0348): every drawing of the seed, in a grid two
 * per row, with a search by name, the five filters as chips (a set one is
 * light and has «×»; any chip opens the sheet with them all) and the order
 * as a switch. The heart on a card asks the API for the route whole and
 * keeps it as the heart on the map would, so it is the same favorite;
 * without an account, «Profile» opens as there. A card or «Start» opens
 * the route on the map.
 */
export function CatalogScreen({
  apiUrl,
  near,
  onBack,
  onOpen,
  onStart = onOpen,
  routes = CATALOG,
  fetchFn = fetch,
}: Props) {
  const insets = useSafeAreaInsets();
  const units = useUnits();
  const favorites = useFavoritesDoor();
  const { width } = useWindowDimensions();
  const contentWidth = width - 2 * space.lg;
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<CatalogFilter>(NO_FILTER);
  const [order, setOrder] = useState<CatalogOrder>(near === null ? "best" : "nearest");
  const [pages, setPages] = useState(1);
  const [filtering, setFiltering] = useState(false);

  const shown = useMemo(
    () => orderCatalog(searchCatalog(filterCatalog(routes, filter), query), order, near),
    [routes, filter, query, order, near],
  );
  const counts = catalogCounts(routes);

  // A new list starts from its first page.
  const changeFilter = (next: CatalogFilter) => {
    setFilter(next);
    setPages(1);
  };
  const changeQuery = (text: string) => {
    setQuery(text);
    setPages(1);
  };
  const changeOrder = (next: CatalogOrder) => {
    setOrder(next);
    setPages(1);
  };

  const isKept = useCallback(
    (route: CatalogRoute) => favorites.has(route.favorite_key),
    [favorites],
  );
  const open = useCallback(
    (route: CatalogRoute) => onOpen(asRecommended(route, near)),
    [onOpen, near],
  );
  const start = useCallback(
    (route: CatalogRoute) => onStart(asRecommended(route, near)),
    [onStart, near],
  );
  const heart = useCallback(
    (route: CatalogRoute) => {
      const listed = asRecommended(route, near);
      if (apiUrl === null) {
        onOpen(listed);
        return;
      }
      void fetchRecommendedRoute(apiUrl, route.id, { fetchFn }).then((outcome) => {
        if (outcome.kind === "route") {
          favorites.press(exploredKeepable(listed, outcome.route));
        } else {
          // Not whole on the phone: the map has it, and its heart.
          onOpen(listed);
        }
      });
    },
    [apiUrl, fetchFn, favorites, near, onOpen],
  );

  // The chips: each filter, set or not; a set one shows its value.
  const chips: { key: keyof CatalogFilter; label: string; on: boolean; clear: CatalogFilter }[] = [
    {
      key: "country",
      label: filter.country === null ? t("Country") : countryName(filter.country),
      on: filter.country !== null,
      clear: { ...filter, country: null },
    },
    {
      key: "city",
      label: filter.city === null ? t("City") : cityName(filter.city),
      on: filter.city !== null,
      clear: { ...filter, city: null },
    },
    {
      key: "category",
      label: filter.category === null ? t("Category") : categoryName(filter.category),
      on: filter.category !== null,
      clear: { ...filter, category: null },
    },
    {
      key: "distances",
      label:
        filter.distances.length === 0
          ? t("Distance")
          : filter.distances.map((d) => wholeDistanceLabel(d, units)).join(" · "),
      on: filter.distances.length > 0,
      clear: { ...filter, distances: [] },
    },
    {
      key: "activity",
      label: filter.activity === null ? t("Sport") : activityName(filter.activity),
      on: filter.activity !== null,
      clear: { ...filter, activity: null },
    },
  ];

  return (
    <View style={[StyleSheet.absoluteFill, styles.screen]} testID="catalog-screen">
      <View style={[styles.header, { paddingTop: insets.top + space.sm }]}>
        <Pressable
          style={styles.back}
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel={t("Back")}
        >
          <Text style={styles.backText}>←</Text>
        </Pressable>
        <View style={styles.titles}>
          <Text style={styles.title} accessibilityRole="header">
            {t("Catalog")}
          </Text>
          <Text style={styles.subtitle}>
            {t("{count} drawings · {cities} cities", {
              count: counts.routes,
              cities: counts.cities,
            })}
          </Text>
        </View>
      </View>
      <View style={styles.tools}>
        <View style={styles.field}>
          <Image source={LENS} style={styles.lens} />
          <TextInput
            style={styles.input}
            value={query}
            onChangeText={changeQuery}
            placeholder={t("Search by name: heart, CIAO, Milan…")}
            placeholderTextColor={color.textFaint}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
            clearButtonMode="while-editing"
            accessibilityLabel={t("Search")}
            testID="catalog-search"
          />
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
          keyboardShouldPersistTaps="handled"
        >
          {chips.map((chip) => (
            <View key={chip.key} style={styles.chipPair}>
              <Chip
                label={chip.on ? `${chip.label} ×` : chip.label}
                on={chip.on}
                onPress={() => (chip.on ? changeFilter(chip.clear) : setFiltering(true))}
                testID={`catalog-chip-${chip.key}`}
              />
            </View>
          ))}
        </ScrollView>
        <View style={styles.orders} accessibilityRole="radiogroup">
          {ORDERS.map(({ order: each, label }) => (
            <Tap
              key={each}
              style={[styles.order, order === each && styles.orderOn]}
              onPress={() => changeOrder(each)}
              accessibilityRole="radio"
              accessibilityState={{ checked: order === each }}
              testID={`catalog-order-${each}`}
            >
              <Text style={[styles.orderText, order === each && styles.orderTextOn]}>
                {t(label)}
              </Text>
            </Tap>
          ))}
        </View>
      </View>
      <CatalogGrid
        routes={shown}
        pages={pages}
        onMore={() => setPages((n) => n + 1)}
        width={contentWidth}
        units={units}
        near={near}
        isKept={isKept}
        onOpen={open}
        onStart={start}
        onHeart={heart}
        onClear={() => {
          changeFilter(NO_FILTER);
          changeQuery("");
        }}
        paddingBottom={insets.bottom + space.lg}
      />
      <CatalogFilterSheet
        visible={filtering}
        routes={routes}
        filter={filter}
        units={units}
        onApply={(next) => {
          changeFilter(next);
          setFiltering(false);
        }}
        onClose={() => setFiltering(false)}
      />
      {favorites.problem !== null && (
        <Pressable
          style={[styles.problem, { bottom: insets.bottom + space.lg }]}
          onPress={favorites.clearProblem}
          accessibilityRole="alert"
        >
          <Text style={styles.problemText}>{favorites.problem}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: color.background,
  },
  // As the header of «Explore» with a way back.
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingBottom: space.sm,
  },
  back: {
    width: MIN_TAP_SIZE,
    height: MIN_TAP_SIZE,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: color.surfaceRaised,
    borderWidth: 1,
    borderColor: color.borderStrong,
  },
  backText: {
    color: color.text,
    fontSize: fontSize.title,
  },
  titles: {
    flex: 1,
  },
  title: {
    color: color.text,
    fontSize: fontSize.title,
    fontWeight: fontWeight.bold,
  },
  subtitle: {
    color: color.textMuted,
    fontSize: fontSize.small,
  },
  tools: {
    paddingHorizontal: space.lg,
    paddingBottom: space.sm,
    gap: space.sm,
  },
  // As the search at the top of «Explore».
  field: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    minHeight: MIN_TAP_SIZE,
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
  lens: {
    width: TAB_ICON_SIZE - space.xs,
    height: TAB_ICON_SIZE - space.xs,
    tintColor: color.textMuted,
  },
  input: {
    flex: 1,
    color: color.text,
    fontSize: fontSize.input,
    paddingVertical: space.sm,
  },
  chips: {
    gap: space.sm,
  },
  chipPair: {
    flexDirection: "row",
  },
  orders: {
    flexDirection: "row",
    padding: 3,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
  order: {
    flex: 1,
    minHeight: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
  },
  orderOn: {
    backgroundColor: color.surfaceRaised,
  },
  orderText: {
    color: color.textMuted,
    fontSize: fontSize.small,
  },
  orderTextOn: {
    color: color.text,
    fontWeight: fontWeight.medium,
  },
  problem: {
    position: "absolute",
    left: space.lg,
    right: space.lg,
    padding: space.md,
    borderRadius: radius.md,
    backgroundColor: color.surfaceRaised,
  },
  problemText: {
    color: color.error,
    fontSize: fontSize.small,
  },
});
