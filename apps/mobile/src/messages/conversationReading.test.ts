import newsExample from "@shaperoute/shared-types/fixtures/message-news.json";
import messagesExample from "@shaperoute/shared-types/fixtures/messages.json";
import type { Message, MessageNews, MessagesPage } from "@shaperoute/shared-types";

import {
  afterNews,
  afterPage,
  type Held,
  RHYTHM,
  waitMs,
  wantsPage,
} from "./conversationReading";

// How an open conversation is read again (TASK-498): the rhythm, when the
// page is due, and what the screen holds after each answer — the same
// object when the answer changes nothing.

const page = messagesExample as MessagesPage;
const news = newsExample as MessageNews;
const ASKED = "token person";

/** A copy as a new answer of the API would be: equal, never the same. */
function again<T>(body: T): T {
  return JSON.parse(JSON.stringify(body)) as T;
}

function message(id: string, created_at: string, mine = false): Message {
  return { id, text: id, created_at, mine, attachment: null };
}

const held: Held = afterPage(null, ASKED, page);

test("the user's rhythm: 5 s, 15 s after a minute of silence, 30 s after five", () => {
  expect(RHYTHM).toEqual({
    fastMs: 5_000,
    slowMs: 15_000,
    slowestMs: 30_000,
    slowAfterMs: 60_000,
    slowestAfterMs: 300_000,
    pageEveryMs: 60_000,
  });
  expect(waitMs(0)).toBe(5_000);
  expect(waitMs(59_999)).toBe(5_000);
  expect(waitMs(60_000)).toBe(15_000);
  expect(waitMs(299_999)).toBe(15_000);
  expect(waitMs(300_000)).toBe(30_000);
  expect(waitMs(3_600_000)).toBe(30_000);
});

test("the page is due without a place to ask from, and once a minute", () => {
  // The first reading, and a server of before: no `latest`.
  expect(wantsPage(null, 0)).toBe(true);
  expect(wantsPage("17-ab", 0)).toBe(false);
  expect(wantsPage("17-ab", 59_999)).toBe(false);
  expect(wantsPage("17-ab", 60_000)).toBe(true);
});

test("the first page is what the screen holds", () => {
  expect(held).toEqual({
    asked: ASKED,
    person: page.person,
    state: "open",
    files: ["photo", "video", "drawing"],
    messages: page.messages,
    next: page.next,
  });
  // A post is not sent from the «+»; a request attaches nothing.
  const withPost: MessagesPage = {
    ...page,
    attachments: { ...page.attachments!, kinds: ["photo", "post"] },
  };
  expect(afterPage(null, ASKED, withPost).files).toEqual(["photo"]);
  expect(afterPage(null, ASKED, { ...page, state: "request" }).files).toEqual([]);
});

test("a page that says the same leaves what is held as it is", () => {
  expect(afterPage(held, ASKED, again(page))).toBe(held);
  // And a server of before, whose page has no `latest`.
  const before = again(page);
  delete before.latest;
  expect(afterPage(held, ASKED, before)).toBe(held);
});

test("a page that changes one thing changes that, and keeps the rest", () => {
  // The other's picture.
  const photo = afterPage(held, ASKED, {
    ...again(page),
    person: { ...page.person, photo: "abc" },
  });
  expect(photo).not.toBe(held);
  expect(photo.person.photo).toBe("abc");
  expect(photo.messages).toBe(held.messages);
  expect(photo.files).toBe(held.files);
  // A message the other deleted is gone; the one left is the object held.
  const [first, second] = page.messages;
  const deleted = afterPage(held, ASKED, { ...again(page), messages: [again(second)] });
  expect(deleted.messages).toEqual([second]);
  expect(deleted.messages[0]).toBe(held.messages[1]);
  expect(deleted.person).toBe(held.person);
  // A card that changed: that message is new, the other is not.
  const changed = afterPage(held, ASKED, {
    ...again(page),
    messages: [{ ...again(first), text: "[Post]" }, again(second)],
  });
  expect(changed.messages[0]).not.toBe(held.messages[0]);
  expect(changed.messages[1]).toBe(held.messages[1]);
  // The state, and with it what may be attached.
  const waiting = afterPage(held, ASKED, {
    ...again(page),
    state: "waiting",
    attachments: null,
  });
  expect(waiting.state).toBe("waiting");
  expect(waiting.files).toEqual([]);
  // The older pages read stay where they ended.
  const more = { ...held, next: "1-ab" };
  expect(afterPage(more, ASKED, { ...again(page), state: "waiting" }).next).toBe(
    "1-ab",
  );
});

test("no news leaves what is held as it is", () => {
  const nothing: MessageNews = {
    state: "open",
    messages: [],
    more: false,
    latest: page.latest!,
  };
  expect(afterNews(held, nothing)).toBe(held);
  // One's own message, held from its sending, comes as news: nothing new.
  const [first] = page.messages;
  expect(afterNews(held, { ...nothing, messages: [again(first)] })).toBe(held);
});

test("the news go on top, the latest first, each message once", () => {
  const after = afterNews(held, again(news));
  expect(after).not.toBe(held);
  expect(after.messages.map((m) => m.id)).toEqual([
    news.messages[0].id,
    ...page.messages.map((m) => m.id),
  ]);
  // What was held is the same objects, and who the other is too.
  expect(after.messages.slice(1)).toEqual(held.messages);
  expect(after.messages[1]).toBe(held.messages[0]);
  expect(after.person).toBe(held.person);
  expect(after.files).toBe(held.files);
  expect(after.next).toBe(held.next);
  // One's own sent since, already on top, and the other's after it.
  const mine = message("mine", "2026-10-26T09:30:00Z", true);
  const theirs = message("theirs", "2026-10-26T09:30:05Z");
  const sent: Held = { ...held, messages: [mine, ...held.messages] };
  const both = afterNews(sent, {
    state: "open",
    messages: [again(theirs), again(mine)],
    more: false,
    latest: "1-ab",
  });
  expect(both.messages.map((m) => m.id).slice(0, 2)).toEqual(["theirs", "mine"]);
  expect(both.messages[1]).toBe(mine);
  expect(both.messages).toHaveLength(held.messages.length + 2);
});

test("the news say the state, and nothing of who the other is", () => {
  const waiting: Held = { ...held, state: "waiting", files: [] };
  const accepted = afterNews(waiting, {
    state: "open",
    messages: [],
    more: false,
    latest: page.latest!,
  });
  expect(accepted.state).toBe("open");
  expect(accepted.messages).toBe(waiting.messages);
  // What may be attached is the page's to say: asked at once by the screen.
  expect(accepted.files).toBe(waiting.files);
});
