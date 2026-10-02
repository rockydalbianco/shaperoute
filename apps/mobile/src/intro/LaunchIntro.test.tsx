import { act, render, screen } from "@testing-library/react-native";

import { INTRO_MS, INTRO_SHOWN_MS, INTRO_TOTAL_MS, LaunchIntro } from "./LaunchIntro";
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
      INTRO_MS.flood + INTRO_MS.draw + INTRO_MS.hold + INTRO_MS.fade,
    );
  });

  it("is over only after all its steps", async () => {
    const onDone = jest.fn();
    await render(<LaunchIntro onDone={onDone} />);
    await wait(INTRO_SHOWN_MS - 1);
    expect(onDone).not.toHaveBeenCalled();
    await wait(INTRO_MS.fade + 100);
    expect(onDone).toHaveBeenCalledTimes(1);
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
