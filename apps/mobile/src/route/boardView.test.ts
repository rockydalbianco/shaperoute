import {
  clampView,
  FIT,
  fitBox,
  MAX_SCALE,
  panned,
  pinched,
  pinchOf,
  shareAt,
} from "./boardView";

// A 400 × 300 picture on a 400 × 700 board: 200 points above and below.
const BOX = fitBox(400, 700, 4 / 3);

test("the picture fits the board, centred", () => {
  expect(BOX).toEqual({ left: 0, top: 200, width: 400, height: 300 });
  expect(fitBox(400, 300, 0.5)).toEqual({ left: 125, top: 0, width: 150, height: 300 });
});

test("unzoomed, a point of the board is its share of the picture", () => {
  expect(shareAt([100, 275], FIT, BOX)).toEqual([0.25, 0.25]);
  // Outside the picture, kept on its edge.
  expect(shareAt([100, 50], FIT, BOX)).toEqual([0.25, 0]);
});

test("zoomed, the same point of the board is a smaller piece of the picture", () => {
  const view = { scale: 2, x: 0, y: 0 };
  expect(shareAt([200, 350], view, BOX)).toEqual([0.5, 0.5]);
  // A quarter of the board from the centre is an eighth of the picture.
  expect(shareAt([100, 350], view, BOX)).toEqual([0.375, 0.5]);
});

test("spreading two fingers zooms around the point between them", () => {
  const start = pinchOf([100, 270], [100, 280], FIT);
  const under = shareAt(start.centre, FIT, BOX);
  const view = pinched(start, [100, 260], [100, 290], BOX);
  expect(view.scale).toBeCloseTo(3);
  const after = shareAt([100, 275], view, BOX);
  expect(after[0]).toBeCloseTo(under[0]);
  expect(after[1]).toBeCloseTo(under[1]);
});

test("the zoom stays between the whole picture and MAX_SCALE", () => {
  const start = pinchOf([150, 350], [250, 350], FIT);
  expect(pinched(start, [199, 350], [201, 350], BOX).scale).toBe(1);
  expect(pinched(start, [0, 350], [4000, 350], BOX).scale).toBe(MAX_SCALE);
});

test("moving the picture stops with its edge at the board's centre", () => {
  const view = panned({ scale: 2, x: 0, y: 0 }, 1000, -30, BOX);
  expect(view).toEqual({ scale: 2, x: 400, y: -30 });
  expect(clampView({ scale: 0.5, x: 999, y: 0 }, BOX)).toEqual({
    scale: 1,
    x: 200,
    y: 0,
  });
});
