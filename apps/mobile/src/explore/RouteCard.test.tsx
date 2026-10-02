import type { LatLon } from "@shaperoute/shared-types";
import { fireEvent, render, screen } from "@testing-library/react-native";

import { cardDrawingHeight, cardWidth, RouteCard } from "./RouteCard";

// A square: four stretches to draw.
const SQUARE: LatLon[] = [
  [46.06, 11.12],
  [46.06, 11.13],
  [46.07, 11.13],
  [46.07, 11.12],
  [46.06, 11.12],
];

test("two cards stand side by side in the width they are given", () => {
  // 390 wide less the page's margins, 12 between the two.
  expect(cardWidth(358)).toBe(173);
  expect(cardWidth(358, 8)).toBe(175);
  expect(2 * cardWidth(343) + 12).toBeLessThanOrEqual(343);
  expect(cardWidth(0)).toBe(0);
  expect(cardDrawingHeight(173)).toBe(114);
});

test("shows the drawing, what the route is, where, and how much it looks like the shape", async () => {
  await render(
    <RouteCard
      width={173}
      line={SQUARE}
      title="Star · 5.1 km"
      detail="Trento · 450 m away"
      match={0.996}
      onPress={jest.fn()}
    />,
  );
  expect(screen.getByText("Star · 5.1 km")).toBeOnTheScreen();
  expect(screen.getByText("Trento · 450 m away")).toBeOnTheScreen();
  expect(screen.getByText("100%")).toBeOnTheScreen();
  const drawing = screen.getByTestId("route-card-drawing");
  expect(drawing).toHaveStyle({ width: 173, height: 114 });
  // Four stretches, and the likeness over them.
  expect(drawing.children).toHaveLength(5);
  expect(screen.getByTestId("route-card")).toHaveStyle({ width: 173 });
});

test("a touch opens the route, and a screen reader hears what it is told", async () => {
  const onPress = jest.fn();
  await render(
    <RouteCard
      width={173}
      line={SQUARE}
      title="Star · 5.1 km"
      onPress={onPress}
      accessibilityLabel="star, 5 km, 450 m away"
    />,
  );
  await fireEvent.press(screen.getByRole("button", { name: "star, 5 km, 450 m away" }));
  expect(onPress).toHaveBeenCalledTimes(1);
});

test("a route not drawn yet is a card to read, not to touch", async () => {
  await render(<RouteCard width={161} line={null} title="Circle" detail="Drawing…" />);
  expect(screen.getByText("Circle")).toBeOnTheScreen();
  expect(screen.getByText("Drawing…")).toBeOnTheScreen();
  expect(screen.queryByRole("button")).toBeNull();
  // The place of the drawing is kept, empty: the card does not jump later.
  const drawing = screen.getByTestId("route-card-drawing");
  expect(drawing).toHaveStyle({ width: 161, height: 106 });
  expect(drawing.children).toHaveLength(0);
});
