import contract from "@shaperoute/shared-types/fixtures/catalog.json";

import type { RecommendedRoute } from "./recommendedRoutes";
import {
  CATALOG_PAGE,
  catalogUrl,
  farRows,
  fetchCatalogPage,
  groupByCity,
} from "./catalogList";

// The catalog of the server for «Explore», a page at a time, grouped by
// city (TASK-420).

function route(
  id: string,
  city: string,
  awayM: number,
  similarity = 0.95,
): RecommendedRoute {
  return {
    id,
    city,
    shape: "heart",
    word: null,
    style: null,
    distance_m: 5000,
    route_m: 5100,
    similarity,
    start: [46.067, 11.1215],
    away_m: awayM,
    preview: [
      [46.067, 11.1215],
      [46.068, 11.1225],
    ],
  };
}

const TRENTO: [number, number] = [46.067, 11.1215];

test("the page is asked near the start, from an offset, a page at a time", () => {
  expect(catalogUrl("http://api", TRENTO, 0)).toBe(
    `http://api/catalog?lat=46.07&lon=11.12&offset=0&limit=${CATALOG_PAGE}`,
  );
  expect(catalogUrl("http://api", TRENTO, 80, 20)).toMatch(/offset=80&limit=20$/);
});

test("a page comes with its total, each route measured from the real start", async () => {
  const body = {
    total: 155,
    cities: 23,
    routes: [route("a", "trento", 999), route("b", "rovereto", 999)],
  };
  const fetchFn = jest.fn().mockResolvedValue(Response.json(body));
  const outcome = await fetchCatalogPage("http://api", TRENTO, 0, {
    fetchFn,
    key: null,
  });
  expect(outcome.kind).toBe("page");
  if (outcome.kind !== "page") {
    return;
  }
  expect(outcome.page.total).toBe(155);
  expect(outcome.page.cities).toBe(23);
  // Measured from the start given, not from the kilometre the API was told.
  expect(outcome.page.routes[0].away_m).toBe(0);
  expect(fetchFn.mock.calls[0][0]).toMatch(/\/catalog\?/);
});

test("an API without the catalog: none; one that fails: failed", async () => {
  const notFound = jest.fn().mockResolvedValue(new Response("", { status: 404 }));
  expect(
    (await fetchCatalogPage("http://api", TRENTO, 0, { fetchFn: notFound, key: null }))
      .kind,
  ).toBe("none");
  // An answer that is no page (the list of «Best near you», say): none too.
  const other = jest.fn().mockResolvedValue(Response.json({ routes: [] }));
  expect(
    (await fetchCatalogPage("http://api", TRENTO, 0, { fetchFn: other, key: null }))
      .kind,
  ).toBe("none");
  const broken = jest.fn().mockResolvedValue(new Response("down", { status: 500 }));
  expect(
    (await fetchCatalogPage("http://api", TRENTO, 0, { fetchFn: broken, key: null }))
      .kind,
  ).toBe("failed");
  const offline = jest.fn().mockRejectedValue(new Error("offline"));
  expect(
    (await fetchCatalogPage("http://api", TRENTO, 0, { fetchFn: offline, key: null }))
      .kind,
  ).toBe("failed");
});

test("the routes by city, each city where it first appears, at its nearest start", () => {
  const routes = [
    route("t1", "trento", 450),
    route("t2", "trento", 200),
    route("r1", "rovereto", 22_000),
    route("m1", "milano", 190_000),
    route("r2", "rovereto", 23_000),
  ];
  const groups = groupByCity(routes);
  expect(groups.map((g) => g.city)).toEqual(["trento", "rovereto", "milano"]);
  expect(groups[0].away_m).toBe(200);
  expect(groups[1].routes.map((r) => r.id)).toEqual(["r1", "r2"]);
  // The ones «Near you» already shows are left out; a city left empty is gone.
  const left = groupByCity(routes, new Set(["t1", "t2", "m1"]));
  expect(left.map((g) => g.city)).toEqual(["rovereto"]);
});

test("the rows: a city's label, then its routes two by two", () => {
  const groups = groupByCity([
    route("r1", "rovereto", 22_000),
    route("r2", "rovereto", 23_000),
    route("r3", "rovereto", 24_000),
    route("m1", "milano", 190_000),
  ]);
  const rows = farRows(groups);
  expect(rows.map((row) => row.kind)).toEqual(["city", "pair", "pair", "city", "pair"]);
  expect(rows[0]).toMatchObject({ city: "rovereto", away_m: 22_000, count: 3 });
  expect(rows[1].kind === "pair" && rows[1].routes.map((r) => r.id)).toEqual([
    "r1",
    "r2",
  ]);
  expect(rows[2].kind === "pair" && rows[2].routes.map((r) => r.id)).toEqual(["r3"]);
  // Every row has a key of its own.
  expect(new Set(rows.map((row) => row.key)).size).toBe(rows.length);
  expect(farRows([])).toEqual([]);
});

test("the page the API writes (the shared contract) reads as a page", async () => {
  // packages/shared-types/fixtures/catalog.json: what GET /catalog answers
  // for the API's test catalogue, limit 2 (services/api/tests/test_recommended.py).
  const fetchFn = jest.fn().mockResolvedValue(Response.json(contract));
  const outcome = await fetchCatalogPage("http://api", TRENTO, 0, {
    fetchFn,
    key: null,
  });
  expect(outcome.kind).toBe("page");
  if (outcome.kind !== "page") {
    return;
  }
  expect(outcome.page.total).toBe(contract.total);
  expect(outcome.page.cities).toBe(contract.cities);
  expect(outcome.page.routes.map((r) => r.id)).toEqual(
    contract.routes.map((r) => r.id),
  );
  // The same fields as a route of «Best near you»: the cards draw it as one.
  expect(outcome.page.routes[0]).toMatchObject({
    city: "trento",
    shape: "star",
    word: null,
    distance_m: 5000,
    rotation_deg: expect.any(Number),
  });
  expect(outcome.page.routes[0].preview.length).toBeGreaterThan(2);
});
