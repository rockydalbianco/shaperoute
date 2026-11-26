import { act, render, screen } from "@testing-library/react-native";
import { Animated } from "react-native";

import { BREATH_MS, Figure } from "./Figure";
import { deepen, grounding, STAND } from "./poses";

/** A leg swing: the near leg forward, then as far back, the arms still. */
const SWING_FROM = { ...STAND, thighNear: 35, shinNear: 35, footNear: 125 };
const SWING = { thighNear: -70, shinNear: -60, footNear: -60 };

beforeEach(() => {
  jest.useFakeTimers();
});
afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

/** Every duration an animation was started with. */
function durations(timing: jest.SpyInstance): number[] {
  return timing.mock.calls.map(
    ([, config]: [unknown, { duration?: number }]) => config.duration ?? -1,
  );
}

describe("a movement of the figure (TASK-520)", () => {
  it("is a breath as wide as it needs: far more than a held pose goes", () => {
    // The standing leg stays on the floor at both ends of the swing.
    expect(grounding(SWING_FROM)).toBeCloseTo(grounding(STAND));
    expect(grounding(deepen(SWING_FROM, SWING))).toBeCloseTo(grounding(STAND));
    expect(deepen(SWING_FROM, SWING).thighNear).toBe(-35);
  });

  it("goes there and back once every `breathMs`", async () => {
    const timing = jest.spyOn(Animated, "timing");
    await render(
      <Figure
        pose={SWING_FROM}
        breath={SWING}
        breathing
        breathMs={1200}
        height={300}
        testID="f"
      />,
    );
    await act(() => jest.advanceTimersByTimeAsync(0));
    expect(durations(timing).filter((ms) => ms === 600)).toHaveLength(2);
    expect(durations(timing)).not.toContain(BREATH_MS / 2);
    expect(screen.getByTestId("f", { includeHiddenElements: true })).toBeTruthy();
  });

  it("breathes every `BREATH_MS` when no pace is given, as before", async () => {
    const timing = jest.spyOn(Animated, "timing");
    await render(
      <Figure pose={SWING_FROM} breath={SWING} breathing height={300} testID="f" />,
    );
    await act(() => jest.advanceTimersByTimeAsync(0));
    expect(durations(timing).filter((ms) => ms === BREATH_MS / 2)).toHaveLength(2);
  });

  it("starts again at the new pace when the pace changes while it moves", async () => {
    const timing = jest.spyOn(Animated, "timing");
    const { rerender } = await render(
      <Figure pose={SWING_FROM} breath={SWING} breathing height={300} testID="f" />,
    );
    await act(() => jest.advanceTimersByTimeAsync(BREATH_MS));
    await rerender(
      <Figure
        pose={SWING_FROM}
        breath={SWING}
        breathing
        breathMs={2000}
        height={300}
        testID="f"
      />,
    );
    await act(() => jest.advanceTimersByTimeAsync(0));
    expect(durations(timing).filter((ms) => ms === 1000)).toHaveLength(2);
  });
});
