import type { OutfitTagReason, Visibility } from "@shaperoute/shared-types";
import { OUTFIT_TAG_REASONS } from "@shaperoute/shared-types";

import { sessionEnded } from "../../account/messages";
import { isSeen, worthAgain } from "../../api/drawings";
import { saveOutfitTags } from "../../api/outfitTags";
import { keptList } from "../../storage/keptList";
import type { Synced } from "../drawingPhotos";
import { draftOf, isOutfitDraft, type OutfitDraft, requestOf } from "./outfitTags";

/**
 * The items tagged on the photos of the runs, on the phone (TASK-394 part
 * B, ADR-0333), beside the photos themselves (drawingPhotos.ts): the list
 * of each photo as its owner made it, and whether the API has it. They are
 * data beside the photo, not pixels in it, and follow it: they go only
 * after the photo, while others see the drawing; made «Only me», the API
 * drops them with the photos and they stay here, to go again when the
 * drawing opens; a photo changed or taken off takes its items with it.
 */

export const DRAWING_OUTFITS_FILE = "drawing-outfits.json";

export type OutfitKept = {
  /** The id of the account the run belongs to (User.id). */
  owner: number;
  /** The run's key in «My activities». */
  key: string;
  /** The photo's place, as in drawingPhotos.ts. */
  n: number;
  /** Every item of the photo, in order; none takes them all off. */
  tags: OutfitDraft[];
  /** The API has this list. */
  sent: boolean;
  /** Why the API refused it: it waits for a change, not sent again. */
  refused?: OutfitTagReason | null;
};

function isReason(value: unknown): value is OutfitTagReason {
  return (OUTFIT_TAG_REASONS as readonly unknown[]).includes(value);
}

function isOutfitKept(value: unknown): value is OutfitKept {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const item = value as Record<string, unknown>;
  return (
    typeof item.owner === "number" &&
    typeof item.key === "string" &&
    typeof item.n === "number" &&
    Array.isArray(item.tags) &&
    item.tags.every(isOutfitDraft) &&
    typeof item.sent === "boolean" &&
    (item.refused === undefined || item.refused === null || isReason(item.refused))
  );
}

// Written so that a write cut short loses nothing that was there (TASK-252).
const kept = keptList(DRAWING_OUTFITS_FILE, isOutfitKept);

function same(item: OutfitKept, owner: number, key: string, n?: number): boolean {
  return item.owner === owner && item.key === key && (n === undefined || item.n === n);
}

export function loadOutfits(): OutfitKept[] {
  return kept.load();
}

function withEntry(list: OutfitKept[], item: OutfitKept): OutfitKept[] {
  return [...list.filter((other) => !same(other, item.owner, item.key, item.n)), item];
}

/** Keeps `tags` as the items of the photo `n` of the run `key`; the API
 * does not have them yet. False when the phone refused the file. */
export function keepOutfit(
  owner: number,
  key: string,
  n: number,
  tags: readonly OutfitDraft[],
): boolean {
  return kept.save(
    withEntry(loadOutfits(), {
      owner,
      key,
      n,
      tags: [...tags],
      sent: false,
      refused: null,
    }),
  );
}

/** Keeps the items of the photos chosen at the end of a run, in the order
 * of the photos from place 1 (keepPhotos); a photo with none keeps none. */
export function keepOutfits(
  owner: number,
  key: string,
  tags: readonly (readonly OutfitDraft[])[],
): void {
  tags.forEach((one, i) => {
    if (one.length > 0) {
      keepOutfit(owner, key, i + 1, one);
    }
  });
}

/** The items of the photo `n` kept here; null when this phone has none. */
export function outfitOnPhone(
  owner: number,
  key: string,
  n: number,
): OutfitKept | null {
  return loadOutfits().find((item) => same(item, owner, key, n)) ?? null;
}

/** The brands this account tagged on this phone, the latest first: the
 * suggestions of the form. */
export function brandsUsed(owner: number): string[] {
  const brands: string[] = [];
  for (const item of [...loadOutfits()].reverse()) {
    if (item.owner !== owner) {
      continue;
    }
    for (const tag of item.tags) {
      const brand = tag.brand.trim();
      if (
        brand !== "" &&
        !brands.some((one) => one.toLowerCase() === brand.toLowerCase())
      ) {
        brands.push(brand);
      }
    }
  }
  return brands;
}

/** The photo `n` was kept anew: a different picture in its place loses its
 * items on the API, so they go again after it. */
export function outfitToSendAgain(owner: number, key: string, n: number): void {
  const list = loadOutfits();
  const was = list.find((item) => same(item, owner, key, n));
  if (was !== undefined && was.sent) {
    kept.save(withEntry(list, { ...was, sent: false }));
  }
}

/** The photo `n` is gone: its items with it. */
export function forgetOutfit(owner: number, key: string, n: number): void {
  const list = loadOutfits();
  if (list.some((item) => same(item, owner, key, n))) {
    kept.save(list.filter((item) => !same(item, owner, key, n)));
  }
}

/** The run is gone: the items of its photos with it. */
export function forgetOutfitsOf(owner: number, key: string): void {
  const list = loadOutfits();
  if (list.some((item) => same(item, owner, key))) {
    kept.save(list.filter((item) => !same(item, owner, key)));
  }
}

/** The account is deleted: the items of all its photos leave the phone. */
export function forgetAllOutfitsOf(owner: number): void {
  const list = loadOutfits();
  if (list.some((item) => item.owner === owner)) {
    kept.save(list.filter((item) => item.owner !== owner));
  }
}

type Options = { fetchFn?: typeof fetch; key?: string | null };

/**
 * Sends the items of the photos of the run `key` that the API does not have,
 * right after its photos went with `visibility`. With "only_me" the API
 * dropped them with the photos: they stay here, to go again. A list the
 * API refuses for a reason it tells (a link MuW cannot open, words of the
 * filter…) stays here with it and waits for a change; one it will never take
 * otherwise is let go; no network, or the API busy, leaves it waiting.
 */
export async function syncOutfits(
  baseUrl: string,
  token: string,
  owner: number,
  key: string,
  visibility: Visibility,
  options: Options = {},
): Promise<Synced> {
  const mine = loadOutfits()
    .filter((item) => same(item, owner, key))
    .sort((a, b) => a.n - b.n);
  if (mine.length === 0) {
    return "done";
  }
  if (!isSeen(visibility)) {
    if (mine.some((item) => item.sent)) {
      kept.save(
        loadOutfits().map((item) =>
          same(item, owner, key) ? { ...item, sent: false } : item,
        ),
      );
    }
    return "done";
  }
  for (const item of mine) {
    if (item.sent || (item.refused !== undefined && item.refused !== null)) {
      continue;
    }
    const outcome = await saveOutfitTags(
      baseUrl,
      token,
      key,
      item.n,
      item.tags.map(requestOf),
      options,
    );
    if (outcome.kind === "ok") {
      // With the ids of the new ones: sent again, they keep their counts. A
      // list changed meanwhile goes with the next round.
      const list = loadOutfits();
      const now = list.find((other) => same(other, owner, key, item.n));
      if (now !== undefined && JSON.stringify(now.tags) === JSON.stringify(item.tags)) {
        kept.save(
          withEntry(list, {
            ...now,
            tags: outcome.value.tags.map(draftOf),
            sent: true,
          }),
        );
      }
      continue;
    }
    if (sessionEnded(outcome)) {
      return "session_ended";
    }
    if (worthAgain(outcome)) {
      return "waits";
    }
    if (outcome.kind === "api_error" && outcome.code === "outfit_tag_rejected") {
      const reason = isReason(outcome.reason) ? outcome.reason : "blocked";
      kept.save(withEntry(loadOutfits(), { ...item, refused: reason }));
      continue;
    }
    // Never taken as it is (no photo there any more, an id not of it): the
    // API keeps what it had.
    forgetOutfit(owner, key, item.n);
  }
  return "done";
}
