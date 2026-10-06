/**
 * A run along a turned route, drawn small (TASK-232, ADR-0195): route and
 * run are turned back together, so the drawing reads upright as on the map.
 */
import type { LatLon } from "@shaperoute/shared-types";
import { render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import { RunDrawing } from "./RunDrawing";

const RAD = Math.PI / 180;
// The «up» of a shape turned 30° counterclockwise: a stroke from Trento
// that points 30° west of north.
const NORTH = 0.01 * Math.cos(30 * RAD);
const UP: LatLon[] = [
  [46.06, 11.12],
  [
    46.06 + NORTH,
    11.12 - (0.01 * Math.sin(30 * RAD)) / Math.cos((46.06 + NORTH / 2) * RAD),
  ],
];

/** How a stretch is turned on the screen, in degrees. */
function angleOf(testID: string): number {
  const [stroke] = screen.getAllByTestId(testID);
  const style = StyleSheet.flatten(stroke.props.style);
  const [{ rotate }] = style.transform as { rotate: string }[];
  return parseFloat(rotate);
}

test("a run along a route turned 30° is drawn turned back: its up is up", async () => {
  await render(
    <RunDrawing route={UP} track={UP} width={100} height={100} rotationDeg={30} />,
  );
  expect(angleOf("run-drawing-route")).toBeCloseTo(-90, 4);
  expect(angleOf("run-drawing-track")).toBeCloseTo(-90, 4);
});

test("a run that does not say how its route is turned is drawn north up", async () => {
  const { rerender } = await render(
    <RunDrawing route={UP} track={UP} width={100} height={100} />,
  );
  expect(angleOf("run-drawing-route")).toBeCloseTo(-120, 4);
  await rerender(
    <RunDrawing route={UP} track={UP} width={100} height={100} rotationDeg={null} />,
  );
  expect(angleOf("run-drawing-route")).toBeCloseTo(-120, 4);
  await rerender(
    <RunDrawing route={UP} track={UP} width={100} height={100} rotationDeg={0} />,
  );
  expect(angleOf("run-drawing-track")).toBeCloseTo(-120, 4);
});
