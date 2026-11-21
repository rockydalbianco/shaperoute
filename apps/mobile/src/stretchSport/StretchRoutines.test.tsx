import { act, fireEvent, render, screen } from "@testing-library/react-native";

import { chooseRoutine, chosenRoutine, FIRST_ROUTINE } from "./stretchChoice";
import { StretchRoutines } from "./StretchRoutines";

// TASK-475 part B: «Draw» with the sport «Stretching» shows the routines of
// TASK-466, one ticked; «Start stretching» reads the one ticked.

beforeEach(() => chooseRoutine(FIRST_ROUTINE));

test("the three routines, «Morning» ticked first, each with its lengths", async () => {
  await render(<StretchRoutines />);
  const group = screen.getByTestId("stretch-routines");
  expect(group.props.accessibilityRole).toBe("radiogroup");
  expect(group.props.accessibilityLabel).toBe("Stretching");
  const radios = screen.getAllByRole("radio");
  expect(radios.map((radio) => radio.props.accessibilityLabel)).toEqual([
    "Morning",
    "After run",
    "After gym",
  ]);
  expect(screen.getByRole("radio", { name: "Morning" })).toBeChecked();
  expect(screen.getByRole("radio", { name: "After run" })).not.toBeChecked();
  expect(screen.getAllByText("3 min · 5 min · 10 min")).toHaveLength(3);
});

test("a tap ticks a routine, and it is the one «Start stretching» opens", async () => {
  await render(<StretchRoutines />);
  await act(async () => {
    fireEvent.press(screen.getByRole("radio", { name: "After run" }));
  });
  expect(screen.getByRole("radio", { name: "After run" })).toBeChecked();
  expect(screen.getByRole("radio", { name: "Morning" })).not.toBeChecked();
  expect(chosenRoutine()).toBe("afterRun");
  expect(screen.getAllByText("✓")).toHaveLength(1);
});
