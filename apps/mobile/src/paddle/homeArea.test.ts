import type { LatLon } from "@shaperoute/shared-types";
import activities from "@shaperoute/shared-types/fixtures/activities.json";

import type { Activity } from "../api/activities";
import { files } from "../engine/memoryFiles";
import { metresBetween } from "../map/coordinates";
import {
  HOME_AREA_FILE,
  HOME_RADIUS_M,
  homeAreaOf,
  loadHomeArea,
  noteHomeArea,
  type Start,
  startOf,
} from "./homeArea";

jest.mock("expo-file-system", () => jest.requireActual("../engine/memoryFiles"));

const [TRENTO_RUN, MILAN_RUN] = activities.activities as Activity[];
const TRENTO: LatLon = [46.0671, 11.1214];
const ROVERETO: LatLon = [45.8906, 11.0401];
const MILAN: LatLon = [45.4642, 9.19];

function start(point: LatLon, place: string | null = null): Start {
  return { point, place };
}

/** A run of the fixture that starts at `point`, from the town `place`. */
function runAt(point: LatLon, place: string | null, id: string): Activity {
  return { ...TRENTO_RUN, id, place, track_preview: [point], route_preview: null };
}

beforeEach(() => {
  files.clear();
});

test("an activity starts where its track does, else where its route does", () => {
  expect(startOf(TRENTO_RUN)).toEqual({ point: TRENTO, place: "Trento" });
  expect(startOf(MILAN_RUN)).toEqual({ point: MILAN, place: null });
  expect(
    startOf({ ...TRENTO_RUN, track_preview: [], route_preview: [ROVERETO] }),
  ).toEqual({ point: ROVERETO, place: "Trento" });
  expect(startOf({ ...TRENTO_RUN, track_preview: [], route_preview: null })).toBeNull();
});

test("the home area is where most activities start, not the latest one", () => {
  const home = homeAreaOf([
    // The latest: a trip to Milan.
    start(MILAN, "Milano"),
    start(TRENTO, "Trento"),
    start([46.07, 11.13], "Trento"),
    start([46.06, 11.11], "Trento"),
  ]);
  expect(home?.place).toBe("Trento");
  expect(metresBetween(home?.point ?? MILAN, TRENTO)).toBeLessThan(1000);
});

test("the centre is that of the starts of the area, the others left out", () => {
  const home = homeAreaOf([start([46.0, 11.0]), start([46.02, 11.0]), start(MILAN)]);
  expect(home?.point[0]).toBeCloseTo(46.01, 6);
  expect(home?.point[1]).toBeCloseTo(11.0, 6);
  expect(home?.place).toBeNull();
});

test("on a tie the latest activity's area wins", () => {
  expect(homeAreaOf([start(MILAN, "Milano"), start(TRENTO, "Trento")])?.place).toBe(
    "Milano",
  );
  expect(homeAreaOf([start(TRENTO, "Trento"), start(MILAN, "Milano")])?.place).toBe(
    "Trento",
  );
});

test("the town is the one most starts of the area have", () => {
  // Rovereto is 20 km from Trento: two areas. Around Trento, two names.
  expect(metresBetween(TRENTO, ROVERETO)).toBeGreaterThan(HOME_RADIUS_M);
  const home = homeAreaOf([
    start([46.06, 11.12], "Gardolo"),
    start(TRENTO, "Trento"),
    start([46.07, 11.12], "Trento"),
    start(ROVERETO, "Rovereto"),
  ]);
  expect(home?.place).toBe("Trento");
});

test("without starts there is no home area", () => {
  expect(homeAreaOf([])).toBeNull();
});

test("the home area is kept on the phone, and read back", () => {
  expect(loadHomeArea()).toBeNull();
  noteHomeArea([
    runAt(TRENTO, "Trento", "a"),
    runAt([46.07, 11.13], "Trento", "b"),
    MILAN_RUN,
  ]);
  expect(Array.from(files.keys())).toEqual([`file:///documents/${HOME_AREA_FILE}`]);
  expect(loadHomeArea()?.place).toBe("Trento");
});

test("no activities leave no home area, and a broken file reads as none", () => {
  noteHomeArea([TRENTO_RUN]);
  expect(loadHomeArea()).not.toBeNull();
  noteHomeArea([]);
  expect(loadHomeArea()).toBeNull();
  files.set(`file:///documents/${HOME_AREA_FILE}`, "{not json");
  expect(loadHomeArea()).toBeNull();
  files.set(`file:///documents/${HOME_AREA_FILE}`, '{"point":[1],"place":null}');
  expect(loadHomeArea()).toBeNull();
});
