/**
 * The way back to the route on the streets during a run (TASK-314 part B,
 * ADR-0274): asked off the route, its turns said after the navigator's
 * words, kept while the runner is on it, gone back on the route. No way is
 * the straight dotted line of TASK-303, and nothing more is said.
 */
import type {
  Activity,
  Direction,
  LatLon,
  WayBack,
  WayBackRequest,
} from "@shaperoute/shared-types";

import type { WayBackAnswer } from "../engine/wayBackOnPhone";
import { BASE_LANGUAGE } from "../i18n/languages";
import {
  ANNOUNCE_M,
  type Navigation,
  onFix,
  type Reading,
  startNavigation,
} from "./navigator";
import { cumulative } from "./progress";
import {
  AHEAD_CAP_M,
  aheadOf,
  NEW_WAY_SAID_EVERY_S,
  startWayBack,
  WAY_BACK_EVERY_S,
  type WayBackAsk,
} from "./wayBackRun";
import {
  alongWay,
  newWayCues,
  upcomingOnWay,
  wayLineFrom,
  wayShownOf,
} from "./wayBackShown";

// Metres east (x) and north (y) of a corner of Trento, on a plane.
const LAT = 46.0;
const LON = 11.0;
const M_PER_DEG_LAT = 111_195;
const M_PER_DEG_LON = M_PER_DEG_LAT * Math.cos((LAT * Math.PI) / 180);
function at(x: number, y: number): LatLon {
  return [LAT + y / M_PER_DEG_LAT, LON + x / M_PER_DEG_LON];
}
function xy([lat, lon]: LatLon): [number, number] {
  return [(lon - LON) * M_PER_DEG_LON, (lat - LAT) * M_PER_DEG_LAT];
}

type Corner = [x: number, y: number];

/** The points along the corners, `stepM` apart. */
function through(corners: Corner[], stepM: number): LatLon[] {
  const points: LatLon[] = [at(...corners[0])];
  for (let i = 1; i < corners.length; i += 1) {
    const [x0, y0] = corners[i - 1];
    const [x1, y1] = corners[i];
    const steps = Math.round(Math.hypot(x1 - x0, y1 - y0) / stepM);
    for (let s = 1; s <= steps; s += 1) {
      points.push(at(x0 + ((x1 - x0) * s) / steps, y0 + ((y1 - y0) * s) / steps));
    }
  }
  return points;
}

function direction(
  turn: Direction["turn"],
  distanceM: number,
  street: string,
  point: LatLon,
): Direction {
  return {
    node: 0,
    point,
    distance_m: distanceM,
    turn,
    angle_deg: 0,
    street,
    road_type: "residential",
    branches: 3,
    joined: false,
    along: null,
  };
}

/** Via Roma, due east for 1.2 km. */
const STREET = through(
  [
    [0, 0],
    [1200, 0],
  ],
  20,
);
const DEPART = [direction("depart", 0, "Via Roma", STREET[0])];

/**
 * The engine's way from wherever the runner asks: to Via Nord, the street
 * 100 m north, east along it to Via Sud, and down Via Sud to the route at
 * 400 m, where it goes left.
 */
function wayFrom(request: WayBackRequest): WayBack {
  const points: LatLon[] = [request.here, at(300, 100), at(400, 100), at(400, 0)];
  const along = cumulative(points);
  return {
    points,
    distance_m: along[3],
    rejoin: points[3],
    rejoin_m: 400 - xy(request.ahead[0])[0],
    directions: [
      direction("depart", 0, "Via Nord", points[0]),
      direction("right", along[1], "Via Est", points[1]),
      direction("right", along[2], "Via Sud", points[2]),
      direction("left", along[3], "Via Roma", points[3]),
    ],
  };
}

const finds: WayBackAsk = async (request) => ({
  kind: "way",
  way: wayFrom(request),
  by: "phone",
});

/** The runner's fixes along the corners: 6 m apart, every 2 s. */
function runner(corners: Corner[], accuracyM = 8): { at: LatLon; reading: Reading }[] {
  return through(corners, 6).map((point, i) => ({
    at: point,
    reading: { accuracyM, timeMs: i * 2000 },
  }));
}

/** Out to 300 m, round the block by Via Nord and Via Sud, on to 600 m. */
const ROUND_THE_BLOCK: Corner[] = [
  [0, 0],
  [300, 0],
  [300, 100],
  [400, 100],
  [400, 0],
  [600, 0],
];

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

/**
 * Every fix through the navigator and the way back, as the run does it, with
 * the answers coming between two fixes. What is said, in order, and what
 * each way found said when it came.
 */
async function run(
  fixes: { at: LatLon; reading: Reading }[],
  ask: WayBackAsk,
  {
    activity,
    inFront = true,
    route = STREET,
  }: { activity?: Activity; inFront?: boolean; route?: LatLon[] } = {},
) {
  let navigation = startNavigation(route, DEPART).navigation;
  let clock = 0;
  const said: string[] = [];
  const placed: string[][] = [];
  const steps: Navigation[] = [];
  const wayBack = startWayBack(
    activity,
    (place) => {
      const found = place(navigation, BASE_LANGUAGE);
      navigation = found.navigation;
      placed.push(found.cues.map((cue) => cue.say));
      said.push(...found.cues.map((cue) => cue.say));
    },
    { ask, now: () => clock, inFront: () => inFront },
  );
  for (const { at: fix, reading } of fixes) {
    clock = reading.timeMs ?? clock;
    const followed = onFix(navigation, fix, reading, BASE_LANGUAGE);
    const step = wayBack.onFix(followed, fix, reading, BASE_LANGUAGE);
    navigation = step.navigation;
    said.push(...step.cues.map((cue) => cue.say));
    steps.push(navigation);
    await flush();
  }
  wayBack.end();
  return { said, placed, steps, navigation };
}

describe("off the route, the way back on the streets", () => {
  test("its turns are said after «off the route», then «back on the route»", async () => {
    const { said } = await run(runner(ROUND_THE_BLOCK), finds);
    expect(said).toEqual([
      "You are off the route. Head back to it.",
      expect.stringMatching(/^The route is \d+ metres away, to the south\.$/),
      // The way found, at once: its first turn, near.
      expect.stringMatching(/^In \d+ metres, turn right onto Via Est$/),
      "In 50 metres, turn right onto Via Sud",
      "In 50 metres, turn left onto Via Roma",
      "Back on the route.",
    ]);
  });

  test("the run shows it while the runner is on it, and not back on the route", async () => {
    const { steps, navigation } = await run(runner(ROUND_THE_BLOCK), finds);
    const off = steps.filter((step) => step.offRoute);
    expect(off.length).toBeGreaterThan(20);
    // From the fix the way came after, to the last one off the route.
    expect(off.slice(1).every((step) => step.wayBack !== null)).toBe(true);
    expect(off.at(-1)?.wayBack?.rejoinAlongM).toBeCloseTo(400, 0);
    expect(navigation.offRoute).toBe(false);
    expect(navigation.wayBack ?? null).toBeNull();
  });

  test("asked once from where the runner is, with the route ahead of where they left it", async () => {
    const ask = jest.fn(finds);
    await run(runner(ROUND_THE_BLOCK), ask);
    expect(ask).toHaveBeenCalledTimes(1);
    const [request, , inFront] = ask.mock.calls[0];
    expect(request.activity).toBe("running");
    const [hereX, hereY] = xy(request.here);
    expect(hereX).toBeCloseTo(300, 0);
    expect(hereY).toBeGreaterThan(40);
    const [firstX, firstY] = xy(request.ahead[0]);
    expect(firstX).toBeCloseTo(300, 0);
    expect(firstY).toBeCloseTo(0, 0);
    // The route the runner may get back on: ahead, and not much further.
    const lastX = xy(request.ahead[request.ahead.length - 1])[0];
    expect(lastX).toBeGreaterThan(600);
    expect(lastX).toBeLessThan(1000);
    expect(inFront).toBe(true);
  });

  test("with the phone locked, asked all the same, saying so", async () => {
    const ask = jest.fn(finds);
    const { said } = await run(runner(ROUND_THE_BLOCK), ask, { inFront: false });
    expect(ask.mock.calls[0][2]).toBe(false);
    expect(said).toContain("In 50 metres, turn right onto Via Sud");
  });

  test("by bike too, the activity asked with", async () => {
    const ask = jest.fn(finds);
    await run(runner(ROUND_THE_BLOCK), ask, { activity: "cycling" });
    expect(ask.mock.calls[0][0].activity).toBe("cycling");
  });

  test.each<Activity>(["swimming", "paddling"])(
    "on the water (%s) nothing is asked",
    async (activity) => {
      const ask = jest.fn(finds);
      const { said } = await run(runner(ROUND_THE_BLOCK), ask, { activity });
      expect(ask).not.toHaveBeenCalled();
      expect(said).not.toContain("In 50 metres, turn right onto Via Sud");
    },
  );
});

describe("no way back: the dots of before", () => {
  test("nothing more is said, and it is asked again at most every WAY_BACK_EVERY_S", async () => {
    // When each request is made: the time of the fix it is made from.
    const times: number[] = [];
    const fixes = runner(ROUND_THE_BLOCK);
    const timed: WayBackAsk = async (request) => {
      times.push(fixes.find((fix) => fix.at === request.here)?.reading.timeMs ?? -1);
      return { kind: "none", why: "the server answered 404" };
    };
    const { said, steps } = await run(fixes, timed);
    expect(said).toEqual([
      "You are off the route. Head back to it.",
      expect.stringMatching(/^The route is/),
      "Back on the route.",
    ]);
    expect(steps.every((step) => (step.wayBack ?? null) === null)).toBe(true);
    expect(times.length).toBeGreaterThan(2);
    for (let i = 1; i < times.length; i += 1) {
      expect(times[i] - times[i - 1]).toBeGreaterThanOrEqual(WAY_BACK_EVERY_S * 1000);
      expect(times[i] - times[i - 1]).toBeLessThan((WAY_BACK_EVERY_S + 3) * 1000);
    }
  });

  test("a way that never comes is given up back on the route", async () => {
    const signals: AbortSignal[] = [];
    const never: WayBackAsk = (_request, signal) => {
      signals.push(signal);
      return new Promise<WayBackAnswer>(() => {});
    };
    const { said, navigation } = await run(runner(ROUND_THE_BLOCK), never);
    expect(signals).toHaveLength(1);
    expect(signals[0].aborted).toBe(true);
    expect(said.at(-1)).toBe("Back on the route.");
    expect(navigation.wayBack ?? null).toBeNull();
  });

  test("one that comes after the runner is back on the route is not shown", async () => {
    let answer: (found: WayBackAnswer) => void = () => {};
    let request: WayBackRequest | null = null;
    const late: WayBackAsk = (asked) => {
      request = asked;
      return new Promise<WayBackAnswer>((resolve) => {
        answer = resolve;
      });
    };
    const { navigation, said } = await run(runner(ROUND_THE_BLOCK), late);
    expect(request).not.toBeNull();
    answer({ kind: "way", way: wayFrom(request!), by: "server" });
    await flush();
    expect(navigation.wayBack ?? null).toBeNull();
    expect(said.at(-1)).toBe("Back on the route.");
  });

  test("a poor fix asks nothing", async () => {
    const ask = jest.fn(finds);
    const { steps } = await run(runner(ROUND_THE_BLOCK), finds);
    const off = steps.find((step) => step.offRoute)!;
    const wayBack = startWayBack(undefined, jest.fn(), { ask, now: () => 0 });
    wayBack.onFix(
      { navigation: { ...off, wayBack: null }, cues: [] },
      at(300, 80),
      { accuracyM: 90 },
      BASE_LANGUAGE,
    );
    wayBack.end();
    expect(ask).not.toHaveBeenCalled();
  });
});

describe("a runner who leaves the way", () => {
  /** Up Via Nord, then west along it, away from the way. */
  const WEST: Corner[] = [
    [0, 0],
    [300, 0],
    [300, 100],
    [0, 100],
  ];

  test("is asked a way again, from where they are, and hears it near its turns", async () => {
    const ask = jest.fn(finds);
    const { placed, steps } = await run(runner(WEST), ask);
    expect(ask.mock.calls.length).toBeGreaterThanOrEqual(2);
    const [x, y] = xy(ask.mock.calls[1][0].here);
    expect(x).toBeLessThan(260);
    expect(y).toBeCloseTo(100, 0);
    // Between the two, the dots of before.
    expect(steps.some((step) => step.offRoute && step.wayBack === null)).toBe(true);
    expect(steps.at(-1)?.wayBack).not.toBeNull();
    // A new way within NEW_WAY_SAID_EVERY_S is not said at once.
    expect(placed[0]).toHaveLength(1);
    expect(placed[1]).toEqual([]);
  });

  test("after NEW_WAY_SAID_EVERY_S a new way is said again", async () => {
    // Slowly: a fix every 5 s, the second way more than a minute after.
    const fixes = runner(WEST).map((fix, i) => ({
      ...fix,
      reading: { accuracyM: 8, timeMs: i * 5000 },
    }));
    const ask = jest.fn(finds);
    const { placed } = await run(fixes, ask);
    const times = placed.map((cues) => cues.length);
    expect(times[0]).toBe(1);
    expect(times.slice(1)).toContain(1);
    expect(NEW_WAY_SAID_EVERY_S).toBe(60);
  });
});

describe("the route sent with the request", () => {
  const LONG = through(
    [
      [0, 0],
      [5000, 0],
    ],
    50,
  );
  const { navigation: started } = startNavigation(LONG, []);

  test("ahead of where the runner left it, at most AHEAD_CAP_M after a gap", () => {
    const ahead = aheadOf({ ...started, alongM: 300, offRoute: true, lost: true });
    expect(ahead?.fromM).toBe(300);
    expect(xy(ahead!.points[0])[0]).toBeCloseTo(300, 0);
    expect(xy(ahead!.points[ahead!.points.length - 1])[0]).toBeCloseTo(
      300 + AHEAD_CAP_M,
      0,
    );
  });

  test("never on the route yet: its first AHEAD_M", () => {
    const ahead = aheadOf({ ...started, offRoute: true });
    expect(ahead?.fromM).toBe(0);
    expect(xy(ahead!.points[ahead!.points.length - 1])[0]).toBeCloseTo(300, 0);
  });

  test("on a closed route not joined yet, around the point the dots go to", () => {
    const square = through(
      [
        [0, 0],
        [1000, 0],
        [1000, 1000],
        [0, 1000],
        [0, 0],
      ],
      50,
    );
    const { navigation } = startNavigation(square, [], BASE_LANGUAGE, ANNOUNCE_M, true);
    const ahead = aheadOf({
      ...navigation,
      offRoute: true,
      rejoin: {
        from: at(1100, 2000),
        to: at(1000, 2000),
        alongM: 2000,
        distanceM: 100,
        bearingDeg: 270,
      },
    });
    expect(ahead?.fromM).toBe(2000 - AHEAD_CAP_M / 2);
    const [x, y] = xy(ahead!.points[0]);
    expect(x).toBeCloseTo(500, 0);
    expect(y).toBeCloseTo(0, 0);
  });
});

describe("the way as the run shows it", () => {
  const request: WayBackRequest = {
    activity: "running",
    here: at(300, 60),
    ahead: [at(300, 0), at(1200, 0)],
  };
  const shown = wayShownOf(wayFrom(request), 300);

  test("its first turn said when found, and again near it when it was far", () => {
    // From further back on Via Nord: Via Est is 90 m on.
    const far = wayShownOf(wayFrom({ ...request, here: at(300, 10) }), 300);
    const found = newWayCues(far, BASE_LANGUAGE);
    expect(found.cues.map((cue) => cue.say)).toEqual([
      "In 90 metres, turn right onto Via Est",
    ]);
    const near = alongWay(found.shown, at(300, 50), { accuracyM: 8 }, BASE_LANGUAGE);
    expect(near.cues.map((cue) => cue.say)).toEqual([
      "In 50 metres, turn right onto Via Est",
    ]);
    // Said once near it.
    const after = alongWay(near.shown!, at(300, 56), { accuracyM: 8 }, BASE_LANGUAGE);
    expect(after.cues).toEqual([]);
  });

  test("the banner's turn, how far it is", () => {
    const on = alongWay(shown, at(350, 100), { accuracyM: 8 }, BASE_LANGUAGE).shown!;
    const next = upcomingOnWay(on);
    expect(next?.direction.street).toBe("Via Sud");
    expect(next?.inM).toBeCloseTo(50, 0);
  });

  test("the map's dots: from the runner, along what is left of it", () => {
    const on = alongWay(shown, at(350, 110), { accuracyM: 8 }, BASE_LANGUAGE).shown!;
    const line = wayLineFrom(on, at(350, 110)).map(xy);
    expect(line).toHaveLength(4);
    expect(line[0][0]).toBeCloseTo(350, 0);
    expect(line[0][1]).toBeCloseTo(110, 0);
    expect(line[1][0]).toBeCloseTo(350, 0);
    expect(line[1][1]).toBeCloseTo(100, 0);
    expect(line[3][0]).toBeCloseTo(400, 0);
    expect(line[3][1]).toBeCloseTo(0, 0);
  });

  test("left after OFF_FIXES fixes away from it; a poor fix changes nothing", () => {
    let current = alongWay(shown, at(320, 100), { accuracyM: 8 }, BASE_LANGUAGE).shown;
    current = alongWay(current!, at(200, 200), { accuracyM: 90 }, BASE_LANGUAGE).shown;
    expect(current?.leftFixes).toBe(0);
    for (let i = 0; i < 2; i += 1) {
      current = alongWay(current!, at(200, 200), { accuracyM: 8 }, BASE_LANGUAGE).shown;
      expect(current).not.toBeNull();
    }
    expect(
      alongWay(current!, at(200, 200), { accuracyM: 8 }, BASE_LANGUAGE).shown,
    ).toBeNull();
  });
});
