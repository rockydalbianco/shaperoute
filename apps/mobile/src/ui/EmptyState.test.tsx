import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { Animated, StyleSheet } from "react-native";

import { runAnimationsOnJs } from "./animationsOnJs.testing";
import { EMPTY_DRAW_MS, EmptyState } from "./EmptyState";
import { HEART } from "./outlines";
import { useReduceMotion } from "./useReduceMotion";

jest.mock("./useReduceMotion");
const reduceMotion = jest.mocked(useReduceMotion);

beforeEach(() => {
  reduceMotion.mockReturnValue(false);
});
afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

/** How much of each stroke of the yellow figure is there, in the pen's order. */
function drawn(): number[] {
  // The figure is hidden from a screen reader: the words say it all.
  const pen = screen.getByTestId("empty-state-pen", { includeHiddenElements: true });
  return pen.children.map((stroke) => {
    if (typeof stroke === "string") {
      return 1;
    }
    const look = StyleSheet.flatten(stroke.props.style) as { opacity?: number };
    return look.opacity ?? 1;
  });
}

async function showHeart() {
  await render(
    <EmptyState
      outline={HEART}
      title="All"
      message="Nothing here yet."
      testID="empty"
    />,
  );
}

test("says what is missing, gently, and offers nothing it was not given", async () => {
  await render(
    <EmptyState
      outline={HEART}
      title="Nothing kept yet"
      message="When a route catches your eye, tap the heart on its map."
      testID="empty"
    />,
  );
  expect(screen.getByRole("header", { name: "Nothing kept yet" })).toBeTruthy();
  expect(screen.getByText(/tap the heart on its map/)).toBeTruthy();
  expect(screen.queryByRole("button")).toBeNull();
});

test("the one thing to do about it is a button", async () => {
  const onPress = jest.fn();
  await render(
    <EmptyState
      outline={HEART}
      title="Nothing kept yet"
      message="It will wait for you here."
      action={{ label: "Look around Explore", onPress }}
    />,
  );
  fireEvent.press(screen.getByRole("button", { name: "Look around Explore" }));
  expect(onPress).toHaveBeenCalledTimes(1);
});

test("on a page that has its title already, the figure and the line alone", async () => {
  await render(<EmptyState outline={HEART} message="Your tips will show up here" />);
  expect(screen.getByText("Your tips will show up here")).toBeTruthy();
  expect(screen.queryByRole("header")).toBeNull();
});

test("the heart is a closed outline in the unit square, starting at the notch", () => {
  expect(HEART.length).toBeGreaterThanOrEqual(60);
  expect(HEART[0]).toEqual(HEART[HEART.length - 1]);
  for (const [x, y] of HEART) {
    expect(x).toBeGreaterThanOrEqual(0);
    expect(x).toBeLessThanOrEqual(1);
    expect(y).toBeGreaterThanOrEqual(0);
    expect(y).toBeLessThanOrEqual(1);
  }
  // The notch: halfway across, below the top of the lobes.
  const [x0, y0] = HEART[0];
  expect(x0).toBeCloseTo(0.5, 2);
  expect(y0).toBeGreaterThan(0.1);
  expect(y0).toBeLessThan(0.35);
  // The pen leaves it to the right, as a run would.
  expect(HEART[1][0]).toBeGreaterThan(x0);
});

// TASK-509: a few yellow strokes left standing read as a spinner that had
// stopped. The pen goes round once and the figure stays whole.

test("the pen goes round the figure once and leaves it whole", async () => {
  jest.useFakeTimers();
  runAnimationsOnJs();
  const timing = jest.spyOn(Animated, "timing");
  await showHeart();
  expect(drawn().length).toBeGreaterThanOrEqual(60);
  expect(Math.max(...drawn())).toBe(0);
  await act(() => jest.advanceTimersByTimeAsync(EMPTY_DRAW_MS / 2));
  // On its way: the first strokes are there, the last are not.
  expect(drawn()[0]).toBe(1);
  expect(drawn()[drawn().length - 1]).toBe(0);
  await act(() => jest.advanceTimersByTimeAsync(EMPTY_DRAW_MS));
  expect(Math.min(...drawn())).toBe(1);
  // Once: nothing starts it again.
  await act(() => jest.advanceTimersByTimeAsync(5 * EMPTY_DRAW_MS));
  expect(Math.min(...drawn())).toBe(1);
  expect(timing).toHaveBeenCalledTimes(1);
});

test("with Reduce Motion the figure is whole at once, and nothing moves", async () => {
  jest.useFakeTimers();
  runAnimationsOnJs();
  reduceMotion.mockReturnValue(true);
  const timing = jest.spyOn(Animated, "timing");
  await showHeart();
  await act(() => jest.advanceTimersByTimeAsync(0));
  expect(Math.min(...drawn())).toBe(1);
  expect(timing).not.toHaveBeenCalled();
});
