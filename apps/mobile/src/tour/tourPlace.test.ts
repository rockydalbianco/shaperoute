import {
  BUBBLE_GAP,
  EDGE,
  HOLE_PAD,
  holeOf,
  placeBubble,
  shadeAround,
} from "./tourPlace";

const SCREEN = { width: 400, height: 800 };
const INSETS = { top: 50, bottom: 30 };
const BUBBLE = 180;

test("the light is the part with room around it, inside the screen", () => {
  expect(holeOf({ x: 20, y: 100, width: 200, height: 60 }, SCREEN)).toEqual({
    x: 20 - HOLE_PAD,
    y: 100 - HOLE_PAD,
    width: 200 + 2 * HOLE_PAD,
    height: 60 + 2 * HOLE_PAD,
  });
  // A part at the edge of the screen: the light stops at the edge.
  expect(holeOf({ x: 0, y: 0, width: 400, height: 40 }, SCREEN)).toEqual({
    x: 0,
    y: 0,
    width: 400,
    height: 40 + HOLE_PAD,
  });
});

test("without a part the words are in the middle, the whole screen dark", () => {
  const placed = placeBubble(null, SCREEN, INSETS, BUBBLE);
  expect(placed).toEqual({ hole: null, bubbleTop: (800 - BUBBLE) / 2 });
  expect(shadeAround(null, SCREEN)).toEqual([{ x: 0, y: 0, width: 400, height: 800 }]);
});

test("a part high on the screen has its words under it", () => {
  const part = { x: 16, y: 120, width: 368, height: 100 };
  const placed = placeBubble(part, SCREEN, INSETS, BUBBLE);
  expect(placed.hole).toEqual(holeOf(part, SCREEN));
  expect(placed.bubbleTop).toBe(120 + 100 + HOLE_PAD + BUBBLE_GAP);
});

test("a part at the foot of the screen has its words over it", () => {
  const part = { x: 16, y: 700, width: 368, height: 60 };
  const placed = placeBubble(part, SCREEN, INSETS, BUBBLE);
  expect(placed.hole).toEqual(holeOf(part, SCREEN));
  expect(placed.bubbleTop).toBe(700 - HOLE_PAD - BUBBLE_GAP - BUBBLE);
});

test("a whole page has its words at the foot and the light cut above them", () => {
  const page = { x: 0, y: 60, width: 400, height: 740 };
  const placed = placeBubble(page, SCREEN, INSETS, BUBBLE);
  const bubbleTop = 800 - INSETS.bottom - EDGE - BUBBLE;
  expect(placed.bubbleTop).toBe(bubbleTop);
  expect(placed.hole).toEqual({
    x: 0,
    y: 60 - HOLE_PAD,
    width: 400,
    height: bubbleTop - BUBBLE_GAP - (60 - HOLE_PAD),
  });
});

test("the words never go above the top edge of the screen", () => {
  const tall = 900;
  const placed = placeBubble(null, SCREEN, INSETS, tall);
  expect(placed.bubbleTop).toBe(INSETS.top + EDGE);
});

test("the dark goes around the light, on its four sides", () => {
  const hole = { x: 20, y: 100, width: 300, height: 80 };
  const shade = shadeAround(hole, SCREEN);
  expect(shade).toEqual([
    { x: 0, y: 0, width: 400, height: 100 },
    { x: 0, y: 180, width: 400, height: 620 },
    { x: 0, y: 100, width: 20, height: 80 },
    { x: 320, y: 100, width: 80, height: 80 },
  ]);
  // The dark covers the screen but the light, once.
  const dark = shade.reduce((sum, box) => sum + box.width * box.height, 0);
  expect(dark).toBe(400 * 800 - 300 * 80);
});

test("a light as wide as the screen leaves no dark at its sides", () => {
  const shade = shadeAround({ x: 0, y: 100, width: 400, height: 80 }, SCREEN);
  expect(shade).toHaveLength(2);
});
