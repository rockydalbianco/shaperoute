import { StyleSheet, Text, View } from "react-native";

import { t, tPlural } from "../i18n";
import { color, font, fontSize, MIN_TAP_SIZE, radius, space } from "../theme/tokens";
import { Tap } from "../ui/Tap";
import { CATALOG, type CatalogRoute, catalogCounts } from "./catalog";
import { RouteThumb } from "./RouteThumb";

/** How many small drawings the card shows in a row. */
export const ENTRY_THUMBS = 5;

type Props = {
  onPress: () => void;
  /** What the card has between the page's margins. */
  width: number;
  /** The catalog; injected in tests. */
  routes?: readonly CatalogRoute[];
};

/**
 * The drawings on the card: the best of `count` different figures, so the
 * strip shows what the catalog has, not five hearts.
 */
export function entryThumbs(
  routes: readonly CatalogRoute[],
  count: number = ENTRY_THUMBS,
): CatalogRoute[] {
  const best = [...routes].sort((a, b) => b.similarity - a.similarity);
  const seen = new Set<string>();
  const chosen: CatalogRoute[] = [];
  for (const route of best) {
    const figure = route.word ?? route.shape ?? "";
    if (!seen.has(figure)) {
      seen.add(figure);
      chosen.push(route);
    }
    if (chosen.length === count) {
      break;
    }
  }
  return chosen;
}

/**
 * The way into the catalog from «Explore» (TASK-420, ADR-0348): a card
 * under the search with a few of its drawings, its name and how much it
 * holds. One tap opens the page.
 */
export function CatalogEntry({ onPress, width, routes = CATALOG }: Props) {
  const { routes: count, cities } = catalogCounts(routes);
  const thumbs = entryThumbs(routes);
  const side = Math.floor((width - 2 * space.md - (ENTRY_THUMBS - 1) * space.sm) / ENTRY_THUMBS);
  const detail = tPlural(
    count,
    "{count} drawing in {cities} cities · filters, search",
    "{count} drawings in {cities} cities · filters, search",
    { cities },
  );
  return (
    <Tap
      style={styles.card}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${t("Catalog")}, ${detail}`}
      testID="catalog-entry"
    >
      <View style={styles.strip}>
        {thumbs.map((route) => (
          <RouteThumb key={route.id} line={route.preview} width={side} height={side} />
        ))}
      </View>
      <View style={styles.line}>
        <View style={styles.words}>
          <Text style={styles.title}>{t("Catalog")}</Text>
          <Text style={styles.detail} numberOfLines={1}>
            {detail}
          </Text>
        </View>
        <View style={styles.arrow}>
          <Text style={styles.arrowText}>→</Text>
        </View>
      </View>
    </Tap>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.xl,
    backgroundColor: color.surface,
    padding: space.md,
    gap: space.md,
  },
  strip: {
    flexDirection: "row",
    gap: space.sm,
  },
  line: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
  },
  words: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    ...font.cardTitle,
    color: color.text,
  },
  detail: {
    ...font.detail,
    color: color.textMuted,
  },
  arrow: {
    width: MIN_TAP_SIZE - space.sm,
    height: MIN_TAP_SIZE - space.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.borderStrong,
    backgroundColor: color.surfaceRaised,
    alignItems: "center",
    justifyContent: "center",
  },
  arrowText: {
    color: color.text,
    fontSize: fontSize.heading,
  },
});
