import { fireEvent, render, screen } from "@testing-library/react-native";
import { StyleSheet, Text } from "react-native";

import { color, fontWeight, MIN_TAP_SIZE } from "../theme/tokens";
import { Tile } from "./Tile";
import { tintOver } from "./tint";
import { useReduceMotion } from "./useReduceMotion";

// A small card to tap, in the grids of two columns (TASK-523 part A2).

jest.mock("./useReduceMotion");

beforeEach(() => {
  jest.mocked(useReduceMotion).mockReturnValue(false);
});

const icon = <Text>i</Text>;
const face = () => StyleSheet.flatten(screen.getByTestId("tile").props.style);

test("a tile is a button with its name, and answers the finger", async () => {
  const onPress = jest.fn();
  await render(
    <Tile
      label="Shape"
      colour={color.section.draw}
      icon={icon}
      onPress={onPress}
      testID="tile"
    />,
  );
  const tile = screen.getByRole("button", { name: "Shape" });
  await fireEvent.press(tile);
  expect(onPress).toHaveBeenCalledTimes(1);
  expect(face().minHeight).toBeGreaterThanOrEqual(MIN_TAP_SIZE);
  expect(face().backgroundColor).toBe(color.surface);
  // Not one of a set: nothing is said about being chosen.
  expect(tile.props.accessibilityState?.selected).toBeUndefined();
});

test("its quiet line is read with its name", async () => {
  await render(
    <Tile
      label="Language"
      detail="English"
      colour={color.section.explore}
      icon={icon}
      onPress={jest.fn()}
      testID="tile"
    />,
  );
  expect(screen.getByRole("button", { name: "Language, English" })).toBeOnTheScreen();
  expect(screen.getByText("English")).toBeOnTheScreen();
});

test("the one chosen has the veil, the border and a bolder name, and says so", async () => {
  await render(
    <Tile
      label="Word"
      colour={color.section.draw}
      icon={icon}
      selected
      onPress={jest.fn()}
      testID="tile"
    />,
  );
  expect(face()).toMatchObject({
    borderColor: color.section.draw,
    backgroundColor: tintOver(color.section.draw, color.surface),
  });
  expect(StyleSheet.flatten(screen.getByText("Word").props.style).fontWeight).toBe(
    fontWeight.semibold,
  );
  expect(
    screen.getByRole("button", { name: "Word", selected: true }),
  ).toBeOnTheScreen();
});

test("one not chosen says so, and is the same size as the one chosen", async () => {
  const { rerender } = await render(
    <Tile
      label="Word"
      colour={color.section.draw}
      icon={icon}
      selected={false}
      onPress={jest.fn()}
      testID="tile"
    />,
  );
  expect(
    screen.getByRole("button", { name: "Word", selected: false }),
  ).toBeOnTheScreen();
  const { borderWidth, padding } = face();
  await rerender(
    <Tile
      label="Word"
      colour={color.section.draw}
      icon={icon}
      selected
      onPress={jest.fn()}
      testID="tile"
    />,
  );
  expect(face()).toMatchObject({ borderWidth, padding });
});
