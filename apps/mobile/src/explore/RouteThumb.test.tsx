import { thumbSegments } from "./RouteThumb";

test("a line fills the box inside the padding, north up", () => {
  // A square, 1 km a side near 46° N: as wide as it is tall, in metres.
  const k = Math.cos((46 * Math.PI) / 180);
  const d = 0.009;
  const square: [number, number][] = [
    [46, 11],
    [46 + d, 11],
    [46 + d, 11 + d / k],
    [46, 11 + d / k],
    [46, 11],
  ];
  const segments = thumbSegments(square, 100, 60, 5);
  expect(segments).toHaveLength(4);
  // Fitted to the height: 50 px a side, centred in the width.
  for (const s of segments) {
    expect(s.length).toBeCloseTo(50, 0);
  }
  // The first goes north: up on the screen.
  expect(segments[0].angle).toBeCloseTo(-90, 0);
});

test("nothing to draw with fewer than two points", () => {
  expect(thumbSegments([[46, 11]], 100, 60, 5)).toEqual([]);
});

test("a point the pen comes to without drawing has no segment ending at it", () => {
  // A square, then an eye inside it, reached with the pen up (TASK-226).
  const line: [number, number][] = [
    [46.0, 11.0],
    [46.0, 11.001],
    [46.001, 11.001],
    [46.001, 11.0],
    [46.0, 11.0],
    [46.0004, 11.0004],
    [46.0006, 11.0006],
    [46.0, 11.0],
  ];
  const whole = thumbSegments(line, 120, 120, 6);
  const apart = thumbSegments(line, 120, 120, 6, [5, 7]);
  expect(whole).toHaveLength(7);
  // The same frame, two segments fewer: to the eye, and back from it.
  expect(apart).toHaveLength(5);
  expect(apart).toEqual(whole.filter((_, i) => i !== 4 && i !== 6));
});
