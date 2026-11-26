import { fireEvent, render, screen } from "@testing-library/react-native";

import { color } from "../theme/tokens";
import { MapPointSheet } from "./MapPointSheet";

async function show(point: [number, number] | null) {
  const handlers = { onWaypoint: jest.fn(), onLanding: jest.fn(), onClose: jest.fn() };
  await render(<MapPointSheet point={point} palette={color} {...handlers} />);
  return handlers;
}

it("offers a waypoint or a landing where the map was pressed", async () => {
  const handlers = await show([46.12345, 11.5]);
  expect(screen.getByText("Mark this place")).toBeTruthy();
  expect(screen.getByText("46.12345, 11.50000")).toBeTruthy();
  await fireEvent.press(screen.getByTestId("map-point-waypoint"));
  expect(handlers.onWaypoint).toHaveBeenCalledWith([46.12345, 11.5]);
  await fireEvent.press(screen.getByTestId("map-point-landing"));
  expect(handlers.onLanding).toHaveBeenCalledWith([46.12345, 11.5]);
  await fireEvent.press(screen.getByTestId("map-point-cancel"));
  expect(handlers.onClose).toHaveBeenCalled();
});

it("is closed without a point", async () => {
  await show(null);
  expect(screen.queryByTestId("map-point-sheet")).toBeNull();
});
