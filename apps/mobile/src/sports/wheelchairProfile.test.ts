/**
 * «Wheelchair & stroller» ♿ in the app (TASK-414 part B, ADR-0343): its row
 * in «Settings», on since the server has part A (0071); offered in the search
 * and the form to publish while ready; the caution under its routes; its
 * four shapes; its bests over 1 and 5 km; the time at a walker's pace; the
 * files of other apps that say a wheelchair.
 */
import { WHEELCHAIR_BEST_DISTANCES } from "@shaperoute/shared-types";

import { translate } from "../i18n/translate";
import { sportOfWord } from "../imports/fileTrack";
import { withoutRouteIcon } from "../screens/RunNoRouteButton";
import { SEARCH_ACTIVITIES } from "../search/searchFilters";
import {
  activityOf,
  activityOffered,
  ALL_SPORTS,
  canChoose,
  runActivityOf,
  type SportOption,
  withoutRouteLabel,
} from "../settings/sport";
import { profileOf } from "./index";

jest.mock("expo-file-system");

const CAUTION =
  "Map data can miss kerbs, steps and steep slopes: check the route before you set off.";

test("«Wheelchair & stroller» ♿ comes after «Roller», on since the server has part A", () => {
  const index = ALL_SPORTS.findIndex((option) => option.id === "wheelchair");
  expect(ALL_SPORTS[index - 1]?.id).toBe("roller");
  expect(ALL_SPORTS[index]).toEqual({
    id: "wheelchair",
    emoji: "♿",
    name: "Wheelchair & stroller",
    ready: true,
  });
  expect(canChoose("wheelchair", ALL_SPORTS)).toBe(true);
  // Asked, and saved, as itself; out with its own words, which say no walk.
  expect(activityOf("wheelchair")).toBe("wheelchair");
  expect(runActivityOf("wheelchair")).toBe("wheelchair");
  expect(withoutRouteLabel("wheelchair")).toBe("Go without a route");
  expect(withoutRouteIcon("wheelchair")).toBe("♿");
});

test("a wheelchair route is offered to search and publish while ready", () => {
  expect(activityOffered("wheelchair")).toBe(true);
  expect(SEARCH_ACTIVITIES).toContain("wheelchair");
  const soon: SportOption[] = ALL_SPORTS.map((option) =>
    option.id === "wheelchair" ? { ...option, ready: false } : option,
  );
  expect(activityOffered("wheelchair", soon)).toBe(false);
  expect(activityOffered("walking", soon)).toBe(true);
});

test("its profile: four shapes, no word nor image, a walker's time, bests over 1 and 5 km", () => {
  const profile = profileOf("wheelchair");
  expect(profile.shapes).toEqual(["circle", "heart", "star", "moon"]);
  expect(profile.noWords).toBe(true);
  expect(profile.noImages).toBe(true);
  expect(profile.drawKm).toEqual([1, 5]);
  expect(profile.timeAt).toBe("walker");
  expect(profile.bests).toEqual({ distances: WHEELCHAIR_BEST_DISTANCES, named: "km" });
  expect(WHEELCHAIR_BEST_DISTANCES).toEqual(["1k", "5k"]);
  // Apple's Wheelchair Walk Pace and Health Connect's wheelchair, for a
  // stroller too (the user's choice 8); no distance of the day in Apple
  // Health, which would count a stroller's metres as a wheelchair's.
  expect(profile.appleWorkout).toBe(70);
  expect(profile.healthConnect).toBe(82);
  expect(profile.appleDistance).toBeUndefined();
  // Its numbers are a walk's: a pace, no ride.
  expect(profile.rides).toBeUndefined();
  expect(profile.freeRunAs).toBe("wheelchair");
  // No other sport limits its shapes.
  for (const activity of ["running", "walking", "hiking", "paddling"] as const) {
    expect(profileOf(activity).shapes).toBeUndefined();
  }
});

test("a wheelchair route says the map can miss kerbs, steps and slopes, in five languages", () => {
  expect(profileOf("wheelchair").caution).toBe(CAUTION);
  const texts = (["it", "de", "fr", "es"] as const).map((language) => [
    translate(language, "Wheelchair & stroller"),
    translate(language, "Go without a route"),
    translate(language, profileOf("wheelchair").caution ?? ""),
  ]);
  // The user's choice 6.
  expect(texts).toEqual([
    [
      "Carrozzina e passeggino",
      "Vai senza percorso",
      "I dati della mappa possono non segnare cordoli, gradini e salite ripide: controlla il percorso prima di partire.",
    ],
    [
      "Rollstuhl & Kinderwagen",
      "Ohne Route los",
      "Die Kartendaten zeigen nicht immer Bordsteine, Stufen und steile Steigungen: Prüf die Route, bevor du losgehst.",
    ],
    [
      "Fauteuil et poussette",
      "Partir sans parcours",
      "Les données de la carte peuvent oublier des bordures, des marches et des pentes raides : vérifie le parcours avant de partir.",
    ],
    [
      "Silla y carrito",
      "Salir sin ruta",
      "Los datos del mapa pueden no mostrar bordillos, escalones y cuestas pronunciadas: revisa la ruta antes de salir.",
    ],
  ]);
});

test("a file that says a wheelchair is one, never a run", () => {
  expect(sportOfWord("wheelchair")).toBe("wheelchair");
  expect(sportOfWord("Wheelchair")).toBe("wheelchair");
  // Garmin's, before «run» is read in it.
  expect(sportOfWord("wheelchair_push_run")).toBe("wheelchair");
  expect(sportOfWord("wheelchair_push_walk")).toBe("wheelchair");
  expect(sportOfWord("running")).toBe("running");
});
