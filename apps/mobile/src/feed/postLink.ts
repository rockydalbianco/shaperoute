import { POST_LINK_PAGE } from "@shaperoute/shared-types";
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
