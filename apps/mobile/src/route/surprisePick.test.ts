import { type Activity, ACTIVITIES, SHAPES } from "@shaperoute/shared-types";

import { profileOf } from "../sports";
import { APP_DISTANCE_LIMITS_KM } from "./distance";
import {
  BIKE_SHAPES,
  hasSurprise,
  type NearbyRoute,
  nearbyPicks,
  samePick,
  SPARE_ON_FOOT,
  sparePicks,
  surpriseDistancesM,
  type SurprisePick,
  surprisePick,
} from "./surprisePick";

/** A generator with a seed (mulberry32): the same numbers at every run. */
function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A city of the catalogue: shapes at 5, 10 and 21 km, and its words. */
const TRENTO: NearbyRoute[] = [
  { shape: "heart", distance_m: 10000 },
  { shape: "heart", distance_m: 5000 },
  { shape: "horse", distance_m: 10000 },
  { shape: "horse", distance_m: 21000 },
  { shape: "snail", distance_m: 21000 },
  { shape: null, distance_m: 12000 },
  { shape: "star", distance_m: 5000 },
  // The same pair from another square of the city.
  { shape: "heart", distance_m: 5000 },
];

/** The rides of a city: the catalogue has them from 20 to 50 km. */
const RIDES: NearbyRoute[] = [
  { shape: "sun", distance_m: 20000 },
  { shape: "cat", distance_m: 25000 },
  { shape: "fish", distance_m: 30000 },
  { shape: "moon", distance_m: 40000 },
  { shape: "butterfly", distance_m: 50000 },
];

const SURPRISED: Activity[] = ["running", "walking", "cycling"];

test("only a run, a walk and a ride have it", () => {
  expect(ACTIVITIES.filter(hasSurprise).sort()).toEqual([...SURPRISED].sort());
  for (const activity of ACTIVITIES.filter((each) => !hasSurprise(each))) {
    expect(surprisePick({ activity, nearby: TRENTO, random: seeded(1) })).toBeNull();
    expect(nearbyPicks(activity, TRENTO)).toEqual([]);
    expect(sparePicks(activity)).toEqual([]);
    expect(surpriseDistancesM(activity)).toEqual([]);
  }
});

test("the pairs near: shapes at 5 or 10 km, each once, no word, no 21 km", () => {
  expect(nearbyPicks("running", TRENTO)).toEqual([
    { shape: "heart", distanceM: 10000 },
    { shape: "heart", distanceM: 5000 },
    { shape: "horse", distanceM: 10000 },
    { shape: "star", distanceM: 5000 },
  ]);
  // A walk is shown a run's routes.
  expect(nearbyPicks("walking", TRENTO)).toEqual(nearbyPicks("running", TRENTO));
});

test("by bike 20, 25 or 30 km, never the 40 and 50 of «Explore»", () => {
  expect(nearbyPicks("cycling", RIDES)).toEqual([
    { shape: "sun", distanceM: 20000 },
    { shape: "cat", distanceM: 25000 },
    { shape: "fish", distanceM: 30000 },
  ]);
});

test("an API that answers a ride's list with runs gives no pair by bike", () => {
  expect(nearbyPicks("cycling", TRENTO)).toEqual([]);
  const pick = surprisePick({ activity: "cycling", nearby: TRENTO, random: seeded(3) });
  expect(pick?.distanceM).toBe(20000);
  expect(BIKE_SHAPES).toContain(pick?.shape);
});

test("a shape the catalogue does not have is not a pair", () => {
  expect(nearbyPicks("running", [{ shape: "dragon", distance_m: 5000 }])).toEqual([]);
  // By bike only the eight of its catalogue, whatever the list says.
  expect(nearbyPicks("cycling", [{ shape: "horse", distance_m: 20000 }])).toEqual([]);
});

test("with the same seed and the same routes the pick is the same", () => {
  const first = surprisePick({
    activity: "running",
    nearby: TRENTO,
    random: seeded(7),
  });
  const again = surprisePick({
    activity: "running",
    nearby: TRENTO,
    random: seeded(7),
  });
  expect(first).not.toBeNull();
  expect(again).toEqual(first);
});

test("the numbers choose the shape first, then one of its distances", () => {
  const numbers = (...values: number[]) => {
    const left = [...values];
    return () => left.shift() ?? 0;
  };
  // Three shapes near: heart, horse, star. The first number takes the shape.
  expect(
    surprisePick({ activity: "running", nearby: TRENTO, random: numbers(0, 0) }),
  ).toEqual({ shape: "heart", distanceM: 10000 });
  expect(
    surprisePick({ activity: "running", nearby: TRENTO, random: numbers(0, 0.99) }),
  ).toEqual({ shape: "heart", distanceM: 5000 });
  expect(
    surprisePick({ activity: "running", nearby: TRENTO, random: numbers(0.5, 0) }),
  ).toEqual({ shape: "horse", distanceM: 10000 });
  expect(
    surprisePick({ activity: "running", nearby: TRENTO, random: numbers(0.99, 0) }),
  ).toEqual({ shape: "star", distanceM: 5000 });
  // A generator that gives 1, which it should not, still gives a pick.
  expect(
    surprisePick({ activity: "running", nearby: TRENTO, random: () => 1 }),
  ).toEqual({ shape: "star", distanceM: 5000 });
});

test("every pick is of the routes near while they have one", () => {
  const near = nearbyPicks("running", TRENTO);
  const random = seeded(11);
  for (let i = 0; i < 200; i += 1) {
    const pick = surprisePick({ activity: "running", nearby: TRENTO, random });
    expect(near.some((each) => pick !== null && samePick(each, pick))).toBe(true);
  }
});

test("a second tap never gives the pick before, nor its shape while there is another", () => {
  const random = seeded(5);
  let previous: SurprisePick | null = null;
  for (let i = 0; i < 300; i += 1) {
    const pick: SurprisePick | null = surprisePick({
      activity: "running",
      nearby: TRENTO,
      previous,
      random,
    });
    expect(pick).not.toBeNull();
    if (pick !== null && previous !== null) {
      expect(pick.shape).not.toBe(previous.shape);
    }
    previous = pick;
  }
});

test("one shape near at two distances: the other distance, not the same pair", () => {
  const nearby = [
    { shape: "heart", distance_m: 5000 },
    { shape: "heart", distance_m: 10000 },
  ];
  expect(
    surprisePick({
      activity: "running",
      nearby,
      previous: { shape: "heart", distanceM: 5000 },
      random: seeded(2),
    }),
  ).toEqual({ shape: "heart", distanceM: 10000 });
});

test("the only pair near was the one before: a spare shape, another one", () => {
  const previous = { shape: "heart", distanceM: 5000 } as const;
  const random = seeded(9);
  for (let i = 0; i < 100; i += 1) {
    const pick = surprisePick({
      activity: "running",
      nearby: [{ shape: "heart", distance_m: 5000 }],
      previous,
      random,
    });
    expect(pick).not.toBeNull();
    expect(pick?.shape).not.toBe("heart");
    expect(SPARE_ON_FOOT).toContain(pick?.shape);
  }
});

test("a pair that came out poorly here is not offered again", () => {
  const avoid = [
    { shape: "heart", distanceM: 5000 },
    { shape: "horse", distanceM: 10000 },
  ] as const;
  const random = seeded(13);
  for (let i = 0; i < 200; i += 1) {
    const pick = surprisePick({ activity: "running", nearby: TRENTO, avoid, random });
    expect(avoid.some((poor) => pick !== null && samePick(poor, pick))).toBe(false);
  }
});

test("every pair near came out poorly: a spare shape that did not", () => {
  const avoid = [
    ...nearbyPicks("running", TRENTO),
    { shape: "circle", distanceM: 5000 } as const,
  ];
  const random = seeded(17);
  for (let i = 0; i < 200; i += 1) {
    const pick = surprisePick({ activity: "running", nearby: TRENTO, avoid, random });
    expect(pick).not.toBeNull();
    expect(SPARE_ON_FOOT).toContain(pick?.shape);
    expect(avoid.some((poor) => pick !== null && samePick(poor, pick))).toBe(false);
  }
});

test("everything came out poorly here: the pill answers all the same", () => {
  const avoid = [...nearbyPicks("running", TRENTO), ...sparePicks("running")];
  const previous = { shape: "moon", distanceM: 5000 } as const;
  const pick = surprisePick({
    activity: "running",
    nearby: TRENTO,
    avoid,
    previous,
    random: seeded(19),
  });
  expect(pick).not.toBeNull();
  expect(pick?.shape).not.toBe("moon");
});

test("nothing near: on foot the seven shapes at 5 or 10 km", () => {
  expect(sparePicks("running")).toHaveLength(SPARE_ON_FOOT.length * 2);
  const seen = new Set<string>();
  const random = seeded(23);
  for (let i = 0; i < 400; i += 1) {
    const pick = surprisePick({ activity: "walking", random });
    expect(pick).not.toBeNull();
    expect(SPARE_ON_FOOT).toContain(pick?.shape);
    expect([5000, 10000]).toContain(pick?.distanceM);
    seen.add(`${pick?.shape} ${pick?.distanceM}`);
  }
  // Every spare pair comes out sooner or later.
  expect(seen.size).toBe(SPARE_ON_FOOT.length * 2);
});

test("nothing near: by bike one of the eight at 20 km", () => {
  expect(sparePicks("cycling")).toEqual(
    BIKE_SHAPES.map((shape) => ({ shape, distanceM: 20000 })),
  );
});

test("no pick is outside what «Draw» offers for the sport", () => {
  const all: NearbyRoute[] = SHAPES.flatMap((shape) =>
    [1000, 5000, 10000, 20000, 21000, 25000, 30000, 40000, 50000].map((distance_m) => ({
      shape,
      distance_m,
    })),
  );
  for (const activity of SURPRISED) {
    const [lowest, highest] = APP_DISTANCE_LIMITS_KM[activity];
    const shapes = profileOf(activity).shapes ?? SHAPES;
    const picks = [...nearbyPicks(activity, all), ...sparePicks(activity)];
    expect(picks.length).toBeGreaterThan(0);
    for (const pick of picks) {
      expect(pick.distanceM).toBeGreaterThanOrEqual(lowest * 1000);
      expect(pick.distanceM).toBeLessThanOrEqual(highest * 1000);
      expect(surpriseDistancesM(activity)).toContain(pick.distanceM);
      expect(shapes).toContain(pick.shape);
    }
  }
  // On foot never the 21 km of the catalogue.
  expect(nearbyPicks("running", all).some((pick) => pick.distanceM > 10000)).toBe(
    false,
  );
  // By bike only the eight shapes.
  expect(
    nearbyPicks("cycling", all).every((pick) => BIKE_SHAPES.includes(pick.shape)),
  ).toBe(true);
});

test("the spare shapes are shapes of the catalogue, each once", () => {
  for (const list of [SPARE_ON_FOOT, BIKE_SHAPES]) {
    expect(new Set(list).size).toBe(list.length);
    for (const shape of list) {
      expect(SHAPES).toContain(shape);
    }
  }
});
