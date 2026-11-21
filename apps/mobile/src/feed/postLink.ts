import { POST_LINK_PAGE, type LatLon, type Visibility } from "@shaperoute/shared-types";
import { useSyncExternalStore } from "react";
import { Share } from "react-native";

/**
 * The link of a post (TASK-455 part E, ADR-0382): the page of the site
 * that shows it to anyone, with no account. Only a post the API calls
 * `linkable` has one: for everyone, with its line, of an owner who leaves
 * «Links to my posts» on. Any other has none, and the row is not there.
 */
export function postLinkOf(post: { id: string; linkable?: boolean }): string | null {
  return post.linkable === true ? `${POST_LINK_PAGE}${post.id}` : null;
}

/** What `usePostLink` reads of a post: a drawing of a list has all of it. */
export type LinkedPost = {
  id: string;
  linkable?: boolean;
  visibility?: Visibility;
  track_preview?: LatLon[];
};

/**
 * Whether one's own post, read while «Links to my posts» was off, has its
 * link again now that the switch is on: what the API asks of a drawing
 * besides the switch (`LINKABLE_SQL` in services/api, drawings.py) — it is
 * for everyone and has a line. Only for a post the API called not linkable:
 * one of an API before the links says nothing, and has none.
 */
function linkCameBack(post: LinkedPost): boolean {
  return (
    post.linkable === false &&
    post.visibility === "everyone" &&
    post.track_preview !== undefined &&
    post.track_preview.length >= 2
  );
}

/**
 * «Share link»: the phone's own sheet with the address and nothing else,
 * no words of ours. Closing the sheet without choosing is not a problem.
 */
export function sharePostLink(link: string): Promise<void> {
  return Share.share({ message: link }).then(
    () => undefined,
    () => undefined,
  );
}

// What «Links to my posts» was last read or turned to, while the app is
// open, and for which account. The posts «Feed» keeps were read before a
// turn of the switch, and their `linkable` is of then: off, one's own posts
// have no «Share link» at once, without waiting for the Feed to be read
// again. `back`: it was off while the app was open and is on again, so a
// post read in between says it has no link and has one.
let ownLinks: { token: string; on: boolean; back: boolean } | null = null;
const listeners = new Set<() => void>();

/** «Links to my posts» as the API has just said it is for this session:
 * read, or turned. */
export function ownPostLinksAre(token: string, on: boolean): void {
  const was = ownLinks !== null && ownLinks.token === token ? ownLinks : null;
  if (was !== null && was.on === on) {
    return;
  }
  // Off and on again: `back` stays until the session ends, since a list
  // read while it was off may be kept for as long.
  ownLinks = { token, on, back: was !== null && (was.back || !was.on) };
  listeners.forEach((listener) => listener());
}

/** Forgets the switch: a session that ended, and the tests. */
export function forgetOwnPostLinks(): void {
  ownLinks = null;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * The link «Share link» gives for a post, in a list that may have been read
 * a while ago: the post's own (`postLinkOf`), and none on one's own post
 * once «Links to my posts» is known to be off for the session that reads
 * (`token`). Turned on again while the app is open, one's own post read
 * while it was off has its link back at once too (`linkCameBack`), without
 * waiting for the list to be read again. Everywhere else the API says which
 * posts have a link: the app only follows the switch sooner.
 */
export function usePostLink(
  post: LinkedPost,
  mine: boolean,
  token: string | null,
): string | null {
  const own = useSyncExternalStore(subscribe, () => ownLinks);
  const known = mine && own !== null && own.token === token ? own : null;
  if (known !== null && !known.on) {
    return null;
  }
  if (known !== null && known.back && linkCameBack(post)) {
    return `${POST_LINK_PAGE}${post.id}`;
  }
  return postLinkOf(post);
}
