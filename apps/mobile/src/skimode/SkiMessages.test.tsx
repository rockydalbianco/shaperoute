import { fireEvent, render, screen } from "@testing-library/react-native";
import { BackHandler, Text } from "react-native";

import { SkiMessages } from "./SkiMessages";

jest.mock(
  "react-native-safe-area-context",
  () => jest.requireActual("react-native-safe-area-context/jest/mock").default,
);

// «Messages» over the app in the ski mode (TASK-429 part A): the list
// inside, «Back» and the phone's back leave.

test("shows the conversations under «Back», which leaves", async () => {
  const onBack = jest.fn();
  await render(
    <SkiMessages onBack={onBack}>
      <Text>The conversations</Text>
    </SkiMessages>,
  );
  expect(screen.getByText("The conversations")).toBeOnTheScreen();
  await fireEvent.press(screen.getByTestId("ski-messages-back"));
  expect(onBack).toHaveBeenCalledTimes(1);
});

test("the phone's back leaves too, and is taken", async () => {
  const listeners: (() => boolean | null | undefined)[] = [];
  const add = jest
    .spyOn(BackHandler, "addEventListener")
    .mockImplementation((_event, listener) => {
      listeners.push(() => listener({} as Parameters<typeof listener>[0]));
      return { remove: jest.fn() };
    });
  const onBack = jest.fn();
  await render(<SkiMessages onBack={onBack}>{null}</SkiMessages>);
  expect(listeners).toHaveLength(1);
  expect(listeners[0]()).toBe(true);
  expect(onBack).toHaveBeenCalledTimes(1);
  add.mockRestore();
});
