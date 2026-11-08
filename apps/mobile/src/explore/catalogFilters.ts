import type { Activity, LatLon } from "@shaperoute/shared-types";

import { shapeName } from "../i18n/shapeNames";
import { metresBetween } from "../map/coordinates";
import { type CatalogCategory, type CatalogRoute, countryName } from "./catalog";
import { cityName } from "./recommendedRoutes";

/**
 * What the «Catalog» page does to its routes (TASK-420, ADR-0348), as pure
 * functions: the filters, the search by name, the order, and the pages the
 * grid shows while it is scrolled.
 */

export type CatalogFilter = {
  /** As the data writes it ("Italy"); null for every country. */
  country: string | null;
  /** The seed's name ("milano"); null for every city. */
  city: string | null;
  category: CatalogCategory | null;
  /** The distances asked for, in metres; empty for any. */
  distances: readonly number[];
  activity: Activity | null;
};

export const NO_FILTER: CatalogFilter = {
  country: null,
  city: null,
  category: null,
  distances: [],
  activity: null,
};

export type CatalogOrder = "nearest" | "best" | "shortest";

/** How many cards the grid shows at first, and adds at its end. */
export const PAGE_SIZE = 40;

/** How many of the five filters are set. */
export function activeFilters(filter: CatalogFilter): number {
  return (
    (filter.country === null ? 0 : 1) +
    (filter.city === null ? 0 : 1) +
    (filter.category === null ? 0 : 1) +
    (filter.distances.length === 0 ? 0 : 1) +
    (filter.activity === null ? 0 : 1)
  );
}

export function filterCatalog(
  routes: readonly CatalogRoute[],
  filter: CatalogFilter,
): CatalogRoute[] {
  return routes.filter(
    (route) =>
      (filter.country === null || route.country === filter.country) &&
      (filter.city === null || route.city === filter.city) &&
      (filter.category === null || route.category === filter.category) &&
      (filter.distances.length === 0 || filter.distances.includes(route.distance_m)) &&
      (filter.activity === null || route.activity === filter.activity),
  );
}

/** Letters and digits alone, lower case, accents dropped: "Città" → "citta". */
function plain(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** The words a route is found by: its shape in the app's language and as
 * the data names it, its word, its city, its country. */
export function searchWords(route: CatalogRoute): string {
  return plain(
    [
      route.shape === null ? "" : `${shapeName(route.shape)} ${route.shape}`,
      route.word ?? "",
      route.city,
      cityName(route.city),
      route.country,
      countryName(route.country),
    ].join(" "),
  );
}

/**
 * The routes whose words contain every word of `query`: "heart milan"
 * finds the hearts of Milan; an empty query finds them all.
 */
export function searchCatalog(
  routes: readonly CatalogRoute[],
  query: string,
): CatalogRoute[] {
  const words = plain(query)
    .split(" ")
    .filter((word) => word !== "");
  if (words.length === 0) {
    return [...routes];
  }
  return routes.filter((route) => {
    const found = searchWords(route);
    return words.every((word) => found.includes(word));
  });
}

/**
 * The routes in `order`: «Nearest» from `near`, the closest start first
 * (without a start, as «Best»); «Best» the most like their figure first,
 * the shorter before at the same likeness; «Shortest» the fewest metres
 * first. Ties keep the id's order, so the list never shuffles.
 */
export function orderCatalog(
  routes: readonly CatalogRoute[],
  order: CatalogOrder,
  near: LatLon | null,
): CatalogRoute[] {
  const byId = (a: CatalogRoute, b: CatalogRoute) =>
    a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  const best = (a: CatalogRoute, b: CatalogRoute) =>
    b.similarity - a.similarity || a.route_m - b.route_m || byId(a, b);
  if (order === "shortest") {
    return [...routes].sort((a, b) => a.route_m - b.route_m || best(a, b));
  }
  if (order === "nearest" && near !== null) {
    const away = new Map(routes.map((r) => [r.id, metresBetween(near, r.start)]));
    return [...routes].sort(
      (a, b) => (away.get(a.id) ?? 0) - (away.get(b.id) ?? 0) || best(a, b),
    );
  }
  return [...routes].sort(best);
}

/** The first `pages` pages of the routes. */
export function pageOf(routes: readonly CatalogRoute[], pages: number): CatalogRoute[] {
  return routes.slice(0, Math.max(1, pages) * PAGE_SIZE);
}

/** True while the grid has not shown them all. */
export function hasMore(routes: readonly CatalogRoute[], pages: number): boolean {
  return routes.length > Math.max(1, pages) * PAGE_SIZE;
}

/** The countries of the routes, in the order they are read, those with
 * more routes first. "" (a city with no country) is left out. */
export function countriesOf(routes: readonly CatalogRoute[]): string[] {
  return ranked(
    routes.map((r) => r.country).filter((c) => c !== ""),
    countryName,
  );
}

/** The cities of the routes, those of `country` when given, the ones with
 * more routes first. */
export function citiesOf(
  routes: readonly CatalogRoute[],
  country: string | null = null,
): string[] {
  return ranked(
    routes.filter((r) => country === null || r.country === country).map((r) => r.city),
    cityName,
  );
}

/** The distances asked for among the routes, the shortest first. */
export function distancesOf(routes: readonly CatalogRoute[]): number[] {
  return [...new Set(routes.map((r) => r.distance_m))].sort((a, b) => a - b);
}

/** The sports among the routes, in the order they are met. */
export function activitiesOf(routes: readonly CatalogRoute[]): Activity[] {
  return [...new Set(routes.map((r) => r.activity))];
}

/** The categories among the routes, in the catalog's order. */
export function categoriesOf(routes: readonly CatalogRoute[]): CatalogCategory[] {
  const present = new Set(routes.map((r) => r.category));
  return (
    ["animals", "food", "symbols", "monuments", "sport", "words", "holidays"] as const
  ).filter((category) => present.has(category));
}

/** Distinct values, the most frequent first, then by their name. */
function ranked(values: string[], name: (value: string) => string): string[] {
  const counts = new Map<string, number>();
  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort(([a, n], [b, m]) => m - n || name(a).localeCompare(name(b)))
    .map(([value]) => value);
}
