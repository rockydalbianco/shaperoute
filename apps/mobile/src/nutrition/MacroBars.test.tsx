import { render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import { color } from "../theme/tokens";
import { MacroBars } from "./MacroBars";

// The diary's bars of protein, carbs and fat take the colours of the
// recipes' rings (TASK-489 part L, «Sì, stessi colori»).

jest.mock("../ui/useReduceMotion", () => ({ useReduceMotion: () => true }));

const HIDDEN = { includeHiddenElements: true };

const DAY = { proteinG: 80, carbsG: 200, fatG: 60, complete: true };

test("each bar has its kind's colour, and the three are not alike", async () => {
  await render(<MacroBars macros={DAY} />);
  const fills = (["protein", "carbs", "fat"] as const).map((kind) => {
    // The bar is hidden from the screen reader, which reads the row's label.
    const bar = screen.getByTestId(`diary-macro-${kind}-bar`, HIDDEN);
    const fill = StyleSheet.flatten(bar.props.style).backgroundColor;
    expect(fill).toBe(color[kind]);
    return fill;
  });
  expect(new Set(fills).size).toBe(3);
});

test("the colour is never the only sign: the name and the grams stay", async () => {
  await render(<MacroBars macros={DAY} />);
  expect(screen.getByTestId("diary-macro-protein")).toHaveTextContent(/Protein/);
  expect(screen.getByTestId("diary-macro-protein")).toHaveTextContent(/80 g/);
  expect(screen.getByTestId("diary-macro-fat").props.accessibilityLabel).toMatch(
    /^Fat, 60 g/,
  );
});

test("a day with none of the three draws no bar", async () => {
  await render(<MacroBars macros={null} />);
  expect(screen.getByTestId("diary-macros-none")).toBeTruthy();
  expect(screen.queryByTestId("diary-macro-protein-bar", HIDDEN)).toBeNull();
});
