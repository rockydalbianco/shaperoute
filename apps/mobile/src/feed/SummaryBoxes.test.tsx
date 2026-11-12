/**
 * The numbers of a post in the card of «Feed» (TASK-474): in a row of four
 * — a run with its calories — iOS drew every value tiny over its label,
 * because a value that shrinks to fit had a fixed line height and its row
 * came out 39.9999 pt high instead of 40. A row of three was right.
 */
import { render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import { font, fontSize } from "../theme/tokens";
import type { PostRow } from "./postSections";
import { MIN_VALUE_SCALE, SummaryBoxes, VALUE_PAD } from "./SummaryBoxes";

const THREE: PostRow[] = [
  { label: "Distance", value: "4.62 km" },
  { label: "Time", value: "9:05" },
  { label: "Avg speed", value: "30.5 km/h" },
];

const FOUR: PostRow[] = [
  { label: "Distance", value: "4.27 km" },
  { label: "Time", value: "24:16" },
  { label: "Avg pace", value: "5:41 /km" },
  { label: "Calories", value: "299 kcal", energy: true },
];

function valueStyle(value: string) {
  return StyleSheet.flatten(screen.getByText(value).props.style);
}

test("a row of four has its values as big as a row of three", async () => {
  await render(<SummaryBoxes rows={THREE} />);
  const three = valueStyle("4.62 km");
  await render(<SummaryBoxes rows={FOUR} />);
  for (const row of FOUR) {
    const four = valueStyle(row.value);
    expect(four.fontSize).toBe(three.fontSize);
    expect(four.fontSize).toBe(fontSize.body);
  }
});

test("a value that shrinks to fit has no fixed line height, in any row", async () => {
  // A fixed line never fits a box a hair shorter than it: iOS then takes
  // the font down to its smallest, and the line stays as high.
  for (const rows of [THREE, FOUR]) {
    await render(<SummaryBoxes rows={rows} />);
    for (const row of rows) {
      const text = screen.getByText(row.value);
      expect(text.props.adjustsFontSizeToFit).toBe(true);
      expect(valueStyle(row.value).lineHeight).toBeUndefined();
    }
  }
});

test("a value too long for its box shrinks no smaller than its label, then is cut", async () => {
  await render(<SummaryBoxes rows={FOUR} />);
  for (const row of FOUR) {
    const text = screen.getByText(row.value);
    expect(text.props.numberOfLines).toBe(1);
    expect(text.props.minimumFontScale).toBe(MIN_VALUE_SCALE);
  }
  expect(fontSize.body * MIN_VALUE_SCALE).toBeGreaterThanOrEqual(fontSize.detail);
});

test("a row of three looks as before: the value's line is as high as the 22 pt one was", async () => {
  await render(<SummaryBoxes rows={THREE} />);
  for (const row of THREE) {
    expect(valueStyle(row.value).paddingVertical).toBe(VALUE_PAD);
  }
  // 15 pt in SF is a 17.9 pt line: with the pads, within a pixel of 22.
  expect(Math.abs(17.9 + 2 * VALUE_PAD - font.body.lineHeight)).toBeLessThan(1 / 3);
});
