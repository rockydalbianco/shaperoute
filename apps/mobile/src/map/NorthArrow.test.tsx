import { fireEvent, render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import { color } from "../theme/tokens";
import { NorthArrow } from "./NorthArrow";

function needleTurn(): unknown {
  const style = StyleSheet.flatten(
    screen.getByTestId("north-arrow-needle").props.style,
  );
  return style.transform;
}

test("on a turned map the arrow points north, and a tap is told", async () => {
  const onPress = jest.fn();
  await render(<NorthArrow shown={-30} onPress={onPress} />);
  expect(needleTurn()).toEqual([{ rotate: "30deg" }]);
  const arrow = screen.getByRole("button", { name: "North arrow" });
  expect(arrow.props.accessibilityHint).toBe("Turns the map north up");
  await fireEvent.press(arrow);
  expect(onPress).toHaveBeenCalledTimes(1);
});

test("with north up the arrow is upright, and says it turns the map back", async () => {
  await render(<NorthArrow shown={0} onPress={jest.fn()} />);
  expect(needleTurn()).toEqual([{ rotate: "0deg" }]);
  expect(screen.getByTestId("north-arrow").props.accessibilityHint).toBe(
    "Turns the map like the drawing",
  );
});

test("the arrow is not the route's yellow: only the route is", async () => {
  await render(<NorthArrow shown={45} onPress={jest.fn()} />);
  const tip = StyleSheet.flatten(screen.getByText("▲").props.style);
  const north = StyleSheet.flatten(screen.getByText("N").props.style);
  expect(tip.color).toBe(color.text);
  expect(north.color).toBe(color.text);
  expect(color.text).not.toBe(color.accent);
});
