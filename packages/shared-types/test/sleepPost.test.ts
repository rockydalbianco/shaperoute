import assert from "node:assert/strict";
import { test } from "node:test";

import reads from "../fixtures/reads.json" with { type: "json" };
import request from "../fixtures/sleep-post-request.json" with { type: "json" };
import post from "../fixtures/sleep-post.json" with { type: "json" };
import summary from "../fixtures/sleep-summary.json" with { type: "json" };
import {
  type DrawingSource,
  type MySleepPost,
  SLEEP_POST_VISIBILITIES,
  SLEEP_SOURCE,
  type SleepPostRequest,
  type SleepPostVisibility,
} from "../src/index.ts";

// The same JSON is validated by the API's test_sleep_posts.py (TASK-467
// part E, ADR-0380 precisazione E).
const visibility = (value: string): SleepPostVisibility => {
  assert.ok((SLEEP_POST_VISIBILITIES as readonly string[]).includes(value));
  return value as SleepPostVisibility;
};
const sent: SleepPostRequest = {
  ...request,
  visibility: visibility(request.visibility),
};
const kept: MySleepPost = { ...post, visibility: visibility(post.visibility) };

test("the post of a night is its figures and who sees it, never «Only me»", () => {
  assert.deepEqual(Object.keys(sent).sort(), [
    "asleep_min",
    "awake_min",
    "score",
    "stages",
    "visibility",
  ]);
  assert.deepEqual([...SLEEP_POST_VISIBILITIES], ["everyone", "followers"]);
});

test("its owner reads the night, the drawing's id and when it was published", () => {
  const { id, visibility: seenBy, published_at, ...night } = kept;
  assert.deepEqual(night, summary);
  assert.match(id, /^[0-9a-f-]{36}$/);
  assert.equal(seenBy, "everyone");
  assert.ok(!Number.isNaN(Date.parse(published_at)));
  // The night is a day: no hour of going to bed or of waking.
  assert.match(kept.night, /^\d{4}-\d{2}-\d{2}$/);
});

test("`sleep` is a source of a drawing and a kind an app may read, after `photos`", () => {
  const source: DrawingSource = SLEEP_SOURCE;
  assert.equal(source, "sleep");
  assert.equal(reads.kinds.indexOf(SLEEP_SOURCE), reads.kinds.indexOf("photos") + 1);
  // The app says it with part E's app: today's does not read it yet.
  assert.ok(!reads.this_app.split(",").includes(SLEEP_SOURCE));
});
