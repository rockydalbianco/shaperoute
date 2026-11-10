import type {
  GameCatalog,
  GameCollection,
  GameShape,
  GameShapeState,
} from "@shaperoute/shared-types";

import type { Language } from "../i18n/languages";

/**
 * The collections of «Play» (TASK-423 part D, ADR-0351; docs/GIOCO.md §5.3):
 * the shapes of the catalog by collection, in the catalog's order (easiest
 * first), with how many the account has: «7 / 13». Counted here from the
 * shapes' own states, so the line and the grid never disagree.
 */

export type CollectionRow = {
  collection: GameCollection;
  shapes: GameShape[];
  /** The shapes of it the account has unlocked. */
  unlocked: number;
  total: number;
  /** The shape the row shows: the first one not unlocked yet, the last
   * one once all are. */
  shown: GameShape;
  /** Every shape of it unlocked. */
  complete: boolean;
};

/** The name of a collection in the app's language, English without one. */
export function collectionNameIn(
  collection: GameCollection,
  language: Language,
): string {
  return collection.names[language] || collection.names.en || collection.id;
}

/** Whether the catalog comes in collections: from TASK-423 part A on. An
 * older API's has none, and «Collection» stays the one grid. */
export function hasCollections(catalog: GameCatalog): boolean {
  return (catalog.collections ?? []).some((collection) =>
    catalog.shapes.some((shape) => shape.collection === collection.id),
  );
}

/** The collections of the catalog in its order, each with its shapes; a
 * collection with no shape is left out. `states`: the account's, by shape
 * id; empty without an account. */
export function collectionRows(
  catalog: GameCatalog,
  states: ReadonlyMap<string, GameShapeState>,
): CollectionRow[] {
  return (catalog.collections ?? []).flatMap((collection): CollectionRow[] => {
    const shapes = catalog.shapes.filter((shape) => shape.collection === collection.id);
    const last = shapes.at(-1);
    if (last === undefined) {
      return [];
    }
    const taken = (shape: GameShape) =>
      (states.get(shape.id)?.unlocked_at ?? null) !== null;
    const unlocked = shapes.filter(taken).length;
    return [
      {
        collection,
        shapes,
        unlocked,
        total: shapes.length,
        shown: shapes.find((shape) => !taken(shape)) ?? last,
        complete: unlocked === shapes.length,
      },
    ];
  });
}

/** "7 / 13". */
export function countText(row: Pick<CollectionRow, "unlocked" | "total">): string {
  return `${row.unlocked} / ${row.total}`;
}

/**
 * The shapes for choosing one, by collection (the form of a new team
 * challenge): the catalog's collections in order, then, under no heading,
 * any shape outside them. Without collections, one group of all.
 */
export function shapesByCollection(
  catalog: GameCatalog,
): { collection: GameCollection | null; shapes: GameShape[] }[] {
  const rows = collectionRows(catalog, new Map());
  const placed = new Set(rows.flatMap((row) => row.shapes.map((shape) => shape.id)));
  const rest = catalog.shapes.filter((shape) => !placed.has(shape.id));
  return [
    ...rows.map((row) => ({ collection: row.collection, shapes: row.shapes })),
    ...(rest.length > 0 ? [{ collection: null, shapes: rest }] : []),
  ];
}
