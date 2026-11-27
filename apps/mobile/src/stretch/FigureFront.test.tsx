import { act, render, screen } from "@testing-library/react-native";
import { AccessibilityInfo, Animated, StyleSheet } from "react-native";

import { BREATH_MS, POSE_MS } from "./Figure";
import { FigureFront, frontFlips, frontPath, frontTurns } from "./FigureFront";
import { FRONT_SEGMENTS, FRONT_STAND, type FrontPose, mirrorFront } from "./posesFront";

/** A side bend to the left of the screen, the right arm over the head. */
const BEND: FrontPose = {
  ...FRONT_STAND,
  torso: 160,
  head: 150,
  upperArmRight: 150,
  forearmRight: 140,
};
/** Folded forward between wide legs: the body turned over, the head down. */
const FOLD: FrontPose = {
  ...FRONT_STAND,
  torso: 0,
  head: 0,
  thighLeft: 26,
  shinLeft: 26,
  thighRight: -26,
  shinRight: -26,
};
/** A tilt of the head. */
const TILT: FrontPose = { ...FRONT_STAND, head: 150 };

beforeEach(() => {
  jest.useFakeTimers();
});
afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe("the front figure's moves", () => {
  it("goes straight from standing into a pose, and back up", () => {
    expect(frontPath(FRONT_STAND, BEND)).toEqual([FRONT_STAND, BEND]);
    expect(frontPath(BEND, FRONT_STAND)).toEqual([BEND, FRONT_STAND]);
  });

  it("stands up between two poses, and to do the other side", () => {
    expect(frontPath(BEND, TILT)).toEqual([BEND, FRONT_STAND, TILT]);
    const other = mirrorFront(BEND);
    expect(frontPath(BEND, other)).toEqual([BEND, FRONT_STAND, other]);
  });

  it("stays put when nothing changes", () => {
    expect(frontPath(BEND, BEND)).toEqual([BEND]);
  });

  it("turns every joint the short way at each step of a path", () => {
    const other = mirrorFront(BEND);
    for (const segment of FRONT_SEGMENTS) {
      const along = frontTurns(segment, frontPath(BEND, other));
      expect(along).toHaveLength(3);
      for (let i = 1; i < along.length; i += 1) {
        expect(Math.abs(along[i] - along[i - 1])).toBeLessThanOrEqual(180);
      }
    }
    // A limb's turn is counted from the one it hangs from.
    expect(frontTurns("head", [BEND])).toEqual([-10]);
    expect(frontTurns("torso", [BEND])).toEqual([160]);
  });
});

describe("a pose with the body turned over", () => {
  it("is told from one that only leans", () => {
    expect(frontFlips(frontPath(FRONT_STAND, FOLD))).toBe(true);
    expect(frontFlips(frontPath(FOLD, FRONT_STAND))).toBe(true);
    // Through standing, on the way to another pose.
    expect(frontFlips(frontPath(FOLD, BEND))).toBe(true);
    expect(frontFlips(frontPath(FRONT_STAND, BEND))).toBe(false);
    expect(frontFlips(frontPath(BEND, mirrorFront(BEND)))).toBe(false);
    expect(frontFlips([FOLD])).toBe(false);
  });

  it("fades out and back in instead of swinging the body round to a side", async () => {
    const timing = jest.spyOn(Animated, "timing");
    await render(<FigureFront pose={FOLD} height={300} testID="f" />);
    const durations = () => timing.mock.calls.map(([, config]) => config.duration);
    // Two halves of a pose's time, and no turn through the poses.
    expect(durations().filter((duration) => duration === POSE_MS / 2)).toHaveLength(2);
    expect(durations()).not.toContain(POSE_MS);
    // Out, then back in.
    expect(
      timing.mock.calls
        .filter(([, config]) => config.duration === POSE_MS / 2)
        .map(([, config]) => config.toValue),
    ).toEqual([0, 1]);
    await act(() => jest.advanceTimersByTimeAsync(POSE_MS * 2));
    expect(screen.getByTestId("f", { includeHiddenElements: true })).toBeTruthy();
  });

  it("turns as before into a pose that only leans", async () => {
    const timing = jest.spyOn(Animated, "timing");
    await render(<FigureFront pose={BEND} height={300} testID="f" />);
    expect(timing.mock.calls.map(([, config]) => config.duration)).toContain(POSE_MS);
  });
});

describe("the front figure on screen", () => {
  it("breathes while held, does the other side, and stays hidden from a screen reader", async () => {
    const { rerender } = await render(
      <FigureFront
        pose={BEND}
        breath={{ torso: -6 }}
        breathing
        height={300}
        testID="f"
      />,
    );
    await act(() => jest.advanceTimersByTimeAsync(BREATH_MS * 2));
    await rerender(
      <FigureFront
        pose={BEND}
        breath={{ torso: -6 }}
        height={300}
        mirrored
        testID="f"
      />,
    );
    await act(() => jest.advanceTimersByTimeAsync(POSE_MS * 3));
    expect(screen.queryByTestId("f")).toBeNull();
    expect(screen.getByTestId("f", { includeHiddenElements: true })).toBeTruthy();
  });

  it("gives no joint a frame of no size at (0, 0), which iOS would misplace when reused", async () => {
    await render(<FigureFront pose={BEND} height={300} testID="f" />);
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
    // Ten segments, each a joint with its bar; the shoulders and the hips.
    expect(frames.length).toBeGreaterThan(30);
    for (const frame of frames) {
      const { width, height } = StyleSheet.flatten(frame.props.style as object) as {
        width?: number;
        height?: number;
      };
      expect(width).toBeGreaterThan(0);
      expect(height).toBeGreaterThan(0);
    }
  });

  it("does a movement at its own pace: one go, there and back, in `breathMs`", async () => {
    const timing = jest.spyOn(Animated, "timing");
    await render(
      <FigureFront
        pose={TILT}
        breath={{ head: 60 }}
        breathing
        breathMs={1200}
        height={300}
        testID="f"
      />,
    );
    await act(() => jest.advanceTimersByTimeAsync(0));
    const halves = timing.mock.calls
      .map(([, config]) => config.duration)
      .filter((duration) => duration === 600);
    expect(halves).toHaveLength(2);
    expect(timing.mock.calls.map(([, config]) => config.duration)).not.toContain(
      BREATH_MS / 2,
    );
  });

  it("takes each pose at once and stays still with «Reduce Motion» on", async () => {
    jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockResolvedValue(true);
    const { rerender } = await render(
      <FigureFront
        pose={BEND}
        breath={{ torso: -6 }}
        breathing
        height={300}
        testID="f"
      />,
    );
    await act(() => jest.advanceTimersByTimeAsync(0));
    await rerender(<FigureFront pose={TILT} height={300} mirrored testID="f" />);
    expect(screen.getByTestId("f", { includeHiddenElements: true })).toBeTruthy();
  });
});
