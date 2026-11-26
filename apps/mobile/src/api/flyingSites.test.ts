import { answers, apiError } from "../account/testing";
import { fetchLandings, isFlyingSites } from "./flyingSites";

const URL = "http://api";
const options = (fetchFn: jest.Mock) => ({ fetchFn, key: null });
const BOX = { south: 45.5, west: 10.6, north: 46, east: 11.1 };

// Invented sites, in the form of docs/API.md «Flying sites».
const SITES = {
  sites: [
    {
      id: "n1",
      kind: "landing",
      lat: 45.7,
      lon: 10.8,
      name: "Test field",
      ele_m: 300,
      orientation: "",
      official: null,
      osm_url: "https://www.openstreetmap.org/node/1",
      away_m: null,
    },
    { id: "n2", kind: "landing", lat: 45.71, lon: 10.81, name: null, ele_m: null },
  ],
  more: false,
  attribution: "© OpenStreetMap contributors",
};

test("the API's sites are what the app reads, with fields it does not know", () => {
  expect(isFlyingSites(SITES)).toBe(true);
  expect(isFlyingSites({ ...SITES, sites: [] })).toBe(true);
  expect(isFlyingSites({ ...SITES, sites: [{ ...SITES.sites[0], lat: 95 }] })).toBe(
    false,
  );
  expect(isFlyingSites({ ...SITES, sites: [{ ...SITES.sites[0], kind: "pub" }] })).toBe(
    false,
  );
  expect(isFlyingSites({ sites: [] })).toBe(false);
});

test("the landings of a box are asked without a token", async () => {
  const fetchFn = answers({ status: 200, body: SITES });
  expect(await fetchLandings(URL, BOX, options(fetchFn))).toEqual({
    kind: "ok",
    value: SITES,
  });
  const [url, init] = fetchFn.mock.calls[0];
  expect(url).toBe(
    "http://api/flying-sites?south=45.5000&west=10.6000&north=46.0000&east=11.1000&kind=landing",
  );
  expect((init?.headers as Record<string, string>).Authorization).toBeUndefined();
});

test("a box the API refuses is an error, not an empty list", async () => {
  const fetchFn = answers({ status: 422, body: apiError("invalid_request") });
  expect((await fetchLandings(URL, BOX, options(fetchFn))).kind).toBe("api_error");
});
