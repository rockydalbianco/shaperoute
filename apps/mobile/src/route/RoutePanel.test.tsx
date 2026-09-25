import type { RouteRequest } from "@shaperoute/shared-types";
import { act, fireEvent, render, screen } from "@testing-library/react-native";

import { SLOW_TEXT } from "./LoadingBar";
import { RouteChoice, RouteOutcome } from "./RoutePanel";
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
