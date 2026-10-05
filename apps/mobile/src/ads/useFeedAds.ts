import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { NativeAd } from "react-native-google-mobile-ads";

import { AD_LOAD_AHEAD, adSlots, slotAhead } from "../feed/feedWithAds";
import type { FeedAds } from "./feedAds";

/**
 * The ads between the posts of «Feed» (TASK-235, ADR-0198), one place at a
 * time: the first is asked for when the Feed is on the screen (`active`),
 * each next one when the user reaches the place before it. A place whose ad
 * does not come stays empty. An ad that comes when its place is already on
 * the screen goes to the next place still ahead: the posts the user is
 * looking at never move. When the Feed goes, its ads go too.
 *
 * `ads[i]` is the ad of slot `i` (`feedWithAds`); `see(post)` tells that a
 * post, by its place in the list, is on the screen.
 */
export function useFeedAds(
  posts: number,
  active: boolean,
  network: FeedAds,
): { ads: readonly (NativeAd | undefined)[]; see: (post: number) => void } {
  const slots = useMemo(() => adSlots(posts), [posts]);
  const [ads, setAds] = useState<readonly (NativeAd | undefined)[]>([]);
  // The furthest post that has been on the screen: at the top, the first.
  const [seen, setSeen] = useState(0);
  const seenNow = useRef(0);
  // The first slot not tried yet, and whether an ad is on its way.
  const [next, setNext] = useState(0);
  const loading = useRef(false);
  const alive = useRef(true);
  const kept = useRef(new Set<NativeAd>());

  const see = useCallback((post: number) => {
    if (post > seenNow.current) {
      seenNow.current = post;
      setSeen(post);
    }
  }, []);

  useEffect(() => {
    if (!active || loading.current) {
      return;
    }
    const target = slotAhead(slots, next, seen);
    if (target === null || slots[target] - seen > AD_LOAD_AHEAD) {
      return;
    }
    loading.current = true;
    void network.load().then((ad) => {
      loading.current = false;
      if (!alive.current) {
        ad?.destroy();
        return;
      }
      if (ad === null) {
        setNext(target + 1);
        return;
      }
      // Late, its place may be on the screen by now: the next one ahead.
      const at = slotAhead(slots, target, seenNow.current);
      if (at === null) {
        ad.destroy();
        setNext(slots.length);
        return;
      }
      kept.current.add(ad);
      setAds((now) => {
        const placed = [...now];
        placed[at] = ad;
        return placed;
      });
      setNext(at + 1);
    });
  }, [active, network, next, seen, slots]);

  useEffect(() => {
    alive.current = true;
    const held = kept.current;
    return () => {
      alive.current = false;
      held.forEach((ad) => ad.destroy());
      held.clear();
    };
  }, []);

  return { ads, see };
}
