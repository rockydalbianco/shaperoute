import myPhotoPost from "@shaperoute/shared-types/fixtures/my-photo-post.json";
import myPhotoPosts from "@shaperoute/shared-types/fixtures/my-photo-posts.json";

import { fetchMyPhotoPosts, isMyPhotoPost } from "../api/photoPosts";
import {
  forgetPhotoPostsOf,
  keepPhotoPost,
  keepPhotoPostDeleted,
  loadPhotoPostOutbox,
  MAX_PHOTO_POSTS_WAITING,
  PHOTO_POST_PHOTO_PREFIX,
  sendWaitingPhotoPosts,
  waitingPhoto,
  waitingPost,
} from "./photoPostOutbox";

// The posts of photos only on the phone until the API has them (TASK-312
// part C2): the post, then its photos, the places emptied, the order;
// deleted ones deleted; a refused one not sent again.

// The phone's documents folder, in memory.
jest.mock("expo-file-system", () => {
  const files = new Map<string, string>();
  class File {
    uri: string;
    constructor(directory: { uri: string }, name: string) {
      this.uri = `${directory.uri}${name}`;
    }
    get exists(): boolean {
      return files.has(this.uri);
    }
    create(): void {
      files.set(this.uri, "");
    }
    write(text: string): void {
      files.set(this.uri, text);
    }
    textSync(): string {
      return files.get(this.uri) ?? "";
    }
    delete(): void {
      files.delete(this.uri);
    }
  }
  return { File, files, Paths: { document: { uri: "file:///documents/" } } };
});

const { files } = jest.requireMock<{ files: Map<string, string> }>("expo-file-system");
const API = "http://api";
const KEY = "p1a2b3c4d5e6f708";
const CHOICE = {
  title: "Lake morning",
  description: null,
  visibility: "everyone" as const,
  tags: [],
};

type Call = { method: string; path: string; body: unknown };

/** The API, faked: every call recorded, each answered as `answer` says. */
function api(answer: (call: Call) => Response = () => Response.json(myPhotoPost)) {
  const calls: Call[] = [];
  const fetchFn = jest.fn(async (url: string, init?: RequestInit) => {
    const call = {
      method: init?.method ?? "GET",
      path: url.slice(API.length),
      body: init?.body === undefined ? undefined : JSON.parse(String(init.body)),
    };
    calls.push(call);
    return call.method === "DELETE"
      ? new Response(null, { status: 204 })
      : answer(call);
  });
  return { calls, fetchFn: fetchFn as unknown as typeof fetch };
}

function photoFiles(): string[] {
  return [...files.keys()].filter((uri) => uri.includes(PHOTO_POST_PHOTO_PREFIX));
}

beforeEach(() => {
  files.clear();
});

test("the answers of the API are read as the shared examples say", () => {
  expect(isMyPhotoPost(myPhotoPost)).toBe(true);
  expect(isMyPhotoPost({ ...myPhotoPost, visibility: "only_me" })).toBe(false);
  expect(myPhotoPosts.photo_posts.every(isMyPhotoPost)).toBe(true);
});

test("the account's posts are listed with their keys; an API before: none", async () => {
  const listed = api(() => Response.json(myPhotoPosts));
  const outcome = await fetchMyPhotoPosts(API, "token", { fetchFn: listed.fetchFn });
  expect(outcome).toEqual({ kind: "ok", value: myPhotoPosts.photo_posts });
  expect(listed.calls).toEqual([
    { method: "GET", path: "/me/photo-posts", body: undefined },
  ]);
  const older = api(() =>
    Response.json(
      { error: { code: "http_error", message: "Not Found" } },
      { status: 404 },
    ),
  );
  expect(await fetchMyPhotoPosts(API, "token", { fetchFn: older.fetchFn })).toEqual({
    kind: "ok",
    value: [],
  });
});

test("a post goes whole, then its photos, then its order, and leaves the phone", async () => {
  expect(
    keepPhotoPost({
      owner: 1,
      key: KEY,
      choice: CHOICE,
      added: [
        { n: 1, base64: "AAA" },
        { n: 2, base64: "BBB" },
      ],
      removed: [],
      order: ["photo:2", "photo:1"],
    }),
  ).toBe("kept");
  expect(waitingPhoto(1, KEY, 2)).toBe("BBB");
  const { calls, fetchFn } = api();
  expect(await sendWaitingPhotoPosts(API, "token", 1, { fetchFn })).toEqual({
    sent: true,
    stopped: false,
  });
  expect(calls.map((call) => `${call.method} ${call.path}`)).toEqual([
    `PUT /me/photo-posts/${KEY}`,
    `PUT /me/photo-posts/${KEY}/photos/1`,
    `PUT /me/photo-posts/${KEY}/photos/2`,
    `PUT /me/photo-posts/${KEY}/order`,
  ]);
  expect(calls[0]?.body).toEqual(CHOICE);
  expect(calls[1]?.body).toEqual({ image: "AAA" });
  expect(calls[3]?.body).toEqual({ order: ["photo:2", "photo:1"] });
  expect(loadPhotoPostOutbox()).toEqual([]);
  expect(photoFiles()).toEqual([]);
});

test("without a network it all waits, and goes the next time", async () => {
  keepPhotoPost({
    owner: 1,
    key: KEY,
    choice: CHOICE,
    added: [{ n: 1, base64: "AAA" }],
    removed: [],
    order: null,
  });
  const offline = jest.fn(async () => {
    throw new TypeError("Network request failed");
  }) as unknown as typeof fetch;
  expect(await sendWaitingPhotoPosts(API, "token", 1, { fetchFn: offline })).toEqual({
    sent: false,
    stopped: true,
  });
  expect(waitingPost(1, KEY)?.photos).toEqual([1]);
  const { calls, fetchFn } = api();
  await sendWaitingPhotoPosts(API, "token", 1, { fetchFn });
  expect(calls).toHaveLength(2);
  expect(loadPhotoPostOutbox()).toEqual([]);
});

test("a change on top of one waiting adds its photos and empties its places", () => {
  keepPhotoPost({
    owner: 1,
    key: KEY,
    choice: CHOICE,
    added: [
      { n: 1, base64: "AAA" },
      { n: 2, base64: "BBB" },
    ],
    removed: [],
    order: null,
  });
  keepPhotoPost({
    owner: 1,
    key: KEY,
    choice: { ...CHOICE, title: "Lake at dawn" },
    added: [{ n: 3, base64: "CCC" }],
    removed: [2, 5],
    order: null,
  });
  const waiting = waitingPost(1, KEY);
  expect(waiting?.choice.title).toBe("Lake at dawn");
  expect(waiting?.photos).toEqual([1, 3]);
  expect(waiting?.removed).toEqual([2, 5]);
  expect(waitingPhoto(1, KEY, 2)).toBeNull();
});

test("a post deleted is deleted on the API, its photos gone from the phone", async () => {
  keepPhotoPost({
    owner: 1,
    key: KEY,
    choice: CHOICE,
    added: [{ n: 1, base64: "AAA" }],
    removed: [],
    order: null,
  });
  expect(keepPhotoPostDeleted(1, KEY)).toBe(true);
  expect(photoFiles()).toEqual([]);
  const { calls, fetchFn } = api();
  await sendWaitingPhotoPosts(API, "token", 1, { fetchFn });
  expect(calls.map((call) => `${call.method} ${call.path}`)).toEqual([
    `DELETE /me/photo-posts/${KEY}`,
  ]);
  expect(loadPhotoPostOutbox()).toEqual([]);
});

test("a post the API refuses stays, marked, and is not sent again", async () => {
  keepPhotoPost({
    owner: 1,
    key: KEY,
    choice: { ...CHOICE, title: "x".repeat(61) },
    added: [{ n: 1, base64: "AAA" }],
    removed: [],
    order: null,
  });
  const refusing = api(() =>
    Response.json(
      {
        error: {
          code: "invalid_request",
          message: "A title is at most 60 characters.",
        },
      },
      { status: 422 },
    ),
  );
  await sendWaitingPhotoPosts(API, "token", 1, { fetchFn: refusing.fetchFn });
  expect(waitingPost(1, KEY)?.refused?.code).toBe("invalid_request");
  const again = api();
  await sendWaitingPhotoPosts(API, "token", 1, { fetchFn: again.fetchFn });
  expect(again.calls).toEqual([]);
});

test("each account has its own posts, and as many as the phone holds", () => {
  for (let i = 0; i < MAX_PHOTO_POSTS_WAITING; i += 1) {
    keepPhotoPost({
      owner: 1,
      key: `p${String(i).padStart(8, "0")}`,
      choice: CHOICE,
      added: [],
      removed: [],
      order: null,
    });
  }
  const one = { choice: CHOICE, added: [], removed: [], order: null };
  expect(keepPhotoPost({ ...one, owner: 1, key: "pfullfull" })).toBe("full");
  expect(keepPhotoPost({ ...one, owner: 2, key: "pfullfull" })).toBe("kept");
  forgetPhotoPostsOf(1);
  expect(loadPhotoPostOutbox().map((item) => item.owner)).toEqual([2]);
});
