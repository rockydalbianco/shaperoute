import type { LatLon } from "@shaperoute/shared-types";

import type { Place } from "../places/photon";
import {
  distanceOnSpot,
  findSpots,
  SPOT_PLACES_SHOWN,
  type SpotPlace,
  spotPlaces,
} from "./placeSpots";
import { WATER_SPOTS, type WaterSpot } from "./waterSpots";

const LEVICO_TERME: LatLon = [46.0122, 11.2986];

/** The names found for a text, on the app's own list. */
function names(query: string, from: LatLon | null = LEVICO_TERME): string[] {
  return findSpots(WATER_SPOTS, query, from).map(({ spot }) => spot.name);
}

test("the user's text finds the lake: «Terme» is in no lake's name", () => {
  expect(names("lago di Levico Terme")).toEqual(["Lago di Levico"]);
  expect(names("levico terme")).toEqual(["Lago di Levico"]);
  expect(names("Lago di Caldonazzo, Trento")).toEqual(["Lago di Caldonazzo"]);
});

test("a name is found as in «Explore»: its beginning, without accents or capitals", () => {
  // «lev» begins «Levico» and the «Levante» of a beach (TASK-245): the
  // nearest first.
  expect(names("lev")).toEqual(["Lago di Levico", "Sestri Levante"]);
  expect(names("LAGO LEV")).toEqual(["Lago di Levico", "Sestri Levante"]);
  expect(names("levi")).toEqual(["Lago di Levico"]);
  expect(names("lago d'iseo")).toEqual(["Lago d'Iseo"]);
  expect(names("como")).toEqual(["Lago di Como"]);
});

test("only the last word typed may be the beginning of a word of a name", () => {
  // Still being written.
  expect(names("via")).toEqual(["Viareggio"]);
  expect(names("viar")).toEqual(["Viareggio"]);
  expect(names("lago di lev")).toEqual(["Lago di Levico", "Sestri Levante"]);
  // Written whole: «via» is no «Viareggio», «lev» no «Levico».
  expect(names("via Roma, Trento")).toEqual([]);
  expect(names("via r")).toEqual([]);
  expect(names("lev terme")).toEqual([]);
  expect(names("levico terme")).toEqual(["Lago di Levico"]);
});

test("a beach of the list is found, with one word of its name or more", () => {
  expect(names("forte dei marmi")).toEqual(["Forte dei Marmi"]);
  expect(names("Forte dei Marmi, Lucca")).toEqual(["Forte dei Marmi"]);
  expect(names("spiaggia di san vito lo capo")).toEqual(["San Vito lo Capo"]);
  expect(names("san vito")).toEqual(["San Vito lo Capo"]);
  expect(names("sestri lev")).toEqual(["Sestri Levante"]);
  expect(names("lungomare di Viareggio")).toEqual(["Viareggio"]);
  const [forte] = spotPlaces("forte dei marmi", null);
  expect(forte.label).toBe("Forte dei Marmi");
  expect(forte.distance_m).toBe(2000);
});

test("the two beaches are found, with the words around them", () => {
  expect(names("jesolo lido")).toEqual(["Jesolo"]);
  expect(names("spiaggia di Riccione")).toEqual(["Riccione"]);
});

test("«lago» alone is every lake, the nearest first", () => {
  const found = names("lago");
  expect(found.length).toBeGreaterThan(100);
  expect(found[0]).toBe("Lago di Levico");
  expect(found[1]).toBe("Lago di Caldonazzo");
});

test("a street is no lake: common words do not find one beside an unknown word", () => {
  expect(names("via al lago")).toEqual([]);
  expect(names("via del lago")).toEqual([]);
  expect(names("via Roma, Trento")).toEqual([]);
  expect(names("piazza Duomo")).toEqual([]);
  expect(names("via San Marco")).toEqual([]);
});

test("every telling word must be in the name", () => {
  expect(names("lago di levico caldonazzo")).toEqual([]);
  expect(names("san giovanni")).toEqual(
    expect.arrayContaining(["Lago San Giovanni", "Lago di San Giovanni Incarico"]),
  );
  expect(names("san giovanni")).toHaveLength(2);
});

test("nothing typed finds nothing", () => {
  expect(names("")).toEqual([]);
  expect(names("  , ")).toEqual([]);
});

test("without a position the places chosen by hand come first", () => {
  expect(names("lago", null).slice(0, 2)).toEqual(["Lago di Garda", "Lago di Como"]);
});

test("a short list has no common words until a word is in more than three names", () => {
  const spots: WaterSpot[] = [
    { name: "Lago di Levico", point: [46.0085, 11.283], distance_m: 2000 },
    { name: "Lago di Cà Selva", point: [46.29, 12.72], distance_m: 1000 },
  ];
  const found = (query: string) =>
    findSpots(spots, query, null).map(({ spot }) => spot.name);
  expect(found("ca selva")).toEqual(["Lago di Cà Selva"]);
  expect(found("lago di levico terme")).toEqual(["Lago di Levico"]);
});

test("the places offered are a few, each on the shore, with its distance", () => {
  const offered = spotPlaces("lago", LEVICO_TERME);
  expect(offered).toHaveLength(SPOT_PLACES_SHOWN);
  const [levico] = spotPlaces("lago di Levico Terme", LEVICO_TERME);
  const listed = WATER_SPOTS.filter((spot) => spot.name === "Lago di Levico");
  expect(levico.label).toBe("Lago di Levico");
  expect(listed.map((spot) => spot.point)).toContainEqual(levico.point);
  expect(levico.distance_m).toBe(2000);
});

test("a long shore is offered at its point nearest the position", () => {
  const riva: LatLon = [45.885, 10.841];
  const sirmione: LatLon = [45.492, 10.608];
  const north = spotPlaces("garda", riva)[0];
  const south = spotPlaces("garda", sirmione)[0];
  expect(north.label).toBe("Lago di Garda");
  expect(south.label).toBe("Lago di Garda");
  expect(north.point[0]).toBeGreaterThan(45.8);
  expect(south.point[0]).toBeLessThan(45.6);
});

/** A lake as the search offers it, its shapes fitting at `distance_m`. */
function lake(distance_m: number): SpotPlace {
  return { label: "Lago di Tovel", point: [46.26, 10.95], distance_m };
}

test("a small lake brings the distance down to the one its shapes fit at", () => {
  expect(distanceOnSpot(lake(1000), 2000)).toBe(1000);
  expect(distanceOnSpot(lake(1500), 5000)).toBe(1500);
  // No distance typed yet, or one out of the limits.
  expect(distanceOnSpot(lake(1500), null)).toBe(1500);
});

test("the distance stays when it fits, on a lake of 2 km and on a street", () => {
  const street: Place = { label: "Via al Lago, Levico Terme", point: [46, 11.3] };
  expect(distanceOnSpot(lake(1500), 1000)).toBeNull();
  expect(distanceOnSpot(lake(1500), 1500)).toBeNull();
  expect(distanceOnSpot(lake(2000), 5000)).toBeNull();
  expect(distanceOnSpot(street, 5000)).toBeNull();
});
