import { render, screen } from "@testing-library/react-native";
import { StyleSheet, Text } from "react-native";

import { color, font, radius } from "../theme/tokens";
import { SectionCard } from "./SectionCard";
import { tintOver } from "./tint";

// A card of a page (TASK-523 part A2).

const face = (testID: string) =>
  StyleSheet.flatten(screen.getByTestId(testID).props.style);

test("a plain card is the app's surface with soft corners", async () => {
  await render(
    <SectionCard title="Today" testID="card">
      <Text>Inside</Text>
    </SectionCard>,
  );
  expect(face("card")).toMatchObject({
    backgroundColor: color.surface,
    borderRadius: radius.card,
  });
  const title = screen.getByRole("header", { name: "Today" });
  expect(StyleSheet.flatten(title.props.style)).toMatchObject({
    ...font.cardTitle,
    color: color.text,
  });
  expect(screen.getByText("Inside")).toBeOnTheScreen();
});

test("a section's card takes the veil of its colour, and its title the colour", async () => {
  await render(<SectionCard title="Draw" colour={color.section.draw} testID="card" />);
  expect(face("card").backgroundColor).toBe(
    tintOver(color.section.draw, color.surface),
  );
  const title = screen.getByRole("header", { name: "Draw" });
  expect(StyleSheet.flatten(title.props.style).color).toBe(color.section.draw);
});

test("a card's face is opaque, with or without a section", async () => {
  await render(
    <>
      <SectionCard testID="plain" />
      <SectionCard colour={color.section.messages} testID="tinted" />
    </>,
  );
  for (const testID of ["plain", "tinted"]) {
    expect(face(testID).backgroundColor).toMatch(/^#[0-9A-F]{6}$/);
    expect(face(testID).opacity).toBeUndefined();
  }
});

test("with no title there is no heading", async () => {
  await render(<SectionCard testID="card" />);
  expect(screen.queryByRole("header")).toBeNull();
});

test("the caller's style comes last", async () => {
  await render(<SectionCard style={{ padding: 0 }} testID="card" />);
  expect(face("card").padding).toBe(0);
});
