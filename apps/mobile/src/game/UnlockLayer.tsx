import type { GameCatalog } from "@shaperoute/shared-types";
import { useEffect, useState } from "react";

import { t, tPlural } from "../i18n";
import type { Language } from "../i18n/languages";
import { useLanguage } from "../i18n/useLanguage";
import { SAVED_TOTAL_MS } from "../intro/SavedLogo";
import { color, gamePrize } from "../theme/tokens";
import { collectionNameIn } from "./collections";
import { gameCatalog, useGameCatalog } from "./gameCatalog";
import { frameColor } from "./ProfileFrame";
import { editionName } from "./prizesText";
import { shapeNameIn } from "./ShapeCard";
import { UnlockCard } from "./UnlockCard";
import { type Unlocked, onUnlocked, openPlay } from "./unlocks";

/** One card of the queue. */
export type UnlockItem =
  | { kind: "shape"; id: string }
  | { kind: "edition"; id: string; edition: "silver" | "gold" }
  | { kind: "collection"; id: string }
  | { kind: "summary"; shapes: string[]; editions: number; collections: string[] };

/** Past this many things from one run, one card says them all (TASK-423 E). */
export const MAX_CARDS = 3;

/** The cards of what one run gave, the ones the catalog on the phone knows:
 * its shapes, its editions, its collections completed; one summary past
 * `MAX_CARDS`. */
export function itemsOf(unlocked: Unlocked, catalog: GameCatalog | null): UnlockItem[] {
  const shapes = new Set(catalog?.shapes.map((each) => each.id) ?? []);
  const collections = new Set(catalog?.collections?.map((each) => each.id) ?? []);
  const items: UnlockItem[] = [
    ...unlocked.shapeIds
      .filter((id) => shapes.has(id))
      .map((id): UnlockItem => ({ kind: "shape", id })),
    ...unlocked.editions
      .filter((up) => shapes.has(up.shapeId))
      .map((up): UnlockItem => ({
        kind: "edition",
        id: up.shapeId,
        edition: up.edition,
      })),
    ...unlocked.collectionsDone
      .filter((id) => collections.has(id))
      .map((id): UnlockItem => ({ kind: "collection", id })),
  ];
  if (items.length <= MAX_CARDS) {
    return items;
  }
  return [
    {
      kind: "summary",
      shapes: items.flatMap((item) => (item.kind === "shape" ? [item.id] : [])),
      editions: items.filter((item) => item.kind === "edition").length,
      collections: items.flatMap((item) =>
        item.kind === "collection" ? [item.id] : [],
      ),
    },
  ];
}

type Card = {
  title: string;
  name: string;
  line: string;
  outline: readonly (readonly [number, number])[];
  tint: string;
  announce: string;
};

/** What a card of the queue says and draws; null for one the catalog no
 * longer knows. */
export function cardOf(
  item: UnlockItem,
  catalog: GameCatalog,
  language: Language,
): Card | null {
  const shapeOf = (id: string) => catalog.shapes.find((each) => each.id === id);
  const collectionOf = (id: string) =>
    catalog.collections?.find((each) => each.id === id);
  switch (item.kind) {
    case "shape": {
      const shape = shapeOf(item.id);
      if (shape === undefined) {
        return null;
      }
      const name = shapeNameIn(shape, language);
      const collection = collectionOf(shape.collection ?? "");
      return {
        title: t("New shape unlocked"),
        name,
        line:
          collection === undefined
            ? t("It is in your collection.")
            : t("In your {collection} collection.", {
                collection: collectionNameIn(collection, language),
              }),
        outline: shape.outline,
        tint: color.accent,
        announce: t("New shape unlocked: {name}", { name }),
      };
    }
    case "edition": {
      const shape = shapeOf(item.id);
      if (shape === undefined) {
        return null;
      }
      const name = shapeNameIn(shape, language);
      const title = editionName(item.edition);
      return {
        title,
        name,
        line: t("You met its goal in {count} runs.", {
          count: item.edition === "gold" ? 10 : 3,
        }),
        outline: shape.outline,
        tint: item.edition === "gold" ? gamePrize.gold : gamePrize.silver,
        announce: `${title}: ${name}`,
      };
    }
    case "collection": {
      const collection = collectionOf(item.id);
      if (collection === undefined) {
        return null;
      }
      const name = collectionNameIn(collection, language);
      const hardest = catalog.shapes
        .filter((each) => each.collection === item.id)
        .at(-1);
      return {
        title: t("Collection complete"),
        name,
        line: t("A new frame for your profile."),
        outline: hardest?.outline ?? [],
        tint: frameColor(item.id),
        announce: `${t("Collection complete")}: ${name}`,
      };
    }
    case "summary": {
      const first = shapeOf(item.shapes[0] ?? "") ?? catalog.shapes[0];
      const parts = [
        item.shapes.length > 0
          ? tPlural(item.shapes.length, "{count} new shape", "{count} new shapes")
          : null,
        item.editions > 0
          ? tPlural(item.editions, "{count} new edition", "{count} new editions")
          : null,
        ...item.collections.map((id) => {
          const collection = collectionOf(id);
          return t("{collection} complete", {
            collection:
              collection === undefined ? id : collectionNameIn(collection, language),
          });
        }),
      ].filter((part): part is string => part !== null);
      const line = parts.join(" · ");
      return {
        title: t("New in Play"),
        name: line,
        line: t("See them in your collection."),
        outline: first?.outline ?? [],
        tint: color.accent,
        announce: `${t("New in Play")}: ${line}`,
      };
    }
  }
}

/**
 * Where «New shape unlocked» comes up (TASK-296 part B): over the app, under
 * the logo after «Save» (`intro/Root`). A run just saved shows its cards
 * once the logo has gone; a run sent later, at once. Its shapes, then its
 * editions and the collections it completed (TASK-423 part E), one card
 * after the other; past 3, one card for all. «See collection» closes them
 * all and opens «Play». What the catalog on the phone does not know is not
 * shown.
 */
export function UnlockLayer() {
  const catalog = useGameCatalog();
  const language = useLanguage();
  const [queue, setQueue] = useState<readonly UnlockItem[]>([]);
  useEffect(() => {
    const timers = new Set<ReturnType<typeof setTimeout>>();
    const stop = onUnlocked((unlocked) => {
      const shown = itemsOf(unlocked, gameCatalog());
      if (shown.length === 0) {
        return;
      }
      const { keptAt } = unlocked;
      const wait =
        keptAt === null ? 0 : Math.max(0, keptAt + SAVED_TOTAL_MS - Date.now());
      const show = () => setQueue((last) => [...last, ...shown]);
      if (wait === 0) {
        show();
        return;
      }
      const timer = setTimeout(() => {
        timers.delete(timer);
        show();
      }, wait);
      timers.add(timer);
    });
    return () => {
      stop();
      timers.forEach((timer) => clearTimeout(timer));
    };
  }, []);
  // The first card the catalog still knows; those before it are let go.
  const cards =
    catalog === null ? [] : queue.map((each) => cardOf(each, catalog, language));
  const at = cards.findIndex((each) => each !== null);
  const item = queue[at];
  const card = cards[at] ?? null;
  if (item === undefined || card === null) {
    return null;
  }
  return (
    <UnlockCard
      key={`${item.kind}-${"id" in item ? item.id : "all"}-${queue.length}`}
      {...card}
      onClose={() => setQueue((last) => last.slice(at + 1))}
      onPlay={() => {
        setQueue([]);
        openPlay();
      }}
    />
  );
}
