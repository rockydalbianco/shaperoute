import type { LatLon } from "@shaperoute/shared-types";
import { act, fireEvent, render, screen } from "@testing-library/react-native";

import { POST_RESULTS, type PostRun } from "./postRun";
import { FIRST_EDIT, type VideoEdit } from "./videoEdit";
import type { VideoPageMessage } from "./videoPage";
import { PREVIEW_DELAY_MS, VideoPreview } from "./VideoPreview";
import { videoScene } from "./videoScene";

jest.mock("react-native-webview");
jest.mock("./videoCharacter", () => ({
  ...jest.requireActual<typeof import("./videoCharacter")>("./videoCharacter"),
  characterModel: jest.fn(async () => new Uint8Array([1, 2, 3])),
}));

const { injectJavaScript: inject } =
  jest.requireMock<typeof import("../../__mocks__/react-native-webview")>(
    "react-native-webview",
  );

/** A straight line north, a point every 50 m. */
function north(metres: number): LatLon[] {
  return Array.from({ length: metres / 50 + 1 }, (_, i): LatLon => [
    46.07 + (i * 50) / 111_195,
    11.12,
  ]);
}

const RUN: PostRun = {
  key: "run-1",
  title: "Heart in Trento",
  track: north(5200),
  distanceM: 5200,
  durationMs: (28 * 60 + 10) * 1000,
};

const sceneOf = jest.fn((edit: VideoEdit) =>
  videoScene(RUN, POST_RESULTS, [], edit.style, edit),
);

async function page(message: VideoPageMessage) {
  await fireEvent(screen.getByTestId("video-preview-page"), "message", {
    nativeEvent: { data: JSON.stringify(message) },
  });
}

const calls = () => inject.mock.calls.map((call) => call[0]);

beforeEach(() => {
  inject.mockClear();
  sceneOf.mockClear();
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe("VideoPreview (TASK-408 C2c)", () => {
  it("plays the video as it is once its map is ready, not before", async () => {
    await render(<VideoPreview edit={FIRST_EDIT} sceneOf={sceneOf} />);
    expect(screen.getByText("0:00 / 0:12")).toBeOnTheScreen();
    expect(inject).not.toHaveBeenCalled();
    await page({ type: "ready", codec: "avc1.42e028" });
    expect(calls()).toHaveLength(1);
    expect(calls()[0].startsWith("window.muwVideo.prepareMap({")).toBe(true);
    await page({ type: "waiting", ms: 4000 });
    expect(calls()).toHaveLength(1);
    await page({ type: "map", ok: true, why: null, ms: {} });
    expect(calls()[1].startsWith("window.muwVideo.play({")).toBe(true);
    // No music, no file: the preview never makes the video.
    expect(calls().some((call) => call.includes("make("))).toBe(false);
  });

  it("plays at once with no map to wait for", async () => {
    await render(
      <VideoPreview edit={{ ...FIRST_EDIT, style: "2d" }} sceneOf={sceneOf} />,
    );
    await page({ type: "ready", codec: "avc1.42e028" });
    expect(calls()[0].startsWith("window.muwVideo.play({")).toBe(true);
  });

  it("plays without the map when the map does not come", async () => {
    await render(<VideoPreview edit={FIRST_EDIT} sceneOf={sceneOf} />);
    await page({ type: "ready", codec: "avc1.42e028" });
    await page({ type: "map", ok: false, why: "timeout", ms: {} });
    expect(calls()[1].startsWith("window.muwVideo.play({")).toBe(true);
  });

  it("shows the second the page plays", async () => {
    await render(<VideoPreview edit={FIRST_EDIT} sceneOf={sceneOf} />);
    await page({ type: "time", seconds: 6.2 });
    expect(screen.getByText("0:06 / 0:12")).toBeOnTheScreen();
  });

  it("holds the picture on a tap, and goes on with another", async () => {
    await render(<VideoPreview edit={FIRST_EDIT} sceneOf={sceneOf} />);
    await page({ type: "ready", codec: "avc1.42e028" });
    const preview = screen.getByRole("button", { name: "Video preview" });
    expect(preview.props.accessibilityHint).toBe("Pause");
    await fireEvent.press(preview);
    expect(calls()).toContain("window.muwVideo.pause(); true;");
    expect(
      screen.getByRole("button", { name: "Video preview" }).props.accessibilityHint,
    ).toBe("Resume");
    await fireEvent.press(screen.getByRole("button", { name: "Video preview" }));
    expect(calls()).toContain("window.muwVideo.resume(); true;");
  });

  it("takes a choice half a second after it is made, on the same page", async () => {
    const { rerender } = await render(
      <VideoPreview edit={FIRST_EDIT} sceneOf={sceneOf} />,
    );
    await page({ type: "ready", codec: "avc1.42e028" });
    await page({ type: "map", ok: true, why: null, ms: {} });
    inject.mockClear();
    await rerender(
      <VideoPreview edit={{ ...FIRST_EDIT, end: "🎆" }} sceneOf={sceneOf} />,
    );
    expect(inject).not.toHaveBeenCalled();
    await act(async () => {
      jest.advanceTimersByTime(PREVIEW_DELAY_MS);
    });
    const plays = calls().filter((call) => call.startsWith("window.muwVideo.play("));
    expect(plays).toHaveLength(1);
    expect(plays[0]).toContain('"text":"🎆"');
    // The map is the same: not asked again.
    expect(calls().some((call) => call.includes("prepareMap"))).toBe(false);
  });

  it("loads the page again for a new style, with its map, and reads the animal's model", async () => {
    const { rerender } = await render(
      <VideoPreview edit={FIRST_EDIT} sceneOf={sceneOf} />,
    );
    await rerender(
      <VideoPreview
        edit={{ ...FIRST_EDIT, style: "3d", character: "horse" }}
        sceneOf={sceneOf}
      />,
    );
    await act(async () => {
      jest.advanceTimersByTime(PREVIEW_DELAY_MS);
    });
    inject.mockClear();
    await page({ type: "ready", codec: "avc1.42e028" });
    await act(async () => {
      await Promise.resolve();
    });
    expect(calls()[0]).toContain('"terrain":');
    expect(
      calls().some((call) => call.startsWith("window.muwVideo.prepareCharacter(")),
    ).toBe(true);
  });
});
