import catalog from "@shaperoute/shared-types/fixtures/game-catalog.json";
import me from "@shaperoute/shared-types/fixtures/game-me.json";
import type { GameCatalog, GameShapeState } from "@shaperoute/shared-types";

import {
  collectionNameIn,
  collectionRows,
  countText,
  hasCollections,
  shapesByCollection,
} from "./collections";

const CATALOG = catalog as GameCatalog;
const STATES = new Map<string, GameShapeState>(
  me.shapes.map((state) => [state.id, state as GameShapeState]),
);
const NONE = new Map<string, GameShapeState>();
const GRID: GameCatalog = {
  rules_version: 2,
  shapes: CATALOG.shapes.map(({ collection: _collection, ...shape }) => shape),
};

test("the collections in the catalog's order, each with its shapes and count", () => {
  const rows = collectionRows(CATALOG, STATES);
  expect(rows.map((row) => row.collection.id)).toEqual(["geometry", "sky"]);
  const [geometry, sky] = rows;
  expect(geometry.shapes.map((shape) => shape.id)).toEqual(["triangle", "hexagon"]);
  expect([geometry.unlocked, geometry.total, geometry.complete]).toEqual([1, 2, false]);
  expect(countText(geometry)).toBe("1 / 2");
  // The triangle is taken: the row shows the hexagon, the next one.
  expect(geometry.shown.id).toBe("hexagon");
  expect([sky.unlocked, sky.total]).toEqual([0, 1]);
  // The same counts as the API's own (GET /game/me).
  expect(
    rows.map(({ collection, unlocked, total }) => ({
      id: collection.id,
      unlocked,
      total,
    })),
  ).toEqual(me.collections);
});

test("all taken: complete, and the row shows the last shape", () => {
  const all = new Map<string, GameShapeState>(
    CATALOG.shapes.map((shape) => [
      shape.id,
      { id: shape.id, unlocked_at: "2026-11-01T08:00:00Z", progress: 1 },
    ]),
  );
  const [geometry] = collectionRows(CATALOG, all);
  expect(geometry.complete).toBe(true);
  expect(geometry.shown.id).toBe("hexagon");
});

test("without an account nothing is taken; the first shape is shown", () => {
  const [geometry] = collectionRows(CATALOG, NONE);
  expect(geometry.unlocked).toBe(0);
  expect(geometry.shown.id).toBe("triangle");
});

test("an older API's catalog has no collections; an empty one is left out", () => {
  expect(hasCollections(CATALOG)).toBe(true);
  expect(hasCollections(GRID)).toBe(false);
  expect(hasCollections({ ...GRID, collections: CATALOG.collections })).toBe(false);
  const extra = {
    ...CATALOG,
    collections: [
      ...(CATALOG.collections ?? []),
      { id: "sea", names: { en: "Sea", de: "Meer", it: "Mare", es: "Mar", fr: "Mer" } },
    ],
  };
  expect(collectionRows(extra, NONE).map((row) => row.collection.id)).toEqual([
    "geometry",
    "sky",
  ]);
});

test("a collection's name in the app's language, English without one", () => {
  const [geometry, sky] = CATALOG.collections ?? [];
  expect(collectionNameIn(sky, "it")).toBe("Cielo");
  expect(collectionNameIn(geometry, "es")).toBe("Geometría");
  expect(collectionNameIn({ ...sky, names: { ...sky.names, de: "" } }, "de")).toBe(
    "Sky",
  );
});

test("the shapes to choose from, by collection; without collections, all of them", () => {
  expect(
    shapesByCollection(CATALOG).map((group) => [
      group.collection?.id ?? null,
      group.shapes.map((shape) => shape.id),
    ]),
  ).toEqual([
    ["geometry", ["triangle", "hexagon"]],
    ["sky", ["lightning"]],
  ]);
  expect(
    shapesByCollection(GRID).map((group) => [
      group.collection,
      group.shapes.map((shape) => shape.id),
    ]),
  ).toEqual([[null, ["triangle", "hexagon", "lightning"]]]);
});
