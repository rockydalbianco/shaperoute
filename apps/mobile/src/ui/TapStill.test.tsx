import { fireEvent, render, screen } from "@testing-library/react-native";
import { Animated, StyleSheet, Text } from "react-native";

import { Tap } from "./Tap";
import { useReduceMotion } from "./useReduceMotion";

// In its own file: after the animated presses of `Tap.test.tsx`, the next
// async render in the same file does not commit (a quirk of the renderer),
// and this test is about the other branch of `Tap` anyway.
jest.mock("./useReduceMotion");
jest.mocked(useReduceMotion).mockReturnValue(true);

test("with «Reduce Motion» on, nothing is animated: a plain Pressable that only dims when held", async () => {
  const timing = jest.spyOn(Animated, "timing");
  const onPressIn = jest.fn();
  const onPress = jest.fn();
  await render(
    <Tap testID="tap" onPressIn={onPressIn} onPress={onPress}>
      <Text>Go</Text>
    </Tap>,
  );
  const tap = screen.getByTestId("tap");
  fireEvent(tap, "pressIn");
  fireEvent(tap, "pressOut");
  fireEvent.press(tap);
  expect(onPressIn).toHaveBeenCalledTimes(1);
  expect(onPress).toHaveBeenCalledTimes(1);
  expect(timing).not.toHaveBeenCalled();

  // No scale, no animated opacity: the only pressed look is the held style.
  const style = StyleSheet.flatten(tap.props.style) as {
    opacity?: number;
    transform?: unknown;
  };
  expect(style.transform).toBeUndefined();
  expect(style.opacity).toBeUndefined();
});
