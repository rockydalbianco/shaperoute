import { fireEvent, render, screen } from "@testing-library/react-native";
import { Text } from "react-native";

import { TrainingTabIcon } from "./TrainingTabIcon";
import { TrainingTodayPage } from "./TrainingTodayPage";

// «Today», the first page of the training mode (TASK-490 part A): its
// title and the gym of «Draw» as it is, whose «Start workout» starts the
// workout the app always had.

jest.mock(
  "react-native-safe-area-context",
  () => jest.requireActual("react-native-safe-area-context/jest/mock").default,
);

test("shows «Today» and what stands under it", async () => {
  await render(<TrainingTodayPage onStart={jest.fn()} guide={<Text>Push</Text>} />);
  expect(screen.getByRole("header", { name: "Today" })).toBeOnTheScreen();
  expect(screen.getByText("Push")).toBeOnTheScreen();
});

test("the gym of «Draw»: «Start workout» starts the workout", async () => {
  const onStart = jest.fn();
  await render(<TrainingTodayPage onStart={onStart} />);
  expect(screen.getByTestId("gym-guide")).toBeOnTheScreen();
  expect(
    screen.getByText("No route in the gym: MuW times your workout."),
  ).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole("button", { name: "Start workout" }));
  expect(onStart).toHaveBeenCalledTimes(1);
});

test("the tab icons are bolder on the tab on screen", async () => {
  await render(
    <>
      <TrainingTabIcon name="today" selected />
      <TrainingTabIcon name="workouts" selected={false} />
    </>,
  );
  expect(screen.getByTestId("training-tab-today-on")).toBeOnTheScreen();
  expect(screen.getByTestId("training-tab-workouts-off")).toBeOnTheScreen();
});

test("without an account, no body of the week over the gym", async () => {
  await render(<TrainingTodayPage onStart={jest.fn()} guide={<Text>Push</Text>} />);
  expect(screen.queryByTestId("week-body")).toBeNull();
});

test("without an account, no Coach line over the gym", async () => {
  await render(<TrainingTodayPage onStart={jest.fn()} guide={<Text>Push</Text>} />);
  expect(screen.queryByTestId("training-coach")).toBeNull();
});
