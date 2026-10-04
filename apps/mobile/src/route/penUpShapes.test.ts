import { PEN_UP_SHAPES, SHAPES } from "@shaperoute/shared-types";

import { isPenUpShape, offersPenUp, shapeAsked } from "./penUpShapes";

test("the pen up is offered for the three shapes the user chose", () => {
  expect(SHAPES.filter(offersPenUp)).toEqual(["smiley", "ghost", "donut"]);
  // The sun is drawn with the pen down; the eyes wait (TASK-223).
  expect(offersPenUp("sun")).toBe(false);
  expect(offersPenUp("cat")).toBe(false);
  expect(offersPenUp(null)).toBe(false);
});

test("every shape offered may be asked with the pen up", () => {
  for (const shape of SHAPES.filter(offersPenUp)) {
    expect(PEN_UP_SHAPES).toContain(shape);
  }
});

test("a route of a shape in pieces may have walks, of another shape not", () => {
  expect(isPenUpShape("sun")).toBe(true);
  expect(isPenUpShape("cat")).toBe(true);
  expect(isPenUpShape("heart")).toBe(false);
  expect(isPenUpShape(null)).toBe(false);
  expect(isPenUpShape(undefined)).toBe(false);
});

test("«Draw» asks for the pen up only for a shape offered so, on the roads", () => {
  expect(shapeAsked("smiley", true, "running")).toEqual({
    shape: "smiley",
    pen_up: true,
  });
  expect(shapeAsked("ghost", true, "cycling")).toEqual({
    shape: "ghost",
    pen_up: true,
  });
  // Switched off, another shape, or on the water: the request of before.
  expect(shapeAsked("smiley", false, "running")).toEqual({ shape: "smiley" });
  expect(shapeAsked("sun", true, "running")).toEqual({ shape: "sun" });
  expect(shapeAsked("heart", true, "running")).toEqual({ shape: "heart" });
  expect(shapeAsked("donut", true, "paddling")).toEqual({ shape: "donut" });
});
