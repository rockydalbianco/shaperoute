import { act, render, screen } from "@testing-library/react-native";

import { useReduceMotion } from "../ui/useReduceMotion";
import { COUNT_MS, countAt, CountUp } from "./CountUp";

// A number that counts up to its value (TASK-489 part H).

jest.mock("../ui/useReduceMotion", () => ({ useReduceMotion: jest.fn() }));

const reduceMotion = jest.mocked(useReduceMotion);

beforeEach(() => {
  reduceMotion.mockReturnValue(false);
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

test("the count goes fast, then settles on its value", () => {
  expect(countAt(0, 1000, 0)).toBe(0);
  expect(countAt(0, 1000, 0.5)).toBe(875);
  expect(countAt(0, 1000, 1)).toBe(1000);
  // Never past it, and down as well as up.
  expect(countAt(0, 1000, 3)).toBe(1000);
  expect(countAt(1000, 400, 1)).toBe(400);
  expect(countAt(-200, 300, 0)).toBe(-200);
});

test("a number comes from zero and ends on its value", async () => {
  await render(<CountUp value={1420} testID="count" />);
  expect(screen.getByTestId("count")).toHaveTextContent("0");
  await act(async () => {
    jest.advanceTimersByTime(COUNT_MS + 100);
  });
  expect(screen.getByTestId("count")).toHaveTextContent("1420");
});

test("a new value is counted to from where the number was", async () => {
  const view = await render(<CountUp value={1000} testID="count" />);
  await act(async () => {
    jest.advanceTimersByTime(COUNT_MS + 100);
  });
  await view.rerender(<CountUp value={400} testID="count" />);
  // Not back to zero first.
  expect(screen.getByTestId("count")).toHaveTextContent("1000");
  await act(async () => {
    jest.advanceTimersByTime(COUNT_MS + 100);
  });
  expect(screen.getByTestId("count")).toHaveTextContent("400");
});

test("with «Reduce Motion» the number is its value at once", async () => {
  reduceMotion.mockReturnValue(true);
  await render(<CountUp value={-660} format={(n) => `${n} kcal`} testID="count" />);
  expect(screen.getByTestId("count")).toHaveTextContent("-660 kcal");
});

test("no number is a dash, moving or not", async () => {
  const view = await render(<CountUp value={null} testID="count" />);
  expect(screen.getByTestId("count")).toHaveTextContent("—");
  await view.rerender(<CountUp value={250} testID="count" />);
  await act(async () => {
    jest.advanceTimersByTime(COUNT_MS + 100);
  });
  expect(screen.getByTestId("count")).toHaveTextContent("250");
});
