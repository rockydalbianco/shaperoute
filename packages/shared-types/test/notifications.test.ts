import assert from "node:assert/strict";
import { test } from "node:test";

import page from "../fixtures/notifications.json" with { type: "json" };
import unreadExample from "../fixtures/notifications-unread.json" with { type: "json" };
import type {
  NotificationsPage,
  NotificationsReadRequest,
  NotificationsUnread,
} from "../src/index.ts";

// The same JSON is read by the API's test_notification_list.py (TASK-367 C).
const bell: NotificationsPage = page;

test("the bell's lines come newest first, with what each opens", () => {
  const ids = bell.notifications.map((line) => line.id);
  assert.deepEqual(
    ids,
    [...ids].sort((a, b) => b - a),
  );
  assert.equal(bell.unread, bell.notifications.filter((line) => !line.read).length);
  const [comment, request] = bell.notifications.map((line) => line.opens);
  assert.ok("drawing_id" in comment);
  assert.ok(
    "public_id" in request &&
      request.public_id === bell.notifications[1].actor.public_id,
  );
});

test("reading says the newest line shown", () => {
  const read: NotificationsReadRequest = { up_to: bell.notifications[0].id };
  assert.equal(read.up_to, 42);
});

// The same JSON is read by the API's test_notification_unread.py (TASK-499).
test("the bell's number alone is a count and nothing else", () => {
  const count: NotificationsUnread = unreadExample;
  assert.deepEqual(Object.keys(count), ["unread"]);
  assert.ok(Number.isInteger(count.unread) && count.unread >= 0);
});
