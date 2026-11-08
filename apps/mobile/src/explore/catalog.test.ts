/// <reference types="node" />

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { favoriteKey } from "../favorites/favoriteKey";
import {
  asRecommended,
  CATALOG,
  CATALOG_CATEGORIES,
  catalogCounts,
  categoryName,
  countryName,
} from "./catalog";

// catalog.json as scripts/catalog-data.mjs writes it from catalog/seed
// (TASK-420, ADR-0348).

const SEED = join(__dirname, "..", "..", "..", "..", "catalog", "seed");

test("every route of the seed, once, with the id the API gives it", () => {
  expect(CATALOG.length).toBeGreaterThan(300);
  expect(new Set(CATALOG.map((r) => r.id)).size).toBe(CATALOG.length);
  for (const route of CATALOG) {
    const name = route.word?.toLowerCase() ?? route.shape;
    expect(route.id).toBe(
      `${route.city}-${name}-${route.distance_m}-${route.id.split("-").at(-1)}`,
    );
    // One of the two, as in a route request.
    expect(route.shape === null).not.toBe(route.word === null);
    expect(route.style === null).toBe(route.word === null);
  }
});

test("light: a preview of at most 48 points, the start, the key, the category", () => {
  for (const route of CATALOG) {
    expect(route.preview.length).toBeGreaterThanOrEqual(2);
    expect(route.preview.length).toBeLessThanOrEqual(48);
    expect(route.start).toEqual(route.preview[0]);
    expect(route.favorite_key).toMatch(/^[0-9a-f]{16}$/);
    expect(CATALOG_CATEGORIES).toContain(route.category);
    expect(route.similarity).toBeGreaterThan(0.8);
    expect(route.route_m).toBeGreaterThan(0);
    expect(route.activity).toBe("running");
  }
  // A word is in "words", a shape never.
  for (const route of CATALOG) {
    expect(route.category === "words").toBe(route.word !== null);
  }
});

test("the key of a route is the favorites' key of its whole line", () => {
  // The script copies favoriteKey: this is where the two must agree.
  const trento = JSON.parse(readFileSync(join(SEED, "trento.json"), "utf8")) as {
    routes: { points: [number, number][] }[];
  };
  const first = CATALOG.find((r) => r.id.startsWith("trento-") && r.id.endsWith("-0"));
  expect(first).toBeDefined();
  expect(first?.favorite_key).toBe(favoriteKey(trento.routes[0].points));
});

test("the cities of the seed have their country; the counts count them", () => {
  const { routes, cities } = catalogCounts(CATALOG);
  expect(routes).toBe(CATALOG.length);
  expect(cities).toBe(23);
  expect(CATALOG.find((r) => r.city === "milano")?.country).toBe("Italy");
  expect(CATALOG.find((r) => r.city === "newyork")?.country).toBe("United States");
  expect(CATALOG.every((r) => r.country !== "")).toBe(true);
});

test("as a route of «Explore»: the same fields, how far from the start", () => {
  const route = CATALOG.find((r) => r.id === "trento-star-5000-0");
  expect(route).toBeDefined();
  if (route === undefined) {
    return;
  }
  const listed = asRecommended(route, [46.067, 11.1215]);
  expect(listed.id).toBe("trento-star-5000-0");
  expect(listed.shape).toBe("star");
  expect(listed.route_m).toBe(route.route_m);
  expect(listed.preview).toBe(route.preview);
  expect(listed.away_m).toBeGreaterThan(0);
  expect(listed.away_m).toBeLessThan(5000);
  // Without a start, nothing to measure from.
  expect(asRecommended(route, null).away_m).toBe(0);
  // A turned route keeps its turn; an upright one says nothing.
  expect("rotation_deg" in asRecommended({ ...route, rotation_deg: 30 }, null)).toBe(
    true,
  );
  expect(
    "rotation_deg" in asRecommended({ ...route, rotation_deg: undefined }, null),
  ).toBe(false);
});

test("names as people read them", () => {
  expect(categoryName("animals")).toBe("Animals");
  expect(categoryName("words")).toBe("Words");
  expect(countryName("Italy")).toBe("Italy");
  // A country the table does not know is shown as the data writes it.
  expect(countryName("Atlantis")).toBe("Atlantis");
});
