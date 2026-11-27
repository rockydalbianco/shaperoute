import { render, screen } from "@testing-library/react-native";
import { StyleSheet, Text } from "react-native";

import { color, font } from "../theme/tokens";
import { SectionHeader } from "./SectionHeader";

// The name over a group of a page (TASK-523 part A2).

test("a group's name is a heading, in the quiet grey", async () => {
  await render(<SectionHeader title="ACCOUNT" />);
  const title = screen.getByRole("header", { name: "ACCOUNT" });
  expect(StyleSheet.flatten(title.props.style)).toMatchObject({
    ...font.label,
    color: color.textMuted,
  });
});

test("a group of a section has its name in the section's colour", async () => {
  await render(<SectionHeader title="WHAT YOU DRAW" colour={color.section.draw} />);
  const title = screen.getByRole("header", { name: "WHAT YOU DRAW" });
  expect(StyleSheet.flatten(title.props.style).color).toBe(color.section.draw);
});

test("what is given for the end of the line is shown beside the name", async () => {
  await render(
    <SectionHeader title="FEED" trailing={<Text>See all</Text>} testID="h" />,
  );
  expect(screen.getByTestId("h")).toContainElement(screen.getByText("See all"));
});
