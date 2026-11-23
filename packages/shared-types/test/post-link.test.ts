import assert from "node:assert/strict";
import { test } from "node:test";

import linkExample from "../fixtures/post-link.json" with { type: "json" };
import { POST_LINK_PAGE, type PostLink, type PostLinksSwitch } from "../src/index.ts";

// The same JSON is validated by the API's test_post_links.py (TASK-455 C).
const shown = linkExample as PostLink;

test("the link of a post shows its line, its name and who drew it", () => {
  assert.equal(shown.username, "cleo_draws");
  assert.ok(shown.track.length >= 2);
  assert.ok(shown.distance_m > 0);
});

test("it shows nothing else of the post or of the account", () => {
  assert.deepEqual(Object.keys(shown).sort(), [
    "activity",
    "distance_m",
    "id",
    "rotation_deg",
    "route_title",
    "shape",
    "title",
    "track",
    "username",
    "word",
  ]);
});

test("the link is the page of the site, then the drawing's id", () => {
  assert.equal(
    `${POST_LINK_PAGE}${shown.id}`.startsWith("https://getmuw.app/p/#"),
    true,
  );
  const off: PostLinksSwitch = { post_links: false };
  assert.equal(off.post_links, false);
});
