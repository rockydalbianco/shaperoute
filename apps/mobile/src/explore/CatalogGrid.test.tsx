import { fireEvent, render, screen } from "@testing-library/react-native";

import type { CatalogRoute } from "./catalog";
import { CatalogGrid } from "./CatalogGrid";
import { PAGE_SIZE } from "./catalogFilters";

// The grid of the catalog (TASK-420): a page at a time, more at the end,
// an empty page with the way to clear the filters.

function route(i: number): CatalogRoute {
  return {
    id: `trento-heart-5000-${i}`,
    city: "trento",
    country: "Italy",
    shape: "heart",
    word: null,
    style: null,
    category: "symbols",
    activity: "running",
    distance_m: 5000,
    route_m: 5000 + i,
    similarity: 0.9,
    start: [46.067, 11.1215],
    preview: [
      [46.067, 11.1215],
      [46.068, 11.1225],
    ],
    favorite_key: "0000000000000000",
  };
}

const MANY = Array.from({ length: 95 }, (_, i) => route(i));

function grid(over: Partial<React.ComponentProps<typeof CatalogGrid>> = {}) {
  const props = {
    routes: MANY,
    pages: 1,
    onMore: jest.fn(),
    width: 358,
    units: "km" as const,
    near: null,
    isKept: () => false,
    onOpen: jest.fn(),
    onStart: jest.fn(),
    onHeart: jest.fn(),
    onClear: jest.fn(),
    ...over,
  };
  return { props, node: <CatalogGrid {...props} /> };
}

test("the first page, two per row, and more on the way", async () => {
  const { props, node } = grid();
  await render(node);
  const list = screen.getByTestId("catalog-grid");
  expect(list.props.data).toHaveLength(PAGE_SIZE);
  // Two per row: the first two cards share a row, the third is in the next.
  const cards = screen.getAllByTestId("catalog-card");
  expect(cards[0].parent).toBe(cards[1].parent);
  expect(cards[2].parent).not.toBe(cards[1].parent);
  expect(screen.getByText("Loading more…")).toBeOnTheScreen();
  // The end comes near: the next page is asked for.
  await fireEvent(list, "onEndReached", { distanceFromEnd: 0 });
  expect(props.onMore).toHaveBeenCalledTimes(1);
});

test("the last page: everything, and nothing more to come", async () => {
  const { props, node } = grid({ pages: 3 });
  await render(node);
  const list = screen.getByTestId("catalog-grid");
  expect(list.props.data).toHaveLength(95);
  expect(screen.queryByText("Loading more…")).toBeNull();
  expect(list.props.onEndReached).toBeUndefined();
  expect(props.onMore).not.toHaveBeenCalled();
});

test("the cards are as wide as two between the margins, and kept ones know it", async () => {
  const kept = new Set([MANY[1].id]);
  await render(grid({ routes: MANY.slice(0, 4), isKept: (r) => kept.has(r.id) }).node);
  const cards = screen.getAllByTestId("catalog-card");
  expect(cards).toHaveLength(4);
  expect(screen.getAllByText("♥︎")).toHaveLength(1);
  expect(screen.getAllByText("♡")).toHaveLength(3);
});

test("nothing left: an empty page whose «Clear» clears the filters", async () => {
  const { props, node } = grid({ routes: [] });
  await render(node);
  expect(screen.getByText("No drawings match")).toBeOnTheScreen();
  expect(screen.queryByText("Loading more…")).toBeNull();
  await fireEvent.press(screen.getByRole("button", { name: "Clear" }));
  expect(props.onClear).toHaveBeenCalled();
});
