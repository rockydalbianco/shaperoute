import { fireEvent, render, screen } from "@testing-library/react-native";

import type { CatalogRoute } from "./catalog";
import { CatalogFilterSheet } from "./CatalogFilterSheet";
import { NO_FILTER } from "./catalogFilters";

jest.mock(
  "react-native-safe-area-context",
  () => jest.requireActual("react-native-safe-area-context/jest/mock").default,
);

// The filters of the catalog in one sheet (TASK-420).

function route(fields: Partial<CatalogRoute> & { id: string }): CatalogRoute {
  return {
    city: "trento",
    country: "Italy",
    shape: "heart",
    word: null,
    style: null,
    category: "symbols",
    activity: "running",
    distance_m: 5000,
    route_m: 5100,
    similarity: 0.95,
    start: [46.067, 11.1215],
    preview: [
      [46.067, 11.1215],
      [46.068, 11.1225],
    ],
    favorite_key: "0000000000000000",
    ...fields,
  };
}

const ROUTES = [
  route({ id: "trento-heart-5000-0" }),
  route({ id: "trento-cat-10000-1", shape: "cat", category: "animals", distance_m: 10000 }),
  route({ id: "milano-ciao-21000-0", city: "milano", shape: null, word: "CIAO", style: "round", category: "words", distance_m: 21000 }),
  route({ id: "paris-circle-10000-0", city: "paris", country: "France", shape: "circle", distance_m: 10000, activity: "cycling" }),
];

function sheet(over: Partial<React.ComponentProps<typeof CatalogFilterSheet>> = {}) {
  const props = {
    visible: true,
    routes: ROUTES,
    filter: NO_FILTER,
    units: "km" as const,
    onApply: jest.fn(),
    onClose: jest.fn(),
    ...over,
  };
  return { props, node: <CatalogFilterSheet {...props} /> };
}

const button = (name: string | RegExp) => screen.getByRole("button", { name });

test("every filter as chips, and how many drawings they leave", async () => {
  await render(sheet().node);
  for (const title of ["Country", "City", "Category", "Distance", "Sport"]) {
    expect(screen.getByRole("header", { name: title })).toBeOnTheScreen();
  }
  expect(screen.getByText("The drawings are planned at 5 km, 10 km, 21 km.")).toBeOnTheScreen();
  // The countries with more routes first; the cities; the categories in
  // the catalog's order; the sports.
  for (const chip of ["Italy", "France", "Trento", "Milano", "Paris", "Animals", "Symbols", "Words", "Run", "Bike"]) {
    expect(button(chip)).toBeOnTheScreen();
  }
  expect(button("Show 4 drawings")).toBeOnTheScreen();
  // "All" on everything, "Any" on the distance: nothing set.
  expect(screen.getAllByRole("button", { name: "All" })).toHaveLength(4);
  expect(button("Any").props.accessibilityState).toEqual({ selected: true });
});

test("a choice counts at once; «Show» applies it; nothing before", async () => {
  const { props, node } = sheet();
  await render(node);
  await fireEvent.press(button("10 km"));
  expect(button("Show 2 drawings")).toBeOnTheScreen();
  // Two distances at once.
  await fireEvent.press(button("21 km"));
  expect(button("Show 3 drawings")).toBeOnTheScreen();
  await fireEvent.press(button("Animals"));
  expect(button("Show 1 drawing")).toBeOnTheScreen();
  expect(props.onApply).not.toHaveBeenCalled();
  await fireEvent.press(button("Show 1 drawing"));
  expect(props.onApply).toHaveBeenCalledWith({
    ...NO_FILTER,
    category: "animals",
    distances: [10000, 21000],
  });
});

test("a country narrows the cities and lets go of a city elsewhere", async () => {
  await render(sheet({ filter: { ...NO_FILTER, city: "paris" } }).node);
  expect(button("Paris").props.accessibilityState).toEqual({ selected: true });
  await fireEvent.press(button("Italy"));
  expect(screen.queryByRole("button", { name: "Paris" })).toBeNull();
  expect(button("Trento")).toBeOnTheScreen();
  expect(button("Show 3 drawings")).toBeOnTheScreen();
  // The city of Paris went with its country.
  await fireEvent.press(button("Show 3 drawings"));
});

test("«Clear» puts every filter back; the sheet closes on the screen behind", async () => {
  const { props, node } = sheet({ filter: { ...NO_FILTER, country: "France", distances: [10000] } });
  await render(node);
  expect(button("Show 1 drawing")).toBeOnTheScreen();
  await fireEvent.press(button("Clear"));
  expect(button("Show 4 drawings")).toBeOnTheScreen();
  await fireEvent.press(screen.getByTestId("catalog-filters-backdrop"));
  expect(props.onClose).toHaveBeenCalled();
  expect(props.onApply).not.toHaveBeenCalled();
});

test("closed: nothing of it on screen", async () => {
  await render(sheet({ visible: false }).node);
  expect(screen.queryByRole("header", { name: "Country" })).toBeNull();
});
