import { fireEvent, render, screen } from "@testing-library/react-native";
import { Text } from "react-native";

import { AskLine } from "./AskLine";

// «Ask for a route» as one line that opens (TASK-420).

test("closed: the line alone; open: what is under it, and the arrow turns", async () => {
  const onToggle = jest.fn();
  const view = await render(
    <AskLine open={false} onToggle={onToggle}>
      <Text>the form</Text>
    </AskLine>,
  );
  expect(screen.getByText("Ask for a route")).toBeOnTheScreen();
  expect(
    screen.getByText("Famous places, best views, food… in any city"),
  ).toBeOnTheScreen();
  expect(screen.queryByText("the form")).toBeNull();
  expect(screen.getByText("→")).toBeOnTheScreen();
  const line = screen.getByRole("button", { name: "Ask for a route" });
  expect(line.props.accessibilityState).toEqual({ expanded: false });
  await fireEvent.press(line);
  expect(onToggle).toHaveBeenCalledTimes(1);
  await view.rerender(
    <AskLine open onToggle={onToggle}>
      <Text>the form</Text>
    </AskLine>,
  );
  expect(screen.getByText("the form")).toBeOnTheScreen();
  expect(screen.getByText("↑")).toBeOnTheScreen();
  expect(
    screen.getByRole("button", { name: "Ask for a route" }).props.accessibilityState,
  ).toEqual({
    expanded: true,
  });
});
