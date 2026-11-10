import { fireEvent, render, screen } from "@testing-library/react-native";
import { Text } from "react-native";

import { SkiTodayPage } from "./SkiTodayPage";

// «Today», the first page of the ski mode (TASK-429 part A): its title, the
// resort of the day, and «Record your day», which starts the recording the
// app always had.

test("shows «Today», the resort of the day and «Record your day»", async () => {
  await render(<SkiTodayPage onRecord={jest.fn()} resort={<Text>Alpe Bianca</Text>} />);
  expect(screen.getByRole("header", { name: "Today" })).toBeOnTheScreen();
  expect(screen.getByText("Alpe Bianca")).toBeOnTheScreen();
  expect(screen.getByText("Record your day")).toBeOnTheScreen();
});

test("«Record your day» starts the day", async () => {
  const onRecord = jest.fn();
  await render(<SkiTodayPage onRecord={onRecord} resort={null} />);
  await fireEvent.press(screen.getByRole("button", { name: "Record your day" }));
  expect(onRecord).toHaveBeenCalledTimes(1);
});
