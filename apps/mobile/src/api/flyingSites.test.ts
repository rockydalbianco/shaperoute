import history from "@shaperoute/shared-types/fixtures/flying-site-history.json";
import detail from "@shaperoute/shared-types/fixtures/flying-site.json";
import box from "@shaperoute/shared-types/fixtures/flying-sites.json";

import { answers } from "../account/testing";
import {
  fetchFlyingHistory,
  fetchFlyingSite,
  flyingSitesIn,
  isFlyingHistory,
  isFlyingSiteDetail,
  isFlyingSites,
} from "./flyingSites";

const URL = "http://api";
const options = (fetchFn: jest.Mock) => ({ fetchFn, key: null });
const BOX = { south: 45.951234, west: 10.95, north: 46.05, east: 11.050009 };

test("the examples of the API are what the app reads", () => {
  expect(isFlyingSites(box)).toBe(true);
  expect(isFlyingSites({ sites: [], more: false, attribution: "©" })).toBe(true);
  expect(isFlyingSiteDetail(detail)).toBe(true);
  expect(isFlyingHistory(history)).toBe(true);
  expect(
    isFlyingHistory({
      ...history,
      few: true,
      flights: null,
      pilots: null,
      today: null,
      months: null,
    }),
  ).toBe(true);
});

test("a body that is not sites is not read", () => {
  const site = box.sites[0];
  expect(isFlyingSites(null)).toBe(false);
  expect(isFlyingSites({ ...box, more: "no" })).toBe(false);
  expect(isFlyingSites({ ...box, sites: [{ ...site, kind: "toplanding" }] })).toBe(false);
  expect(isFlyingSites({ ...box, sites: [{ ...site, orientation: ["SOUTH"] }] })).toBe(
    false,
  );
  expect(
    isFlyingSites({ ...box, sites: [{ ...site, osm_url: "https://example.com/1" }] }),
  ).toBe(false);
  expect(isFlyingSiteDetail({ ...detail, near: null })).toBe(false);
  expect(isFlyingHistory({ ...history, in_air_now: { count: -1, shares: [] } })).toBe(
    false,
  );
  expect(
    isFlyingHistory({
      ...history,
      records: { ...history.records, longest_s: { value: 1 } },
    }),
  ).toBe(false);
});

test("a box is asked with its four sides, without a token", async () => {
  const fetchFn = answers({ status: 200, body: box });
  const outcome = await flyingSitesIn(URL, BOX, options(fetchFn));
  expect(outcome).toEqual({ kind: "ok", value: box });
  const [url, init] = fetchFn.mock.calls[0];
  expect(url).toBe(
    "http://api/flying-sites?south=45.9512&west=10.9500&north=46.0500&east=11.0500",
  );
  expect((init?.headers as Record<string, string>).Authorization).toBeUndefined();
});

test("a box may ask one kind and a limit", async () => {
  const fetchFn = answers({ status: 200, body: box });
  await flyingSitesIn(URL, BOX, { ...options(fetchFn), kind: "landing", limit: 50 });
  expect(fetchFn.mock.calls[0][0]).toMatch(/&kind=landing&limit=50$/);
});

test("a site and a takeoff's history by id, «today» from the phone's offset", async () => {
  const fetchFn = answers({ status: 200, body: detail }, { status: 200, body: history });
  expect(await fetchFlyingSite(URL, 101, options(fetchFn))).toEqual({
    kind: "ok",
    value: detail,
  });
  expect(
    await fetchFlyingHistory(URL, 101, { ...options(fetchFn), utcOffsetMin: 60 }),
  ).toEqual({ kind: "ok", value: history });
  expect(fetchFn.mock.calls[0][0]).toBe("http://api/flying-sites/101");
  expect(fetchFn.mock.calls[1][0]).toBe(
    "http://api/flying-sites/101/history?utc_offset_min=60",
  );
});
