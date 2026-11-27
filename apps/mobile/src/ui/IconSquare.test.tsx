import { render, screen } from "@testing-library/react-native";
import { StyleSheet, Text } from "react-native";

import { color, radius } from "../theme/tokens";
import { ICON_SQUARE, IconSquare } from "./IconSquare";
import { tintOver } from "./tint";

// The square behind an icon (TASK-523 part A2).

// A picture is hidden from screen readers, and so from the plain queries.
const square = () => screen.getByTestId("square", { includeHiddenElements: true });

test("the square is the veil of the section's colour over a card", async () => {
  await render(
    <IconSquare colour={color.section.profile} testID="square">
      <Text>i</Text>
    </IconSquare>,
  );
  expect(StyleSheet.flatten(square().props.style)).toMatchObject({
    width: ICON_SQUARE,
    height: ICON_SQUARE,
    borderRadius: radius.md,
    backgroundColor: tintOver(color.section.profile, color.surface),
  });
});

test("it takes the size it is told", async () => {
  await render(
    <IconSquare colour={color.section.feed} size={48} testID="square">
      <Text>i</Text>
    </IconSquare>,
  );
  expect(StyleSheet.flatten(square().props.style)).toMatchObject({
    width: 48,
    height: 48,
  });
});

test("it is a picture: screen readers pass it by", async () => {
  await render(
    <IconSquare colour={color.section.explore} testID="square">
      <Text>i</Text>
    </IconSquare>,
  );
  expect(screen.queryByTestId("square")).toBeNull();
  expect(square().props.accessibilityElementsHidden).toBe(true);
  expect(square().props.importantForAccessibility).toBe("no-hide-descendants");
  expect(screen.queryByText("i")).toBeNull();
});
