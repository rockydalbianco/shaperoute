import { act, renderHook } from "@testing-library/react-native";

import {
  arrowTurnDeg,
  bearingOf,
  isTurned,
  tapBearing,
  TURNED_MIN_DEG,
  useTurnedMap,
} from "./turnedMap";

test("the map takes the bearing opposite to the shape's turn", () => {
  // Counterclockwise 30° is a bearing of -30: the drawing is upright.
  expect(bearingOf(30)).toBe(-30);
  expect(bearingOf(-45)).toBe(45);
  expect(bearingOf(12.5)).toBe(-12.5);
});

test("a route that does not say how it is turned keeps north up", () => {
  expect(bearingOf(undefined)).toBe(0);
  expect(bearingOf(null)).toBe(0);
  expect(bearingOf(Number.NaN)).toBe(0);
  expect(bearingOf(Number.POSITIVE_INFINITY)).toBe(0);
  // The circle, which turns freely: 0, and never a -0 for the page.
  expect(Object.is(bearingOf(0), 0)).toBe(true);
});

test("any turn is a bearing in (-180, 180]", () => {
  expect(bearingOf(180)).toBe(180);
  expect(bearingOf(-180)).toBe(180);
  expect(bearingOf(190)).toBe(170);
  expect(bearingOf(-190)).toBe(-170);
  expect(bearingOf(360)).toBe(0);
  expect(bearingOf(-725)).toBe(5);
});

test("a map is turned from half a degree", () => {
  expect(isTurned(0)).toBe(false);
  expect(isTurned(TURNED_MIN_DEG - 0.1)).toBe(false);
  expect(isTurned(TURNED_MIN_DEG)).toBe(true);
  expect(isTurned(-30)).toBe(true);
});

test("a tap puts north up, a second one turns the map as the drawing", () => {
  expect(tapBearing(-30, -30)).toBe(0);
  expect(tapBearing(0, -30)).toBe(-30);
  // Turned by two fingers, wherever: north up first.
  expect(tapBearing(12, -30)).toBe(0);
  expect(tapBearing(12, 0)).toBe(0);
});

test("the arrow points where north is on the turned map", () => {
  expect(arrowTurnDeg(-30)).toBe(30);
  expect(arrowTurnDeg(45)).toBe(-45);
  expect(Object.is(arrowTurnDeg(0), 0)).toBe(true);
});

test("a turned route has an arrow, and its taps ask the map to turn", async () => {
  const { result } = await renderHook(() => useTurnedMap(30));
  expect(result.current.bearing).toBe(-30);
  expect(result.current.arrow).toBe(true);
  expect(result.current.turn).toBeNull();

  // The map says it is turned as the drawing: a tap puts north up.
  await act(() => result.current.onTurned(-30));
  expect(result.current.shown).toBe(-30);
  await act(() => result.current.onArrow());
  expect(result.current.turn).toEqual({ bearing: 0 });

  // North is up: the arrow stays, and a tap turns the map back.
  await act(() => result.current.onTurned(0));
  expect(result.current.arrow).toBe(true);
  await act(() => result.current.onArrow());
  expect(result.current.turn).toEqual({ bearing: -30 });
});

test("each tap is a new turn, also to where the map was asked before", async () => {
  const { result } = await renderHook(() => useTurnedMap(null));
  await act(() => result.current.onTurned(20));
  await act(() => result.current.onArrow());
  const first = result.current.turn;
  expect(first).toEqual({ bearing: 0 });
  // Two fingers turn it again before it says north is up.
  await act(() => result.current.onArrow());
  expect(result.current.turn).toEqual({ bearing: 0 });
  expect(result.current.turn).not.toBe(first);
});

test("north up and no turned route: no arrow; two fingers bring one", async () => {
  const { result } = await renderHook(() => useTurnedMap(undefined));
  expect(result.current.bearing).toBe(0);
  expect(result.current.arrow).toBe(false);
  await act(() => result.current.onTurned(17));
  expect(result.current.arrow).toBe(true);
  await act(() => result.current.onTurned(0));
  expect(result.current.arrow).toBe(false);
});
