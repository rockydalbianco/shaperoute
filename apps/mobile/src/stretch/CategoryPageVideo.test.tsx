import { fireEvent, render, screen } from "@testing-library/react-native";

import type { VideoPageMessage } from "../share/videoPage";
import type { VideoScene } from "../share/videoScene";
import { color } from "../theme/tokens";
import { CategoryPage } from "./CategoryPage";
import { category, compose } from "./compose";
import { routineVideoScene } from "./routineVideo";
import { resetChoicesForTests } from "./stretchChoices";

jest.mock("expo-file-system");
jest.mock("react-native-webview");
jest.mock("expo-sharing", () => ({
  isAvailableAsync: jest.fn(async () => true),
  shareAsync: jest.fn(async () => {}),
}));
jest.mock("../stretchSport/StretchSessionHost", () => ({
  startCategorySession: jest.fn(),
}));

const { injectJavaScript: inject } =
  jest.requireMock<typeof import("../../__mocks__/react-native-webview")>(
    "react-native-webview",
  );

async function page(message: VideoPageMessage) {
  await fireEvent(
    screen.getByTestId("run-video", { includeHiddenElements: true }),
    "message",
    { nativeEvent: { data: JSON.stringify(message) } },
  );
}

/** The scene the hidden page was asked to make. */
function asked(): VideoScene {
  const call = inject.mock.calls[inject.mock.calls.length - 1][0];
  const json = call.slice("window.muwVideo.make(".length, call.lastIndexOf("); true;"));
  return JSON.parse(json) as VideoScene;
}

beforeEach(() => {
  jest.useFakeTimers();
  resetChoicesForTests();
  inject.mockClear();
});
afterEach(() => {
  jest.useRealTimers();
});

describe("«Export video» on a stretching category's page", () => {
  it("is at the top, next to «Close», with nothing hidden under the page yet", async () => {
    await render(<CategoryPage categoryKey="neck" onClose={() => {}} />);
    expect(screen.getByRole("button", { name: "Export video" })).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Close" })).toBeOnTheScreen();
    expect(
      screen.queryByTestId("run-video", { includeHiddenElements: true }),
    ).toBeNull();
  });

  it("makes the video of the routine as it is chosen on the page", async () => {
    await render(<CategoryPage categoryKey="running_after" onClose={() => {}} />);
    await fireEvent.press(screen.getByTestId("stretch-minutes-10"));
    await fireEvent.press(screen.getByTestId("stretch-video"));
    await page({ type: "ready", codec: "avc1.42e028" });
    const of = category("running_after");
    const routine = compose(of, { minutes: 10, level: "gentle", where: "any" });
    expect(asked()).toEqual(
      JSON.parse(
        JSON.stringify(
          routineVideoScene({
            title: "Running · After",
            minutes: 10,
            exercises: routine.exercises,
            tint: color.stretch.sports,
          }),
        ),
      ),
    );
  });
});
