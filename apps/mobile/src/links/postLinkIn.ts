import { POST_LINK_PAGE } from "@shaperoute/shared-types";

// The page of a post's link without its «#»: `https://getmuw.app/p/`.
const PAGE = POST_LINK_PAGE.replace(/#$/, "").replace(/\/$/, "");
const ID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const escaped = PAGE.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// The page as the site serves it (`/p`, `/p/`, `/p/index.html`), whatever
// it was asked with after «?», and the post after «#».
const LINK = new RegExp(
  `^${escaped}(?:/(?:index\\.html)?)?(?:\\?[^#]*)?#(${ID})$`,
  "i",
);

/**
 * The post an address handed to the app is the link of (TASK-482 part A,
 * ADR-0391), or null: only the page of the site that shows a post
 * (`POST_LINK_PAGE`, TASK-455 part E) with something shaped like a
 * drawing's id after «#». Anything else is not ours to open — another
 * site, another page, another scheme, words that are not an address.
 *
 * The id is only a shape here: whether the post exists and who may see it
 * is the API's to say, when the drawing is fetched.
 */
export function postLinkIn(address: unknown): string | null {
  if (typeof address !== "string") {
    return null;
  }
  const found = LINK.exec(address.trim());
  return found === null ? null : found[1].toLowerCase();
}
