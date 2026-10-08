import {
  distanceMOf,
  type DrawDistance,
  type DrawnFor,
  fieldText,
  firstDistance,
  refitDistance,
} from "./drawDistance";

// The distance of «Draw» as App.tsx keeps it (TASK-182 part E): typed, or
// the metres the app chose. In km every text is the one App.tsx wrote
// before; with «Miles» the field reads miles and the API is asked the same
// whole metres.

const runKm: DrawnFor = { activity: "running", units: "km" };
const runMi: DrawnFor = { activity: "running", units: "mi" };

/** The field's text and the metres asked, for `distance` in `drawn`. */
function field(distance: DrawDistance, { activity, units }: DrawnFor) {
  return [fieldText(distance, units), distanceMOf(distance, activity, units)];
}

describe("in kilometres, as before part E", () => {
  test("the field starts at 5 km, 10 by bike, 2 on the water", () => {
    expect(firstDistance(runKm)).toEqual({ text: "5" });
    expect(firstDistance({ activity: "cycling", units: "km" })).toEqual({ text: "10" });
    expect(firstDistance({ activity: "paddling", units: "km" })).toEqual({ text: "2" });
  });

  test("a «Try» and a small lake write their km, asked as they are", () => {
    expect(field({ metres: 12_000 }, runKm)).toEqual(["12", 12_000]);
    expect(field({ metres: 1500 }, { activity: "paddling", units: "km" })).toEqual([
      "1.5",
      1500,
    ]);
    expect(field({ metres: 1000 }, { activity: "paddling", units: "km" })).toEqual([
      "1",
      1000,
    ]);
  });

  test("what is typed is read as ever", () => {
    expect(field({ text: "7,5" }, runKm)).toEqual(["7,5", 7500]);
    expect(field({ text: "22" }, runKm)).toEqual(["22", null]);
    expect(field({ text: "" }, runKm)).toEqual(["", null]);
  });

  test("a sport just chosen brings the distance within its limits", () => {
    const bike: DrawnFor = { activity: "cycling", units: "km" };
    const water: DrawnFor = { activity: "paddling", units: "km" };
    expect(refitDistance({ text: "5" }, runKm, bike)).toEqual({ text: "10" });
    expect(refitDistance({ text: "25" }, bike, runKm)).toEqual({ text: "21" });
    expect(refitDistance({ text: "8" }, runKm, water)).toEqual({ text: "2" });
    // A small lake's 1.5 km are a run's too.
    expect(refitDistance({ metres: 1500 }, water, runKm)).toEqual({ text: "1.5" });
  });
});

describe("with «Miles»", () => {
  test("the field starts at 3 mi, 7 by bike, 1 on the water", () => {
    expect(firstDistance(runMi)).toEqual({ text: "3 mi" });
    expect(firstDistance({ activity: "cycling", units: "mi" })).toEqual({
      text: "7 mi",
    });
    expect(firstDistance({ activity: "paddling", units: "mi" })).toEqual({
      text: "1 mi",
    });
  });

  test("a «Try» shows its miles and asks for its metres", () => {
    // «Try 7 mi» and «Try 3.1 mi» (`RoutePanelMiles.test.tsx`).
    expect(field({ metres: 11_265 }, runMi)).toEqual(["7 mi", 11_265]);
    expect(field({ metres: 4989 }, runMi)).toEqual(["3.1 mi", 4989]);
    expect(field({ metres: 6437 }, { activity: "cycling", units: "mi" })).toEqual([
      "4 mi",
      null,
    ]);
  });

  test("a small lake shows its tenth of a mile, below 1 mi, and asks for its metres", () => {
    const water: DrawnFor = { activity: "paddling", units: "mi" };
    expect(field({ metres: 1500 }, water)).toEqual(["0.9 mi", 1500]);
    expect(field({ metres: 1000 }, water)).toEqual(["0.6 mi", 1000]);
    // Typed, 0.9 mi is below the miles the field takes.
    expect(field({ text: "0.9 mi" }, water)).toEqual(["0.9 mi", null]);
  });

  test("a sport just chosen brings the distance within its miles", () => {
    const bike: DrawnFor = { activity: "cycling", units: "mi" };
    const water: DrawnFor = { activity: "paddling", units: "mi" };
    expect(refitDistance({ metres: 11_265 }, runMi, bike)).toEqual({ text: "7 mi" });
    expect(refitDistance({ text: "3 mi" }, runMi, bike)).toEqual({ text: "7 mi" });
    expect(refitDistance({ text: "18 mi" }, bike, runMi)).toEqual({ text: "13 mi" });
    expect(refitDistance({ text: "3 mi" }, runMi, water)).toEqual({ text: "1 mi" });
    expect(refitDistance({ metres: 1500 }, water, runMi)).toEqual({ text: "1 mi" });
  });
});

describe("«Settings» changes the units with a distance written", () => {
  test("typed: the same distance, to the whole mile or km within the limits", () => {
    expect(refitDistance({ text: "7,5" }, runKm, runMi)).toEqual({ text: "5 mi" });
    expect(refitDistance({ text: "5 mi" }, runMi, runKm)).toEqual({ text: "8" });
    expect(refitDistance({ text: "21" }, runKm, runMi)).toEqual({ text: "13 mi" });
    expect(refitDistance({ text: "1" }, runKm, runMi)).toEqual({ text: "1 mi" });
  });

  test("chosen by the app: from its metres, to the whole mile or km", () => {
    expect(refitDistance({ metres: 11_265 }, runMi, runKm)).toEqual({ text: "11" });
    expect(refitDistance({ metres: 12_000 }, runKm, runMi)).toEqual({ text: "7 mi" });
    const water = (units: "km" | "mi"): DrawnFor => ({ activity: "paddling", units });
    expect(refitDistance({ metres: 1500 }, water("km"), water("mi"))).toEqual({
      text: "1 mi",
    });
  });

  test("what is not a number stays as typed, in the new unit", () => {
    expect(refitDistance({ text: "" }, runKm, runMi)).toEqual({ text: " mi" });
    expect(refitDistance({ text: "abc mi" }, runMi, runKm)).toEqual({ text: "abc" });
  });
});
