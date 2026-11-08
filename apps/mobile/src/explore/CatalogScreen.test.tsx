import detail from "@shaperoute/shared-types/fixtures/recommended-route.json";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import { favoriteKey } from "../favorites/favoriteKey";
import { FavoritesContext, type FavoritesDoor } from "../favorites/favoritesDoor";
import { CATALOG, type CatalogRoute } from "./catalog";
import { CatalogScreen } from "./CatalogScreen";
import { PAGE_SIZE } from "./catalogFilters";

jest.mock(
  "react-native-safe-area-context",
  () => jest.requireActual("react-native-safe-area-context/jest/mock").default,
);

// The «Catalog» page (TASK-420, ADR-0348): the grid of the whole seed, the
// search, the chips, the order, the heart through the favorites.

const TRENTO: [number, number] = [46.067, 11.1215];

/** The favorites as «Profile» hands them, with what the page uses. */
function door(kept: string[] = []): FavoritesDoor {
  return {
    status: "ready",
    list: [],
    problem: null,
    has: (id) => kept.includes(id),
    toggle: jest.fn(),
    remove: jest.fn(),
    refresh: jest.fn(),
    clearProblem: jest.fn(),
    press: jest.fn(),
    opening: null,
    open: jest.fn(),
    show: jest.fn(),
    opened: null,
    close: jest.fn(),
    showList: jest.fn(),
    forgetWaiting: jest.fn(),
  };
}

function page(
  over: Partial<React.ComponentProps<typeof CatalogScreen>> = {},
  favorites: FavoritesDoor = door(),
) {
  const props = {
    apiUrl: "http://api",
    near: TRENTO,
    onBack: jest.fn(),
    onOpen: jest.fn(),
    fetchFn: jest.fn(),
    ...over,
  };
  return {
    props,
    favorites,
    node: (
      <FavoritesContext.Provider value={favorites}>
        <CatalogScreen {...props} />
      </FavoritesContext.Provider>
    ),
  };
}

const grid = () => screen.getByTestId("catalog-grid");
const shown = (): CatalogRoute[] => grid().props.data;

test("the whole seed, counted, the nearest first, a page at a time", async () => {
  const { props, node } = page();
  await render(node);
  expect(screen.getByRole("header", { name: "Catalog" })).toBeOnTheScreen();
  expect(screen.getByText(`${CATALOG.length} drawings · 23 cities`)).toBeOnTheScreen();
  expect(shown()).toHaveLength(PAGE_SIZE);
  // From Trento, Trento's routes first.
  expect(shown()[0].city).toBe("trento");
  expect(screen.getByTestId("catalog-order-nearest").props.accessibilityState).toEqual({
    checked: true,
  });
  await fireEvent(grid(), "onEndReached", { distanceFromEnd: 0 });
  expect(shown()).toHaveLength(2 * PAGE_SIZE);
  await fireEvent.press(screen.getByRole("button", { name: "Back" }));
  expect(props.onBack).toHaveBeenCalled();
});

test("without a start, «Best» is the order and nothing is away", async () => {
  await render(page({ near: null }).node);
  expect(screen.getByTestId("catalog-order-best").props.accessibilityState).toEqual({
    checked: true,
  });
  const first = shown()[0];
  expect(first.similarity).toBe(Math.max(...CATALOG.map((r) => r.similarity)));
  expect(screen.queryByText(/ away$/)).toBeNull();
});

test("the order switches, and starts the pages again", async () => {
  await render(page().node);
  await fireEvent(grid(), "onEndReached", { distanceFromEnd: 0 });
  expect(shown()).toHaveLength(2 * PAGE_SIZE);
  await fireEvent.press(screen.getByTestId("catalog-order-shortest"));
  expect(shown()).toHaveLength(PAGE_SIZE);
  expect(shown()[0].route_m).toBe(Math.min(...CATALOG.map((r) => r.route_m)));
  await fireEvent.press(screen.getByTestId("catalog-order-best"));
  expect(shown()[0].similarity).toBe(Math.max(...CATALOG.map((r) => r.similarity)));
});

test("the search by name narrows the grid; empty, an empty page", async () => {
  await render(page().node);
  const field = screen.getByTestId("catalog-search");
  await fireEvent.changeText(field, "ciao milan");
  expect(shown().every((r) => r.word === "CIAO" && r.city === "milano")).toBe(true);
  expect(shown().length).toBeGreaterThan(0);
  await fireEvent.changeText(field, "nothing like this");
  expect(shown()).toHaveLength(0);
  expect(screen.getByText("No drawings match")).toBeOnTheScreen();
  // «Clear» on the empty page clears the search too.
  await fireEvent.press(screen.getByRole("button", { name: "Clear" }));
  expect(shown()).toHaveLength(PAGE_SIZE);
});

test("a chip opens the sheet; applied, the chip says the filter and «×» clears it", async () => {
  await render(page().node);
  expect(screen.queryByRole("header", { name: "Country" })).toBeNull();
  await fireEvent.press(screen.getByTestId("catalog-chip-country"));
  expect(screen.getByRole("header", { name: "Country" })).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole("button", { name: "United States" }));
  await fireEvent.press(screen.getByRole("button", { name: "10 km" }));
  await fireEvent.press(screen.getByTestId("catalog-filters-show"));
  expect(
    shown().every((r) => r.country === "United States" && r.distance_m === 10000),
  ).toBe(true);
  expect(shown().length).toBeGreaterThan(0);
  const country = screen.getByTestId("catalog-chip-country");
  expect(country).toHaveTextContent("United States ×");
  expect(screen.getByTestId("catalog-chip-distances")).toHaveTextContent("10 km ×");
  // The unset ones say their name.
  expect(screen.getByTestId("catalog-chip-city")).toHaveTextContent("City");
  await fireEvent.press(country);
  expect(shown().every((r) => r.distance_m === 10000)).toBe(true);
  expect(shown().some((r) => r.country === "Italy")).toBe(true);
  expect(screen.getByTestId("catalog-chip-country")).toHaveTextContent("Country");
});

test("a card opens its route as a route of «Explore»; «Start» too", async () => {
  const { props, node } = page();
  await render(node);
  const first = shown()[0];
  const cards = screen.getAllByTestId("catalog-card");
  const at = (pageX: number, pageY: number) => ({ nativeEvent: { pageX, pageY } });
  await fireEvent(cards[0], "pressIn", at(50, 50));
  await fireEvent(cards[0], "press", at(50, 50));
  expect(props.onOpen).toHaveBeenCalledWith(
    expect.objectContaining({ id: first.id, city: "trento", preview: first.preview }),
  );
  const opened = (props.onOpen as jest.Mock).mock.calls[0][0];
  expect(opened.away_m).toBeGreaterThanOrEqual(0);
  expect(opened.away_m).toBeLessThan(5000);
  await fireEvent.press(screen.getAllByTestId("catalog-card-start")[0]);
  expect(props.onOpen).toHaveBeenCalledTimes(2);
});

test("the heart asks the API for the route whole and keeps it as the map would", async () => {
  const fetchFn = jest.fn().mockResolvedValue(Response.json(detail));
  const { props, favorites, node } = page({ fetchFn });
  await render(node);
  const star = shown().findIndex((r) => r.id === detail.id);
  expect(star).toBeGreaterThanOrEqual(0);
  await fireEvent.press(screen.getAllByTestId("catalog-card-heart")[star]);
  await waitFor(() => expect(favorites.press).toHaveBeenCalled());
  expect(fetchFn.mock.calls[0][0]).toBe(`http://api/recommended-routes/${detail.id}`);
  const [kept] = (favorites.press as jest.Mock).mock.calls[0];
  expect(kept.id).toBe(favoriteKey(detail.points as [number, number][]));
  expect(kept.request.city).toBe("trento");
  expect(kept.request.shape).toBe("star");
  expect(props.onOpen).not.toHaveBeenCalled();
});

test("kept routes have a full heart; without the API the heart opens the route", async () => {
  const first = CATALOG.find((r) => r.city === "trento");
  const { props, node } = page({ apiUrl: null }, door([first?.favorite_key ?? ""]));
  await render(node);
  expect(screen.getAllByText("♥︎").length).toBeGreaterThan(0);
  await fireEvent.press(screen.getAllByTestId("catalog-card-heart")[0]);
  expect(props.onOpen).toHaveBeenCalled();
});

test("an API that fails: the route opens on the map, where its heart is", async () => {
  const fetchFn = jest.fn().mockRejectedValue(new Error("offline"));
  const { props, favorites, node } = page({ fetchFn });
  await render(node);
  await fireEvent.press(screen.getAllByTestId("catalog-card-heart")[0]);
  await waitFor(() => expect(props.onOpen).toHaveBeenCalled());
  expect(favorites.press).not.toHaveBeenCalled();
});
