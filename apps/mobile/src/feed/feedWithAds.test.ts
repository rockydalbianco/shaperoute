import { AD_EVERY, adSlots, feedWithAds, slotAhead } from "./feedWithAds";

test("an ad after every 5 posts, only between two posts (ADR-0198)", () => {
  expect(AD_EVERY).toBe(5);
  expect(adSlots(0)).toEqual([]);
  // Few posts: no ad, and never one at the end.
  expect(adSlots(5)).toEqual([]);
  expect(adSlots(6)).toEqual([5]);
  expect(adSlots(10)).toEqual([5]);
  expect(adSlots(11)).toEqual([5, 10]);
  // The example Feed of today: two.
  expect(adSlots(15)).toEqual([5, 10]);
});

test("the ads that are there go between the posts, the missing ones leave no gap", () => {
  const posts = Array.from({ length: 15 }, (_, i) => `post ${i}`);
  const rows = (ads: (string | undefined)[]) =>
    feedWithAds(posts, ads).map((item) =>
      item.kind === "post" ? item.post : `${item.ad} (slot ${item.slot})`,
    );

  // No ad: the posts as they are.
  expect(rows([])).toEqual(posts);
  expect(rows([undefined, undefined])).toEqual(posts);

  expect(rows(["ad A", "ad B"])).toEqual([
    ...posts.slice(0, 5),
    "ad A (slot 0)",
    ...posts.slice(5, 10),
    "ad B (slot 1)",
    ...posts.slice(10),
  ]);
  // Only the second place has its ad.
  expect(rows([undefined, "ad B"])).toEqual([
    ...posts.slice(0, 10),
    "ad B (slot 1)",
    ...posts.slice(10),
  ]);
});

test("each post keeps its place in the list of posts", () => {
  const items = feedWithAds(["a", "b", "c", "d", "e", "f"], ["ad"]);
  expect(items).toEqual([
    { kind: "post", post: "a", index: 0 },
    { kind: "post", post: "b", index: 1 },
    { kind: "post", post: "c", index: 2 },
    { kind: "post", post: "d", index: 3 },
    { kind: "post", post: "e", index: 4 },
    { kind: "ad", ad: "ad", slot: 0 },
    { kind: "post", post: "f", index: 5 },
  ]);
});

test("an ad goes only to a place whose next post has not been on the screen", () => {
  const slots = [5, 10, 15];
  // At the top: the first place.
  expect(slotAhead(slots, 0, 0)).toBe(0);
  // Post 5 (the sixth, under the first place) on the screen: too late for it.
  expect(slotAhead(slots, 0, 4)).toBe(0);
  expect(slotAhead(slots, 0, 5)).toBe(1);
  expect(slotAhead(slots, 0, 12)).toBe(2);
  // From a later slot on.
  expect(slotAhead(slots, 2, 0)).toBe(2);
  // All passed.
  expect(slotAhead(slots, 0, 15)).toBeNull();
  expect(slotAhead(slots, 3, 0)).toBeNull();
  expect(slotAhead([], 0, 0)).toBeNull();
});
