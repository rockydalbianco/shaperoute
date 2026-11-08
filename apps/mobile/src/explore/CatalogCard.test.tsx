import { fireEvent, render, screen } from "@testing-library/react-native";

import type { CatalogRoute } from "./catalog";
import { CatalogCard, catalogDetail, catalogTitle } from "./CatalogCard";
import { TAP_SLOP } from "./useTapNotSwipe";

// A route of the catalog as a card (TASK-420): drawing, likeness, heart,
// what and where, «Start».

const HEART: CatalogRoute = {
  id: "trento-heart-10000-3",
  city: "trento",
  country: "Italy",
  shape: "heart",
  word: null,
  style: null,
  category: "symbols",
  activity: "running",
  distance_m: 10000,
  route_m: 10240,
  similarity: 0.93,
  start: [46.067, 11.1215],
  rotation_deg: -30,
  preview: [
    [46.067, 11.1215],
    [46.068, 11.1225],
    [46.069, 11.121],
    [46.067, 11.1215],
  ],
  favorite_key: "0ad7b74e4eb55354",
};

function card(over: Partial<React.ComponentProps<typeof CatalogCard>> = {}) {
  const props = {
    route: HEART,
    width: 171,
    units: "km" as const,
    near: [46.07, 11.12] as [number, number],
    kept: false,
    onOpen: jest.fn(),
    onStart: jest.fn(),
    onHeart: jest.fn(),
    ...over,
  };
  return { props, node: <CatalogCard {...props} /> };
}

test("what it is and where, in the words of «Best near you»", () => {
  expect(catalogTitle(HEART, "km")).toBe("Heart · 10.2 km");
  expect(catalogTitle(HEART, "mi")).toBe("Heart · 6.4 mi");
  expect(
    catalogTitle({ ...HEART, shape: null, word: "CIAO", style: "round" }, "km"),
  ).toBe("CIAO · 10.2 km");
  expect(catalogDetail(HEART, [46.07, 11.12], "km")).toMatch(
    /^Trento · Italy · \d+ m away$/,
  );
  // Without a start, nothing to be away from; without a country, the city alone.
  expect(catalogDetail(HEART, null, "km")).toBe("Trento · Italy");
  expect(catalogDetail({ ...HEART, country: "" }, null, "km")).toBe("Trento");
});

test("the card: the drawing with its likeness, the words, the heart, «Start»", async () => {
  await render(card().node);
  expect(screen.getByText("Heart · 10.2 km")).toBeOnTheScreen();
  expect(screen.getByText(/^Trento · Italy · \d+ m away$/)).toBeOnTheScreen();
  expect(screen.getByText("93%")).toBeOnTheScreen();
  expect(screen.getByText("♡")).toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "Add to favorites" })).toBeOnTheScreen();
  expect(
    screen.getByRole("button", { name: "Start: Heart · 10.2 km" }),
  ).toBeOnTheScreen();
  // The line is drawn: segments of the preview, turned back upright.
  expect(screen.getByTestId("catalog-card-drawing").children.length).toBeGreaterThan(3);
});

test("kept: the heart is full and says so", async () => {
  await render(card({ kept: true }).node);
  expect(screen.getByText("♥︎")).toBeOnTheScreen();
  const heart = screen.getByRole("button", { name: "Remove from favorites" });
  expect(heart.props.accessibilityState).toEqual({ selected: true });
});

test("a tap opens the route; the heart and «Start» are their own", async () => {
  const { props, node } = card();
  await render(node);
  const at = (pageX: number, pageY: number) => ({ nativeEvent: { pageX, pageY } });
  const theCard = screen.getByTestId("catalog-card");
  await fireEvent(theCard, "pressIn", at(100, 100));
  await fireEvent(theCard, "press", at(102, 101));
  expect(props.onOpen).toHaveBeenCalledWith(HEART);
  await fireEvent.press(screen.getByTestId("catalog-card-heart"));
  expect(props.onHeart).toHaveBeenCalledWith(HEART);
  await fireEvent.press(screen.getByTestId("catalog-card-start"));
  expect(props.onStart).toHaveBeenCalledWith(HEART);
  expect(props.onOpen).toHaveBeenCalledTimes(1);
});

test("a finger that slides over the card does not open it (TASK-196)", async () => {
  const { props, node } = card();
  await render(node);
  const at = (pageX: number, pageY: number) => ({ nativeEvent: { pageX, pageY } });
  const theCard = screen.getByTestId("catalog-card");
  await fireEvent(theCard, "pressIn", at(100, 100));
  await fireEvent(theCard, "press", at(100 + TAP_SLOP + 1, 100));
  expect(props.onOpen).not.toHaveBeenCalled();
});
