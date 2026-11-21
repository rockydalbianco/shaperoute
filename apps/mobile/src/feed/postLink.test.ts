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
