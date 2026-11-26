import type {
  Activity,
  LatLon,
  RouteRequest,
  RouteResult,
} from "@shaperoute/shared-types";
import requestFixture from "@shaperoute/shared-types/fixtures/route-request.json";
import resultFixture from "@shaperoute/shared-types/fixtures/route-result.json";
import { act, renderHook } from "@testing-library/react-native";

import { saveUnitsChoice } from "../units/units";
import type { SurpriseKept, SurpriseStorage } from "./surpriseKept";
import { BIKE_SHAPES, SPARE_ON_FOOT, type SurprisePick } from "./surprisePick";
import type { AnyRouteRequest, RouteState } from "./useRouteRequest";
import {
  forgetSurpriseNearby,
  knownSurpriseNearby,
  NEARBY_FRESH_MS,
  offeredPick,
  poorPickOf,
  SURPRISE_RADIUS_M,
  surpriseNearby,
  type SurpriseOptions,
  useSurprise,
} from "./useSurprise";

jest.mock("expo-file-system", () => jest.requireActual("../engine/memoryFiles"));

const API = "http://api.test";
const trento: LatLon = [46.0702, 11.1265];
const rovereto: LatLon = [45.8906, 11.0401];
const REQUEST = requestFixture as RouteRequest;
const RESULT = resultFixture as unknown as RouteResult;
const IDLE: RouteState = { status: "idle" };

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

/** A route of the list, as GET /recommended-routes gives it. */
function listed(shape: string | null, distance_m: number, i = 0) {
  return {
    id: `trento-${shape ?? "word"}-${distance_m}-${i}`,
    city: "trento",
    shape,
    word: shape === null ? "CIAO" : null,
    style: shape === null ? "round" : null,
    distance_m,
    route_m: distance_m + 120,
    similarity: 0.93,
    start: trento,
    away_m: 400,
    preview: [trento, [46.071, 11.127]],
  };
}

const TRENTO_LIST = {
  routes: [
    listed("heart", 5000),
    listed("horse", 10000),
    listed("snail", 21000),
    listed(null, 12000),
    listed("star", 5000),
  ],
};

/** An API that answers every list with `body`, and counts the calls. */
function api(body: unknown, status = 200) {
  const urls: string[] = [];
  const fetchFn = jest.fn(async (url: RequestInfo | URL) => {
    urls.push(String(url));
    return Response.json(body, { status });
  }) as unknown as typeof fetch;
  return { fetchFn, urls };
}

/** An API that never answers: only the abort ends the wait. */
function silent() {
  const fetchFn = jest.fn(
    (_url: RequestInfo | URL, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(new Error("aborted")));
      }),
  ) as unknown as typeof fetch;
  return { fetchFn };
}

function memory(first: SurpriseKept | null = null): SurpriseStorage & {
  kept: () => SurpriseKept | null;
} {
  let kept = first;
  return {
    load: () => kept,
    save: (next) => {
      kept = next;
    },
    kept: () => kept,
  };
}

function done(
  request: AnyRouteRequest,
  similarity: number,
  others: number[] = [],
  more?: true,
): RouteState {
  const route = { ...RESULT, similarity, alternatives: [] };
  const result: RouteResult = {
    ...route,
    alternatives: others.map((each) => ({ ...route, similarity: each })),
  };
  return { status: "done", request, result, ...(more ? { more } : {}) };
}

beforeEach(() => {
  forgetSurpriseNearby();
});

afterEach(async () => {
  await act(async () => {
    saveUnitsChoice("phone");
  });
});

describe("the routes near the start", () => {
  test("asked as «Explore» asks, within 10 km of the rounded start", async () => {
    const { fetchFn, urls } = api(TRENTO_LIST);
    const routes = await surpriseNearby(API, trento, "running", { fetchFn, key: null });
    expect(urls).toEqual([
      `${API}/recommended-routes?lat=46.07&lon=11.13&radius_m=${SURPRISE_RADIUS_M}`,
    ]);
    expect(routes).toEqual([
      { shape: "heart", distance_m: 5000 },
      { shape: "horse", distance_m: 10000 },
      { shape: "snail", distance_m: 21000 },
      { shape: null, distance_m: 12000 },
      { shape: "star", distance_m: 5000 },
    ]);
  });

  test("a ride's by its name; a walk's are a run's, asked once", async () => {
    const { fetchFn, urls } = api(TRENTO_LIST);
    await surpriseNearby(API, trento, "cycling", { fetchFn, key: null });
    await surpriseNearby(API, trento, "running", { fetchFn, key: null });
    await surpriseNearby(API, trento, "walking", { fetchFn, key: null });
    expect(urls).toHaveLength(2);
    expect(urls[0]).toContain("&activity=cycling");
    expect(urls[1]).not.toContain("activity");
  });

  test("kept for ten minutes, then asked again", async () => {
    const { fetchFn, urls } = api(TRENTO_LIST);
    let clock = 1_000_000;
    const now = () => clock;
    await surpriseNearby(API, trento, "running", { fetchFn, key: null, now });
    expect(knownSurpriseNearby(API, trento, "running", clock)).toHaveLength(5);
    clock += NEARBY_FRESH_MS - 1;
    await surpriseNearby(API, trento, "running", { fetchFn, key: null, now });
    expect(urls).toHaveLength(1);
    clock += 1;
    expect(knownSurpriseNearby(API, trento, "running", clock)).toBeUndefined();
    await surpriseNearby(API, trento, "running", { fetchFn, key: null, now });
    expect(urls).toHaveLength(2);
  });

  test("an error, or an answer that is not a list, is null and not kept", async () => {
    for (const { fetchFn } of [
      api({ error: "x" }, 500),
      api({ routes: [{ id: 1 }] }),
    ]) {
      expect(
        await surpriseNearby(API, trento, "running", { fetchFn, key: null }),
      ).toBeNull();
      expect(knownSurpriseNearby(API, trento, "running")).toBeUndefined();
    }
    const offline = jest.fn(async () => {
      throw new Error("no network");
    }) as unknown as typeof fetch;
    expect(
      await surpriseNearby(API, trento, "running", { fetchFn: offline, key: null }),
    ).toBeNull();
  });

  test("an API that does not answer in time is let go", async () => {
    const { fetchFn } = silent();
    expect(
      await surpriseNearby(API, trento, "running", { fetchFn, key: null, waitMs: 5 }),
    ).toBeNull();
    expect(knownSurpriseNearby(API, trento, "running")).toBeUndefined();
  });
});

describe("what a route's end says of a pair", () => {
  const heart5: SurprisePick = { shape: "heart", distanceM: 5000 };

  test("no route at 90%: the pair came out poorly from its start", () => {
    expect(poorPickOf(done(REQUEST, 0.85))).toEqual({
      start: REQUEST.start,
      pick: heart5,
    });
    expect(poorPickOf(done(REQUEST, 0.85, [0.89, 0.7]))).not.toBeNull();
  });

  test("a route at 90%, the first or another, came out well", () => {
    expect(poorPickOf(done(REQUEST, 0.9))).toBeNull();
    expect(poorPickOf(done(REQUEST, 0.85, [0.93]))).toBeNull();
  });

  test("while the other routes are coming nothing is said yet", () => {
    expect(poorPickOf(done(REQUEST, 0.85, [], true))).toBeNull();
  });

  test("the engine refused the shape there: poor; no network: nothing said", () => {
    expect(
      poorPickOf({
        status: "failed",
        request: REQUEST,
        problem: { kind: "api_error", code: "shape_not_drawable", message: "No." },
      }),
    ).toEqual({ start: REQUEST.start, pick: heart5 });
    expect(
      poorPickOf({
        status: "failed",
        request: REQUEST,
        problem: { kind: "unreachable", url: API },
      }),
    ).toBeNull();
    expect(
      poorPickOf({ status: "failed", request: REQUEST, problem: { kind: "timeout" } }),
    ).toBeNull();
  });

  test("idle and waiting say nothing", () => {
    expect(poorPickOf(IDLE)).toBeNull();
    expect(
      poorPickOf({
        status: "waiting",
        request: REQUEST,
        startedAt: 0,
        phase: "sending",
      }),
    ).toBeNull();
  });

  test("only a pair the pill could give: not a word, a pen up, another distance", () => {
    const word: RouteRequest = { ...REQUEST, shape: null, word: "CIAO" };
    expect(poorPickOf(done(word, 0.5))).toBeNull();
    const penUp: RouteRequest = {
      start: REQUEST.start,
      shape: "cat",
      word: null,
      pen_up: true,
      distance_m: 5000,
      activity: "running",
    };
    expect(poorPickOf(done(penUp, 0.5))).toBeNull();
    expect(poorPickOf(done({ ...REQUEST, distance_m: 7000 }, 0.5))).toBeNull();
    expect(poorPickOf(done({ ...REQUEST, distance_m: 21000 }, 0.5))).toBeNull();
    expect(poorPickOf(done({ ...REQUEST, activity: "hiking" }, 0.5))).toBeNull();
    expect(poorPickOf(done({ ...REQUEST, placement: "anchored" }, 0.5))).toBeNull();
  });

  test("a picture's outline is no pair", () => {
    const picture = {
      start: REQUEST.start,
      outline: [
        [0, 0],
        [1, 0],
        [1, 1],
      ],
      distance_m: 5000,
      activity: "running",
    } as unknown as AnyRouteRequest;
    expect(poorPickOf(done(picture, 0.5))).toBeNull();
  });

  test("with «Miles» the 3 miles asked are the 5 km of the pair", () => {
    expect(poorPickOf(done({ ...REQUEST, distance_m: 4828 }, 0.5))?.pick).toEqual(
      heart5,
    );
  });

  test("a ride at 20 km is a pair too", () => {
    const ride: RouteRequest = {
      start: REQUEST.start,
      shape: "sun",
      word: null,
      distance_m: 20000,
      activity: "cycling",
    };
    expect(poorPickOf(done(ride, 0.5))?.pick).toEqual({
      shape: "sun",
      distanceM: 20000,
    });
  });
});

test("the pick as «Draw» asks it: km as they are, with «Miles» the whole mile", () => {
  const pick: SurprisePick = { shape: "heart", distanceM: 5000 };
  expect(offeredPick(pick, "running", "km")).toEqual(pick);
  expect(offeredPick(pick, "running", "mi")).toEqual({
    shape: "heart",
    distanceM: 4828,
  });
  expect(
    offeredPick({ shape: "sun", distanceM: 20000 }, "cycling", "mi").distanceM,
  ).toBe(19312);
});

describe("the pill", () => {
  async function pill(options: Partial<SurpriseOptions> = {}) {
    const onPick = jest.fn<void, [SurprisePick]>();
    const first: SurpriseOptions = {
      apiUrl: API,
      start: trento,
      activity: "running",
      state: IDLE,
      onPick,
      storage: memory(),
      random: seeded(1),
      key: null,
      ...options,
    };
    const hook = await renderHook((props: SurpriseOptions) => useSurprise(props), {
      initialProps: first,
    });
    const tap = () => act(async () => hook.result.current?.surprise());
    return { ...hook, first, onPick, tap };
  }

  test("no pill for a sport without a catalogue", async () => {
    for (const activity of ["hiking", "paddling", "swimming"] as Activity[]) {
      const { result } = await pill({ activity });
      expect(result.current).toBeNull();
    }
  });

  test("the first tap asks the routes near and gives one of their pairs", async () => {
    const { fetchFn, urls } = api(TRENTO_LIST);
    const { result, onPick, tap } = await pill({ fetchFn });
    expect(urls).toHaveLength(0);
    expect(result.current?.busy).toBe(false);
    await tap();
    expect(urls).toHaveLength(1);
    expect(result.current?.busy).toBe(false);
    expect(onPick).toHaveBeenCalledTimes(1);
    const [pick] = onPick.mock.calls[0];
    expect([
      { shape: "heart", distanceM: 5000 },
      { shape: "horse", distanceM: 10000 },
      { shape: "star", distanceM: 5000 },
    ]).toContainEqual(pick);
  });

  test("the taps after ask nothing, and each gives another shape", async () => {
    const { fetchFn, urls } = api(TRENTO_LIST);
    const { onPick, tap } = await pill({ fetchFn });
    for (let i = 0; i < 12; i += 1) {
      await tap();
    }
    expect(urls).toHaveLength(1);
    expect(onPick).toHaveBeenCalledTimes(12);
    const shapes = onPick.mock.calls.map(([pick]) => pick.shape);
    for (let i = 1; i < shapes.length; i += 1) {
      expect(shapes[i]).not.toBe(shapes[i - 1]);
    }
    expect(new Set(shapes)).toEqual(new Set(["heart", "horse", "star"]));
  });

  test("the pill waits while the routes are asked, and a second tap is nothing", async () => {
    let answer: (response: Response) => void = () => {};
    const fetchFn = jest.fn(
      () =>
        new Promise<Response>((resolve) => {
          answer = resolve;
        }),
    ) as unknown as typeof fetch;
    const { result, onPick } = await pill({ fetchFn });
    await act(async () => result.current?.surprise());
    expect(result.current?.busy).toBe(true);
    await act(async () => result.current?.surprise());
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(onPick).not.toHaveBeenCalled();
    await act(async () => answer(Response.json(TRENTO_LIST)));
    expect(result.current?.busy).toBe(false);
    expect(onPick).toHaveBeenCalledTimes(1);
  });

  test("the start changed while waiting: the answer is let go", async () => {
    let answer: (response: Response) => void = () => {};
    const fetchFn = jest.fn(
      () =>
        new Promise<Response>((resolve) => {
          answer = resolve;
        }),
    ) as unknown as typeof fetch;
    const { result, rerender, first, onPick } = await pill({ fetchFn });
    await act(async () => result.current?.surprise());
    expect(result.current?.busy).toBe(true);
    await rerender({ ...first, start: rovereto });
    // The pill of the new start is not waiting.
    expect(result.current?.busy).toBe(false);
    await act(async () => answer(Response.json(TRENTO_LIST)));
    expect(onPick).not.toHaveBeenCalled();
  });

  test("the API does not answer: a spare shape", async () => {
    const { fetchFn } = api({ error: "down" }, 503);
    const { onPick, tap } = await pill({ fetchFn });
    await tap();
    const [pick] = onPick.mock.calls[0];
    expect(SPARE_ON_FOOT).toContain(pick.shape);
    expect([5000, 10000]).toContain(pick.distanceM);
  });

  test("no start yet, or no API: a spare shape, and nothing asked", async () => {
    const { fetchFn, urls } = api(TRENTO_LIST);
    for (const options of [{ start: null }, { apiUrl: null }]) {
      const { onPick, tap } = await pill({ fetchFn, ...options });
      await tap();
      expect(SPARE_ON_FOOT).toContain(onPick.mock.calls[0][0].shape);
    }
    expect(urls).toHaveLength(0);
  });

  test("by bike nothing near: one of the eight at 20 km", async () => {
    const { fetchFn, urls } = api({ routes: [] });
    const { onPick, tap } = await pill({ fetchFn, activity: "cycling" });
    await tap();
    expect(urls[0]).toContain("&activity=cycling");
    const [pick] = onPick.mock.calls[0];
    expect(BIKE_SHAPES).toContain(pick.shape);
    expect(pick.distanceM).toBe(20000);
  });

  test("with «Miles» the distance is the whole mile", async () => {
    await act(async () => {
      saveUnitsChoice("mi");
    });
    const { fetchFn } = api(TRENTO_LIST);
    const { onPick, tap } = await pill({ fetchFn });
    await tap();
    expect([4828, 9656]).toContain(onPick.mock.calls[0][0].distanceM);
  });

  test("a pair that came out poorly from this start is kept, and not given again", async () => {
    const storage = memory();
    const { fetchFn } = api({ routes: [listed("heart", 5000), listed("star", 5000)] });
    const { rerender, first, onPick, tap } = await pill({ fetchFn, storage });
    const asked: RouteRequest = { ...REQUEST, start: trento };
    await rerender({ ...first, state: done(asked, 0.72) });
    expect(storage.kept()).toEqual({
      point: trento,
      poor: [{ shape: "heart", distanceM: 5000 }],
    });
    for (let i = 0; i < 40; i += 1) {
      await tap();
    }
    const given = onPick.mock.calls.map(([pick]) => pick);
    expect(given).toHaveLength(40);
    expect(given).not.toContainEqual({ shape: "heart", distanceM: 5000 });
    // The star near is still given.
    expect(given).toContainEqual({ shape: "star", distanceM: 5000 });
  });

  test("a route that came out well keeps nothing", async () => {
    const storage = memory();
    const { rerender, first } = await pill({ storage });
    await rerender({ ...first, state: done({ ...REQUEST, start: trento }, 0.94) });
    expect(storage.kept()).toBeNull();
  });

  test("what came out poorly from another start is given here", async () => {
    const storage = memory({
      point: rovereto,
      poor: [
        { shape: "heart", distanceM: 5000 },
        { shape: "star", distanceM: 5000 },
      ],
    });
    const { fetchFn } = api({ routes: [listed("heart", 5000), listed("star", 5000)] });
    const { onPick, tap } = await pill({ fetchFn, storage });
    await tap();
    expect(["heart", "star"]).toContain(onPick.mock.calls[0][0].shape);
  });
});
