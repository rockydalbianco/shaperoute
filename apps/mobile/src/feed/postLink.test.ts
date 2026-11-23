import fixture from "@shaperoute/shared-types/fixtures/post-link.json";
import { POST_LINK_PAGE } from "@shaperoute/shared-types";
import { Share } from "react-native";

import { act, renderHook } from "@testing-library/react-native";

import {
  forgetOwnPostLinks,
  ownPostLinksAre,
  postLinkOf,
  sharePostLink,
  usePostLink,
} from "./postLink";

// The link of a post (TASK-455 part E, ADR-0382): the page of the site with
// the drawing's id after the «#», and only for a post the API says has one.

const ID = fixture.id;

afterEach(() => {
  jest.restoreAllMocks();
  forgetOwnPostLinks();
});

test("a linkable post's link is the site's page with its id after the «#»", () => {
  expect(postLinkOf({ id: ID, linkable: true })).toBe(`https://getmuw.app/p/#${ID}`);
  expect(POST_LINK_PAGE).toBe("https://getmuw.app/p/#");
});

test("a post the API does not call linkable has none: followers, switch off, an older API", () => {
  expect(postLinkOf({ id: ID, linkable: false })).toBeNull();
  expect(postLinkOf({ id: ID })).toBeNull();
});

test("«Share link» gives the phone's sheet the address and nothing else", async () => {
  const share = jest
    .spyOn(Share, "share")
    .mockResolvedValue({ action: "sharedAction" });
  await sharePostLink(`${POST_LINK_PAGE}${ID}`);
  expect(share).toHaveBeenCalledTimes(1);
  expect(share).toHaveBeenCalledWith({ message: `https://getmuw.app/p/#${ID}` });
});

test("a sheet that fails or is closed is no problem", async () => {
  jest.spyOn(Share, "share").mockRejectedValue(new Error("dismissed"));
  await expect(sharePostLink(`${POST_LINK_PAGE}${ID}`)).resolves.toBeUndefined();
});

test("one's own posts lose their link at once when «Links to my posts» is off", async () => {
  const post = { id: ID, linkable: true };
  const mine = await renderHook(() => usePostLink(post, true, "token-a"));
  const others = await renderHook(() => usePostLink(post, false, "token-a"));
  expect(mine.result.current).toBe(`https://getmuw.app/p/#${ID}`);
  // The list was read before the switch was turned: its `linkable` is old.
  await act(() => ownPostLinksAre("token-a", false));
  expect(mine.result.current).toBeNull();
  // Somebody else's post is its owner's to switch.
  expect(others.result.current).toBe(`https://getmuw.app/p/#${ID}`);
  // On again: the API's word is back.
  await act(() => ownPostLinksAre("token-a", true));
  expect(mine.result.current).toBe(`https://getmuw.app/p/#${ID}`);
});

test("the switch of one session says nothing of another's posts", async () => {
  ownPostLinksAre("token-a", false);
  const other = await renderHook(() =>
    usePostLink({ id: ID, linkable: true }, true, "token-b"),
  );
  expect(other.result.current).toBe(`https://getmuw.app/p/#${ID}`);
  const none = await renderHook(() =>
    usePostLink({ id: ID, linkable: true }, true, null),
  );
  expect(none.result.current).toBe(`https://getmuw.app/p/#${ID}`);
});

test("turned on, a post the API does not call linkable still has no link", async () => {
  ownPostLinksAre("token-a", true);
  const mine = await renderHook(() =>
    usePostLink({ id: ID, linkable: false }, true, "token-a"),
  );
  expect(mine.result.current).toBeNull();
});

// Read while the switch was off: the API called it not linkable.
const READ_OFF = {
  id: ID,
  linkable: false,
  visibility: "everyone" as const,
  track_preview: fixture.track as [number, number][],
};

test("off and on again, one's own post read in between has its link back at once", async () => {
  ownPostLinksAre("token-a", false);
  const mine = await renderHook(() => usePostLink(READ_OFF, true, "token-a"));
  const others = await renderHook(() => usePostLink(READ_OFF, false, "token-a"));
  expect(mine.result.current).toBeNull();
  await act(() => ownPostLinksAre("token-a", true));
  expect(mine.result.current).toBe(`https://getmuw.app/p/#${ID}`);
  // Somebody else's post is as the API said: its owner's switch, not this one.
  expect(others.result.current).toBeNull();
  // Off once more, and on: still at once.
  await act(() => ownPostLinksAre("token-a", false));
  expect(mine.result.current).toBeNull();
  await act(() => ownPostLinksAre("token-a", true));
  expect(mine.result.current).toBe(`https://getmuw.app/p/#${ID}`);
});

test("on again, only a post the switch alone kept without a link has one", async () => {
  ownPostLinksAre("token-a", false);
  ownPostLinksAre("token-a", true);
  const link = async (post: Parameters<typeof usePostLink>[0]) =>
    (await renderHook(() => usePostLink(post, true, "token-a"))).result.current;
  // For its followers, or for nobody: never a link.
  expect(await link({ ...READ_OFF, visibility: "followers" })).toBeNull();
  expect(await link({ ...READ_OFF, visibility: "only_me" })).toBeNull();
  expect(await link({ ...READ_OFF, visibility: undefined })).toBeNull();
  // Without a line there is nothing for the page to draw.
  expect(await link({ ...READ_OFF, track_preview: [] })).toBeNull();
  expect(await link({ ...READ_OFF, track_preview: undefined })).toBeNull();
  // An API before the links says nothing of `linkable`: no link.
  expect(await link({ ...READ_OFF, linkable: undefined })).toBeNull();
});

test("a switch only read on, or of another session, brings no link back", async () => {
  // Never off while the app was open: the API's word stands.
  ownPostLinksAre("token-a", true);
  const mine = await renderHook(() => usePostLink(READ_OFF, true, "token-a"));
  expect(mine.result.current).toBeNull();
  // Another account turned its own off and on.
  await act(() => ownPostLinksAre("token-b", false));
  await act(() => ownPostLinksAre("token-b", true));
  const other = await renderHook(() => usePostLink(READ_OFF, true, "token-a"));
  expect(other.result.current).toBeNull();
});
