import type { DrawingPhoto, OutfitTagReason } from "@shaperoute/shared-types";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { brandsUsed, keepOutfit, outfitOnPhone } from "./outfitKept";
import { draftOf, type OutfitDraft, tagsOfPhoto } from "./outfitTags";

/**
 * What the composer needs to tag the items on the photos of a post
 * (TASK-394 part B): handed down by the screen that holds the photos, the
 * end of a run or a run of «My activities», so the form between them
 * (`DrawingForm`) stays as it is. Without it, the composer has no «Tag what
 * you wear»: a workout at the gym, or nobody signed in.
 */
export type OutfitTagging = {
  /** The items of the photo `n`, as its owner last made them. */
  tagsOf: (n: number) => readonly OutfitDraft[];
  /** Keeps `tags` as the items of the photo `n`; false when the phone
   * refused them. */
  setTags: (n: number, tags: readonly OutfitDraft[]) => boolean;
  /** Why the API refused the items of the photo `n`; null when it did not. */
  refusedOf: (n: number) => OutfitTagReason | null;
  /** The brands tagged before, the latest first: the form's suggestions. */
  brands: readonly string[];
};

export const OutfitTaggingContext = createContext<OutfitTagging | null>(null);

export function useOutfitTagging(): OutfitTagging | null {
  return useContext(OutfitTaggingContext);
}

/** The items of the photos chosen at the end of a run, held until «Save»,
 * by the photo's place in the form; `owner` is the account signed in. */
export function useChosenOutfits(owner: number | null): {
  tagging: OutfitTagging | null;
  /** The items of the photo `n`; none when it has none. */
  outfitOf: (n: number) => readonly OutfitDraft[];
  /** The photo `n` was taken off: its items with it, its place free. */
  forget: (n: number) => void;
} {
  const [held, setHeld] = useState<ReadonlyMap<number, readonly OutfitDraft[]>>(
    new Map(),
  );
  const outfitOf = useCallback((n: number) => held.get(n) ?? [], [held]);
  const tagging = useMemo<OutfitTagging | null>(
    () =>
      owner === null
        ? null
        : {
            tagsOf: outfitOf,
            setTags: (n, tags) => {
              setHeld((was) => new Map(was).set(n, [...tags]));
              return true;
            },
            refusedOf: () => null,
            brands: brandsUsed(owner),
          },
    [outfitOf, owner],
  );
  const forget = useCallback((n: number) => {
    setHeld((was) => {
      const next = new Map(was);
      next.delete(n);
      return next;
    });
  }, []);
  return { tagging, outfitOf, forget };
}

/**
 * The items of the photos of a run of «My activities»: this phone's, and
 * for a photo it has none of, the API's (its owner has their links). A
 * change is kept here, then `onChanged` sends it after the photos, while
 * others see the run.
 */
export function useRunOutfits(
  owner: number | null,
  runKey: string,
  apiPhotos: readonly DrawingPhoto[],
  onChanged: () => void,
): OutfitTagging | null {
  // Counted up to read the phone's file again after a change.
  const [changed, setChanged] = useState(0);
  // The screen's latest, without reading the file again at every letter typed.
  const changedRef = useRef(onChanged);
  useEffect(() => {
    changedRef.current = onChanged;
  }, [onChanged]);
  return useMemo<OutfitTagging | null>(
    () => {
      if (owner === null) {
        return null;
      }
      return {
        tagsOf: (n) => {
          const mine = outfitOnPhone(owner, runKey, n);
          if (mine !== null) {
            return mine.tags;
          }
          const photo = apiPhotos.find((one) => one.n === n);
          return photo === undefined ? [] : tagsOfPhoto(photo).map(draftOf);
        },
        setTags: (n, tags) => {
          if (!keepOutfit(owner, runKey, n, tags)) {
            return false;
          }
          setChanged((count) => count + 1);
          changedRef.current();
          return true;
        },
        refusedOf: (n) => outfitOnPhone(owner, runKey, n)?.refused ?? null,
        brands: brandsUsed(owner),
      };
    },
    // `changed` says the file changed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [apiPhotos, changed, owner, runKey],
  );
}
