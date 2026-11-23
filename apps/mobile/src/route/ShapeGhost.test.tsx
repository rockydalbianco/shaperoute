import type { OutlinePoint, RouteRequest } from "@shaperoute/shared-types";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { Animated, StyleSheet } from "react-native";

import { route, shapeGhost } from "../theme/tokens";
import { runAnimationsOnJs } from "../ui/animationsOnJs.testing";
import { useReduceMotion } from "../ui/useReduceMotion";
import {
  GHOST_MAX_SIZE,
  ghostSize,
  penPath,
  ShapeGhost,
  WaitingShape,
} from "./ShapeGhost";

// The shape over the map while its route is drawn (TASK-442), on fake
// timers: it breathes, a dot goes round it, and «Reduce Motion» stops both.

jest.mock("../ui/useReduceMotion");
const reduceMotion = jest.mocked(useReduceMotion);

/** A square, clockwise from the top left, as shares of the box. */
const SQUARE: OutlinePoint[] = [
  [0, 0],
  [1, 0],
  [1, 1],
  [0, 1],
  [0, 0],
];

const TRENTO: [number, number] = [46.0679, 11.1211];
const HEART: RouteRequest = {
  start: TRENTO,
  shape: "heart",
  distance_m: 5000,
  activity: "running",
};

/** The shape is hidden from a screen reader: the queries look for it anyway. */
const HIDDEN = { includeHiddenElements: true };

type Look = {
  opacity?: number;
  backgroundColor?: string;
  transform?: ({ translateX: number } | { translateY: number })[];
};

function look(testID: string): Look {
  return (StyleSheet.flatten(screen.getByTestId(testID, HIDDEN).props.style) ??
    {}) as Look;
}

/** Where the dot is, in points of the shape's box. */
function pen(): { x: number; y: number } {
  const [x, y] = look("shape-ghost-pen").transform ?? [];
  return {
    x: (x as { translateX: number }).translateX,
    y: (y as { translateY: number }).translateY,
  };
}

/** The map under the shape measured: 400 × 500 points. */
function laidOut(width = 400, height = 500) {
  return fireEvent(screen.getByTestId("shape-ghost", HIDDEN), "layout", {
    nativeEvent: { layout: { x: 0, y: 0, width, height } },
  });
}

const pass = (ms: number) => act(() => jest.advanceTimersByTime(ms));

beforeEach(() => {
  jest.useFakeTimers();
  runAnimationsOnJs();
  reduceMotion.mockReturnValue(false);
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});

test("the shape is a share of the smaller side of the map, up to a size", () => {
  expect(ghostSize(400, 500)).toBe(GHOST_MAX_SIZE);
  expect(ghostSize(300, 500)).toBe(180);
  expect(ghostSize(500, 200)).toBe(120);
});

test("the dot's way is the outline, by the share of its length", () => {
  expect(penPath(SQUARE, 100)).toEqual({
    at: [0, 0.25, 0.5, 0.75, 1],
    x: [0, 100, 100, 0, 0],
    y: [0, 0, 100, 100, 0],
  });
});

test("a point repeated is passed once, and a line with no length has no way", () => {
  const twice: OutlinePoint[] = [
    [0, 0],
    [0, 0],
    [1, 0],
    [1, 0],
  ];
  expect(penPath(twice, 10)).toEqual({ at: [0, 1], x: [0, 10], y: [0, 0] });
  expect(penPath([[0.5, 0.5]], 10)).toBeNull();
  expect(
    penPath(
      [
        [0.5, 0.5],
        [0.5, 0.5],
      ],
      10,
    ),
  ).toBeNull();
  expect(penPath([], 10)).toBeNull();
});

test("nothing is drawn until the map under it is measured", async () => {
  await render(<ShapeGhost lines={[SQUARE]} />);
  expect(screen.queryByTestId("shape-ghost-outline", HIDDEN)).toBeNull();
  await laidOut();
  expect(screen.getByTestId("shape-ghost-outline", HIDDEN)).toBeTruthy();
});

test("every side of the outline and of its details is drawn, in the ghost's colour", async () => {
  const detail: OutlinePoint[] = [
    [0.5, 0],
    [0.5, 0.5],
  ];
  await render(<ShapeGhost lines={[SQUARE, detail]} />);
  await laidOut();
  const sides = screen.getAllByTestId("shape-ghost-side", HIDDEN);
  expect(sides).toHaveLength(5);
  for (const side of sides) {
    const style = StyleSheet.flatten(side.props.style) as Look;
    expect(style.backgroundColor).toBe(shapeGhost.color);
    expect(style.backgroundColor).not.toBe(route.color);
  }
});

test("it takes no touches and is hidden from a screen reader", async () => {
  await render(<ShapeGhost lines={[SQUARE]} />);
  const over = screen.getByTestId("shape-ghost", HIDDEN);
  expect(over.props.pointerEvents).toBe("none");
  expect(over.props.accessible).toBe(false);
  expect(over.props.accessibilityElementsHidden).toBe(true);
  expect(over.props.importantForAccessibility).toBe("no-hide-descendants");
});

test("it breathes from dim to bright and back, and again", async () => {
  await render(<ShapeGhost lines={[SQUARE]} />);
  await laidOut();
  expect(look("shape-ghost-outline").opacity).toBeCloseTo(shapeGhost.waitDim, 2);
  await pass(shapeGhost.breathMs);
  expect(look("shape-ghost-outline").opacity).toBeCloseTo(shapeGhost.waitBright, 1);
  await pass(shapeGhost.breathMs);
  expect(look("shape-ghost-outline").opacity).toBeCloseTo(shapeGhost.waitDim, 1);
  await pass(shapeGhost.breathMs);
  expect(look("shape-ghost-outline").opacity).toBeCloseTo(shapeGhost.waitBright, 1);
});

test("the dot goes round the outline in a lap, in the route's yellow", async () => {
  await render(<ShapeGhost lines={[SQUARE]} />);
  await laidOut();
  const size = GHOST_MAX_SIZE;
  expect(look("shape-ghost-pen").backgroundColor).toBe(route.color);
  expect(pen().x).toBeCloseTo(0, 0);
  expect(pen().y).toBeCloseTo(0, 0);
  // A quarter of the lap: the first corner; then half, the opposite one.
  await pass(shapeGhost.lapMs / 4);
  expect(pen().x / size).toBeCloseTo(1, 1);
  expect(pen().y / size).toBeCloseTo(0, 1);
  await pass(shapeGhost.lapMs / 4);
  expect(pen().x / size).toBeCloseTo(1, 1);
  expect(pen().y / size).toBeCloseTo(1, 1);
  await pass(shapeGhost.lapMs / 4);
  expect(pen().x / size).toBeCloseTo(0, 1);
  expect(pen().y / size).toBeCloseTo(1, 1);
});

test("with «Reduce Motion» the shape keeps still, bright, with no dot", async () => {
  reduceMotion.mockReturnValue(true);
  await render(<ShapeGhost lines={[SQUARE]} />);
  await laidOut();
  expect(screen.queryByTestId("shape-ghost-pen", HIDDEN)).toBeNull();
  expect(look("shape-ghost-outline").opacity).toBeCloseTo(shapeGhost.waitBright, 2);
  await pass(shapeGhost.breathMs);
  expect(look("shape-ghost-outline").opacity).toBeCloseTo(shapeGhost.waitBright, 2);
  await pass(shapeGhost.breathMs * 3);
  expect(look("shape-ghost-outline").opacity).toBeCloseTo(shapeGhost.waitBright, 2);
});

test("taken away, its two movements are stopped", async () => {
  const loop = Animated.loop;
  const stops: jest.SpyInstance[] = [];
  jest.spyOn(Animated, "loop").mockImplementation((...asked) => {
    const made = loop(...asked);
    stops.push(jest.spyOn(made, "stop"));
    return made;
  });
  const { unmount } = await render(<ShapeGhost lines={[SQUARE]} />);
  await laidOut();
  await pass(100);
  expect(stops).toHaveLength(2);
  for (const stop of stops) {
    expect(stop).not.toHaveBeenCalled();
  }
  await unmount();
  for (const stop of stops) {
    expect(stop).toHaveBeenCalledTimes(1);
  }
});

test("while a heart is drawn its outline is over the map", async () => {
  await render(<WaitingShape request={HEART} />);
  await laidOut();
  expect(screen.getAllByTestId("shape-ghost-side", HIDDEN).length).toBeGreaterThan(10);
  expect(screen.getByTestId("shape-ghost-pen", HIDDEN)).toBeTruthy();
});

test("while a word is drawn there is no shape: the wait is as it was", async () => {
  await render(
    <WaitingShape
      request={{ start: TRENTO, word: "CIAO", distance_m: 5000, activity: "running" }}
    />,
  );
  expect(screen.queryByTestId("shape-ghost", HIDDEN)).toBeNull();
});
