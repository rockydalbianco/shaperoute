/**
 * A card whose route is not there yet shows the outline of its shape
 * (TASK-509): being drawn, up next or not drawn, the card says what is
 * coming and is not a black box. The outline is the catalogue's own
 * (`ShapeGlyph`, TASK-444), in grey: yellow is a route's. The card itself is
 * in RouteCard.test.tsx.
 */
import { type LatLon, SHAPES } from "@shaperoute/shared-types";
import { render, screen, within } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import { glyphLines } from "../route/ShapeGlyph";
import { color, route as routeLine } from "../theme/tokens";
import { cardDrawingHeight, cardOutlineSize, RouteCard } from "./RouteCard";

const WIDTH = 173;
// The glyph is hidden from a screen reader: the card's words name the shape.
const HIDDEN = { includeHiddenElements: true };

const SQUARE: LatLon[] = [
  [46.06, 11.12],
  [46.06, 11.13],
  [46.07, 11.13],
  [46.07, 11.12],
  [46.06, 11.12],
];

test.each(SHAPES)("the card of a %s not drawn yet shows its outline", async (shape) => {
  await render(
    <RouteCard
      width={WIDTH}
      line={null}
      outline={shape}
      title={shape}
      detail="Drawing…"
    />,
  );
  const place = screen.getByTestId("route-card-outline");
  const glyph = within(place).getByTestId(`shape-glyph-${shape}`, HIDDEN);
  // Its real figure: a side for each stretch of the catalogue's lines.
  const sides = glyphLines(shape).reduce((sum, line) => sum + line.length - 1, 0);
  expect(sides).toBeGreaterThan(0);
  expect(glyph.children).toHaveLength(sides);
  // Inside the drawing's place, which keeps its size: the card does not jump.
  const size = cardOutlineSize(WIDTH);
  expect(glyph).toHaveStyle({ width: size, height: size });
  expect(size).toBeLessThan(cardDrawingHeight(WIDTH));
  expect(screen.getByTestId("route-card-drawing")).toHaveStyle({
    width: WIDTH,
    height: cardDrawingHeight(WIDTH),
  });
});

test("the outline is grey, never the route's yellow", async () => {
  await render(<RouteCard width={WIDTH} line={null} outline="heart" title="Heart" />);
  const glyph = screen.getByTestId("shape-glyph-heart", HIDDEN);
  const tints = new Set(
    glyph.children.map((side) =>
      typeof side === "string"
        ? side
        : StyleSheet.flatten(side.props.style).backgroundColor,
    ),
  );
  expect([...tints]).toEqual([color.borderStrong]);
  expect(color.borderStrong).not.toBe(routeLine.color);
});

test("the outline is centred in the drawing's place", async () => {
  await render(<RouteCard width={WIDTH} line={null} outline="star" title="Star" />);
  expect(screen.getByTestId("route-card-outline")).toHaveStyle({
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  });
});

test("a card not drawn yet is still one to read, not to touch", async () => {
  await render(
    <RouteCard
      width={WIDTH}
      line={null}
      outline="heart"
      title="Heart"
      detail="Up next"
    />,
  );
  expect(screen.getByText("Heart")).toBeOnTheScreen();
  expect(screen.getByText("Up next")).toBeOnTheScreen();
  expect(screen.queryByRole("button")).toBeNull();
});

test("once the route is there its line is drawn, not the outline", async () => {
  await render(<RouteCard width={WIDTH} line={SQUARE} outline="heart" title="Heart" />);
  expect(screen.queryByTestId("route-card-outline")).toBeNull();
  expect(screen.queryByTestId("shape-glyph-heart", HIDDEN)).toBeNull();
  // The square's four stretches, in the route's colour.
  expect(screen.getByTestId("route-card-drawing").children).toHaveLength(4);
});

test("a photo alone on a card stays alone", async () => {
  await render(
    <RouteCard
      width={WIDTH}
      line={null}
      outline="heart"
      photo={{ source: { uri: "http://api.test/city-photos/Q1.jpg" }, credit: null }}
      title="Viana"
    />,
  );
  expect(screen.getByTestId("route-card-photo")).toBeOnTheScreen();
  expect(screen.queryByTestId("route-card-outline")).toBeNull();
});

test("a card with no shape given keeps its place empty, as the words'", async () => {
  await render(<RouteCard width={WIDTH} line={null} title="MUW" detail="Drawing…" />);
  expect(screen.queryByTestId("route-card-outline")).toBeNull();
  expect(screen.getByTestId("route-card-drawing").children).toHaveLength(0);
});
