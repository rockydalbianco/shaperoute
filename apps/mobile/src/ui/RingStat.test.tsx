import { act, render, screen } from "@testing-library/react-native";
import { Animated } from "react-native";

import { COUNT_MS } from "../nutrition/CountUp";
import { color } from "../theme/tokens";
import { RING_STAT_SIZE, RingStat } from "./RingStat";
import { useReduceMotion } from "./useReduceMotion";

// A ring with its number in the middle (TASK-523 part A2): the ring and the
// count of «Nutrition», put together.

jest.mock("./useReduceMotion");
const reduceMotion = jest.mocked(useReduceMotion);

beforeEach(() => {
  jest.useFakeTimers();
  reduceMotion.mockReturnValue(false);
});
afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

const percent = (value: number) => `${value}%`;

test("the ring goes to its share on the app's spring, the number counts up", async () => {
  const spring = jest.spyOn(Animated, "spring");
  await render(
    <RingStat
      share={0.78}
      value={78}
      format={percent}
      colour={color.section.profile}
      label="Profile 78% complete"
      testID="stat"
    />,
  );
  expect(spring).toHaveBeenCalledTimes(1);
  expect(spring.mock.calls[0][1]).toMatchObject({
    toValue: 0.78,
    useNativeDriver: true,
  });
  expect(
    screen.getByTestId("stat-value", { includeHiddenElements: true }),
  ).toHaveTextContent("0%");
  await act(() => jest.advanceTimersByTimeAsync(COUNT_MS + 100));
  expect(
    screen.getByTestId("stat-value", { includeHiddenElements: true }),
  ).toHaveTextContent("78%");
});

test("screen readers are told what it says, once", async () => {
  await render(
    <RingStat
      share={0.5}
      value={5}
      colour={color.section.draw}
      label="5 of 10 kilometres"
      testID="stat"
    />,
  );
  const stat = screen.getByLabelText("5 of 10 kilometres");
  expect(stat.props.accessible).toBe(true);
  expect(stat.props.style).toMatchObject({
    width: RING_STAT_SIZE,
    height: RING_STAT_SIZE,
  });
});

test("with «Reduce Motion» the ring and the number are there at once", async () => {
  reduceMotion.mockReturnValue(true);
  const spring = jest.spyOn(Animated, "spring");
  await render(
    <RingStat
      share={0.92}
      value={92}
      format={percent}
      colour={color.section.draw}
      label="Roads follow your drawing: 92%"
      testID="stat"
    />,
  );
  expect(spring).not.toHaveBeenCalled();
  expect(
    screen.getByTestId("stat-value", { includeHiddenElements: true }),
  ).toHaveTextContent("92%");
});

test("with no number there is a dash", async () => {
  await render(
    <RingStat
      share={0}
      value={null}
      colour={color.section.feed}
      label="No data yet"
      testID="stat"
    />,
  );
  expect(
    screen.getByTestId("stat-value", { includeHiddenElements: true }),
  ).toHaveTextContent("—");
});
