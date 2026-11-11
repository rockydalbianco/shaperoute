import { MIN_TAP_SIZE, space } from "../theme/tokens";
import { mapCover } from "./mapCover";

// What lies over the top of the map on `MapScreen` (TASK-443): the status
// bar, and the buttons where the screen draws them.

const WIDTH = 402;
const TOP = 62;

test("the way back and the map's kind are in a row under the status bar", () => {
  expect(
    mapCover({ insetTop: TOP, width: WIDTH, bannerHeight: null, compass: false }),
  ).toEqual({
    top: TOP,
    buttons: [
      { x: space.lg, y: TOP + space.sm, width: MIN_TAP_SIZE, height: MIN_TAP_SIZE },
      {
        x: WIDTH - space.lg - MIN_TAP_SIZE,
        y: TOP + space.sm,
        width: MIN_TAP_SIZE,
        height: MIN_TAP_SIZE,
      },
    ],
  });
});

test("the north arrow is under the map's kind, on the right", () => {
  const { buttons } = mapCover({
    insetTop: TOP,
    width: WIDTH,
    bannerHeight: null,
    compass: true,
  });
  expect(buttons).toHaveLength(3);
  expect(buttons[2]).toEqual({
    x: WIDTH - space.lg - MIN_TAP_SIZE,
    y: TOP + space.sm + MIN_TAP_SIZE + space.sm,
    width: MIN_TAP_SIZE,
    height: MIN_TAP_SIZE,
  });
});

test("a banner takes the row from side to side, the buttons go under it", () => {
  const { top, buttons } = mapCover({
    insetTop: TOP,
    width: WIDTH,
    bannerHeight: 96,
    compass: true,
  });
  expect(top).toBe(TOP);
  expect(buttons[0]).toEqual({
    x: space.lg,
    y: TOP + space.sm,
    width: WIDTH - 2 * space.lg,
    height: 96,
  });
  const under = TOP + space.sm + 96 + space.sm;
  expect(buttons[1]).toMatchObject({ x: WIDTH - space.lg - MIN_TAP_SIZE, y: under });
  expect(buttons[2]).toMatchObject({
    x: WIDTH - space.lg - MIN_TAP_SIZE,
    y: under + MIN_TAP_SIZE + space.sm,
  });
});

test("no button is in the status bar or off the map", () => {
  for (const compass of [false, true]) {
    for (const bannerHeight of [null, 60]) {
      const { top, buttons } = mapCover({
        insetTop: TOP,
        width: WIDTH,
        bannerHeight,
        compass,
      });
      for (const button of buttons) {
        expect(button.y).toBeGreaterThanOrEqual(top);
        expect(button.x).toBeGreaterThanOrEqual(0);
        expect(button.x + button.width).toBeLessThanOrEqual(WIDTH);
      }
    }
  }
});
