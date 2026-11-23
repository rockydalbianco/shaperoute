import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import { color } from "../theme/tokens";
import { forgetIntroSeen, INTRO_FILE, introVersion } from "./introSeen";
import {
  INTRO_MS,
  INTRO_SHORT_MS,
  INTRO_SHORT_SHOWN_MS,
  INTRO_SHORT_TOTAL_MS,
  INTRO_SHOWN_MS,
  INTRO_SKIP_FADE_MS,
  INTRO_TOTAL_MS,
  LaunchIntro,
  penProgress,
} from "./LaunchIntro";
import { Root } from "./Root";

jest.mock("../../App", () => {
  const { Text } = jest.requireActual("react-native");
  return { __esModule: true, default: () => <Text>The app</Text> };
});

// The phone's documents folder, in memory: what is written stays there for
// the next read, as after closing the app.
jest.mock("expo-file-system", () => {
  const files = new Map<string, string>();
  class File {
    uri: string;
    constructor(directory: { uri: string }, name: string) {
      this.uri = `${directory.uri}${name}`;
    }
    get exists(): boolean {
      return files.has(this.uri);
    }
    create(): void {
      files.set(this.uri, "");
    }
    write(text: string): void {
      files.set(this.uri, text);
    }
    textSync(): string {
      return files.get(this.uri) ?? "";
    }
  }
  const Paths = {
    document: { uri: "file:///documents/" },
    cache: { uri: "file:///cache/" },
  };
  return { File, Paths, files };
});

const disk = jest.requireMock<{ files: Map<string, string> }>("expo-file-system");
const INTRO_URI = `file:///documents/${INTRO_FILE}`;

beforeEach(() => {
  jest.useFakeTimers();
  disk.files.clear();
  forgetIntroSeen();
});
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
    expect(screen.getByLabelText("MuW")).toBeTruthy();
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

describe("the short animation", () => {
  it("lasts a second, with the pen off at once", () => {
    expect(INTRO_SHORT_MS.wait).toBe(0);
    expect(INTRO_SHORT_TOTAL_MS).toBe(1000);
    expect(INTRO_SHORT_TOTAL_MS).toBe(
      INTRO_SHORT_MS.draw + INTRO_SHORT_MS.hold + INTRO_SHORT_MS.fade,
    );
  });

  it("is over only after all its steps, and long before the whole one", async () => {
    const onDone = jest.fn();
    await render(<LaunchIntro short onDone={onDone} />);
    await wait(INTRO_SHORT_SHOWN_MS - 1);
    expect(onDone).not.toHaveBeenCalled();
    await wait(INTRO_SHORT_MS.fade + 100);
    expect(onDone).toHaveBeenCalledTimes(1);
    await wait(INTRO_TOTAL_MS);
    expect(onDone).toHaveBeenCalledTimes(1);
  });
});

describe("a touch on the animation", () => {
  it("closes the whole one from where it is, with a short fade", async () => {
    const onDone = jest.fn();
    await render(<LaunchIntro onDone={onDone} />);
    await wait(500);
    await fireEvent(screen.getByTestId("launch-intro"), "responderGrant");
    expect(onDone).not.toHaveBeenCalled();
    await wait(INTRO_SKIP_FADE_MS + 100);
    expect(onDone).toHaveBeenCalledTimes(1);
    // Nothing of the animation that was running comes after it.
    await wait(INTRO_TOTAL_MS);
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it("closes the short one too", async () => {
    const onDone = jest.fn();
    await render(<LaunchIntro short onDone={onDone} />);
    await wait(200);
    await fireEvent(screen.getByTestId("launch-intro"), "responderGrant");
    await wait(INTRO_SKIP_FADE_MS + 100);
    expect(onDone).toHaveBeenCalledTimes(1);
    await wait(INTRO_SHORT_TOTAL_MS);
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it("closes it while the finished heart stays", async () => {
    const onDone = jest.fn();
    await render(<LaunchIntro onDone={onDone} />);
    await wait(INTRO_MS.wait + INTRO_MS.draw + 100);
    await fireEvent(screen.getByTestId("launch-intro"), "responderGrant");
    await wait(INTRO_SKIP_FADE_MS + 100);
    expect(onDone).toHaveBeenCalledTimes(1);
    await wait(INTRO_TOTAL_MS);
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it("counts once, however many there are", async () => {
    const onDone = jest.fn();
    await render(<LaunchIntro onDone={onDone} />);
    await wait(500);
    const cover = screen.getByTestId("launch-intro");
    await fireEvent(cover, "responderGrant");
    await wait(100);
    await fireEvent(cover, "responderGrant");
    await fireEvent(cover, "accessibilityTap");
    await wait(INTRO_TOTAL_MS);
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it("is the screen reader's double tap as well", async () => {
    const onDone = jest.fn();
    await render(<LaunchIntro onDone={onDone} />);
    await wait(500);
    await fireEvent(screen.getByTestId("launch-intro"), "accessibilityTap");
    await wait(INTRO_SKIP_FADE_MS + 100);
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it("is taken by the animation, not by the app under it", async () => {
    await render(<LaunchIntro onDone={jest.fn()} />);
    const cover = screen.getByTestId("launch-intro");
    expect(cover.props.onStartShouldSetResponder()).toBe(true);
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

  it("shows the whole animation at the first opening, the short one from the next", async () => {
    const first = await render(<Root />);
    // Still there when the short one would be over.
    await wait(INTRO_SHORT_TOTAL_MS + 100);
    expect(screen.getByTestId("launch-intro")).toBeTruthy();
    expect(disk.files.has(INTRO_URI)).toBe(false);
    await wait(INTRO_TOTAL_MS);
    expect(screen.queryByTestId("launch-intro")).toBeNull();
    expect(JSON.parse(disk.files.get(INTRO_URI) ?? "")).toEqual({
      version: introVersion(),
    });
    await first.unmount();

    // The app closed and opened again.
    forgetIntroSeen();
    await render(<Root />);
    expect(screen.getByText("The app")).toBeTruthy();
    await wait(INTRO_SHORT_SHOWN_MS - 1);
    expect(screen.getByTestId("launch-intro")).toBeTruthy();
    await wait(INTRO_SHORT_MS.fade + 100);
    expect(screen.queryByTestId("launch-intro")).toBeNull();
    expect(screen.getByText("The app")).toBeTruthy();
  });

  it("shows the whole one once more after a new version of the app", async () => {
    disk.files.set(INTRO_URI, JSON.stringify({ version: "0.0.1-older" }));
    await render(<Root />);
    await wait(INTRO_SHORT_TOTAL_MS + 100);
    expect(screen.getByTestId("launch-intro")).toBeTruthy();
    await wait(INTRO_TOTAL_MS);
    expect(JSON.parse(disk.files.get(INTRO_URI) ?? "")).toEqual({
      version: introVersion(),
    });
  });

  it("counts the whole one as seen when a touch closed it", async () => {
    const first = await render(<Root />);
    await wait(500);
    await fireEvent(screen.getByTestId("launch-intro"), "responderGrant");
    await wait(INTRO_SKIP_FADE_MS + 100);
    expect(screen.queryByTestId("launch-intro")).toBeNull();
    expect(disk.files.has(INTRO_URI)).toBe(true);
    await first.unmount();

    forgetIntroSeen();
    await render(<Root />);
    await wait(INTRO_SHORT_TOTAL_MS + 100);
    expect(screen.queryByTestId("launch-intro")).toBeNull();
  });
});
