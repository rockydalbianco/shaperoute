/**
 * What «Draw» asks for each sport (TASK-414 part B): a word or a picture the
 * sport does not draw waits for another sport, as on the water before
 * (TASK-191, TASK-323); a shape a wheelchair does not draw is not asked.
 */
import { ACTIVITIES, SHAPES } from "@shaperoute/shared-types";

import { drawKindOf, figuresOf, shapeOfSport } from "./sportDraw";

test("on the water and swimming, as before the profiles said it", () => {
  for (const kind of ["shape", "word", "image"] as const) {
    expect(drawKindOf(kind, "paddling")).toBe("shape");
  }
  expect(drawKindOf("word", "swimming")).toBe("shape");
  expect(drawKindOf("image", "swimming")).toBe("image");
  for (const kind of ["shape", "word", "image"] as const) {
    expect(drawKindOf(kind, "running")).toBe(kind);
    expect(drawKindOf(kind, "cycling")).toBe(kind);
  }
});

test("a wheelchair asks a shape, whatever was chosen before", () => {
  for (const kind of ["shape", "word", "image"] as const) {
    expect(drawKindOf(kind, "wheelchair")).toBe("shape");
  }
});

test("a wheelchair asks only a circle, a heart, a star or a moon", () => {
  const asked = SHAPES.filter((shape) => shapeOfSport(shape, "wheelchair") !== null);
  expect(asked).toEqual(["circle", "heart", "star", "moon"]);
  expect(shapeOfSport("horse", "wheelchair")).toBeNull();
  expect(shapeOfSport(null, "wheelchair")).toBeNull();
});

test("every other sport asks every shape of the catalogue", () => {
  for (const activity of ACTIVITIES.filter((a) => a !== "wheelchair")) {
    for (const shape of SHAPES) {
      expect(shapeOfSport(shape, activity)).toBe(shape);
    }
  }
});

test("under a wheelchair route: its four shapes, no picture, no drawing by hand", () => {
  expect(figuresOf("wheelchair")).toEqual({
    shapes: ["circle", "heart", "star", "moon"],
    pictures: false,
    editDrawing: false,
  });
});

test("under the other routes as before: every shape, pictures but on the water", () => {
  expect(figuresOf("running")).toEqual({
    shapes: SHAPES,
    pictures: true,
    editDrawing: true,
  });
  expect(figuresOf("paddling")).toEqual({
    shapes: SHAPES,
    pictures: false,
    editDrawing: true,
  });
  expect(figuresOf("swimming").pictures).toBe(true);
  expect(figuresOf("cycling").editDrawing).toBe(true);
});
