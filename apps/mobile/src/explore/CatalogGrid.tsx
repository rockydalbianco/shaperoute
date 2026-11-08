import type { LatLon } from "@shaperoute/shared-types";
import { useCallback } from "react";
import { FlatList, StyleSheet, Text } from "react-native";

import { t } from "../i18n";
import { color, font, space } from "../theme/tokens";
import { HEART } from "../ui/outlines";
import { EmptyState } from "../ui/EmptyState";
import type { Units } from "../units/units";
import type { CatalogRoute } from "./catalog";
import { CatalogCard } from "./CatalogCard";
import { hasMore, pageOf } from "./catalogFilters";
import { cardWidth } from "./RouteCard";

type Props = {
  /** The routes to show, filtered and ordered; the grid shows them a page
   * at a time. */
  routes: readonly CatalogRoute[];
  /** How many pages are shown; `onMore` asks for the next at the end. */
  pages: number;
  onMore: () => void;
  /** What the grid has between the page's margins. */
  width: number;
  units: Units;
  near: LatLon | null;
  isKept: (route: CatalogRoute) => boolean;
  onOpen: (route: CatalogRoute) => void;
  onStart: (route: CatalogRoute) => void;
  onHeart: (route: CatalogRoute) => void;
  /** Clears every filter, from the empty page. */
  onClear: () => void;
  /** Under the last row: the bottom inset of the screen. */
  paddingBottom?: number;
};

/**
 * The cards of the catalog, two per row (TASK-420, ADR-0348): a `FlatList`
 * that draws what is on screen and a little around it, `PAGE_SIZE` cards
 * at first, and the same again each time the end comes near, so hundreds
 * scroll as a few. With nothing left after the filters, an empty page with
 * the way to clear them.
 */
export function CatalogGrid({
  routes,
  pages,
  onMore,
  width,
  units,
  near,
  isKept,
  onOpen,
  onStart,
  onHeart,
  onClear,
  paddingBottom = space.lg,
}: Props) {
  const card = cardWidth(width);
  const shown = pageOf(routes, pages);
  const more = hasMore(routes, pages);
  const renderItem = useCallback(
    ({ item }: { item: CatalogRoute }) => (
      <CatalogCard
        route={item}
        width={card}
        units={units}
        near={near}
        kept={isKept(item)}
        onOpen={onOpen}
        onStart={onStart}
        onHeart={onHeart}
      />
    ),
    [card, units, near, isKept, onOpen, onStart, onHeart],
  );
  return (
    <FlatList
      data={shown}
      keyExtractor={(route) => route.id}
      renderItem={renderItem}
      numColumns={2}
      columnWrapperStyle={styles.row}
      contentContainerStyle={[styles.list, { paddingBottom }]}
      onEndReached={more ? onMore : undefined}
      onEndReachedThreshold={1}
      initialNumToRender={8}
      windowSize={5}
      removeClippedSubviews
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      ListFooterComponent={
        more ? <Text style={styles.footer}>{t("Loading more…")}</Text> : null
      }
      ListEmptyComponent={
        <EmptyState
          outline={HEART}
          title={t("No drawings match")}
          message={t("Change the filters, or clear them to see every drawing.")}
          action={{ label: t("Clear"), onPress: onClear }}
          testID="catalog-empty"
        />
      }
      testID="catalog-grid"
    />
  );
}

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: space.lg,
    gap: space.md,
  },
  row: {
    gap: space.md,
  },
  footer: {
    ...font.small,
    color: color.textFaint,
    textAlign: "center",
    paddingVertical: space.md,
  },
});
