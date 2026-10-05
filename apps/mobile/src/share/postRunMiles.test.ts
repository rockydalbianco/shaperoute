import { saveUnitsChoice } from "../units/units";
import { postCaption, type PostRun, resultsOf, resultValue } from "./postRun";

// The post of a run in the app's units (TASK-182): with «Miles» the numbers
// on the image and in the text that goes to Strava are miles.

const RUN: PostRun = {
  key: "run-1",
  title: "Heart in Trento",
  track: [],
  distanceM: 5200,
  durationMs: (28 * 60 + 10) * 1000,
};

afterEach(() => {
  saveUnitsChoice("phone");
});

test("with «Miles» the post says miles and the pace per mile", () => {
  saveUnitsChoice("mi");
  expect(resultsOf(RUN)).toEqual(["distance", "time", "pace"]);
  expect(resultValue(RUN, "distance")).toBe("3.23 mi");
  expect(resultValue(RUN, "time")).toBe("28:10");
  expect(resultValue(RUN, "pace")).toBe("8:43 /mi");
  expect(postCaption(RUN, ["pace", "distance", "time"], ["🔥"])).toBe(
    "🔥 3.23 mi · 28:10 · 8:43 /mi",
  );
});

test("back in kilometres it says what it always said", () => {
  saveUnitsChoice("mi");
  saveUnitsChoice("km");
  expect(resultValue(RUN, "distance")).toBe("5.20 km");
  expect(resultValue(RUN, "pace")).toBe("5:25 /km");
});
