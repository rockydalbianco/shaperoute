import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { AccessibilityInfo, Animated } from "react-native";

import { color } from "../theme/tokens";
import { category, compose, defaultChoice } from "./compose";
import { PULSE_MS, TodayCard } from "./TodayCard";

const start = jest.fn();
const see = jest.fn();

async function show(key: string) {
  const of = category(key);
  const routine = compose(of, defaultChoice(of));
  await render(
    <TodayCard
      of={of}
      routine={routine}
      tint={color.stretch[of.group]}
      onStart={start}
      onSee={see}
    />,
  );
  return routine;
}

beforeEach(() => {
  jest.useFakeTimers();
  start.mockClear();
  see.mockClear();
});
afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe("«Today» on the stretching home", () => {
  it("names the routine of the moment, says what it is and starts it", async () => {
    const routine = await show("morning");
    expect(screen.getByText("Today")).toBeOnTheScreen();
    expect(screen.getByRole("header", { name: "Morning" })).toBeOnTheScreen();
    expect(screen.getByText("A good start to the day")).toBeOnTheScreen();
    expect(screen.getByText("5 min")).toBeOnTheScreen();
    expect(screen.getByText(`${routine.exercises.length} exercises`)).toBeOnTheScreen();
    expect(screen.getByText("Gentle")).toBeOnTheScreen();
    await act(async () => {
      fireEvent.press(screen.getByTestId("stretch-today-start"));
    });
    expect(start).toHaveBeenCalledTimes(1);
    expect(see).not.toHaveBeenCalled();
    // The button says what it starts to a screen reader.
    expect(
      screen.getByTestId("stretch-today-start").props.accessibilityLabel,
    ).toContain("Morning");
  });

  it("opens the exercises from the line under «Start»", async () => {
    const routine = await show("fullBody");
    await act(async () => {
      fireEvent.press(
        screen.getByText(`See the ${routine.exercises.length} exercises`),
      );
    });
    expect(see).toHaveBeenCalledTimes(1);
    expect(start).not.toHaveBeenCalled();
  });

  it("has no line for a proposal with none, and names a sport with its when", async () => {
    await show("running_after");
    expect(screen.getByRole("header", { name: "Running · After" })).toBeOnTheScreen();
    expect(screen.queryByText("A good start to the day")).toBeNull();
  });

  it("pulses its rings slowly, and stops them with «Reduce Motion» on", async () => {
    // Every loop made, with whether it was stopped.
    const real = Animated.loop;
    const stops: jest.Mock[] = [];
    jest.spyOn(Animated, "loop").mockImplementation((...args) => {
      const made = real(...args);
      const stop = jest.fn(() => made.stop());
      stops.push(stop);
      return { start: (done) => made.start(done), stop, reset: () => made.reset() };
    });
    const timing = jest.spyOn(Animated, "timing");
    await show("desk");
    await act(() => jest.advanceTimersByTimeAsync(PULSE_MS));
    // Out and back, each half the pulse's time; it goes on while shown.
    expect(
      timing.mock.calls.filter(([, config]) => config.duration === PULSE_MS / 2),
    ).toHaveLength(2);
    // The rings' loop and the figure's breath: neither stopped.
    expect(stops.length).toBeGreaterThanOrEqual(1);
    for (const stop of stops) {
      expect(stop).not.toHaveBeenCalled();
    }
    await screen.unmount();

    stops.length = 0;
    jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockResolvedValue(true);
    await show("desk");
    await act(() => jest.advanceTimersByTimeAsync(PULSE_MS));
    // The phone answered: what had begun meanwhile is stopped, nothing
    // begun after.
    expect(stops.length).toBeGreaterThanOrEqual(1);
    for (const stop of stops) {
      expect(stop).toHaveBeenCalled();
    }
  });
});
