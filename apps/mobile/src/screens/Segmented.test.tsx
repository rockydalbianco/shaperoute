import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { StyleSheet, type ViewStyle } from "react-native";

import { color, space } from "../theme/tokens";
import { runAnimationsOnJs } from "../ui/animationsOnJs.testing";
import { useReduceMotion } from "../ui/useReduceMotion";
import { Segmented, segmentWidth, segmentX } from "./Segmented";

// The choice as a pill that slides to the new one (TASK-469 A2, ADR-0383,
// the look «Capsula»), watched frame by frame on fake timers.

jest.mock("../ui/useReduceMotion");
const reduceMotion = jest.mocked(useReduceMotion);

const OPTIONS = [
  { value: "shape", label: "Shape" },
  { value: "word", label: "Word" },
  { value: "free", label: "Freehand" },
] as const;
type Kind = (typeof OPTIONS)[number]["value"];

const WIDTH = 330;
const FRAME = 16;

function choice(value: Kind, onChange: (value: Kind) => void = jest.fn()) {
  return <Segmented options={OPTIONS} value={value} onChange={onChange} />;
}

/** The track measured by the layout, as the phone does after the first frame. */
async function measure(width = WIDTH) {
  const track = screen.getByTestId("segmented");
  await act(async () => {
    fireEvent(track, "layout", {
      nativeEvent: { layout: { x: 0, y: 0, width, height: 52 } },
    });
  });
}

type Look = ViewStyle & { opacity: number; transform: { translateX: number }[] };

function pill(): Look {
  return StyleSheet.flatten(screen.getByTestId("segment-pill").props.style) as Look;
}

function pillX(): number {
  return pill().transform[0].translateX;
}

async function frames(count: number, each?: () => void) {
  for (let i = 0; i < count; i += 1) {
    await act(() => jest.advanceTimersByTimeAsync(FRAME));
    each?.();
  }
}

beforeEach(() => {
  jest.useFakeTimers();
  runAnimationsOnJs();
  reduceMotion.mockReturnValue(false);
});
afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

test("the choices share the track: the pill stands under each one", () => {
  const each = segmentWidth(3, WIDTH);
  expect(each * 3 + space.xs * 4).toBeCloseTo(WIDTH, 5);
  expect(segmentX(0, 3, WIDTH)).toBe(space.xs);
  expect(segmentX(2, 3, WIDTH) - segmentX(1, 3, WIDTH)).toBeCloseTo(each + space.xs, 5);
});

test("before the track is measured the chosen one wears the pill itself: never a frame without it", async () => {
  await render(choice("word"));
  expect(screen.queryByTestId("segment-pill")).toBeNull();
  expect(screen.getByRole("button", { name: "Word", selected: true })).toHaveStyle({
    backgroundColor: color.surfaceRaised,
    borderColor: color.borderStrong,
  });
});

test("measured, the pill stands under the chosen one, lighter and edged, not yellow", async () => {
  await render(choice("word"));
  await measure();
  expect(pillX()).toBeCloseTo(segmentX(1, 3, WIDTH), 3);
  expect(pill().width).toBeCloseTo(segmentWidth(3, WIDTH), 3);
  expect(pill().backgroundColor).toBe(color.surfaceRaised);
  expect(pill().borderColor).toBe(color.borderStrong);
  expect(pill().backgroundColor).not.toBe(color.accent);
  // The choice itself no longer draws it: one pill only.
  expect(screen.getByRole("button", { name: "Word" })).not.toHaveStyle({
    backgroundColor: color.surfaceRaised,
  });
});

test("the pill glides to the new choice and stops there, never past it; the words stay readable", async () => {
  const { rerender } = await render(choice("shape"));
  await measure();
  await act(async () => rerender(choice("free")));
  const from = segmentX(0, 3, WIDTH);
  const to = segmentX(2, 3, WIDTH);
  const xs: number[] = [];
  await frames(60, () => xs.push(pillX()));
  // On its way: between the two, moving forward, never beyond the mark.
  expect(xs[2]).toBeGreaterThan(from);
  expect(xs[2]).toBeLessThan(to);
  for (const each of xs) {
    expect(each).toBeLessThanOrEqual(to + 0.01);
  }
  expect(pillX()).toBeCloseTo(to, 1);
  // The words sit over the pill, in the text's colour, the chosen bolder.
  expect(screen.getByText("Freehand")).toHaveStyle({ color: color.text });
  expect(screen.getByText("Shape")).toHaveStyle({ color: color.text });
});

test("a touch while the pill travels sends it on from where it is: no jump", async () => {
  const { rerender } = await render(choice("shape"));
  await measure();
  await act(async () => rerender(choice("free")));
  await frames(4);
  const halfWay = pillX();
  expect(halfWay).toBeGreaterThan(segmentX(0, 3, WIDTH));
  await act(async () => rerender(choice("word")));
  await frames(1);
  expect(Math.abs(pillX() - halfWay)).toBeLessThan(segmentWidth(3, WIDTH) / 2);
  await frames(60);
  expect(pillX()).toBeCloseTo(segmentX(1, 3, WIDTH), 1);
});

test("with «Reduce Motion» the pill is at once where it goes and fades in: nothing slides", async () => {
  reduceMotion.mockReturnValue(true);
  const { rerender } = await render(choice("shape"));
  await measure();
  await act(async () => rerender(choice("free")));
  expect(pillX()).toBeCloseTo(segmentX(2, 3, WIDTH), 3);
  expect(pill().opacity).toBeLessThan(1);
  await frames(30);
  expect(pill().opacity).toBe(1);
  expect(pillX()).toBeCloseTo(segmentX(2, 3, WIDTH), 3);
});

test("touching a choice tells it, the chosen one again too", async () => {
  const onChange = jest.fn();
  await render(choice("shape", onChange));
  await measure();
  await fireEvent.press(screen.getByRole("button", { name: "Word" }));
  await fireEvent.press(screen.getByRole("button", { name: "Shape" }));
  expect(onChange.mock.calls).toEqual([["word"], ["shape"]]);
});

test("long words (German) wrap instead of being cut: no line limit", async () => {
  await render(
    <Segmented
      options={[
        { value: "a", label: "Freihändig zeichnen" },
        { value: "b", label: "Buchstaben" },
      ]}
      value="a"
      onChange={jest.fn()}
    />,
  );
  for (const label of ["Freihändig zeichnen", "Buchstaben"]) {
    const text = screen.getByText(label);
    expect(text.props.numberOfLines).toBeUndefined();
    expect(text.props.ellipsizeMode).toBeUndefined();
  }
});

test("a track that changes width puts the pill under the choice again, without travelling", async () => {
  await render(choice("free"));
  await measure(WIDTH);
  await measure(WIDTH + 60);
  expect(pillX()).toBeCloseTo(segmentX(2, 3, WIDTH + 60), 3);
  expect(pill().width).toBeCloseTo(segmentWidth(3, WIDTH + 60), 3);
});
