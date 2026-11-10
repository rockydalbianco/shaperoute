import list from "@shaperoute/shared-types/fixtures/recommended-routes.json";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import { CATALOG_PAGE } from "./catalogList";
import { ExploreScreen } from "./ExploreScreen";
import type { RecommendedRoute } from "./recommendedRoutes";

jest.mock(
  "react-native-safe-area-context",
  () => jest.requireActual("react-native-safe-area-context/jest/mock").default,
);

// «Explore» with every drawing of the catalog in the page (TASK-420, the
// user's choice of 2026-11-10): «Near you» as before, then «Farther away»
// city by city from the server's catalog, a page at a time.

const fetchMock = jest.spyOn(globalThis, "fetch");
const near = list.routes as RecommendedRoute[];
const TRENTO: [number, number] = [46.067, 11.1215];

function far(id: string, city: string, lat: number, lon: number): RecommendedRoute {
  return {
    id,
    city,
    shape: "heart",
    word: null,
    style: null,
    distance_m: 5000,
    route_m: 5100,
    similarity: 0.9,
    start: [lat, lon],
    away_m: 0,
    preview: [
      [lat, lon],
      [lat + 0.001, lon + 0.001],
    ],
  };
}

/** A catalog of `total` routes: the near ones first, then Rovereto, then
 * Milano, served in pages of CATALOG_PAGE. */
function catalogOf(total: number) {
  const all: RecommendedRoute[] = [
    ...near,
    ...Array.from({ length: total - near.length }, (_, i) =>
      i < 3
        ? far(`rovereto-heart-5000-${i}`, "rovereto", 45.89, 11.04)
        : far(`milano-heart-5000-${i}`, "milano", 45.46, 9.19),
    ),
  ];
  return (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes("/recommended-routes")) {
      return Promise.resolve(Response.json(list));
    }
    if (url.includes("/catalog?")) {
      const offset = Number(new URL(url).searchParams.get("offset"));
      const limit = Number(new URL(url).searchParams.get("limit"));
      return Promise.resolve(
        Response.json({ total, cities: 3, routes: all.slice(offset, offset + limit) }),
      );
    }
    return Promise.resolve(Response.json({ routes: [] }));
  };
}

beforeEach(() => {
  fetchMock.mockReset();
});

afterAll(() => {
  fetchMock.mockRestore();
});

const page = () => screen.getByTestId("explore-list");

test("the title counts the catalog; «Farther away» follows, city by city, without the near ones", async () => {
  fetchMock.mockImplementation(catalogOf(10));
  await render(<ExploreScreen apiUrl="http://api" near={TRENTO} onOpen={jest.fn()} />);
  expect(
    await screen.findByText("10 drawings in 3 cities · the nearest first"),
  ).toBeOnTheScreen();
  expect(screen.getByText("Explore")).toBeOnTheScreen();
  expect(screen.getByText("NEAR YOU")).toBeOnTheScreen();
  expect(screen.getByText(`within 5 km · ${near.length}`)).toBeOnTheScreen();
  expect(screen.getByText("FARTHER AWAY")).toBeOnTheScreen();
  expect(screen.getByText(`${10 - near.length} drawings · by city`)).toBeOnTheScreen();
  expect(screen.getByText("ROVERETO")).toBeOnTheScreen();
  expect(screen.getByText("MILANO")).toBeOnTheScreen();
  // Three each, with how far they are.
  expect(screen.getAllByText(/^\d+ km · 3$/)).toHaveLength(2);
  // The near routes are not drawn twice: the rows hold the far ones only.
  const rows = page().props.data as { kind: string; routes?: RecommendedRoute[] }[];
  const farIds = rows.flatMap((row) => row.routes?.map((r) => r.id) ?? []);
  expect(farIds).toHaveLength(10 - near.length);
  expect(farIds.some((id) => near.some((r) => r.id === id))).toBe(false);
  // Every drawing is there: nothing more on the way.
  expect(screen.queryByText("Loading more…")).toBeNull();
  expect(
    fetchMock.mock.calls.filter(([url]) => String(url).includes("/catalog?")),
  ).toHaveLength(1);
});

test("the next page comes when the end is near; a city's cards open as the near ones", async () => {
  const total = CATALOG_PAGE + 10;
  fetchMock.mockImplementation(catalogOf(total));
  const onOpen = jest.fn();
  await render(<ExploreScreen apiUrl="http://api" near={TRENTO} onOpen={onOpen} />);
  await screen.findByText("FARTHER AWAY");
  expect(screen.getByText("Loading more…")).toBeOnTheScreen();
  const before = (page().props.data as unknown[]).length;
  await act(async () => {
    fireEvent(page(), "onEndReached", { distanceFromEnd: 0 });
  });
  await waitFor(() =>
    expect((page().props.data as unknown[]).length).toBeGreaterThan(before),
  );
  await waitFor(() => expect(screen.queryByText("Loading more…")).toBeNull());
  expect(
    fetchMock.mock.calls.filter(([url]) => String(url).includes("/catalog?")),
  ).toHaveLength(2);
  expect(String(fetchMock.mock.calls.at(-1)?.[0])).toContain(`offset=${CATALOG_PAGE}`);
  // A far card is a card of «Explore»: it opens its route.
  const cards = screen.getAllByTestId("route-card");
  expect(cards.length).toBeGreaterThan(near.length);
  await fireEvent.press(screen.getAllByLabelText(/^heart, 5 km/)[0]);
  expect(onOpen).toHaveBeenCalledWith(expect.objectContaining({ city: "rovereto" }));
});

test("a page that fails says so under the list, and «Try again» asks for it again", async () => {
  const serve = catalogOf(CATALOG_PAGE + 5);
  let fail = false;
  fetchMock.mockImplementation((input) =>
    fail && String(input).includes("/catalog?")
      ? Promise.reject(new Error("offline"))
      : serve(input),
  );
  await render(<ExploreScreen apiUrl="http://api" near={TRENTO} onOpen={jest.fn()} />);
  await screen.findByText("FARTHER AWAY");
  fail = true;
  await act(async () => {
    fireEvent(page(), "onEndReached", { distanceFromEnd: 0 });
  });
  expect(await screen.findByText("The rest could not load.")).toBeOnTheScreen();
  fail = false;
  await fireEvent.press(screen.getByText("Try again"));
  await waitFor(() =>
    expect(screen.queryByText("The rest could not load.")).toBeNull(),
  );
  await waitFor(() => expect(screen.queryByText("Loading more…")).toBeNull());
});

test("an API without the catalog: the page as it was, nothing under the list", async () => {
  fetchMock.mockImplementation((input) =>
    String(input).includes("/catalog?")
      ? Promise.resolve(new Response("", { status: 404 }))
      : Promise.resolve(Response.json(list)),
  );
  await render(<ExploreScreen apiUrl="http://api" near={TRENTO} onOpen={jest.fn()} />);
  await screen.findByText("Star · 5.1 km");
  expect(screen.getByText("Starting within 5 km of your start")).toBeOnTheScreen();
  expect(screen.queryByText("FARTHER AWAY")).toBeNull();
  expect(screen.queryByText("Loading more…")).toBeNull();
  expect(screen.queryByText("The rest could not load.")).toBeNull();
});
