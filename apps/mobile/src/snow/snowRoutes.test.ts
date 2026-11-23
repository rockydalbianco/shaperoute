/**
 * A snowshoe route in the app (TASK-413 part B, ADR-0342): what «Draw» says
 * when the snow refuses it, the shapes in pieces kept apart as on the
 * water, the files of other apps that say snowshoes, and the profile's
 * texts the user approved (choice 4, 2026-11-08).
 */
import { sportOfWord } from "../imports/fileTrack";
import { shapeAsked } from "../route/penUpShapes";
import { problemText } from "../route/problems";
import { profileOf } from "../sports";

jest.mock("expo-file-system");

// The API's messages, from the engine (route_engine/snow.py).
const NO_SNOW =
  "there is no open snow to walk on within 2 km of here: off woods, pistes, rock, towns and slopes over 25°";
const TOO_BIG = "the heart does not fit at 3 km on open snow here: it fits at 1.5 km";
const TOO_SMALL = "the heart does not fit on open snow here, even at 0.4 km";

function refused(message: string, fits?: number) {
  return {
    kind: "api_error" as const,
    code: "shape_not_drawable" as const,
    message,
    ...(fits === undefined ? {} : { suggested_distance_m: fits }),
  };
}

test("no open snow near the start, a town too (A3): start near open snow", () => {
  expect(problemText(refused(NO_SNOW), "shape", "snowshoeing", 1000, "km")).toEqual({
    text: "There is no open snow near this start. Start within 2 km of open snow, away from towns, woods and pistes.",
    detail: NO_SNOW,
  });
  expect(problemText(refused(NO_SNOW), "shape", "snowshoeing", 1609, "mi").text).toBe(
    "There is no open snow near this start. Start within 1 mile of open snow, away from towns, woods and pistes.",
  );
});

test("a shape too big offers the half km it fits at, said for the snow", () => {
  expect(
    problemText(refused(TOO_BIG, 1500), "shape", "snowshoeing", 3000, "km"),
  ).toEqual({
    text: "This shape does not fit on the snow here at this distance. It fits at about 1.5 km.",
    detail: TOO_BIG,
    tryDistanceM: 1500,
  });
});

test("a shape that fits nowhere within 0.5–3 km offers the shapes", () => {
  for (const fits of [undefined, 400, 3500]) {
    expect(
      problemText(refused(TOO_SMALL, fits), "shape", "snowshoeing", 500, "km"),
    ).toEqual({
      text: "This shape does not fit on the snow here. Try a shorter distance, another shape, or another start:",
      detail: TOO_SMALL,
      pickShape: true,
    });
  }
});

test("the water's words stay the water's", () => {
  const water = "there is no lake or sea to paddle on within 2 km of here";
  expect(problemText(refused(water), "shape", "paddling", 1000, "km").text).toBe(
    "There is no lake or sea near this start. Start from the shore, within 2 km of the water.",
  );
});

test("a shape in pieces is asked with the pen up on the snow, as on the water", () => {
  expect(shapeAsked("cat", false, "snowshoeing")).toEqual({
    shape: "cat",
    pen_up: true,
  });
  expect(shapeAsked("cat", false, "paddling")).toEqual({ shape: "cat", pen_up: true });
  expect(shapeAsked("heart", true, "snowshoeing")).toEqual({ shape: "heart" });
  // On the roads, the switch decides, as before.
  expect(shapeAsked("cat", false, "running")).toEqual({ shape: "cat" });
});

test("the files of other apps that say snowshoes", () => {
  for (const word of ["snowshoeing", "Snowshoe", "snow_shoeing", "Snow Shoe"]) {
    expect([word, sportOfWord(word)]).toEqual([word, "snowshoeing"]);
  }
  // Nothing else moves.
  expect(sportOfWord("hiking")).toBe("hiking");
  expect(sportOfWord("snowboard")).toBeNull();
});

test("its profile: name, sign and the caution under every route the user approved", () => {
  const profile = profileOf("snowshoeing");
  expect(profile.name).toBe("Snowshoes");
  expect(profile.emoji).toBe("❄️");
  expect(profile.caution).toBe(
    "Off-trail on snow: check the avalanche bulletin first.",
  );
  expect(profile.noWords).toBe(true);
  expect(profile.noImages).toBe(true);
  expect(profile.drawKm).toEqual([0.5, 3]);
  // No pace on the snow: no time under the distance.
  expect(profile.timeAt).toBeUndefined();
});
