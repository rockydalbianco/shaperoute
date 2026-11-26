import { render, screen } from "@testing-library/react-native";

import { CompassLine } from "./CompassLine";
import type { RunNumbers } from "./RunPanel";

// The one line of «Compass» (TASK-518 A): how far and how long.

const NUMBERS = { km: "2.34", units: "km", time: "12:05" } as RunNumbers;

test("how far with its unit, a dot, how long", async () => {
  await render(<CompassLine numbers={NUMBERS} />);
  expect(screen.getByTestId("compass-line")).toHaveTextContent("2.34 km·12:05");
  expect(screen.getByLabelText("Distance: 2.34 km, Time: 12:05")).toBeOnTheScreen();
});

test("in miles when the run's numbers are", async () => {
  await render(<CompassLine numbers={{ ...NUMBERS, km: "1.45", units: "mi" }} />);
  expect(screen.getByTestId("compass-line")).toHaveTextContent("1.45 mi·12:05");
});
