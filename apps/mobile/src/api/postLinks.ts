import type { PostLinksSwitch } from "@shaperoute/shared-types";

import { type AccountOutcome, ask } from "./accounts";

/**
 * «Links to my posts» (TASK-455 part E, ADR-0382, docs/API.md, «Post
 * links»): GET /me/post-links says whether the links to the account's posts
 * work, PUT /me/post-links turns them on or off. Both with the session
 * token. An API older than part C answers 404: `http_error`.
 */

type Options = { fetchFn?: typeof fetch; key?: string | null };

/** GET /me/post-links: the switch as the API keeps it. */
export function fetchPostLinks(
  baseUrl: string,
  token: string,
  options: Options = {},
): Promise<AccountOutcome<PostLinksSwitch>> {
  return ask(
    baseUrl,
    "/me/post-links",
    { method: "GET", token },
    isPostLinksSwitch,
    options,
  );
}

/** PUT /me/post-links: on or off; the answer is the switch as kept now. */
export function savePostLinks(
  baseUrl: string,
  token: string,
  on: boolean,
  options: Options = {},
): Promise<AccountOutcome<PostLinksSwitch>> {
  const body: PostLinksSwitch = { post_links: on };
  return ask(
    baseUrl,
    "/me/post-links",
    { method: "PUT", body, token },
    isPostLinksSwitch,
    options,
  );
}

export function isPostLinksSwitch(body: unknown): body is PostLinksSwitch {
  return (
    typeof body === "object" &&
    body !== null &&
    typeof (body as Record<string, unknown>).post_links === "boolean"
  );
}
