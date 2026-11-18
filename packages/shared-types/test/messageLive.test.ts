import assert from "node:assert/strict";
import { test } from "node:test";

import example from "../fixtures/message-live.json" with { type: "json" };
import {
  MESSAGE_ATTACHMENT_KINDS,
  MESSAGE_LIVE_KIND,
  type MessageAttachmentWithLive,
  READS_MESSAGE_LIVE,
} from "../src/index.ts";

// The same fixture is checked by the API's test_message_lives.py (TASK-468
// part A1b, ADR-0381).

test("a live is not among the kinds every app reads", () => {
  assert.ok(
    !(MESSAGE_ATTACHMENT_KINDS as readonly string[]).includes(MESSAGE_LIVE_KIND),
  );
  assert.equal(READS_MESSAGE_LIVE, "live");
});

test("the example shows a live card, then one ended", () => {
  const [shown, gone] = example.messages.map(
    (m) => m.attachment as MessageAttachmentWithLive,
  );
  assert.equal(shown.kind, MESSAGE_LIVE_KIND);
  assert.equal(shown.live?.status, "live");
  assert.ok((shown.live?.distance_m ?? 0) > 0);
  assert.equal(gone.kind, MESSAGE_LIVE_KIND);
  assert.equal(gone.live, null);
});
