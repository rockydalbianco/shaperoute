import { fireEvent, render, screen } from "@testing-library/react-native";

import { MoveShape } from "./MoveShape";

test("says what to do, that the shape stays where it fits, and the way out", async () => {
  const onCancel = jest.fn();
  await render(<MoveShape onCancel={onCancel} />);
  expect(screen.getByText("Move the shape")).toBeTruthy();
  expect(
    screen.getByText("Drag the shape where you want it, then let go."),
  ).toBeTruthy();
  expect(
    screen.getByText("It stays on the water, off the shore, where it fits."),
  ).toBeTruthy();
  await fireEvent.press(screen.getByRole("button", { name: "Cancel" }));
  expect(onCancel).toHaveBeenCalledTimes(1);
});
