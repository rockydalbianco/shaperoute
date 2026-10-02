import { act, render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import { color } from "../theme/tokens";
import {
  INTRO_MS,
  INTRO_SHOWN_MS,
  INTRO_TOTAL_MS,
  LaunchIntro,
  penProgress,
} from "./LaunchIntro";
import { Root } from "./Root";

jest.mock("../../App", () => {
  const { Text } = jest.requireActual("react-native");
  return { __esModule: true, default: () => <Text>The app</Text> };
});

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

function wait(ms: number) {
  return act(() => jest.advanceTimersByTimeAsync(ms));
}

describe("the launch animation", () => {
  it("shows the heart on yellow for at least two seconds", () => {
    expect(INTRO_SHOWN_MS).toBeGreaterThanOrEqual(2000);
    expect(INTRO_TOTAL_MS).toBe(
      INTRO_MS.wait + INTRO_MS.draw + INTRO_MS.hold + INTRO_MS.fade,
    );
  });

  it("keeps the pen still for the wait, then draws to the end without going back", () => {
    const whole = INTRO_MS.wait + INTRO_MS.draw;
    expect(penProgress(0)).toBe(0);
    expect(penProgress(INTRO_MS.wait / whole)).toBe(0);
    expect(penProgress(1)).toBe(1);
    // Half-way through the drawing, half the line.
    expect(penProgress((INTRO_MS.wait + INTRO_MS.draw / 2) / whole)).toBeCloseTo(
      0.5,
      6,
    );
    let before = 0;
    for (let step = 0; step <= 100; step += 1) {
      const now = penProgress(step / 100);
      expect(now).toBeGreaterThanOrEqual(before);
      before = now;
    }
  });

  it("is over only after all its steps", async () => {
    const onDone = jest.fn();
    await render(<LaunchIntro onDone={onDone} />);
    await wait(INTRO_SHOWN_MS - 1);
    expect(onDone).not.toHaveBeenCalled();
    await wait(INTRO_MS.fade + 100);
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it("is yellow from its first frame: no black after a yellow launch screen", async () => {
    await render(<LaunchIntro onDone={jest.fn()} />);
    const cover = StyleSheet.flatten(screen.getByTestId("launch-intro").props.style);
    expect(cover.backgroundColor).toBe(color.accent);
  });

  it("says the app's name to a screen reader, once", async () => {
    await render(<LaunchIntro onDone={jest.fn()} />);
    expect(screen.getByLabelText("Sgrava")).toBeTruthy();
    expect(screen.getAllByRole("image")).toHaveLength(1);
  });

  it("does not call back when it is taken away half-way", async () => {
    const onDone = jest.fn();
    const { unmount } = await render(<LaunchIntro onDone={onDone} />);
    await wait(1000);
    await unmount();
    await wait(INTRO_TOTAL_MS);
    expect(onDone).not.toHaveBeenCalled();
  });
});

describe("Root", () => {
  it("starts the app under the animation, then leaves it alone", async () => {
    await render(<Root />);
    // The app is there from the first frame: it loads while the heart is drawn.
    expect(screen.getByText("The app")).toBeTruthy();
    expect(screen.getByTestId("launch-intro")).toBeTruthy();
    await wait(INTRO_SHOWN_MS - 1);
    expect(screen.getByTestId("launch-intro")).toBeTruthy();
    await wait(INTRO_MS.fade + 100);
    expect(screen.queryByTestId("launch-intro")).toBeNull();
    expect(screen.getByText("The app")).toBeTruthy();
  });
});
