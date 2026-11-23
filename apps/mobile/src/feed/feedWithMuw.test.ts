import list from "@shaperoute/shared-types/fixtures/muw-routes.json";
import post from "@shaperoute/shared-types/fixtures/style-post.json";
import type { MuwRoute, StylePost } from "@shaperoute/shared-types";

import { feedWithAds } from "./feedWithAds";
import { feedWithMuw, MUW_EVERY, MUW_FIRST, muwSlots } from "./feedWithMuw";
import { feedWithStyle } from "./feedWithStyle";

const ROUTE = (list.routes as unknown as MuwRoute[])[0];
const routes = (n: number): MuwRoute[] =>
  Array.from({ length: n }, (_, i) => ({ ...ROUTE, id: `route-${i + 1}` }));
const STYLE = post as StylePost;
const styles = (n: number): StylePost[] =>
  Array.from({ length: n }, (_, i) => ({ ...STYLE, id: `MS-00${i + 1}` }));
const drawings = (n: number): string[] => Array.from({ length: n }, (_, i) => `d${i}`);

function rows(
  posts: number,
  ads: (string | undefined)[],
  style: number,
  muw: number,
): string[] {
  return feedWithMuw(
    feedWithStyle(feedWithAds(drawings(posts), ads), styles(style)),
    routes(muw),
  ).map((row) =>
    row.kind === "post"
      ? "d"
      : row.kind === "ad"
        ? "AD"
        : row.kind === "style"
          ? "S"
          : "M",
  );
}

test("after the 3rd drawing, then one row in 6 at most", () => {
  expect(MUW_FIRST).toBe(3);
  expect(MUW_EVERY).toBe(6);
  expect(muwSlots(30)).toEqual([3, 8, 13, 18, 23, 28]);
  // 8 and 9 are taken: two drawings down, and the next counts from there.
  expect(muwSlots(30, new Set([8, 9]))).toEqual([3, 10, 15, 20, 25]);
});

test("never in the first 3, never at the end", () => {
  expect(rows(3, [], 0, 5)).toEqual(["d", "d", "d"]);
  expect(rows(4, [], 0, 5)).toEqual(["d", "d", "d", "M", "d"]);
  const list = rows(40, [], 0, 10);
  expect(list.slice(0, 3)).toEqual(["d", "d", "d"]);
  expect(list.at(-1)).toBe("d");
});

test("the examples of today, 15 drawings, have three", () => {
  expect(rows(15, [], 0, 25).filter((r) => r === "M")).toHaveLength(3);
  expect(muwSlots(15)).toEqual([3, 8, 13]);
});

test("never beside an ad or a Style post, never two in a row", () => {
  const list = rows(60, Array(12).fill("ad"), 10, 25);
  for (let at = 1; at < list.length; at += 1) {
    const pair = [list[at - 1], list[at]];
    if (pair.includes("M")) {
      expect(pair.filter((r) => r !== "d")).toHaveLength(1);
    }
  }
  // At most one in 6 in any 6 rows of drawings and routes.
  const ours = list.filter((r) => r === "d" || r === "M");
  for (let at = 0; at + MUW_EVERY <= ours.length; at += 1) {
    expect(
      ours.slice(at, at + MUW_EVERY).filter((r) => r === "M").length,
    ).toBeLessThanOrEqual(1);
  }
  // The Style posts keep their places: after the 7th drawing, the 14th…
  expect(rows(30, [], 4, 25).filter((r) => r !== "M")).toEqual(rows(30, [], 4, 0));
});

test("an ad's place is taken whether its ad came or not", () => {
  const without = rows(30, [], 0, 25);
  const withAds = rows(30, Array(6).fill("ad"), 0, 25).filter((r) => r !== "AD");
  expect(withAds).toEqual(without);
});

test("as many as there are, in their order; none, and the Feed is as before", () => {
  const items = feedWithStyle(feedWithAds(drawings(30), []), styles(2));
  const placed = feedWithMuw(items, routes(2)).filter((r) => r.kind === "muw");
  expect(placed.map((r) => (r.kind === "muw" ? r.route.id : ""))).toEqual([
    "route-1",
    "route-2",
  ]);
  expect(feedWithMuw(items, [])).toEqual(items);
});
