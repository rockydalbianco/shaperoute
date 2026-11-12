import fixture from "@shaperoute/shared-types/fixtures/post-link.json";
import { POST_LINK_PAGE } from "@shaperoute/shared-types";
import { Share } from "react-native";

import { postLinkOf, sharePostLink } from "./postLink";

// The link of a post (TASK-455 part E, ADR-0382): the page of the site with
// the drawing's id after the «#», and only for a post the API says has one.

const ID = fixture.id;

afterEach(() => jest.restoreAllMocks());

test("a linkable post's link is the site's page with its id after the «#»", () => {
  expect(postLinkOf({ id: ID, linkable: true })).toBe(`https://getmuw.app/p/#${ID}`);
  expect(POST_LINK_PAGE).toBe("https://getmuw.app/p/#");
});

test("a post the API does not call linkable has none: followers, switch off, an older API", () => {
  expect(postLinkOf({ id: ID, linkable: false })).toBeNull();
  expect(postLinkOf({ id: ID })).toBeNull();
});

test("«Share link» gives the phone's sheet the address and nothing else", async () => {
  const share = jest.spyOn(Share, "share").mockResolvedValue({ action: "sharedAction" });
  await sharePostLink(`${POST_LINK_PAGE}${ID}`);
  expect(share).toHaveBeenCalledTimes(1);
  expect(share).toHaveBeenCalledWith({ message: `https://getmuw.app/p/#${ID}` });
});

test("a sheet that fails or is closed is no problem", async () => {
  jest.spyOn(Share, "share").mockRejectedValue(new Error("dismissed"));
  await expect(sharePostLink(`${POST_LINK_PAGE}${ID}`)).resolves.toBeUndefined();
});
