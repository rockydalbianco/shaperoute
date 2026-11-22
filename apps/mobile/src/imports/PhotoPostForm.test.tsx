/**
 * «Photos only» (TASK-312 part C2, docs/IMPORTAZIONI.md §4): the form of a
 * post of photos without a run. At least one photo; «Everyone» or
 * «Followers», from the last choice (the user's «L'ultima scelta»), never
 * «Only me»; «Post» keeps it on the phone and sends it, post first, then
 * its photo.
 */
import type { Session } from "@shaperoute/shared-types";
import myPhotoPost from "@shaperoute/shared-types/fixtures/my-photo-post.json";
import session from "@shaperoute/shared-types/fixtures/session.json";
import { act, fireEvent, render, screen } from "@testing-library/react-native";

import type { AccountState } from "../account/useAccount";
import type { PickedPhotos } from "../social/composer/pickPhotos";
import { FollowsContext } from "../social/followsDoor";
import { loadPhotoPostOutbox } from "../social/photoPostOutbox";
import { loadVisibility, saveVisibility } from "../social/visibilityChoice";
import { PhotoPostForm } from "./PhotoPostForm";
import { startVisibility } from "./photoPostVisibility";

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
jest.mock("react-native-view-shot");
// The phone's picker: one photo, «P», each time.
jest.mock("../social/composer/pickPhotos", () => ({
  pickPhotos: jest.fn(async (): Promise<PickedPhotos> => ({
    kind: "picked",
    photos: [{ base64: "P", width: 1, height: 1 }],
    tooLarge: false,
  })),
}));

const { files } = jest.requireMock<{ files: Map<string, string> }>("expo-file-system");
const API = "http://api";
const signedIn = session as Session;
const OWNER = signedIn.user.id;
const SIGNED_IN: AccountState = { status: "signedIn", session: signedIn };
const KEY = "p1a2b3c4d5e6f708";

function server(online = true) {
  return jest.fn(async (_url: string, init?: RequestInit) => {
    if (!online) {
      throw new TypeError("Network request failed");
    }
    return init?.method === "DELETE"
      ? new Response(null, { status: 204 })
      : Response.json(myPhotoPost);
  });
}

async function show(fetchFn = server(), onPosted = jest.fn()) {
  await render(
    <FollowsContext.Provider
      value={{
        apiUrl: API,
        account: { state: SIGNED_IN, sessionEnded: () => {} },
        openProfile: () => {},
      }}
    >
      <PhotoPostForm
        onPosted={onPosted}
        onCancel={() => {}}
        fetchFn={fetchFn as unknown as typeof fetch}
        apiKey={null}
        makeKey={() => KEY}
      />
    </FollowsContext.Provider>,
  );
  await act(async () => {});
  return { fetchFn, onPosted };
}

async function addPhoto() {
  await fireEvent.press(screen.getByRole("button", { name: "Add photo" }));
  await fireEvent.press(screen.getByRole("button", { name: "Choose a picture" }));
}

beforeEach(() => {
  files.clear();
});

test("it starts from the last choice, «Everyone» the first time and after «Only me»", () => {
  expect(startVisibility(OWNER)).toBe("everyone");
  saveVisibility(OWNER, "followers");
  expect(startVisibility(OWNER)).toBe("followers");
  saveVisibility(OWNER, "only_me");
  expect(startVisibility(OWNER)).toBe("everyone");
  expect(startVisibility(null)).toBe("everyone");
});

test("only «Everyone» and «Followers», and «Imported» on it", async () => {
  await show();
  expect(screen.getByRole("radio", { name: "Everyone" })).toBeTruthy();
  expect(screen.getByRole("radio", { name: "Followers" })).toBeTruthy();
  expect(screen.queryByRole("radio", { name: "Only me" })).toBeNull();
  expect(screen.getByTestId("imported-mark")).toBeTruthy();
  expect(screen.getByText("Every member sees it in your profile.")).toBeTruthy();
});

test("without a photo «Post» says to add one, and nothing is kept", async () => {
  const { fetchFn, onPosted } = await show();
  await fireEvent.press(screen.getByTestId("photo-post-post"));
  expect(screen.getByText("Add at least one photo.")).toBeTruthy();
  expect(onPosted).not.toHaveBeenCalled();
  expect(loadPhotoPostOutbox()).toEqual([]);
  expect(fetchFn).not.toHaveBeenCalled();
});

test("«Post» sends the post, then its photo, and keeps the choice for next time", async () => {
  const { fetchFn, onPosted } = await show();
  await addPhoto();
  await fireEvent.changeText(screen.getByLabelText("Title"), "  Lake morning ");
  await fireEvent.press(screen.getByRole("radio", { name: "Followers" }));
  await fireEvent.press(screen.getByTestId("photo-post-post"));
  await act(async () => {});
  expect(onPosted).toHaveBeenCalledTimes(1);
  const calls = fetchFn.mock.calls.map(
    ([url, init]) => `${init?.method ?? "GET"} ${String(url).slice(API.length)}`,
  );
  expect(calls).toEqual([
    `PUT /me/photo-posts/${KEY}`,
    `PUT /me/photo-posts/${KEY}/photos/1`,
    `PUT /me/photo-posts/${KEY}/order`,
  ]);
  expect(JSON.parse(String(fetchFn.mock.calls[0]?.[1]?.body))).toEqual({
    title: "Lake morning",
    description: null,
    visibility: "followers",
    tags: [],
  });
  expect(loadPhotoPostOutbox()).toEqual([]);
  expect(loadVisibility(OWNER)).toBe("followers");
});

test("without a network «Post» keeps it on the phone, to go later", async () => {
  const { onPosted } = await show(server(false));
  await addPhoto();
  await fireEvent.press(screen.getByTestId("photo-post-post"));
  await act(async () => {});
  expect(onPosted).toHaveBeenCalledTimes(1);
  const [waiting] = loadPhotoPostOutbox();
  expect(waiting?.key).toBe(KEY);
  expect(waiting?.photos).toEqual([1]);
});
