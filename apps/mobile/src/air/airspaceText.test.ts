/**
 * The words of an airspace (TASK-479 part E2): its limits as pilots write
 * them, and the approved warning line, «inside» or how far.
 */
import { nearAirspaces } from "./airspaceNear";
import { limitLabel, nearLine } from "./airspaceText";
import type { Airspace } from "./openair";

const BOX: Airspace = {
  class: "R",
  name: "TEST BOX",
  floor: { kind: "aboveSea", metres: 1000 },
  ceiling: { kind: "flightLevel", level: 95 },
  points: [
    [45.0, 10.0],
    [45.0, 10.03],
    [45.02, 10.03],
    [45.02, 10.0],
  ],
};

it("writes limits as pilots do, in the pilot's unit", () => {
  expect(limitLabel({ kind: "ground" }, "m")).toBe("GND");
  expect(limitLabel({ kind: "unlimited" }, "m")).toBe("UNL");
  expect(limitLabel({ kind: "flightLevel", level: 95 }, "m")).toBe("FL95");
  expect(limitLabel({ kind: "aboveSea", metres: 1000 }, "m")).toBe("1000 m");
  expect(limitLabel({ kind: "aboveSea", metres: 1000 }, "ft")).toBe("3281 ft");
  expect(limitLabel({ kind: "aboveGround", metres: 300 }, "m")).toBe("300 m AGL");
});

it("says the warning: name, class, inside or how far, the floor", () => {
  const inside = nearAirspaces([BOX], [45.01, 10.015], 1500, null)[0];
  expect(nearLine(inside, "km", "m")).toBe("TEST BOX (R) · inside · floor 1000 m");
  const south = nearAirspaces([BOX], [44.993, 10.015], 1500, null)[0];
  expect(nearLine(south, "km", "m")).toBe("TEST BOX (R) · 778 m · floor 1000 m");
});
