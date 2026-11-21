/**
 * A post of photos only in «Feed» and on its page (TASK-312 part C2): its
 * photos without a map, its title and «Imported», the actions without
 * «Share»; on one's own, the settings find it by its id, change it with
 * «Save» and delete it after a yes.
 */
import type { FeedPost, Session } from "@shaperoute/shared-types";
import feedPhotos from "@shaperoute/shared-types/fixtures/feed-photos.json";
import myPhotoPosts from "@shaperoute/shared-types/fixtures/my-photo-posts.json";
import session from "@shaperoute/shared-types/fixtures/session.json";
import { act, fireEvent, render, screen } from "@testing-library/react-native";

import type { AccountState } from "../account/useAccount";
import { isFeedPage } from "../api/feed";
import { MessagesContext, type MessagesDoor } from "../messages/messagesDoor";
import { FollowsContext } from "../social/followsDoor";
import { loadPhotoPostOutbox } from "../social/photoPostOutbox";
import { shownPost } from "./feedPosts";
import { PhotoFeedPost, photoPages } from "./PhotoFeedPost";
import { PhotoPostSettings } from "./PhotoPostSettings";

jest.mock(
  "react-native-safe-area-context",
  () => jest.requireActual("react-native-safe-area-context/jest/mock").default,
);
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
const signedIn = session as Session;
const SIGNED_IN: AccountState = { status: "signedIn", session: signedIn };

/** The example post, read as the app reads the Feed. */
function examplePost(): FeedPost {
  const page = structuredClone(feedPhotos);
  if (!isFeedPage(page)) {
    throw new Error("the example Feed is not read");
  }
  return page.posts[0];
}

function messages(): MessagesDoor {
  return {
    apiUrl: API,
    account: { state: SIGNED_IN, sessionEnded: jest.fn() },
    screen: null,
    openList: jest.fn(),
    openConversation: jest.fn(),
    back: jest.fn(),
    close: jest.fn(),
    unread: { unread: 0, requests: 0 },
    recount: jest.fn(),
  };
}

function around(children: React.ReactNode) {
  return (
    <MessagesContext.Provider value={messages()}>
      <FollowsContext.Provider
        value={{
          apiUrl: API,
          account: { state: SIGNED_IN, sessionEnded: () => {} },
          openProfile: () => {},
        }}
      >
        {children}
      </FollowsContext.Provider>
    </MessagesContext.Provider>
  );
}

beforeEach(() => {
  files.clear();
});

test("the example is read as a post of photos only, with no activity", () => {
  const post = examplePost();
  expect(post.source).toBe("photos");
  expect(post.activity).toBeUndefined();
  expect(photoPages(shownPost(post))).toEqual([1]);
});

test("the card shows its photos, its title and «Imported», and no «Share»", async () => {
  const post = examplePost();
  const onOpen = jest.fn();
  await render(
    around(<PhotoFeedPost post={shownPost(post)} width={320} onOpen={onOpen} />),
  );
  expect(screen.getAllByTestId("feed-photo")).toHaveLength(1);
  expect(screen.getByText("Lake morning")).toBeTruthy();
  expect(screen.getByTestId("imported-mark")).toBeTruthy();
  expect(screen.queryByTestId("feed-counter")).toBeNull();
  expect(screen.getByTestId("post-like")).toBeTruthy();
  expect(screen.queryByTestId("post-share")).toBeNull();
  await fireEvent.press(screen.getByTestId("feed-post"));
  expect(onOpen).toHaveBeenCalledTimes(1);
});

test("the author's picture is on the card, as on a run's; the initial without", async () => {
  const post = examplePost();
  const withFace = {
    ...post,
    author: { ...post.author, photo: `/users/${post.author.public_id}/photo?v=1` },
  };
  await render(
    around(<PhotoFeedPost post={shownPost(withFace)} width={320} onOpen={() => {}} />),
  );
  expect(screen.getByTestId("feed-author-photo")).toBeTruthy();
  await render(
    around(<PhotoFeedPost post={shownPost(post)} width={320} onOpen={() => {}} />),
  );
  expect(screen.queryByTestId("feed-author-photo")).toBeNull();
});

test("the owner's settings find the post by its id, «Save» sends the change", async () => {
  const [waiting, published] = myPhotoPosts.photo_posts;
  const post = { ...examplePost(), id: published.id };
  const fetchFn = jest.fn(async (url: string, init?: RequestInit) => {
    if (url === `${API}/me/photo-posts` && (init?.method ?? "GET") === "GET") {
      return Response.json(myPhotoPosts);
    }
    return init?.method === "DELETE"
      ? new Response(null, { status: 204 })
      : Response.json(published);
  });
  const onSaved = jest.fn();
  await render(
    around(
      <PhotoPostSettings
        post={shownPost(post)}
        onSaved={onSaved}
        onDeleted={() => {}}
        fetchFn={fetchFn as unknown as typeof fetch}
        apiKey={null}
      />,
    ),
  );
  await act(async () => {});
  expect(screen.getByTestId("photo-post-settings")).toBeTruthy();
  expect(waiting.id).not.toBe(published.id);
  await fireEvent.changeText(screen.getByLabelText("Title"), "Lake at dawn");
  await fireEvent.press(screen.getByRole("radio", { name: "Followers" }));
  await fireEvent.press(screen.getByTestId("photo-post-save"));
  await act(async () => {});
  expect(onSaved).toHaveBeenCalledWith({
    title: "Lake at dawn",
    description: post.description,
  });
  const put = fetchFn.mock.calls.find(
    ([url, init]) =>
      init?.method === "PUT" && url === `${API}/me/photo-posts/${published.key}`,
  );
  expect(JSON.parse(String(put?.[1]?.body))).toMatchObject({
    title: "Lake at dawn",
    visibility: "followers",
  });
  expect(loadPhotoPostOutbox()).toEqual([]);
});

test("«Delete» asks first, then deletes the post on the API", async () => {
  const [, published] = myPhotoPosts.photo_posts;
  const post = { ...examplePost(), id: published.id };
  const fetchFn = jest.fn(async (url: string, init?: RequestInit) =>
    url === `${API}/me/photo-posts` && (init?.method ?? "GET") === "GET"
      ? Response.json(myPhotoPosts)
      : new Response(null, { status: 204 }),
  );
  const onDeleted = jest.fn();
  await render(
    around(
      <PhotoPostSettings
        post={shownPost(post)}
        onSaved={() => {}}
        onDeleted={onDeleted}
        fetchFn={fetchFn as unknown as typeof fetch}
        apiKey={null}
      />,
    ),
  );
  await act(async () => {});
  await fireEvent.press(screen.getByTestId("photo-post-delete"));
  expect(screen.getByText("Delete this post? It cannot be undone.")).toBeTruthy();
  expect(onDeleted).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByTestId("photo-post-delete-yes"));
  await act(async () => {});
  expect(onDeleted).toHaveBeenCalledTimes(1);
  expect(
    fetchFn.mock.calls.some(
      ([url, init]) =>
        init?.method === "DELETE" && url === `${API}/me/photo-posts/${published.key}`,
    ),
  ).toBe(true);
});

test("a post not among the account's says so, and offers nothing to change", async () => {
  const fetchFn = jest.fn(async () => Response.json({ photo_posts: [] }));
  await render(
    around(
      <PhotoPostSettings
        post={shownPost(examplePost())}
        onSaved={() => {}}
        onDeleted={() => {}}
        fetchFn={fetchFn as unknown as typeof fetch}
        apiKey={null}
      />,
    ),
  );
  await act(async () => {});
  expect(screen.getByText("Something went wrong.")).toBeTruthy();
  expect(screen.queryByTestId("photo-post-save")).toBeNull();
});
