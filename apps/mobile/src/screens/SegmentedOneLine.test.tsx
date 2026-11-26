import { render, screen } from "@testing-library/react-native";
import { StyleSheet, type TextStyle } from "react-native";

import { space } from "../theme/tokens";
import { ONE_LINE_MIN_SCALE, Segmented } from "./Segmented";

// A track of four (TASK-508): «A mano libera» went on two lines among
// three labels on one. With `oneLine` every label keeps one line and gets
// smaller when it does not fit; without it, a long label still wraps.

const FOUR = [
  { value: "freehand", label: "A mano libera" },
  { value: "shape", label: "Forma" },
  { value: "word", label: "Parola" },
  { value: "image", label: "Immagine" },
] as const;

test("with `oneLine` every label is one line that gets smaller, not cut", async () => {
  await render(<Segmented options={FOUR} value="shape" onChange={jest.fn()} oneLine />);
  for (const { label } of FOUR) {
    const text = screen.getByText(label);
    expect(text.props.numberOfLines).toBe(1);
    expect(text.props.adjustsFontSizeToFit).toBe(true);
    expect(text.props.minimumFontScale).toBe(ONE_LINE_MIN_SCALE);
    // As wide as its choice, a little inside the pill's edge.
    const style = StyleSheet.flatten(text.props.style) as TextStyle;
    expect(style.alignSelf).toBe("stretch");
    expect(style.paddingHorizontal).toBe(space.xs);
    expect(style.textAlign).toBe("center");
  }
});

test("the smallest a label gets is still read", () => {
  expect(ONE_LINE_MIN_SCALE).toBeGreaterThanOrEqual(0.7);
  expect(ONE_LINE_MIN_SCALE).toBeLessThan(1);
});

test("without it nothing changes: a long label wraps", async () => {
  await render(<Segmented options={FOUR} value="shape" onChange={jest.fn()} />);
  for (const { label } of FOUR) {
    const text = screen.getByText(label);
    expect(text.props.numberOfLines).toBeUndefined();
    expect(text.props.adjustsFontSizeToFit).toBeUndefined();
    const style = StyleSheet.flatten(text.props.style) as TextStyle;
    expect(style.alignSelf).toBeUndefined();
  }
});
