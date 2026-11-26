import type {
  ConversationState,
  Message,
  MessageNews,
  MessagesPage,
  Person,
} from "@shaperoute/shared-types";

import type { AttachKind } from "./AttachButton";

/**
 * How an open conversation is read again (TASK-498, an addition to
 * ADR-0279): no connection kept open, a question every few seconds.
 *
 * - The first page says `latest`, the place of its newest message; from
 *   then on the screen asks only what came after it (`?after=`), an answer
 *   of a hundred bytes when nothing did.
 * - The page is still read whole now and then: it alone says a message the
 *   other deleted, the other's name and picture, a card that changed, what
 *   may be attached.
 * - While the two write, a question every `fastMs`; after a while of
 *   silence, slower (the user's choice, 2026-11-26); fast again on a new
 *   message, on sending one, on coming back to the app.
 * - An answer that changes nothing leaves what the screen holds as it is,
 *   the same object: React draws nothing again.
 *
 * A server of before has no `latest`: then every question is the page, as
 * it always was, at the same rhythm.
 */

export type Rhythm = {
  /** Between two questions while the two write. */
  fastMs: number;
  /** After `slowAfterMs` without a message. */
  slowMs: number;
  /** After `slowestAfterMs` without one. */
  slowestMs: number;
  slowAfterMs: number;
  slowestAfterMs: number;
  /** The page is read whole when the last one is this old. */
  pageEveryMs: number;
};

/** 5 s; 15 s after a minute of silence; 30 s after five. The page each
 * minute. */
export const RHYTHM: Rhythm = {
  fastMs: 5_000,
  slowMs: 15_000,
  slowestMs: 30_000,
  slowAfterMs: 60_000,
  slowestAfterMs: 300_000,
  pageEveryMs: 60_000,
};

/** How long until the next question, `quietMs` after the last message. */
export function waitMs(quietMs: number, rhythm: Rhythm = RHYTHM): number {
  if (quietMs >= rhythm.slowestAfterMs) {
    return rhythm.slowestMs;
  }
  return quietMs >= rhythm.slowAfterMs ? rhythm.slowMs : rhythm.fastMs;
}

/**
 * Whether the next question is the page: without a place to ask from (the
 * first one, a server of before), or when the last page is old.
 */
export function wantsPage(
  latest: string | null,
  sincePageMs: number,
  rhythm: Rhythm = RHYTHM,
): boolean {
  return latest === null || sincePageMs >= rhythm.pageEveryMs;
}

/** What the screen has of the conversation, for one account and member. */
export type Held = {
  asked: string;
  person: Person;
  state: ConversationState;
  /** The latest first, as the API gives them. */
  messages: Message[];
  next: string | null;
  /** What may be attached now (TASK-333): nothing in a request, nothing
   * on a server before the attachments, no video while it is full. */
  files: AttachKind[];
};

/** The newer messages of `page` over the ones held, the latest first. */
export function merged(held: Message[], page: Message[]): Message[] {
  if (page.length === 0) {
    return [];
  }
  const fresh = new Set(page.map((m) => m.id));
  // As times: «…:00.5Z» is after «…:00Z», though it sorts before it.
  const oldest = Date.parse(page[page.length - 1].created_at);
  // What the page covers is as the page says: a message deleted is gone.
  const older = held.filter(
    (m) => !fresh.has(m.id) && Date.parse(m.created_at) < oldest,
  );
  return [...page, ...older];
}

/** Whether two things the API sent say the same. */
function same(a: unknown, b: unknown): boolean {
  return a === b || JSON.stringify(a) === JSON.stringify(b);
}

/** The messages of `now`, each one the object held when it says the same:
 * a row whose message did not change is not drawn again. */
function kept(held: Message[], now: Message[]): Message[] {
  const byId = new Map(held.map((m) => [m.id, m]));
  const messages = now.map((m) => {
    const was = byId.get(m.id);
    return was !== undefined && same(was, m) ? was : m;
  });
  return messages.length === held.length && messages.every((m, i) => m === held[i])
    ? held
    : messages;
}

/**
 * What the screen holds after a page read again: the page over the
 * messages held, the older pages read kept. `was` itself when the page
 * changes nothing.
 */
export function afterPage(was: Held | null, asked: string, page: MessagesPage): Held {
  // A post is sent from «Share» under it, not from the «+».
  const files =
    page.state === "open"
      ? (page.attachments?.kinds ?? []).filter(
          (kind): kind is AttachKind => kind !== "post",
        )
      : [];
  if (was === null) {
    return {
      asked,
      person: page.person,
      state: page.state,
      files,
      messages: page.messages,
      next: page.next,
    };
  }
  const messages = kept(was.messages, merged(was.messages, page.messages));
  if (
    messages === was.messages &&
    page.state === was.state &&
    same(page.person, was.person) &&
    same(files, was.files)
  ) {
    return was;
  }
  return {
    asked,
    person: same(page.person, was.person) ? was.person : page.person,
    state: page.state,
    files: same(files, was.files) ? was.files : files,
    messages,
    // The older pages read stay: where they end is the cursor.
    next: was.next,
  };
}

/**
 * What the screen holds after the messages that came since: they go on
 * top, and the state is the one said. `was` itself when nothing came.
 * Who the other is and what may be attached are the page's to say.
 */
export function afterNews(was: Held, news: MessageNews): Held {
  const fresh = new Set(news.messages.map((m) => m.id));
  // One's own message is held already, from its sending: once.
  const messages = kept(was.messages, [
    ...news.messages,
    ...was.messages.filter((m) => !fresh.has(m.id)),
  ]);
  if (messages === was.messages && news.state === was.state) {
    return was;
  }
  return { ...was, state: news.state, messages };
}
