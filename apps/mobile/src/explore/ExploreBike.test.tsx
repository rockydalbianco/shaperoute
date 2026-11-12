import list from "@shaperoute/shared-types/fixtures/recommended-routes.json";
import type { LatLon } from "@shaperoute/shared-types";
import { act, render, screen } from "@testing-library/react-native";

import { catalogUrl } from "./catalogList";
import { forgetExploreAhead, prepareExplore } from "./exploreAhead";
import { ExploreScreen } from "./ExploreScreen";
import {
  activityParam,
  type RecommendedRoute,
  recommendedUrl,
} from "./recommendedRoutes";

jest.mock(
  "react-native-safe-area-context",
  () => jest.requireActual("react-native-safe-area-context/jest/mock").default,
);

// «Explore» by bike (TASK-441 part B2): the page asks the API for the
// drawings of a ride, and for a run's as ever when it is not told.

const API = "http://api.test";
const TRENTO: LatLon = [46.067, 11.1215];
const runs = list.routes as RecommendedRoute[];

function ride(id: string, city: string, lat: number, lon: number): RecommendedRoute {
  return {
    id,
    city,
    shape: "heart",
    word: null,
    style: null,
    distance_m: 30_000,
    route_m: 30_400,
    similarity: 0.95,
    start: [lat, lon],
    away_m: 0,
    preview: [
      [lat, lon],
      [lat + 0.01, lon + 0.01],
    ],
  };
}

const nearRide = ride("trento-heart-30000-40", "trento", 46.07, 11.12);
const farRide = ride("milano-star-30000-51", "milano", 45.46, 9.19);

/** An API with rides and runs: each list holds the ones asked for. */
function api(input: RequestInfo | URL) {
  const url = new URL(String(input));
  const cycling = url.searchParams.get("activity") === "cycling";
  if (url.pathname === "/recommended-routes") {
    return Promise.resolve(Response.json({ routes: cycling ? [nearRide] : runs }));
  }
  if (url.pathname === "/catalog") {
    const routes = cycling ? [nearRide, farRide] : runs;
    return Promise.resolve(Response.json({ total: routes.length, cities: 2, routes }));
  }
  if (url.pathname === "/nearby-cities") {
    return Promise.resolve(Response.json({ places: [] }));
  }
  return Promise.resolve(Response.json({}, { status: 404 }));
}

const fetchMock = jest.spyOn(globalThis, "fetch");

function asked(path: string): URL[] {
  return fetchMock.mock.calls
    .map(([url]) => new URL(String(url)))
    .filter((url) => url.pathname === path);
}

function shownIds(): string[] {
  const rows = screen.getByTestId("explore-list").props.data as {
    routes?: RecommendedRoute[];
  }[];
  return rows.flatMap((row) => row.routes?.map((route) => route.id) ?? []);
}

beforeEach(() => {
  forgetExploreAhead();
  fetchMock.mockReset();
  fetchMock.mockImplementation(api);
});

afterAll(() => {
  fetchMock.mockRestore();
});

test("a run's lists are asked with nothing, a ride's with its activity", () => {
  expect(activityParam()).toBe("");
  expect(activityParam("running")).toBe("");
  expect(activityParam("cycling")).toBe("&activity=cycling");
  // A walk has no drawings of its own: a run's, as before.
  expect(activityParam("walking")).toBe("");
  expect(recommendedUrl(API, TRENTO, 5000, "walking")).toBe(
    recommendedUrl(API, TRENTO),
  );
  expect(catalogUrl(API, TRENTO, 0, 40, "walking")).toBe(catalogUrl(API, TRENTO, 0));
  expect(recommendedUrl(API, TRENTO)).toBe(
    recommendedUrl(API, TRENTO, 5000, "running"),
  );
  expect(recommendedUrl(API, TRENTO)).not.toContain("activity");
  expect(recommendedUrl(API, TRENTO, 5000, "cycling")).toMatch(
    /\/recommended-routes\?lat=.*&radius_m=5000&activity=cycling$/,
  );
  expect(catalogUrl(API, TRENTO, 40)).toBe(catalogUrl(API, TRENTO, 40, 40, "running"));
  expect(catalogUrl(API, TRENTO, 40)).not.toContain("activity");
  expect(catalogUrl(API, TRENTO, 40, 40, "cycling")).toMatch(
    /\/catalog\?lat=.*&offset=40&limit=40&activity=cycling$/,
  );
});

test("by bike the page asks for rides, near and far, and shows them", async () => {
  await render(
    <ExploreScreen apiUrl={API} near={TRENTO} onOpen={jest.fn()} activity="cycling" />,
  );
  expect(
    await screen.findByText("2 drawings in 2 cities · the nearest first"),
  ).toBeOnTheScreen();
  expect(asked("/recommended-routes")).toHaveLength(1);
  expect(asked("/recommended-routes")[0].searchParams.get("activity")).toBe("cycling");
  expect(asked("/catalog")).toHaveLength(1);
  expect(asked("/catalog")[0].searchParams.get("activity")).toBe("cycling");
  expect(screen.getByText("MILANO")).toBeOnTheScreen();
  // The near ride is among «Near you», the far one in its city: no run.
  expect(shownIds()).toEqual([farRide.id]);
});

test("not told, the page asks as ever: a run's drawings", async () => {
  await render(<ExploreScreen apiUrl={API} near={TRENTO} onOpen={jest.fn()} />);
  await screen.findByText(`within 5 km · ${runs.length}`);
  for (const url of [...asked("/recommended-routes"), ...asked("/catalog")]) {
    expect(url.searchParams.has("activity")).toBe(false);
  }
  expect(asked("/recommended-routes")).toHaveLength(1);
  expect(asked("/catalog")).toHaveLength(1);
});

test("the runs fetched as the app opened are not shown as rides", async () => {
  prepareExplore(API, TRENTO, { draw: jest.fn(() => () => {}) as never });
  await act(async () => {});
  expect(asked("/recommended-routes")).toHaveLength(1);
  await render(
    <ExploreScreen apiUrl={API} near={TRENTO} onOpen={jest.fn()} activity="cycling" />,
  );
  expect(await screen.findByText("within 5 km · 1")).toBeOnTheScreen();
  const lists = asked("/recommended-routes");
  expect(lists).toHaveLength(2);
  expect(lists[1].searchParams.get("activity")).toBe("cycling");
});

test("from a run to the bike the page asks again", async () => {
  const view = await render(
    <ExploreScreen apiUrl={API} near={TRENTO} onOpen={jest.fn()} />,
  );
  await screen.findByText(`within 5 km · ${runs.length}`);
  await view.rerender(
    <ExploreScreen apiUrl={API} near={TRENTO} onOpen={jest.fn()} activity="cycling" />,
  );
  expect(await screen.findByText("within 5 km · 1")).toBeOnTheScreen();
  expect(
    await screen.findByText("2 drawings in 2 cities · the nearest first"),
  ).toBeOnTheScreen();
  expect(asked("/catalog").map((url) => url.searchParams.get("activity"))).toEqual([
    null,
    "cycling",
  ]);
});
