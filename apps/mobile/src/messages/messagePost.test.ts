import postExample from "@shaperoute/shared-types/fixtures/message-post.json";
import type { MessagePostCard } from "@shaperoute/shared-types";

import {
  followersNote,
  postAttachment,
  postByline,
  postOfDrawing,
  postOfFeed,
  postTitle,
} from "./messagePost";

// A post in a message (TASK-455, ADR-0382): what is sent is its id, and
// what the card says comes from the API, for who reads.

const CARD = postExample.messages[0].attachment.post as MessagePostCard;
const CLEO = { public_id: "c2a9f4d1-5e7b-4a63-b0d8-1f3e6a9c7b24", username: "cleo" };
const ME = "8c1f7a52-3d4e-4b9a-9f61-2a7c0e5d9b13";

test("a post is sent by its id, and nothing of the drawing", () => {
  const post = postOfFeed({ id: "d1", author: CLEO, visibility: "everyone" });
  expect(postAttachment(post)).toEqual({ post_id: "d1" });
});

test("a post of the Feed and a drawing opened say who sees them", () => {
  expect(postOfFeed({ id: "d1", author: CLEO, visibility: "followers" }).everyone).toBe(
    false,
  );
  // An API of before has no visibility: its drawings were for everyone.
  expect(postOfFeed({ id: "d1", author: CLEO }).everyone).toBe(true);
  expect(postOfDrawing({ id: "d1", author: CLEO, public: false })).toEqual({
    id: "d1",
    author: CLEO,
    everyone: false,
  });
});

test("somebody else's post for its followers says who can open it, before it is sent", () => {
  const theirs = postOfDrawing({ id: "d1", author: CLEO, public: false });
  expect(followersNote(theirs, ME)).toBe("Only people who follow cleo can open it.");
  // For everyone there is nothing to say; nor of one's own.
  expect(followersNote({ ...theirs, everyone: true }, ME)).toBeNull();
  expect(followersNote(theirs, CLEO.public_id)).toBeNull();
  // Signed out nobody is the author.
  expect(followersNote(theirs, null)).not.toBeNull();
});

test("the card is called by its title, else by what it draws", () => {
  expect(postTitle(CARD)).toBe("Sunday star");
  expect(postTitle({ ...CARD, title: null })).toBe("Star");
  expect(postTitle({ ...CARD, title: null, shape: null, word: "ciao" })).toBe("ciao");
  expect(
    postTitle({ ...CARD, title: null, shape: null, route_title: "Along the river" }),
  ).toBe("Along the river");
  expect(postTitle({ ...CARD, title: null, shape: null })).toBe("");
});

test("the card says who published it and how long it is", () => {
  expect(postByline(CARD)).toBe("by cleo_draws · 4.0 km");
  // A workout at the gym has no line, so no length.
  expect(postByline({ ...CARD, preview: [] })).toBe("by cleo_draws");
});
