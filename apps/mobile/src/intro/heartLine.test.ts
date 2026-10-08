import { HEART_BOX, HEART_POINTS, heartHeight, heartStrokes } from "./heartLine";

describe("heartStrokes", () => {
  const strokes = heartStrokes(240);

  it("draws a closed line: it ends where it starts", () => {
    expect(HEART_POINTS[HEART_POINTS.length - 1]).toEqual(HEART_POINTS[0]);
    const first = strokes[0];
    const last = strokes[strokes.length - 1];
    expect(last.x2).toBeCloseTo(first.x1, 6);
    expect(last.y2).toBeCloseTo(first.y1, 6);
  });

  it("joins every stroke to the one before, in space and in time", () => {
    expect(strokes[0].from).toBe(0);
    for (let i = 1; i < strokes.length; i += 1) {
      expect(strokes[i].x1).toBeCloseTo(strokes[i - 1].x2, 6);
      expect(strokes[i].y1).toBeCloseTo(strokes[i - 1].y2, 6);
      expect(strokes[i].from).toBeCloseTo(strokes[i - 1].to, 9);
    }
    expect(strokes[strokes.length - 1].to).toBe(1);
  });

  it("gives every stroke its own moment: an animation needs rising stops", () => {
    for (const stroke of strokes) {
      expect(stroke.to).toBeGreaterThan(stroke.from);
      expect(stroke.length).toBeGreaterThan(0);
    }
  });

  it("moves the pen at one speed: the time of a stroke follows its length", () => {
    const total = strokes.reduce((sum, s) => sum + s.length, 0);
    for (const stroke of strokes.slice(0, -1)) {
      expect(stroke.to - stroke.from).toBeCloseTo(stroke.length / total, 9);
    }
  });

  it("cuts the long stretches, so the line never jumps", () => {
    const total = strokes.reduce((sum, s) => sum + s.length, 0);
    for (const stroke of strokes) {
      expect(stroke.length).toBeLessThanOrEqual(total / 110 + 1e-9);
    }
    // Few enough Views for a phone to animate.
    expect(strokes.length).toBeLessThan(260);
  });

  it("stays inside its box at any width", () => {
    for (const width of [180, 240, 300]) {
      const height = heartHeight(width);
      expect(height).toBeCloseTo((width * HEART_BOX.height) / HEART_BOX.width, 9);
      for (const s of heartStrokes(width)) {
        for (const [x, y] of [
          [s.x1, s.y1],
          [s.x2, s.y2],
        ]) {
          expect(x).toBeGreaterThanOrEqual(0);
          expect(x).toBeLessThanOrEqual(width + 1e-9);
          expect(y).toBeGreaterThanOrEqual(0);
          expect(y).toBeLessThanOrEqual(height + 1e-9);
        }
      }
    }
  });

  it("is a heart: two lobes above a point, the notch between them", () => {
    const ys = HEART_POINTS.map(([, y]) => y);
    const lowest = HEART_POINTS[ys.indexOf(Math.max(...ys))];
    // The point at the bottom is near the middle, the notch well below the top.
    expect(Math.abs(lowest[0] - HEART_BOX.width / 2)).toBeLessThan(
      HEART_BOX.width * 0.1,
    );
    const [notchX, notchY] = HEART_POINTS[0];
    expect(Math.abs(notchX - HEART_BOX.width / 2)).toBeLessThan(HEART_BOX.width * 0.1);
    expect(notchY).toBeGreaterThan(HEART_BOX.height * 0.15);
    const topLeft = Math.min(
      ...HEART_POINTS.filter(([x]) => x < notchX).map(([, y]) => y),
    );
    const topRight = Math.min(
      ...HEART_POINTS.filter(([x]) => x > notchX).map(([, y]) => y),
    );
    expect(topLeft).toBeLessThan(notchY - HEART_BOX.height * 0.15);
    expect(topRight).toBeLessThan(notchY - HEART_BOX.height * 0.15);
  });
});
