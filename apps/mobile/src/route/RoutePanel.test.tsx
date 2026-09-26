import type {
  ImageOutline,
  ImageRouteRequest,
  RouteRequest,
} from "@shaperoute/shared-types";
import imageOutline from "@shaperoute/shared-types/fixtures/image-outline.json";
import imageRequest from "@shaperoute/shared-types/fixtures/image-route-request.json";
import { act, fireEvent, render, screen } from "@testing-library/react-native";

import { SLOW_TEXT } from "./LoadingBar";
import { REASON_TEXT } from "./problems";
import { RouteChoice, RouteOutcome } from "./RoutePanel";
import type { ImageState } from "./useImageOutline";
import type { ShapeReadingState } from "./useShapeReading";
import { checkWord } from "./wordInput";

function choice(reading: ShapeReadingState | null) {
  return (
    <RouteChoice
      kind="shape"
      onKind={jest.fn()}
      shapeText="stemma della Ferrari"
      shape={null}
      onShapeText={jest.fn()}
      reading={reading}
      onShapeDone={jest.fn()}
      wordText=""
      onWordText={jest.fn()}
      wordCheck={checkWord("", 5000)}
      distanceText="5"
      distanceM={5000}
      image={{ status: "none" }}
      onChooseImage={jest.fn()}
      onDistanceText={jest.fn()}
    />
  );
}

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

test("while the AI reads the words, a bar under the note", async () => {
  await render(choice({ status: "reading" }));
  expect(screen.getByText("The AI is reading it…")).toBeTruthy();
  expect(screen.getByTestId("reading-loading")).toBeTruthy();
});

test("once read, the bar is gone", async () => {
  await render(choice({ status: "read", shape: "horse" }));
  expect(screen.queryByTestId("reading-loading")).toBeNull();
});

function wordChoice(wordText: string, distanceM: number, onDistanceText = jest.fn()) {
  return (
    <RouteChoice
      kind="word"
      onKind={jest.fn()}
      shapeText="heart"
      shape="heart"
      onShapeText={jest.fn()}
      reading={null}
      onShapeDone={jest.fn()}
      wordText={wordText}
      onWordText={jest.fn()}
      wordCheck={checkWord(wordText, distanceM)}
      distanceText={String(distanceM / 1000)}
      distanceM={distanceM}
      image={{ status: "none" }}
      onChooseImage={jest.fn()}
      onDistanceText={onDistanceText}
    />
  );
}

test("with Word chosen, the word field replaces the shapes", async () => {
  await render(wordChoice("", 5000));
  expect(screen.getByLabelText("Word")).toBeTruthy();
  expect(screen.queryByLabelText("Shape")).toBeNull();
  expect(screen.queryByLabelText("heart")).toBeNull();
  expect(
    screen.getByText("Write a word to draw, with the letters A to Z."),
  ).toBeTruthy();
});

test("a word that can be drawn says the least distance it needs", async () => {
  await render(wordChoice("ciao", 12_000));
  expect(
    screen.getByText("4 letters: at least 12 km. A word takes a few minutes to draw."),
  ).toBeTruthy();
});

test("a distance too short for the word is raised with a tap", async () => {
  const onDistanceText = jest.fn();
  await render(wordChoice("ciao", 5000, onDistanceText));
  expect(
    screen.getByText("“CIAO” needs at least 12 km: 3 km for each letter."),
  ).toBeTruthy();
  await fireEvent.press(screen.getByText("Use 12 km"));
  expect(onDistanceText).toHaveBeenCalledWith("12");
});

function computing(request: RouteRequest) {
  return (
    <RouteOutcome
      view={{ status: "waiting", request, startedAt: 0, phase: "computing" }}
      onCancel={jest.fn()}
      exporting={{ status: "idle" }}
      onExport={jest.fn()}
      onTryDistance={jest.fn()}
      onPickShape={jest.fn()}
      onStart={jest.fn()}
    />
  );
}

test("the bar is given the word, and waits for it longer than for a shape", async () => {
  jest.useFakeTimers();
  try {
    const start: [number, number] = [46.0671, 11.1214];
    await render(
      computing({ start, word: "CIAO", distance_m: 15000, activity: "running" }),
    );
    await act(() => jest.advanceTimersByTimeAsync(100_000));
    expect(screen.getByTestId("loading").props.accessibilityValue.text).toBeUndefined();

    await render(
      computing({ start, shape: "heart", distance_m: 15000, activity: "running" }),
    );
    await act(() => jest.advanceTimersByTimeAsync(100_000));
    expect(screen.getByTestId("loading").props.accessibilityValue.text).toBe(SLOW_TEXT);
  } finally {
    jest.useRealTimers();
  }
});

const PICTURE = { uri: "file:///apple.jpg", width: 800, height: 600 };

function imageChoice(image: ImageState, onChooseImage = jest.fn()) {
  return (
    <RouteChoice
      kind="image"
      onKind={jest.fn()}
      shapeText="heart"
      shape="heart"
      onShapeText={jest.fn()}
      reading={null}
      onShapeDone={jest.fn()}
      wordText=""
      onWordText={jest.fn()}
      wordCheck={checkWord("", 5000)}
      image={image}
      onChooseImage={onChooseImage}
      distanceText="15"
      distanceM={15000}
      onDistanceText={jest.fn()}
    />
  );
}

test("with Image chosen, a picture is chosen or taken", async () => {
  const onChooseImage = jest.fn();
  await render(imageChoice({ status: "none" }, onChooseImage));
  expect(screen.queryByLabelText("Shape")).toBeNull();
  expect(screen.getByText(/One subject on a plain background works best/)).toBeTruthy();
  await fireEvent.press(screen.getByText("Choose picture"));
  await fireEvent.press(screen.getByText("Take photo"));
  expect(onChooseImage.mock.calls).toEqual([["library"], ["camera"]]);
});

test("the traced outline shows before the route, and the picture can be hidden", async () => {
  await render(
    imageChoice({
      status: "traced",
      picture: PICTURE,
      outline: imageOutline as ImageOutline,
    }),
  );
  expect(screen.getByText("Choose another")).toBeTruthy();
  expect(screen.getByText(/The yellow line is what the route will draw/)).toBeTruthy();
  await fireEvent(screen.getByTestId("image-preview"), "layout", {
    nativeEvent: { layout: { width: 300, height: 0 } },
  });
  expect(screen.getAllByTestId("outline-side")).toHaveLength(3);
  expect(screen.getByTestId("preview-picture")).toBeTruthy();
  await fireEvent.press(screen.getByText("Hide the picture"));
  expect(screen.queryByTestId("preview-picture")).toBeNull();
  expect(screen.getByText("Show the picture")).toBeTruthy();
});

test("a refused picture says why in plain words", async () => {
  await render(
    imageChoice({
      status: "failed",
      picture: PICTURE,
      problem: {
        kind: "api_error",
        code: "image_not_usable",
        message: "the background is not uniform",
        reason: "background",
      },
    }),
  );
  expect(screen.getByText(REASON_TEXT.background)).toBeTruthy();
  expect(screen.getByText("the background is not uniform")).toBeTruthy();
  expect(screen.queryByTestId("image-preview")).toBeNull();
});

test("an image route that does not fit offers no shapes", async () => {
  const request = imageRequest as ImageRouteRequest;
  await render(
    <RouteOutcome
      view={{
        status: "failed",
        request,
        problem: { kind: "api_error", code: "shape_not_drawable", message: "no" },
      }}
      onCancel={jest.fn()}
      exporting={{ status: "idle" }}
      onExport={jest.fn()}
      onTryDistance={jest.fn()}
      onPickShape={jest.fn()}
      onStart={jest.fn()}
    />,
  );
  expect(screen.getByText(/This outline does not fit the roads here/)).toBeTruthy();
  expect(screen.queryByText("heart")).toBeNull();
});
