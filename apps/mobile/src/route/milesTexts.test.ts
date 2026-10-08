import type { RouteRequest, RouteResult } from "@shaperoute/shared-types";

import { saveLanguageChoice } from "../i18n/language";
import { saveUnitsChoice } from "../units/units";
import { betterDistanceM, betterDistanceText, tryText } from "./betterDistance";
import { fitsAtM, problemText } from "./problems";
import type { RouteProblem } from "./useRouteRequest";
import { roughMetres, toNote } from "./warnings";
import { checkWord, maxWordLetters } from "./wordInput";

// What «Draw» says with «Miles» (TASK-182 part B): the distance where a
// shape comes out better, the one it fits at, what a word needs, the
// engine's warnings. Each file's own test says the km, unchanged.

beforeEach(() => saveUnitsChoice("mi"));
afterEach(() => {
  saveUnitsChoice("phone");
  saveLanguageChoice("phone");
});

const request: RouteRequest = {
  start: [46.0671, 11.1214],
  shape: "heart",
  // 9 mi.
  distance_m: 14484,
  activity: "running",
};

function result(advised: number): RouteResult {
  return {
    points: [
      [46.0671, 11.1214],
      [46.0671, 11.1214],
    ],
    distance_m: 15200,
    similarity: 0.84,
    shape: "heart",
    warnings: [],
    directions: [],
    better_distance_m: advised,
  };
}

describe("where the shape comes out better", () => {
  test("is offered to the whole mile, in whole metres", () => {
    // 12 km are 7.46 mi: 7 mi, 11 265 m.
    expect(betterDistanceM(result(12_000), request)).toBe(11265);
    expect(betterDistanceM(result(8000), request)).toBe(8047);
    // Within the miles of the sport: 21 km are 13 mi, 1 km is 1 mi.
    expect(betterDistanceM(result(21_000), request)).toBe(20921);
    expect(betterDistanceM(result(1000), request)).toBe(1609);
    // Outside what the app offers in km, nothing: as in km.
    expect(betterDistanceM(result(25_000), request)).toBeNull();
    // In km the metres the API said.
    expect(betterDistanceM(result(12_000), request, null, "km")).toBe(12_000);
  });

  test("is not offered when the request is at that mile already", () => {
    // 14.2 km are 8.8 mi: 9 mi, the distance asked.
    expect(betterDistanceM(result(14_200), request)).toBeNull();
    expect(betterDistanceM(result(15_000), request)).toBeNull();
  });

  test("offers no way back to the miles a «Try» has just left", () => {
    const tried = { ...request, distance_m: 11265 };
    const left = { from: request, to: 11265 };
    // The API now advises about the 9 mi just left.
    expect(betterDistanceM(result(14_500), tried, left)).toBeNull();
    expect(betterDistanceM(result(10_000), tried, left)).toBe(9656);
  });

  test("says the miles, and the button asks for them", () => {
    expect(betterDistanceText("shape", 11265)).toBe(
      "This shape comes out better at about 7 mi.",
    );
    expect(betterDistanceText("word", 14484)).toBe(
      "This word comes out better at about 9 mi.",
    );
    expect(betterDistanceText("image", 8047)).toBe(
      "This outline comes out better at about 5 mi.",
    );
    expect(tryText(11265)).toBe("Try 7 mi");
    saveLanguageChoice("it");
    expect(betterDistanceText("shape", 11265)).toBe(
      "Questa forma viene meglio a circa 7 mi.",
    );
    expect(tryText(11265)).toBe("Prova 7 mi");
    // In km, as before.
    expect(tryText(12_000, "km")).toBe("Prova 12 km");
  });
});

describe("the distance a shape fits at", () => {
  const FAR = "the shape fits at about 4 km";
  const notDrawable = {
    kind: "api_error",
    code: "shape_not_drawable",
    message: FAR,
  } as const satisfies RouteProblem;

  test("is offered to the whole mile within the limits", () => {
    expect(fitsAtM(4000, "running")).toBe(3219);
    expect(fitsAtM(21_000, "running")).toBe(20921);
    expect(fitsAtM(10_000, "cycling")).toBe(11265);
    // Outside the km of the sport, nothing: as in km.
    expect(fitsAtM(25_000, "running")).toBeNull();
    expect(fitsAtM(null, "running")).toBeNull();
    expect(fitsAtM(4000, "running", "km")).toBe(4000);
  });

  test("is never the distance that just failed", () => {
    // 3 mi asked, 5 km fit: 3 mi again would fail again; 3.1 mi is offered.
    expect(fitsAtM(5000, "running", "mi", 4828)).toBe(4989);
    // 3 mi asked, 4.8 km fit: nothing else to offer.
    expect(fitsAtM(4800, "running", "mi", 4828)).toBeNull();
    // Another distance asked: the whole mile.
    expect(fitsAtM(5000, "running", "mi", 8047)).toBe(4828);
  });

  test("on the water is rounded down, never up", () => {
    // 2.5 km fit: 1 mi, not the 2 mi (3.2 km) that would not.
    expect(fitsAtM(2500, "paddling", "mi", null, true)).toBe(1609);
    expect(fitsAtM(3500, "paddling", "mi", null, true)).toBe(3219);
    expect(fitsAtM(5000, "paddling", "mi", null, true)).toBe(4828);
    // Under a mile there is none to offer; nor the mile just asked.
    expect(fitsAtM(1500, "paddling", "mi", null, true)).toBeNull();
    expect(fitsAtM(2500, "paddling", "mi", 1609, true)).toBeNull();
  });

  test("is said in miles, for what is drawn", () => {
    expect(problemText({ ...notDrawable, suggested_distance_m: 4000 })).toEqual({
      text: "This shape does not fit the roads here at this distance. It fits at about 2 mi.",
      detail: FAR,
      tryDistanceM: 3219,
    });
    expect(
      problemText({ ...notDrawable, suggested_distance_m: 9000 }, "word").text,
    ).toBe(
      "This word does not fit the roads here at this distance. It fits at about 6 mi.",
    );
    expect(
      problemText({ ...notDrawable, suggested_distance_m: 9000 }, "image").text,
    ).toBe(
      "This image does not fit the roads here at this distance. It fits at about 6 mi.",
    );
    expect(
      problemText(
        { ...notDrawable, suggested_distance_m: 5000 },
        "shape",
        "running",
        4828,
      ),
    ).toMatchObject({
      text: "This shape does not fit the roads here at this distance. It fits at about 3.1 mi.",
      tryDistanceM: 4989,
    });
    // Nothing to offer: the shapes, as without a distance.
    expect(
      problemText(
        { ...notDrawable, suggested_distance_m: 4800 },
        "shape",
        "running",
        4828,
      ),
    ).toEqual({
      text: "This shape does not fit the roads here. Try another shape, or another start:",
      detail: FAR,
      pickShape: true,
    });
  });

  test("is said in miles on the water", () => {
    const TOO_BIG = "the shape does not fit within 1000 m of the shore";
    expect(
      problemText(
        { ...notDrawable, message: TOO_BIG, suggested_distance_m: 3500 },
        "shape",
        "paddling",
        4828,
      ),
    ).toEqual({
      text: "This shape does not fit on the water here at this distance. It fits at about 2 mi.",
      detail: TOO_BIG,
      tryDistanceM: 3219,
    });
    expect(
      problemText(
        { ...notDrawable, message: TOO_BIG, suggested_distance_m: 1500 },
        "shape",
        "paddling",
        1609,
      ),
    ).toMatchObject({
      text: "This shape does not fit on the water here. Try a shorter distance, another shape, or another start:",
      pickShape: true,
    });
    const NO_WATER = "no lake or sea within 2000 m of the start";
    expect(
      problemText({ ...notDrawable, message: NO_WATER }, "shape", "paddling").text,
    ).toBe(
      "There is no lake or sea near this start. Start from the shore, within 1 mile of the water.",
    );
  });
});

describe("a word", () => {
  test("has six letters at most on a run of 13 mi, eight by bike", () => {
    expect(maxWordLetters("running")).toBe(6);
    expect(maxWordLetters("running", "km")).toBe(7);
    expect(maxWordLetters("cycling")).toBe(8);
    expect(maxWordLetters("cycling", "km")).toBe(8);
    expect(checkWord("ABCDEFG", 20921)).toEqual({
      ok: false,
      problem: "At most 6 letters: each needs 1.9 mi, and the app goes up to 13 mi.",
    });
    expect(checkWord("ABCDEFG", 28968, "cycling")).toEqual({
      ok: true,
      word: "ABCDEFG",
    });
    expect(checkWord("ABCDEF", 20921)).toEqual({ ok: true, word: "ABCDEF" });
  });

  test("says in miles what it needs, never less than it does", () => {
    // 3 mi asked; CIAO needs 12 km, 7.46 mi.
    expect(checkWord("ciao", 4828)).toEqual({
      ok: false,
      problem: "“CIAO” needs at least 7.5 mi: 1.9 mi for each letter.",
      needsDistanceM: 12_000,
    });
    saveLanguageChoice("it");
    expect(checkWord("ciao", 4828)).toMatchObject({
      problem: "A «CIAO» servono almeno 7,5 mi: 1,9 mi per ogni lettera.",
    });
    // In km too, in the app's language (TASK-210, «Draw»).
    expect(checkWord("ciao", 5000, "running", "km")).toMatchObject({
      problem: "A «CIAO» servono almeno 12 km: 3 km per ogni lettera.",
    });
  });
});

describe("the engine's warnings", () => {
  test("say feet under a thousand of them, miles from there", () => {
    expect(toNote("120 m of the route on steps").text).toBe(
      "There are 400 ft of steps along the way.",
    );
    expect(toNote("1400 m of the route on main roads").text).toBe(
      "0.9 mi runs along main roads, with traffic.",
    );
    expect(toNote("60 m of the route in tunnels").text).toBe(
      "200 ft runs through tunnels.",
    );
    expect(
      toNote("start is 35 m from the nearest road; the route begins there").text,
    ).toBe("The nearest road is 100 ft away: the route begins there.");
    // Never "0 ft".
    expect(toNote("4 m of the route on steps").text).toBe(
      "There are 50 ft of steps along the way.",
    );
  });

  test("turn the engine's own distance to miles", () => {
    const moved = (distance: string) =>
      toNote(
        `start moved ${distance} north-east of the requested point, where the shape closes on the roads`,
      ).text;
    expect(moved("1.2 km")).toBe(
      "The route starts 0.7 mi north-east of your start, where the shape fits the roads. Go to “Start here”.",
    );
    expect(moved("250 m")).toBe(
      "The route starts 800 ft north-east of your start, where the shape fits the roads. Go to “Start here”.",
    );
    expect(moved("2 km")).toMatch(/^The route starts 1\.2 mi north-east/);
  });

  test("say the bike walked in feet or miles", () => {
    expect(roughMetres(920)).toBe("0.6 mi");
    expect(roughMetres(120)).toBe("400 ft");
    expect(roughMetres(3)).toBe("50 ft");
    expect(toNote("1100 m of the route with the bike on foot").text).toBe(
      "Includes 0.7 mi walking the bike.",
    );
    saveLanguageChoice("it");
    expect(roughMetres(1100)).toBe("0,7 mi");
  });
});
