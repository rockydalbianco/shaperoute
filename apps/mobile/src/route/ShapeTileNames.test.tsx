import { act, fireEvent, render, screen } from "@testing-library/react-native";

import { saveLanguageChoice } from "../i18n/language";
import { ShapeGrid } from "./ShapeGrid";
import { ShapeTiles } from "./ShapeTiles";

// The names under the shapes of «Draw» (TASK-508): written small, «cuore»,
// among labels that all have their capital. The tile shows the name with
// its capital; the field still takes the word as a sentence writes it.

jest.mock("../haptics/haptics", () => ({ selectionFeel: jest.fn() }));

afterEach(async () => {
  await act(async () => saveLanguageChoice("phone"));
});

test.each([
  ["the grid", ShapeGrid],
  ["the row", ShapeTiles],
] as const)(
  "%s shows the name with its capital and writes it small",
  async (_, Tiles) => {
    const onPick = jest.fn();
    await render(<Tiles chosen={null} onPick={onPick} />);
    expect(screen.getByText("Heart")).toBeOnTheScreen();
    expect(screen.getByText("Star")).toBeOnTheScreen();
    expect(screen.queryByText("heart")).toBeNull();
    await fireEvent.press(screen.getByText("Heart"));
    expect(onPick).toHaveBeenCalledWith("heart");
  },
);

test("in Italian «Cuore» on the tile, «cuore» in the field", async () => {
  await act(async () => saveLanguageChoice("it"));
  const onPick = jest.fn();
  await render(<ShapeGrid chosen={null} onPick={onPick} />);
  expect(screen.getByText("Cuore")).toBeOnTheScreen();
  expect(screen.getByText("Cerchio")).toBeOnTheScreen();
  expect(screen.queryByText("cuore")).toBeNull();
  await fireEvent.press(screen.getByText("Cuore"));
  expect(onPick).toHaveBeenCalledWith("cuore");
});

test("more than one word keeps one capital: «Dog head»", async () => {
  await render(<ShapeTiles chosen={null} onPick={jest.fn()} />);
  expect(screen.getByText("Dog head")).toBeOnTheScreen();
});
