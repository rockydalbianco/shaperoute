import { PEN_UP_SHAPES, SHAPES } from "@shaperoute/shared-types";

import { apartOnWater, isPenUpShape, offersPenUp, shapeAsked } from "./penUpShapes";

// Every shape in pieces but the sun, in the order of the catalogue.
const EIGHT = [
  "cat",
  "fish",
  "dog_head",
  "rabbit_head",
  "pumpkin",
  "smiley",
  "ghost",
  "donut",
];

test("the pen up is offered for the shapes the user chose, the eyes too", () => {
  // The smiley, the ghost and the donut (TASK-223), then the eyes of the
  // cat, the fish, the heads and the pumpkin (2026-10-05).
  expect(SHAPES.filter(offersPenUp)).toEqual(EIGHT);
  // The sun is drawn with the pen down.
  expect(offersPenUp("sun")).toBe(false);
  expect(offersPenUp("heart")).toBe(false);
  expect(offersPenUp(null)).toBe(false);
});

test("on the water every shape in pieces but the sun is drawn in pieces", () => {
  expect(SHAPES.filter(apartOnWater)).toEqual(EIGHT);
  expect(apartOnWater("sun")).toBe(false);
  expect(apartOnWater("heart")).toBe(false);
  expect(apartOnWater(null)).toBe(false);
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
  expect(shapeAsked("cat", true, "running")).toEqual({ shape: "cat", pen_up: true });
  // Switched off, or another shape: the request of before.
  expect(shapeAsked("smiley", false, "running")).toEqual({ shape: "smiley" });
  expect(shapeAsked("sun", true, "running")).toEqual({ shape: "sun" });
  expect(shapeAsked("heart", true, "running")).toEqual({ shape: "heart" });
});

test("on the water the pen goes up by itself, whatever the switch says", () => {
  for (const penUp of [true, false]) {
    expect(shapeAsked("donut", penUp, "paddling")).toEqual({
      shape: "donut",
      pen_up: true,
    });
    expect(shapeAsked("dog_head", penUp, "paddling")).toEqual({
      shape: "dog_head",
      pen_up: true,
    });
    // The sun and the shapes in one line: the request of before.
    expect(shapeAsked("sun", penUp, "paddling")).toEqual({ shape: "sun" });
    expect(shapeAsked("heart", penUp, "paddling")).toEqual({ shape: "heart" });
  }
});
