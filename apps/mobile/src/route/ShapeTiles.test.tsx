import { SHAPES } from "@shaperoute/shared-types";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { ScrollView } from "react-native";

import { ShapeTiles } from "./ShapeTiles";

test("every shape is a tile, in one row that slides sideways", async () => {
  await render(<ShapeTiles chosen={null} onPick={() => {}} />);
  expect(screen.getByTestId("shape-tiles")).toHaveProp("horizontal", true);
  expect(screen.getAllByRole("button")).toHaveLength(SHAPES.length);
  expect(screen.getByRole("button", { name: "pumpkin" })).toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "christmas tree" })).toBeOnTheScreen();
});

test("a tile writes the name the runner reads", async () => {
  const onPick = jest.fn();
  await render(<ShapeTiles chosen={null} onPick={onPick} />);
  await fireEvent.press(screen.getByRole("button", { name: "christmas tree" }));
  expect(onPick).toHaveBeenCalledWith("christmas tree");
});

test("a shape chosen in the field brings its tile into view", async () => {
  const scrollTo = jest
    .spyOn(ScrollView.prototype, "scrollTo")
    .mockImplementation(() => {});
  const { rerender } = await render(<ShapeTiles chosen={null} onPick={() => {}} />);
  await fireEvent(screen.getByRole("button", { name: "pumpkin" }), "layout", {
    nativeEvent: { layout: { x: 1100, y: 0, width: 88, height: 88 } },
  });
  await rerender(<ShapeTiles chosen="pumpkin" onPick={() => {}} />);
  expect(scrollTo).toHaveBeenCalledWith({ x: 1092, animated: true });
  scrollTo.mockRestore();
});
