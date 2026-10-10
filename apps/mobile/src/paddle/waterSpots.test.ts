import type { LatLon } from "@shaperoute/shared-types";

import { MORE_SHAPES, PADDLE_EXAMPLES } from "../explore/exampleRoutes";
import beaches from "./beaches.json";
import lakes from "./lakes.json";
import { spotPlaces } from "./placeSpots";
import { WATER_PLACES } from "./waterPlaces";
import {
  allSpots,
  byName,
  examplesAt,
  kindOf,
  NEAR_ME_M,
  nearestSpot,
  searchSpots,
  WATER_SPOTS,
  type WaterSpot,
} from "./waterSpots";

const LEVICO_TERME: LatLon = [46.0122, 11.2986];
const RIVA: LatLon = WATER_PLACES[0].point;

const SPOTS: WaterSpot[] = [
  { name: "Lago di Garda", point: RIVA, distance_m: 2000, from: "from Riva del Garda" },
  { name: "Lago di Garda", point: [45.55, 10.7], distance_m: 2000 },
  { name: "Lago di Levico", point: [46.0085, 11.283], distance_m: 2000 },
  { name: "Lago di Cà Selva", point: [46.29, 12.72], distance_m: 1000 },
  { name: "Lago d'Idro", point: [45.77, 10.52], distance_m: 2000 },
];

test("the list is the lakes the command wrote, each a name, a point and a distance", () => {
  expect(lakes.lakes.length).toBeGreaterThan(0);
  for (const lake of lakes.lakes) {
    expect(typeof lake.name).toBe("string");
    expect(lake.point).toHaveLength(2);
    expect([1000, 1500, 2000]).toContain(lake.distance_m);
  }
  // The lake of the user's request.
  expect(lakes.lakes.map((lake) => lake.name)).toContain("Lago di Levico");
});

test("the beaches are the seaside places the command wrote, one point each", () => {
  expect(beaches.beaches.length).toBeGreaterThan(0);
  const names = beaches.beaches.map((beach) => beach.name);
  expect(new Set(names).size).toBe(names.length);
  for (const beach of beaches.beaches) {
    expect(beach.point).toHaveLength(2);
    expect([1000, 1500, 2000]).toContain(beach.distance_m);
  }
  // Jesolo and Riccione are chosen by hand, with their examples in the app.
  expect(names).not.toContain("Jesolo");
  expect(names).not.toContain("Riccione");
  // Every beach is a spot of the sea, after the lakes, as the command wrote
  // it (TASK-269: its kind for the filter).
  expect(WATER_SPOTS.slice(-names.length)).toEqual(
    beaches.beaches.map((beach) => ({ ...beach, kind: "sea" })),
  );
  expect(WATER_SPOTS).toHaveLength(allSpots(lakes.lakes).length + names.length);
});

test("a new beach is found by its name in «Explore» and in «Another place»", () => {
  const [beach] = beaches.beaches;
  const word = beach.name.split(" ")[0].toLowerCase();
  expect(
    searchSpots(WATER_SPOTS, beach.name, null).map(({ spot }) => spot.name),
  ).toContain(beach.name);
  expect(searchSpots(WATER_SPOTS, word, null).map(({ spot }) => spot)).toContainEqual({
    ...beach,
    kind: "sea",
  });
  // «Another place» reads the text as an address (TASK-240).
  expect(spotPlaces(`spiaggia di ${beach.name}`, null)).toContainEqual({
    label: beach.name,
    point: beach.point,
    distance_m: beach.distance_m,
  });
  // From its own shore it is the spot of «Near me».
  expect(nearestSpot(WATER_SPOTS, beach.point as LatLon)?.spot.name).toBe(beach.name);
});

test("every beach is found by its whole name, the ones added in TASK-245 C too", () => {
  const names = beaches.beaches.map((beach) => beach.name);
  for (const name of ["Positano", "Lampedusa", "Porto Cervo", "Santa Maria di Leuca"]) {
    expect(names).toContain(name);
  }
  for (const beach of beaches.beaches) {
    expect(
      searchSpots(WATER_SPOTS, beach.name, null).map(({ spot }) => spot.name),
    ).toContain(beach.name);
    expect(spotPlaces(beach.name, null).map((place) => place.label)).toContain(
      beach.name,
    );
    expect(nearestSpot(WATER_SPOTS, beach.point as LatLon)?.spot.name).toBe(beach.name);
  }
});

test("the places chosen by hand come first, and the list does not double them", () => {
  expect(WATER_SPOTS.slice(0, 4).map((spot) => spot.name)).toEqual(
    WATER_PLACES.map((place) => place.name),
  );
  expect(WATER_SPOTS.slice(0, 4).every((spot) => spot.from !== undefined)).toBe(true);
  const listed = [
    // 1 km from Riva del Garda, the same lake: the place chosen by hand.
    { name: "Lago di Garda", point: [RIVA[0] - 0.009, RIVA[1]], distance_m: 2000 },
    // The same lake, 30 km south: a point of its own.
    { name: "Lago di Garda", point: [45.6, 10.7], distance_m: 2000 },
    // Another water beside Riva.
    { name: "Lago di Tenno", point: [RIVA[0] + 0.01, RIVA[1]], distance_m: 1000 },
    { name: "not a spot" },
  ];
  expect(allSpots(listed).map((spot) => [spot.name, spot.point[0]])).toEqual([
    ...WATER_PLACES.map((place) => [place.name, place.point[0]]),
    ["Lago di Garda", 45.6],
    ["Lago di Tenno", RIVA[0] + 0.01],
  ]);
});

test("each spot is a lake or the sea, by the list it comes from (TASK-269)", () => {
  expect(WATER_SPOTS.slice(0, 4).map(kindOf)).toEqual(["lake", "lake", "sea", "sea"]);
  const kinds = new Map(WATER_SPOTS.slice(4).map((spot) => [spot.name, kindOf(spot)]));
  for (const lake of lakes.lakes) {
    expect(kinds.get(lake.name)).toBe("lake");
  }
  for (const beach of beaches.beaches) {
    expect(kinds.get(beach.name)).toBe("sea");
  }
  // A spot that does not say is a lake.
  expect(kindOf(SPOTS[2])).toBe("lake");
});

test("a name is one spot: the nearest to the start, the nearest name first", () => {
  const found = byName(SPOTS, LEVICO_TERME);
  expect(found.map(({ spot }) => spot.name)).toEqual([
    "Lago di Levico",
    "Lago di Garda",
    "Lago d'Idro",
    "Lago di Cà Selva",
  ]);
  // Of the two points of the Garda, Riva is the nearer from Levico.
  expect(found[1].spot.point).toEqual(RIVA);
  expect(found[0].away_m).toBeGreaterThan(1000);
  expect(found[0].away_m).toBeLessThan(1500);
  // From Desenzano it is the other one.
  const south = byName(SPOTS, [45.47, 10.54]);
  expect(south[0].spot).toEqual(SPOTS[1]);
});

test("without a start a name is its first spot, as listed", () => {
  const found = byName(SPOTS, null);
  expect(found.map(({ spot }) => spot.name)).toEqual([
    "Lago di Garda",
    "Lago di Levico",
    "Lago di Cà Selva",
    "Lago d'Idro",
  ]);
  expect(found[0].spot.from).toBe("from Riva del Garda");
  expect(found.every(({ away_m }) => away_m === null)).toBe(true);
});

test("a lake is found by the beginning of any word of its name, accents or not", () => {
  const names = (query: string) =>
    searchSpots(SPOTS, query, null).map(({ spot }) => spot.name);
  expect(names("lev")).toEqual(["Lago di Levico"]);
  expect(names("LAGO lev")).toEqual(["Lago di Levico"]);
  expect(names("ca selva")).toEqual(["Lago di Cà Selva"]);
  expect(names("idro")).toEqual(["Lago d'Idro"]);
  expect(names("lago")).toHaveLength(4);
  // Not the middle of a word.
  expect(names("vico")).toEqual([]);
  expect(names("  ")).toEqual([]);
  // The nearest first, with a start.
  expect(searchSpots(SPOTS, "lago", LEVICO_TERME)[0].spot.name).toBe("Lago di Levico");
});

test("«Near me» is the nearest spot, when it is near enough", () => {
  expect(nearestSpot(SPOTS, LEVICO_TERME)?.spot.name).toBe("Lago di Levico");
  // In the middle of the Ionian Sea.
  expect(nearestSpot(SPOTS, [36.0, 18.5])).toBeNull();
  expect(NEAR_ME_M).toBe(30_000);
  // From Levico Terme, the real list has its lake first.
  expect(nearestSpot(WATER_SPOTS, LEVICO_TERME)?.spot.name).toBe("Lago di Levico");
});

test("2 km examples are the app's; a smaller distance has a set of its own", () => {
  expect(examplesAt(2000)).toBe(PADDLE_EXAMPLES);
  const small = examplesAt(1000);
  expect(small).toEqual({
    activity: "paddling",
    distance_m: 1000,
    more: MORE_SHAPES,
    prefix: "paddling:1000:",
  });
  // The same set each time: the examples' hook keys on it.
  expect(examplesAt(1000)).toBe(small);
  expect(examplesAt(1500).prefix).toBe("paddling:1500:");
});
