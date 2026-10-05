/**
 * Where the ads of «Feed» go among its posts (TASK-235, ADR-0198): one
 * after every 5 posts, and only between two posts, never at the top or at
 * the end. A place whose ad is not there leaves no gap.
 */

/** Posts between two ads: the user's choice (ADR-0198). */
export const AD_EVERY = 5;

/**
 * How near, in posts, the user must be to a place before its ad is asked
 * for: the first as the Feed opens, each next one when the user reaches
 * the place before it. Never all of them at once.
 */
export const AD_LOAD_AHEAD = AD_EVERY;

/**
 * The places for ads in a list of `posts` posts, as the number of posts
 * above each: 15 posts → [5, 10]. None with 5 posts or fewer.
 */
export function adSlots(posts: number): number[] {
  const slots: number[] = [];
  for (let after = AD_EVERY; after < posts; after += AD_EVERY) {
    slots.push(after);
  }
  return slots;
}

/** A row of «Feed»: a post, with its place in the list of posts, or an ad. */
export type FeedItem<P, A> =
  { kind: "post"; post: P; index: number } | { kind: "ad"; ad: A; slot: number };

/** The posts with the ads that are there: `ads[i]` goes to slot `i`. */
export function feedWithAds<P, A>(
  posts: readonly P[],
  ads: readonly (A | undefined)[],
): FeedItem<P, A>[] {
  const slots = adSlots(posts.length);
  const items: FeedItem<P, A>[] = [];
  posts.forEach((post, index) => {
    items.push({ kind: "post", post, index });
    const slot = slots.indexOf(index + 1);
    const ad = slot === -1 ? undefined : ads[slot];
    if (ad !== undefined) {
      items.push({ kind: "ad", ad, slot });
    }
  });
  return items;
}

/**
 * The first slot from `from` that is still ahead of the user: the post
 * under it has not been on the screen (`seen` is the furthest post that
 * has). An ad put there moves nothing the user is looking at. Null when
 * the user has passed them all.
 */
export function slotAhead(
  slots: readonly number[],
  from: number,
  seen: number,
): number | null {
  for (let slot = from; slot < slots.length; slot += 1) {
    if (slots[slot] > seen) {
      return slot;
    }
  }
  return null;
}
