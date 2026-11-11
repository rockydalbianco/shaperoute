import { render, screen } from "@testing-library/react-native";

import { color } from "../theme/tokens";
import { SkiLegend } from "./SkiLegend";

// The legend of a day of skiing (TASK-429 part B): in words, so it reads
// without the colours, and with samples in the colours of the map.

test("says in words what the yellow and the red lines are", async () => {
  await render(<SkiLegend />);
  expect(screen.getByRole("header", { name: "Legend" })).toBeOnTheScreen();
  expect(screen.getByText("Descents · solid, numbered")).toBeOnTheScreen();
  expect(screen.getByText("Lifts · dashed, L1, L2…")).toBeOnTheScreen();
});

test("its samples are in the colours of the map: one solid, one in dashes", async () => {
  await render(<SkiLegend />);
  const tree = JSON.stringify(screen.toJSON());
  expect(tree).toContain(color.ski.descent);
  // The lift is drawn in pieces: its colour more than once.
  expect(tree.split(color.ski.lift).length - 1).toBeGreaterThan(1);
});
