import { act, fireEvent, render, screen } from "@testing-library/react-native";
import * as Sharing from "expo-sharing";
import { View } from "react-native";

import { VIDEO_SILENCE_MS } from "../share/videoFile";
import type { VideoPageMessage } from "../share/videoPage";
import type { VideoScene } from "../share/videoScene";
import { color } from "../theme/tokens";
import { category, compose } from "./compose";
import { type RoutineVideo, routineVideoScene } from "./routineVideo";
import { useRoutineVideo } from "./RoutineVideoButton";

jest.mock("expo-file-system");
jest.mock("react-native-webview");
jest.mock("expo-sharing", () => ({
  isAvailableAsync: jest.fn(async () => true),
  shareAsync: jest.fn(async () => {}),
}));

const { written } =
  jest.requireMock<typeof import("../../__mocks__/expo-file-system")>(
    "expo-file-system",
  );
const { injectJavaScript: inject } =
  jest.requireMock<typeof import("../../__mocks__/react-native-webview")>(
    "react-native-webview",
  );
const share = jest.mocked(Sharing.shareAsync);
const available = jest.mocked(Sharing.isAvailableAsync);

const NECK = category("neck");

function routineOf(minutes: number): RoutineVideo {
  const routine = compose(NECK, { minutes, level: "gentle", where: "any" });
  return {
    title: "Neck",
    minutes,
    exercises: routine.exercises,
    tint: color.stretch.body,
  };
}

function Page({ routine }: { routine: RoutineVideo }) {
  const video = useRoutineVideo(routine);
  return (
    <View>
      {video.layer}
      {video.pill}
    </View>
  );
}

function base64(bytes: number[]): string {
  return Buffer.from(bytes).toString("base64");
}

/** What the hidden page would say. */
async function page(message: VideoPageMessage) {
  await fireEvent(
    screen.getByTestId("run-video", { includeHiddenElements: true }),
    "message",
    { nativeEvent: { data: JSON.stringify(message) } },
  );
}

const hidden = () => screen.queryByTestId("run-video", { includeHiddenElements: true });

async function press() {
  await fireEvent.press(screen.getByTestId("stretch-video"));
}

/** The scene the page was asked to make. */
function asked(): VideoScene {
  const call = inject.mock.calls[inject.mock.calls.length - 1][0];
  const json = call.slice("window.muwVideo.make(".length, call.lastIndexOf("); true;"));
  return JSON.parse(json) as VideoScene;
}

/** The page's answers for a whole video of two pictures. */
async function made() {
  await page({ type: "config", avcC: base64([1, 0x42, 0xe0, 0x28, 0xff]) });
  await page({
    type: "chunks",
    list: [
      { key: true, time: 0, data: base64([0, 1, 2]) },
      { key: false, time: 33_333, data: base64([1, 1, 2]) },
    ],
  });
  await page({ type: "done", frames: 2, ms: {} });
}

beforeEach(() => {
  jest.useFakeTimers();
  written.clear();
  inject.mockClear();
  share.mockClear();
  available.mockClear();
  available.mockResolvedValue(true);
});
afterEach(() => {
  jest.useRealTimers();
});

describe("«Export video» of a stretching routine", () => {
  it("mounts nothing hidden until it is asked", async () => {
    await render(<Page routine={routineOf(5)} />);
    expect(screen.getByRole("button", { name: "Export video" })).toBeOnTheScreen();
    expect(hidden()).toBeNull();
  });

  it("hands the routine's scene to the run's page as soon as it is ready", async () => {
    const routine = routineOf(5);
    await render(<Page routine={routine} />);
    await press();
    expect(hidden()).not.toBeNull();
    expect(inject).not.toHaveBeenCalled();
    await page({ type: "ready", codec: "avc1.42e028" });
    // No map and no animal to wait for: the video is asked at once.
    expect(inject).toHaveBeenCalledTimes(1);
    expect(asked()).toEqual(JSON.parse(JSON.stringify(routineVideoScene(routine))));
  });

  it("says how far it is, and cannot be asked twice", async () => {
    const routine = routineOf(5);
    await render(<Page routine={routine} />);
    await press();
    await page({ type: "ready", codec: "avc1.42e028" });
    const frames = routineVideoScene(routine).frames.length;
    await page({ type: "progress", frames: Math.round(frames / 2) });
    const button = screen.getByTestId("stretch-video");
    expect(button).toHaveTextContent("Making the video… 50%");
    expect(button.props.accessibilityState).toEqual({ busy: true, disabled: true });
    await press();
    expect(available).toHaveBeenCalledTimes(1);
  });

  it("writes the video to its own file and opens the share sheet", async () => {
    await render(<Page routine={routineOf(5)} />);
    await press();
    await page({ type: "ready", codec: "avc1.42e028" });
    await made();
    await act(async () => {});
    expect(written.has("file:///cache/MuW-stretching.mp4")).toBe(true);
    expect(share).toHaveBeenCalledWith(
      "file:///cache/MuW-stretching.mp4",
      expect.objectContaining({ mimeType: "video/mp4" }),
    );
    // Back as it was, ready for another.
    expect(hidden()).toBeNull();
    expect(screen.getByRole("button", { name: "Export video" })).toBeOnTheScreen();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("makes the routine as it is chosen when asked", async () => {
    const view = await render(<Page routine={routineOf(5)} />);
    const longer = routineOf(10);
    await view.rerender(<Page routine={longer} />);
    await press();
    await page({ type: "ready", codec: "avc1.42e028" });
    expect(asked().frames).toHaveLength(routineVideoScene(longer).frames.length);
  });

  it("says so when the phone cannot make the video", async () => {
    await render(<Page routine={routineOf(5)} />);
    await press();
    await page({ type: "ready", codec: null });
    expect(screen.getByRole("alert")).toHaveTextContent(
      "This phone cannot make the video.",
    );
    expect(hidden()).toBeNull();
    expect(share).not.toHaveBeenCalled();
  });

  it("says so when the page fails or goes quiet, and can be tried again", async () => {
    await render(<Page routine={routineOf(5)} />);
    await press();
    await page({ type: "ready", codec: "avc1.42e028" });
    await page({ type: "failed", error: "EncodingError" });
    expect(screen.getByRole("alert")).toHaveTextContent(
      "The video could not be made. Try again.",
    );
    await press();
    expect(screen.queryByRole("alert")).toBeNull();
    await act(async () => {
      jest.advanceTimersByTime(VIDEO_SILENCE_MS + 1);
    });
    expect(screen.getByRole("alert")).toHaveTextContent(
      "The video could not be made. Try again.",
    );
    expect(hidden()).toBeNull();
  });

  it("says so, and makes nothing, on a phone with no share sheet", async () => {
    available.mockResolvedValue(false);
    await render(<Page routine={routineOf(5)} />);
    await press();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "This phone cannot open the share sheet.",
    );
    expect(hidden()).toBeNull();
  });
});
