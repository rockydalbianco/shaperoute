import { act, render, screen } from "@testing-library/react-native";
import { AccessibilityInfo, StyleSheet } from "react-native";

import { EXERCISES } from "./exercises";
import { BREATH_MS, Figure, path, POSE_MS, turns } from "./Figure";
import { CALF, CHILD, QUAD, STAND } from "./poses";

beforeEach(() => {
  jest.useFakeTimers();
});
afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe("the figure's moves", () => {
  it("goes straight from standing into a pose, and back up", () => {
    expect(path(STAND, QUAD, false)).toEqual([STAND, QUAD]);
    expect(path(QUAD, STAND, false)).toEqual([QUAD, STAND]);
  });

  it("stands up between two bent poses, as a person would", () => {
    expect(path(QUAD, CALF, false)).toEqual([QUAD, STAND, CALF]);
  });

  it("stands up to turn round, then goes down again into the same pose", () => {
    expect(path(QUAD, QUAD, true)).toEqual([QUAD, STAND, QUAD]);
  });

  it("stays put when nothing changes", () => {
    expect(path(QUAD, QUAD, false)).toEqual([QUAD]);
  });

  it("turns every joint the short way at each step of a path", () => {
    const angles = turns("torso", [
      { ...STAND, torso: 170 },
      { ...STAND, torso: -170 },
    ]);
    expect(angles).toEqual([170, 190]);
    for (const segment of ["thighNear", "shinNear", "footNear"] as const) {
      const along = turns(segment, path(QUAD, CALF, false));
      for (let i = 1; i < along.length; i += 1) {
        expect(Math.abs(along[i] - along[i - 1])).toBeLessThanOrEqual(180);
      }
    }
  });
});

describe("the figure on screen", () => {
  it("breathes while held, moves on, turns round, and stays hidden from a screen reader", async () => {
    const { rerender } = await render(
      <Figure
        pose={QUAD}
        breath={EXERCISES[0].breath}
        breathing
        height={300}
        testID="f"
      />,
    );
    await act(() => jest.advanceTimersByTimeAsync(BREATH_MS * 2));
    await rerender(<Figure pose={CALF} height={300} mirrored testID="f" />);
    await act(() => jest.advanceTimersByTimeAsync(POSE_MS * 2));
    expect(screen.queryByTestId("f")).toBeNull();
    expect(screen.getByTestId("f", { includeHiddenElements: true })).toBeTruthy();
  });

  it("gives no joint a frame of no size at (0, 0), which iOS would misplace when reused", async () => {
    await render(<Figure pose={CHILD} height={300} testID="f" />);
    await act(() => jest.advanceTimersByTimeAsync(POSE_MS * 2));
    const figure = screen.getByTestId("f", { includeHiddenElements: true });
    type Host = { props: { style?: unknown }; children: readonly (Host | string)[] };
    const frames: Host[] = [];
    const walk = (node: Host | string) => {
      if (typeof node === "string") {
        return;
      }
      frames.push(node);
      node.children.forEach(walk);
    };
    (figure as unknown as Host).children.forEach(walk);
    expect(frames.length).toBeGreaterThan(20);
    for (const frame of frames) {
      const { width, height } = StyleSheet.flatten(frame.props.style as object) as {
        width?: number;
        height?: number;
      };
      expect(width).toBeGreaterThan(0);
      expect(height).toBeGreaterThan(0);
    }
  });

  it("takes each pose at once with «Reduce Motion» on", async () => {
    jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockResolvedValue(true);
    const { rerender } = await render(
      <Figure
        pose={QUAD}
        breath={EXERCISES[0].breath}
        breathing
        height={300}
        testID="f"
      />,
    );
    await act(() => jest.advanceTimersByTimeAsync(0));
    await rerender(<Figure pose={CALF} height={300} mirrored testID="f" />);
    expect(screen.getByTestId("f", { includeHiddenElements: true })).toBeTruthy();
  });
});
