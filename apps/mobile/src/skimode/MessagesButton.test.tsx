import { fireEvent, render, screen } from "@testing-library/react-native";

import { MessagesButton } from "./MessagesButton";

// «Messages» in the header of the ski mode (TASK-429): the icon, the red
// number its tab had, and a touch that opens the conversations.

test("with nothing waiting: the icon alone, read as «Messages»", async () => {
  const onPress = jest.fn();
  await render(<MessagesButton waiting={0} onPress={onPress} />);
  expect(screen.getByLabelText("Messages")).toBeOnTheScreen();
  expect(screen.queryByTestId("ski-messages-count")).toBeNull();
  await fireEvent.press(screen.getByTestId("ski-messages"));
  expect(onPress).toHaveBeenCalledTimes(1);
});

test("with conversations waiting: the red number, and the screen reader says how many", async () => {
  await render(<MessagesButton waiting={3} onPress={jest.fn()} />);
  expect(screen.getByTestId("ski-messages-count")).toBeOnTheScreen();
  expect(screen.getByText("3")).toBeOnTheScreen();
  expect(screen.getByLabelText("Messages, 3 waiting")).toBeOnTheScreen();
});

test("a number past the most the bar shows is cut as the tab cuts it", async () => {
  await render(<MessagesButton waiting={12} onPress={jest.fn()} />);
  expect(screen.getByText("9+")).toBeOnTheScreen();
});
