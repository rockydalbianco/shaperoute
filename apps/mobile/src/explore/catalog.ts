import type { Activity, LatLon } from "@shaperoute/shared-types";

import { t, tLater } from "../i18n";
import { metresBetween } from "../map/coordinates";
import data from "./catalog.json";
import type { RecommendedRoute } from "./recommendedRoutes";

/**
 * The «Catalog» of «Explore» (TASK-420, ADR-0348): every route of the seed
 * (`catalog/seed/*.json`), light, as `scripts/catalog-data.mjs` writes it
 * in `catalog.json`. The page filters and orders them on the phone; a
 * route opens through the API by its id, as every route of «Explore».
 */

/** The user's seven categories (catalogo-esplora.md), as the data names them. */
export const CATALOG_CATEGORIES = [
  "animals",
  "food",
  "symbols",
  "monuments",
  "sport",
  "words",
  "holidays",
] as const;

export type CatalogCategory = (typeof CATALOG_CATEGORIES)[number];

export type CatalogRoute = {
  /** As the API names it: "<city>-<shape|word>-<distance_m>-<i>". */
  id: string;
  /** The seed's name: "milano", "newyork". */
  city: string;
  /** In English, as the data writes it; "" when the data does not say. */
  country: string;
  shape: string | null;
  word: string | null;
  style: string | null;
  category: CatalogCategory;
  activity: Activity;
  distance_m: number;
  route_m: number;
  similarity: number;
  start: LatLon;
  rotation_deg?: number;
  preview: LatLon[];
  /** `favoriteKey` of the whole line: the heart knows if it is kept. */
  favorite_key: string;
};

export const CATALOG: readonly CatalogRoute[] = data.routes as unknown as CatalogRoute[];

/** Whose the routes' streets are, as the seed says. */
export const CATALOG_LICENSE: string = data.license;

const CATEGORY_NAMES: Readonly<Record<CatalogCategory, string>> = {
  animals: tLater("Animals"),
  food: tLater("Food"),
  symbols: tLater("Symbols"),
  monuments: tLater("Monuments"),
  sport: tLater("Sport"),
  words: tLater("Words"),
  holidays: tLater("Holidays"),
};

/** A category as people read it, in the app's language. */
export function categoryName(category: CatalogCategory): string {
  return t(CATEGORY_NAMES[category]);
}

/** The countries of the seed, so each is shown in the app's language; one
 * the table does not have is shown as the data writes it. */
const COUNTRY_NAMES: Readonly<Record<string, string>> = {
  Italy: tLater("Italy"),
  "United States": tLater("United States"),
  Netherlands: tLater("Netherlands"),
  Spain: tLater("Spain"),
  "United Arab Emirates": tLater("United Arab Emirates"),
  Portugal: tLater("Portugal"),
  "United Kingdom": tLater("United Kingdom"),
  France: tLater("France"),
  Australia: tLater("Australia"),
  Japan: tLater("Japan"),
};

export function countryName(country: string): string {
  const name = COUNTRY_NAMES[country];
  return name === undefined ? country : t(name);
}

/** How many routes, and how many cities they are in. */
export function catalogCounts(routes: readonly CatalogRoute[]): {
  routes: number;
  cities: number;
} {
  return { routes: routes.length, cities: new Set(routes.map((r) => r.city)).size };
}

/**
 * A route of the catalog as a route of «Explore», for the map to open it
 * (`onOpen`): `away_m` from `near` when there is one, else 0.
 */
export function asRecommended(route: CatalogRoute, near: LatLon | null): RecommendedRoute {
  return {
    id: route.id,
    city: route.city,
    shape: route.shape,
    word: route.word,
    style: route.style,
    distance_m: route.distance_m,
    route_m: route.route_m,
    similarity: route.similarity,
    start: route.start,
    away_m: near === null ? 0 : Math.round(metresBetween(near, route.start)),
    preview: route.preview,
    ...(route.rotation_deg === undefined ? {} : { rotation_deg: route.rotation_deg }),
  };
}
