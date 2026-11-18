import { POST_LINK_PAGE } from "@shaperoute/shared-types";
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
// again.
let ownLinks: { token: string; on: boolean } | null = null;
const listeners = new Set<() => void>();

/** «Links to my posts» as the API has just said it is for this session:
 * read, or turned. */
export function ownPostLinksAre(token: string, on: boolean): void {
  if (ownLinks !== null && ownLinks.token === token && ownLinks.on === on) {
    return;
  }
  ownLinks = { token, on };
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
 * (`token`). Turned on again, a post read while it was off has its link back
 * when the list is read again: the API says which posts have one, the app
 * only takes it away sooner.
 */
export function usePostLink(
  post: { id: string; linkable?: boolean },
  mine: boolean,
  token: string | null,
): string | null {
  const own = useSyncExternalStore(subscribe, () => ownLinks);
  const off = own !== null && own.token === token && !own.on;
  return mine && off ? null : postLinkOf(post);
}
