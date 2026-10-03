import cyclingFavorite from "@shaperoute/shared-types/fixtures/favorite-cycling.json";
import onFootFavorite from "@shaperoute/shared-types/fixtures/favorite-on-foot.json";
import onFootRequest from "@shaperoute/shared-types/fixtures/favorite-request-on-foot.json";
import cycling from "@shaperoute/shared-types/fixtures/route-result-cycling.json";
import type { RouteResult, Stretch } from "@shaperoute/shared-types";

import type { FavoriteDetail } from "../api/favorites";
import { drawnKeepable, keptNow, openedFavorite } from "./favoriteRoute";

// The stretches of a bike route with the bike on foot, kept with a favorite
// (TASK-206, ADR-0167).

const RIDDEN = cycling as unknown as RouteResult;
const ASKED = {
  start: RIDDEN.points[0],
  shape: "circle" as const,
  distance_m: 10000,
  activity: "cycling" as const,
};

test("a bike route drawn is kept with its stretches on foot", () => {
  const kept = drawnKeepable(ASKED, RIDDEN, null);
  expect(kept.request.on_foot).toEqual(RIDDEN.on_foot);
  expect(kept.request.activity).toBe("cycling");
  // The fields of the contract's example, no more and no fewer.
  expect(Object.keys(kept.request).sort()).toEqual(Object.keys(onFootRequest).sort());
  // The list shows it before the API answers, without them, as the API's.
  expect(keptNow(kept, new Date("2026-10-03T09:00:00Z"))).not.toHaveProperty("on_foot");
});

test("none, or none that fit the line: the request of before", () => {
  const before = drawnKeepable(ASKED, { ...RIDDEN, on_foot: undefined }, null);
  expect(before.request).not.toHaveProperty("on_foot");
  const stretches: Stretch[][] = [[], [[2, 99]], [[5, 2]]];
  for (const on_foot of stretches) {
    expect(drawnKeepable(ASKED, { ...RIDDEN, on_foot }, null)).toEqual(before);
  }
});

test("a bike favorite opens with its stretches on foot in the result", () => {
  const opened = openedFavorite(onFootFavorite as unknown as FavoriteDetail);
  expect(opened.result.on_foot).toEqual([[2, 3]]);
  expect(opened.request.activity).toBe("cycling");
  // Kept again, it keeps them.
  expect(opened.keepable.request.activity).toBe("cycling");
  expect(opened.keepable.request.on_foot).toEqual([[2, 3]]);
  // One kept before TASK-206, or by an older API: none, as before.
  const older = openedFavorite(cyclingFavorite as unknown as FavoriteDetail);
  expect(older.result).not.toHaveProperty("on_foot");
});
