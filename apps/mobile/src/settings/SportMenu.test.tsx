import { fireEvent, render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import type { SportOption } from "./sport";
import { headerHang, SportMenu } from "./SportMenu";

// The panel shared by the header's sport button and «Settings» (TASK-512,
// ADR-0420); what each of them does with it is in their own tests.

const SOME: SportOption[] = [
  { id: "run", emoji: "🏃‍♂️", name: "Run", ready: true },
  { id: "ski", emoji: "⛷️", name: "Ski", ready: true, recordOnly: true },
  { id: "gym", emoji: "🏋️", name: "Gym", ready: true, recordOnly: true },
  { id: "paddle", emoji: "🛶", name: "Paddle", ready: false },
];

type Hung = { top?: number; maxHeight?: number };
const panel = () =>
  StyleSheet.flatten(
    screen.getByTestId("sport-panel").props.style as Parameters<
      typeof StyleSheet.flatten
    >[0],
  ) as Hung;

function show(props: Partial<Parameters<typeof SportMenu>[0]> = {}) {
  const onChoose = jest.fn();
  const onClose = jest.fn();
  return {
    onChoose,
    onClose,
    rendered: render(
      <SportMenu
        open
        sports={SOME}
        chosen="run"
        onChoose={onChoose}
        onClose={onClose}
        {...props}
      />,
    ),
  };
}

test("closed, it shows nothing", async () => {
  await show({ open: false }).rendered;
  expect(screen.queryByTestId("sport-panel")).toBeNull();
  expect(screen.queryByRole("radio")).toBeNull();
});

test("with no place given it hangs under the header's button, with no safe area", async () => {
  await show().rendered;
  expect(panel().top).toBe(headerHang(0));
  expect(panel().maxHeight).toBeGreaterThan(0);
});

test("it hangs where it is told", async () => {
  await show({ top: 120 }).rendered;
  expect(panel().top).toBe(120);
});

test("a tile tells the choice and the panel leaves closing to its owner", async () => {
  const { onChoose, onClose, rendered } = show();
  await rendered;
  await fireEvent.press(screen.getByRole("radio", { name: "Gym" }));
  expect(onChoose).toHaveBeenCalledWith("gym");
  await fireEvent.press(screen.getByRole("button", { name: "Close" }));
  await fireEvent.press(screen.getByTestId("sport-backdrop"));
  expect(onClose).toHaveBeenCalledTimes(2);
  expect(screen.getByRole("radio", { name: "Run" })).toBeChecked();
});

test("the small tiles write no mode line; the screen reader still hears it", async () => {
  await show().rendered;
  expect(screen.queryByText("Turns MuW into your training app")).toBeNull();
  expect(screen.getByRole("radio", { name: "Gym" })).toHaveProp(
    "accessibilityHint",
    "Turns MuW into your training app",
  );
  expect(
    screen.getByRole("radio", { name: "Run" }).props.accessibilityHint,
  ).toBeUndefined();
});

test("in the training mode it says how to go back", async () => {
  await show({ chosen: "gym" }).rendered;
  expect(screen.getByTestId("sport-training-mode")).toBeOnTheScreen();
  expect(screen.getByRole("radio", { name: "Gym" })).toBeChecked();
});
