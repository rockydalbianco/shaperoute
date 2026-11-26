import type { LatLon } from "@shaperoute/shared-types";

import { files } from "../engine/memoryFiles";
import {
  keepPoor,
  MAX_POOR,
  poorFrom,
  readSurprise,
  SURPRISE_FILE,
  surpriseFile,
  type SurpriseKept,
  type SurpriseStorage,
} from "./surpriseKept";
import type { SurprisePick } from "./surprisePick";

jest.mock("expo-file-system", () => jest.requireActual("../engine/memoryFiles"));

const trento: LatLon = [46.0702, 11.1265];
// About 300 m north, and about 3 km north.
const nearTrento: LatLon = [46.0729, 11.1265];
const farFromTrento: LatLon = [46.0972, 11.1265];

/** The file as the in-memory file system names it. */
const FILE_URI = `file:///documents/${SURPRISE_FILE}`;

const HEART_5: SurprisePick = { shape: "heart", distanceM: 5000 };
const HORSE_10: SurprisePick = { shape: "horse", distanceM: 10000 };

function memory(first: SurpriseKept | null = null): SurpriseStorage & {
  kept: () => SurpriseKept | null;
  saves: () => number;
} {
  let kept = first;
  let saves = 0;
  return {
    load: () => kept,
    save: (next) => {
      kept = next;
      saves += 1;
    },
    kept: () => kept,
    saves: () => saves,
  };
}

beforeEach(() => {
  files.clear();
});

test("nothing kept: nothing came out poorly", () => {
  expect(poorFrom(trento, memory())).toEqual([]);
});

test("a pair kept from a start is the start's, and of 300 m away", () => {
  const storage = memory();
  keepPoor(trento, HEART_5, storage);
  expect(poorFrom(trento, storage)).toEqual([HEART_5]);
  expect(poorFrom(nearTrento, storage)).toEqual([HEART_5]);
  expect(storage.kept()?.point).toEqual(trento);
});

test("3 km away is another start: nothing poor there", () => {
  const storage = memory();
  keepPoor(trento, HEART_5, storage);
  expect(poorFrom(farFromTrento, storage)).toEqual([]);
});

test("a second pair joins the first, and the point stays the first one", () => {
  const storage = memory();
  keepPoor(trento, HEART_5, storage);
  keepPoor(nearTrento, HORSE_10, storage);
  expect(storage.kept()).toEqual({ point: trento, poor: [HEART_5, HORSE_10] });
});

test("the same pair is kept once, and not written again", () => {
  const storage = memory();
  keepPoor(trento, HEART_5, storage);
  keepPoor(trento, { ...HEART_5 }, storage);
  expect(storage.kept()?.poor).toEqual([HEART_5]);
  expect(storage.saves()).toBe(1);
});

test("a pair from another start forgets the pairs of the first", () => {
  const storage = memory();
  keepPoor(trento, HEART_5, storage);
  keepPoor(farFromTrento, HORSE_10, storage);
  expect(storage.kept()).toEqual({ point: farFromTrento, poor: [HORSE_10] });
  expect(poorFrom(trento, storage)).toEqual([]);
});

test("no more than MAX_POOR pairs: the oldest go", () => {
  const storage = memory();
  for (let i = 1; i <= MAX_POOR + 5; i += 1) {
    keepPoor(trento, { shape: "heart", distanceM: i * 100 }, storage);
  }
  const poor = storage.kept()?.poor ?? [];
  expect(poor).toHaveLength(MAX_POOR);
  expect(poor[0]).toEqual({ shape: "heart", distanceM: 600 });
  expect(poor[MAX_POOR - 1]).toEqual({
    shape: "heart",
    distanceM: (MAX_POOR + 5) * 100,
  });
});

test("the file is read checked: what does not read is left out", () => {
  expect(readSurprise(null)).toBeNull();
  expect(readSurprise("x")).toBeNull();
  expect(readSurprise({ poor: [HEART_5] })).toBeNull();
  expect(readSurprise({ point: [46, "11"], poor: [HEART_5] })).toBeNull();
  expect(readSurprise({ point: trento })).toEqual({ point: trento, poor: [] });
  expect(
    readSurprise({
      point: trento,
      poor: [
        HEART_5,
        { shape: "dragon", distanceM: 5000 },
        { shape: "star", distanceM: "5000" },
        { shape: "star", distanceM: -1 },
        null,
        HEART_5,
        HORSE_10,
      ],
    }),
  ).toEqual({ point: trento, poor: [HEART_5, HORSE_10] });
});

test("the file in the app's documents: written, and read again", () => {
  expect(surpriseFile.load()).toBeNull();
  keepPoor(trento, HEART_5);
  keepPoor(trento, HORSE_10);
  expect(files.has(FILE_URI)).toBe(true);
  expect(surpriseFile.load()).toEqual({ point: trento, poor: [HEART_5, HORSE_10] });
  expect(poorFrom(nearTrento)).toEqual([HEART_5, HORSE_10]);
});

test("a file that is not JSON is as no file", () => {
  files.set(FILE_URI, "{not json");
  expect(surpriseFile.load()).toBeNull();
  expect(poorFrom(trento)).toEqual([]);
});
