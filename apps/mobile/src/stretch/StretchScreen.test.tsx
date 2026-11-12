import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { AccessibilityInfo } from "react-native";

import type { Exercise } from "./exercises";
import { nearest } from "./Figure";
import { QUAD, STAND } from "./poses";
import { clockLabel, READY_S, StretchScreen, SWITCH_S, TICK_MS } from "./StretchScreen";

jest.mock("expo-keep-awake", () => ({
  activateKeepAwakeAsync: jest.fn(() => Promise.resolve()),
  deactivateKeepAwake: jest.fn(() => Promise.resolve()),
}));

/** Every sound played, in order. */
const mockPlayed: string[] = [];
jest.mock("./chime", () => ({
  chime: () => mockPlayed.push("ding"),
  tick: () => mockPlayed.push("tick"),
}));

/** The sounds played so far. */
function sounds(): string[] {
  return [...mockPlayed];
}

beforeEach(() => {
  jest.useFakeTimers();
  mockPlayed.length = 0;
  jest
    .spyOn(AccessibilityInfo, "announceForAccessibility")
    .mockImplementation(() => {});
});
afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

function wait(ms: number) {
  return act(() => jest.advanceTimersByTimeAsync(ms));
}

/** A tap, and React's work after it. */
function press(name: string) {
  return act(async () => {
    fireEvent.press(screen.getByRole("button", { name }));
  });
}

/** Two short exercises: one on each side, one on both at once. */
const TWO: readonly Exercise[] = [
  {
    key: "a",
    name: "Quad stretch",
    howTo: "Pull the heel.",
    sides: true,
    seconds: 3,
    pose: QUAD,
    breath: { thighNear: -8 },
  },
  {
    key: "b",
    name: "Calf stretch",
    howTo: "Step back.",
    sides: false,
    seconds: 2,
    pose: STAND,
  },
];

describe("the stretching after a run", () => {
  it("writes the seconds left as a clock", () => {
    expect(clockLabel(20)).toBe("0:20");
    expect(clockLabel(65)).toBe("1:05");
    expect(clockLabel(0)).toBe("0:00");
    expect(clockLabel(-3)).toBe("0:00");
  });

  it("turns a joint the short way round", () => {
    expect(nearest(0, 350)).toBe(-10);
    expect(nearest(170, -170)).toBe(190);
    expect(nearest(10, 40)).toBe(40);
  });

  it("starts with «Get ready» on the first exercise, its line and the right side", async () => {
    await render(<StretchScreen onLeave={jest.fn()} exercises={TWO} />);
    expect(screen.getByText("1 of 2")).toBeTruthy();
    expect(screen.getByRole("header", { name: "Quad stretch" })).toBeTruthy();
    expect(screen.getByText("Pull the heel.")).toBeTruthy();
    expect(screen.getByText("Right side")).toBeTruthy();
    expect(screen.getByText("Get ready")).toBeTruthy();
    expect(screen.getByText(clockLabel(READY_S))).toBeTruthy();
    expect(screen.getByText("Stop if it hurts.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Skip" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "End" })).toBeTruthy();
    // Drawn for the eyes only: the name and the line say what it does.
    expect(screen.queryByTestId("stretch-figure")).toBeNull();
    expect(
      screen.getByTestId("stretch-figure", { includeHiddenElements: true }),
    ).toBeTruthy();
    expect(sounds()).toEqual([]);
  });

  it("holds after «Get ready», ticks the last seconds, rings, switches sides and goes on", async () => {
    const onLeave = jest.fn();
    await render(<StretchScreen onLeave={onLeave} exercises={TWO} />);
    await wait(TICK_MS * READY_S);
    // In the pose: the hold's time starts with a tick.
    expect(screen.queryByText("Get ready")).toBeNull();
    expect(screen.getByText("0:03")).toBeTruthy();
    expect(sounds()).toEqual(["tick"]);
    await wait(TICK_MS * 2);
    expect(screen.getByText("0:01")).toBeTruthy();
    expect(sounds()).toEqual(["tick", "tick", "tick"]);
    await wait(TICK_MS);
    // The right side is over: the bell, then a shorter wait to switch.
    expect(sounds()).toEqual(["tick", "tick", "tick", "ding"]);
    expect(screen.getByText("Left side")).toBeTruthy();
    expect(screen.getByText("Switch sides")).toBeTruthy();
    expect(screen.getByText(clockLabel(SWITCH_S))).toBeTruthy();
    expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith(
      "Switch sides",
    );
    await wait(TICK_MS * SWITCH_S);
    // The last side of this exercise: the next one is named.
    expect(screen.getByText("0:03")).toBeTruthy();
    expect(screen.getByText("Next: Calf stretch")).toBeTruthy();
    await wait(TICK_MS * 3);
    // The second exercise, on both sides at once: no side to name.
    expect(screen.getByText("2 of 2")).toBeTruthy();
    expect(screen.getByText("Get ready")).toBeTruthy();
    expect(screen.queryByText("Left side")).toBeNull();
    expect(screen.queryByText("Right side")).toBeNull();
    expect(screen.queryByText("Next: Calf stretch")).toBeNull();
    expect(screen.getByRole("button", { name: "Done" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Skip" })).toBeNull();
    expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith(
      "Calf stretch",
    );
    await wait(TICK_MS * (READY_S + 1));
    expect(onLeave).not.toHaveBeenCalled();
    await wait(TICK_MS);
    expect(sounds().filter((s) => s === "ding")).toHaveLength(3);
    expect(onLeave).toHaveBeenCalledTimes(1);
  });

  it("holds the time on «Pause» and goes on with «Resume»", async () => {
    await render(<StretchScreen onLeave={jest.fn()} exercises={TWO} />);
    await wait(TICK_MS * READY_S);
    await press("Pause");
    await wait(TICK_MS * 5);
    expect(screen.getByText("0:03")).toBeTruthy();
    expect(screen.getByText("Right side")).toBeTruthy();
    await press("Resume");
    await wait(TICK_MS);
    expect(screen.getByText("0:02")).toBeTruthy();
  });

  it("skips to the next exercise's «Get ready» on «Skip», both sides at once", async () => {
    const onLeave = jest.fn();
    await render(<StretchScreen onLeave={onLeave} exercises={TWO} />);
    await wait(TICK_MS * (READY_S + 1));
    await press("Skip");
    expect(screen.getByText("2 of 2")).toBeTruthy();
    expect(screen.getByText("Get ready")).toBeTruthy();
    expect(screen.getByText(clockLabel(READY_S))).toBeTruthy();
    expect(onLeave).not.toHaveBeenCalled();
  });

  it("leaves at once on «End», from any exercise", async () => {
    const onLeave = jest.fn();
    await render(<StretchScreen onLeave={onLeave} exercises={TWO} />);
    await wait(TICK_MS);
    await press("End");
    expect(onLeave).toHaveBeenCalledTimes(1);
  });

  it("does not come back once taken away", async () => {
    const onLeave = jest.fn();
    const { unmount } = await render(
      <StretchScreen onLeave={onLeave} exercises={TWO} />,
    );
    await wait(TICK_MS);
    await unmount();
    await wait(TICK_MS * 30);
    expect(onLeave).not.toHaveBeenCalled();
  });

  it("says the time left to a screen reader every ten seconds of a hold", async () => {
    const long: readonly Exercise[] = [{ ...TWO[1], seconds: 25 }];
    await render(<StretchScreen onLeave={jest.fn()} exercises={long} />);
    await wait(TICK_MS * (READY_S + 5));
    expect(screen.getByRole("timer", { name: "20 seconds left" })).toBeTruthy();
    expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith(
      "20 seconds left",
    );
    expect(AccessibilityInfo.announceForAccessibility).not.toHaveBeenCalledWith(
      "25 seconds left",
    );
  });
});
