import assert from "node:assert/strict";
import { test } from "node:test";

import postExample from "../fixtures/message-post.json" with { type: "json" };
import {
  MESSAGE_ATTACHMENT_KINDS,
  MESSAGE_POST_KIND,
  READS_MESSAGE_POST,
  type MessageAttachmentRequest,
  type MessagePostCard,
} from "../src/index.ts";

// The same JSON is validated by the API's test_message_posts.py (TASK-455).
// Its kind, "post", reaches only an app that says READS_MESSAGE_POST: it is
// read here as plain JSON, not as a MessagesPage of the apps before.
const [shown, gone] = postExample.messages.map((m) => m.attachment);

test("a post attached is a pointer with its card", () => {
  assert.equal(shown.kind, MESSAGE_POST_KIND);
  assert.equal(shown.drawing, null);
  assert.equal(shown.media_id, null);
  const card = shown.post as MessagePostCard;
  assert.equal(card.author.username, "cleo_draws");
  assert.ok(card.preview.length <= 64);
  const asked: MessageAttachmentRequest = { post_id: card.id };
  assert.equal(asked.media_id, undefined);
});

test("a post who asks may not open has no card", () => {
  assert.equal(gone.kind, MESSAGE_POST_KIND);
  assert.equal(gone.post, null);
});

test("only an app that says it reads posts is offered them", () => {
  assert.equal(READS_MESSAGE_POST, "post");
  assert.ok(!(MESSAGE_ATTACHMENT_KINDS as readonly string[]).includes("post"));
  assert.deepEqual(postExample.attachments.kinds, [
    ...MESSAGE_ATTACHMENT_KINDS,
    MESSAGE_POST_KIND,
  ]);
});
