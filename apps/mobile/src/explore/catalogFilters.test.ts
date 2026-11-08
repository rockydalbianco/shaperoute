import type { CatalogRoute } from "./catalog";
import {
  activeFilters,
  activitiesOf,
  categoriesOf,
  citiesOf,
  countriesOf,
  distancesOf,
  filterCatalog,
  hasMore,
  NO_FILTER,
  orderCatalog,
  PAGE_SIZE,
  pageOf,
  searchCatalog,
  searchWords,
} from "./catalogFilters";

// The filters, the search and the order of the catalog (TASK-420), on a
// small catalog of our own.

function route(fields: Partial<CatalogRoute> & { id: string }): CatalogRoute {
  return {
    city: "trento",
    country: "Italy",
    shape: "heart",
    word: null,
    style: null,
    category: "symbols",
    activity: "running",
    distance_m: 5000,
    route_m: 5100,
    similarity: 0.95,
    start: [46.067, 11.1215],
    preview: [
      [46.067, 11.1215],
      [46.068, 11.1225],
    ],
    favorite_key: "0000000000000000",
    ...fields,
  };
}

const TRENTO_HEART = route({ id: "trento-heart-5000-0" });
const TRENTO_CAT = route({
  id: "trento-cat-10000-1",
  shape: "cat",
  category: "animals",
  distance_m: 10000,
  route_m: 10400,
  similarity: 0.91,
});
const MILANO_WORD = route({
  id: "milano-ciao-21000-0",
  city: "milano",
  shape: null,
  word: "CIAO",
  style: "round",
  category: "words",
  distance_m: 21000,
  route_m: 21300,
  similarity: 0.93,
  start: [45.4642, 9.19],
});
const NEWYORK_STAR = route({
  id: "newyork-star-5000-2",
  city: "newyork",
  country: "United States",
  shape: "star",
  route_m: 4900,
  similarity: 0.99,
  start: [40.7359, -73.9911],
});
const PARIS_BIKE = route({
  id: "paris-circle-10000-0",
  city: "paris",
  country: "France",
  shape: "circle",
  activity: "cycling",
  distance_m: 10000,
  route_m: 10100,
  similarity: 0.95,
  start: [48.8566, 2.3522],
});
const ALL = [TRENTO_HEART, TRENTO_CAT, MILANO_WORD, NEWYORK_STAR, PARIS_BIKE];
const ids = (routes: CatalogRoute[]) => routes.map((r) => r.id);

test("no filter keeps them all; each filter keeps its own", () => {
  expect(filterCatalog(ALL, NO_FILTER)).toHaveLength(5);
  expect(ids(filterCatalog(ALL, { ...NO_FILTER, country: "Italy" }))).toEqual([
    TRENTO_HEART.id,
    TRENTO_CAT.id,
    MILANO_WORD.id,
  ]);
  expect(ids(filterCatalog(ALL, { ...NO_FILTER, city: "milano" }))).toEqual([
    MILANO_WORD.id,
  ]);
  expect(ids(filterCatalog(ALL, { ...NO_FILTER, category: "animals" }))).toEqual([
    TRENTO_CAT.id,
  ]);
  expect(ids(filterCatalog(ALL, { ...NO_FILTER, distances: [10000] }))).toEqual([
    TRENTO_CAT.id,
    PARIS_BIKE.id,
  ]);
  // Several distances at once.
  expect(filterCatalog(ALL, { ...NO_FILTER, distances: [5000, 21000] })).toHaveLength(
    3,
  );
  expect(ids(filterCatalog(ALL, { ...NO_FILTER, activity: "cycling" }))).toEqual([
    PARIS_BIKE.id,
  ]);
  // Together they narrow.
  expect(
    ids(filterCatalog(ALL, { ...NO_FILTER, country: "Italy", distances: [5000] })),
  ).toEqual([TRENTO_HEART.id]);
});

test("how many filters are set", () => {
  expect(activeFilters(NO_FILTER)).toBe(0);
  expect(
    activeFilters({ ...NO_FILTER, country: "Italy", distances: [5000, 10000] }),
  ).toBe(2);
  expect(
    activeFilters({
      country: "Italy",
      city: "trento",
      category: "animals",
      distances: [5000],
      activity: "running",
    }),
  ).toBe(5);
});

test("the search finds by the shape's name, the word, the city and the country", () => {
  expect(searchWords(TRENTO_CAT)).toBe("cat cat trento trento italy italy");
  expect(ids(searchCatalog(ALL, "cat"))).toEqual([TRENTO_CAT.id]);
  expect(ids(searchCatalog(ALL, "ciao"))).toEqual([MILANO_WORD.id]);
  expect(ids(searchCatalog(ALL, "New York"))).toEqual([NEWYORK_STAR.id]);
  expect(ids(searchCatalog(ALL, "italy"))).toHaveLength(3);
  // Every word must be found: "heart trento", not "heart" or "trento".
  expect(ids(searchCatalog(ALL, "heart trento"))).toEqual([TRENTO_HEART.id]);
  expect(ids(searchCatalog(ALL, "heart paris"))).toEqual([]);
  // Accents and case do not matter; an empty query is no query.
  expect(ids(searchCatalog(ALL, "  ITALY "))).toHaveLength(3);
  expect(searchCatalog(ALL, "   ")).toHaveLength(5);
  expect(searchCatalog(ALL, "")).not.toBe(ALL);
});

test("«Best» puts the most alike first, the shorter at the same likeness", () => {
  const same = [
    route({ id: "a", similarity: 0.9, route_m: 5200 }),
    route({ id: "b", similarity: 0.9, route_m: 5000 }),
    route({ id: "c", similarity: 0.95, route_m: 9000 }),
  ];
  expect(ids(orderCatalog(same, "best", null))).toEqual(["c", "b", "a"]);
  expect(ids(orderCatalog(ALL, "best", null))).toEqual([
    NEWYORK_STAR.id,
    TRENTO_HEART.id,
    PARIS_BIKE.id,
    MILANO_WORD.id,
    TRENTO_CAT.id,
  ]);
});

test("«Shortest» puts the fewest metres first", () => {
  expect(ids(orderCatalog(ALL, "shortest", null))).toEqual([
    NEWYORK_STAR.id,
    TRENTO_HEART.id,
    PARIS_BIKE.id,
    TRENTO_CAT.id,
    MILANO_WORD.id,
  ]);
});

test("«Nearest» from the start; without a start, as «Best»", () => {
  const fromTrento = orderCatalog(ALL, "nearest", [46.07, 11.12]);
  expect(ids(fromTrento).slice(0, 3)).toEqual([
    TRENTO_HEART.id,
    TRENTO_CAT.id,
    MILANO_WORD.id,
  ]);
  expect(ids(fromTrento).at(-1)).toBe(NEWYORK_STAR.id);
  const fromParis = orderCatalog(ALL, "nearest", [48.85, 2.35]);
  expect(ids(fromParis)[0]).toBe(PARIS_BIKE.id);
  expect(ids(orderCatalog(ALL, "nearest", null))).toEqual(
    ids(orderCatalog(ALL, "best", null)),
  );
  // The list given is not changed.
  expect(ids(ALL)[0]).toBe(TRENTO_HEART.id);
});

test("the pages: 40 at a time, and whether there are more", () => {
  const many = Array.from({ length: 95 }, (_, i) => route({ id: `r${i}` }));
  expect(pageOf(many, 1)).toHaveLength(PAGE_SIZE);
  expect(pageOf(many, 2)).toHaveLength(80);
  expect(pageOf(many, 3)).toHaveLength(95);
  expect(pageOf(many, 0)).toHaveLength(PAGE_SIZE);
  expect(hasMore(many, 1)).toBe(true);
  expect(hasMore(many, 2)).toBe(true);
  expect(hasMore(many, 3)).toBe(false);
  expect(hasMore(ALL, 1)).toBe(false);
});

test("the choices of the filters, from the routes", () => {
  // The country with more routes first; then by name.
  expect(countriesOf(ALL)).toEqual(["Italy", "France", "United States"]);
  expect(citiesOf(ALL)).toEqual(["trento", "milano", "newyork", "paris"]);
  expect(citiesOf(ALL, "Italy")).toEqual(["trento", "milano"]);
  expect(categoriesOf(ALL)).toEqual(["animals", "symbols", "words"]);
  expect(distancesOf(ALL)).toEqual([5000, 10000, 21000]);
  expect(activitiesOf(ALL)).toEqual(["running", "cycling"]);
  // A city with no country is not a country.
  expect(countriesOf([route({ id: "x", country: "" })])).toEqual([]);
});
