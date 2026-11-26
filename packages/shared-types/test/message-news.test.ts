import assert from "node:assert/strict";
import { test } from "node:test";

import attachmentsExample from "../fixtures/message-attachments.json" with { type: "json" };
import newsExample from "../fixtures/message-news.json" with { type: "json" };
import messagesExample from "../fixtures/messages.json" with { type: "json" };
import {
  CONVERSATION_STATES,
  type MessageNews,
  type MessagesPage,
} from "../src/index.ts";

// The same JSON is validated by the API's test_message_news.py (TASK-498).
const news = newsExample as MessageNews;
const page = messagesExample as MessagesPage;
const withFiles = attachmentsExample as unknown as MessagesPage;

/** The place of a message, as the API writes it: microseconds and its id. */
function placeOf(message: { id: string; created_at: string }): string {
  return `${Date.parse(message.created_at) * 1000}-${message.id.replaceAll("-", "")}`;
}

test("the first page says the place of its newest message", () => {
  assert.equal(page.latest, placeOf(page.messages[0]));
  assert.equal(withFiles.latest, placeOf(withFiles.messages[0]));
});

test("the news are the messages after a place, and where the next check starts", () => {
  assert.deepEqual(Object.keys(news), ["state", "messages", "more", "latest"]);
  assert.ok((CONVERSATION_STATES as readonly string[]).includes(news.state));
  assert.equal(news.more, false);
  assert.equal(news.latest, placeOf(news.messages[0]));
  // After the page's newest: this is what `?after=<page.latest>` answers.
  assert.ok(
    Date.parse(news.messages[0].created_at) > Date.parse(page.messages[0].created_at),
  );
});
