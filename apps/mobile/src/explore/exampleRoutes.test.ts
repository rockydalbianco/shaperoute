import type { RouteResult, Shape } from "@shaperoute/shared-types";
import fixture from "@shaperoute/shared-types/fixtures/route-result.json";
import { act, renderHook } from "@testing-library/react-native";

import type { requestRoute, RouteOutcome } from "../api/routes";
import type { Place } from "../places/photon";
import {
  asRecommended,
  cityKey,
  DRAW_ORDER,
  drawExamples,
  EXAMPLE_DISTANCE_M,
  EXAMPLE_SHAPES,
  exampleDetail,
  type Example,
  firstExamples,
  forgetExamples,
  isMore,
  MAX_KEPT_CITIES,
  MORE_SHAPES,
  readKept,
  shownExamples,
  type Storage,
  thinned,
  useCityExamples,
} from "./exampleRoutes";
import type { RecommendedRouteDetail } from "./recommendedRoutes";

const result = fixture as unknown as RouteResult;
const vercelli: Place = {
  label: "Vercelli, Piedmont, Italy",
  point: [45.3252, 8.4228],
  kind: "city",
};
const levico: Place = { label: "Levico Terme, Trentino", point: [46.0091, 11.3018] };

/** A file in memory, as the phone's. */
function memory(): Storage & { kept: Record<string, RecommendedRouteDetail[]> } {
  const store = {
    kept: {} as Record<string, RecommendedRouteDetail[]>,
    load: () => JSON.parse(JSON.stringify(store.kept)),
    save: (kept: Record<string, RecommendedRouteDetail[]>) => {
      store.kept = kept;
    },
  };
  return store;
}

/** The API by hand: each request waits until the test answers it. */
function api() {
  const asked: {
    shape: Shape;
    signal?: AbortSignal;
    answer: (o: RouteOutcome) => void;
  }[] = [];
  const request = jest.fn(
    (
      _url: string,
      body: { shape?: Shape | null },
      options?: { signal?: AbortSignal },
    ) =>
      new Promise<RouteOutcome>((resolve) => {
        asked.push({
          shape: body.shape as Shape,
          signal: options?.signal,
          answer: resolve,
        });
      }),
  ) as unknown as typeof requestRoute & jest.Mock;
  return { request, asked };
}

/** Where the first shapes are; the others have their own tests. */
function statuses(key: string, read: () => Example[] | null): string {
  return (
    firstExamples(read() ?? [])
      .map((e) => `${e.shape}:${e.status}`)
      .join(" ") + ` (${key})`
  );
}

/** Where the shapes drawn after the first ones are. */
function others(read: () => Example[] | null): string {
  return (read() ?? [])
    .filter((e) => isMore(e.shape))
    .map((e) => `${e.shape}:${e.status}`)
    .join(" ");
}

const EVERY_SHAPE = EXAMPLE_SHAPES.length + MORE_SHAPES.length;
const notDrawable: RouteOutcome = {
  kind: "api_error",
  code: "shape_not_drawable",
  message: "no",
  suggested_distance_m: null,
};

beforeEach(() => {
  forgetExamples();
});

test("a city's key, a thinned line, a route as the list has it", () => {
  expect(cityKey([45.32519, 8.42277])).toBe("45.3252,8.4228");
  const line = Array.from(
    { length: 500 },
    (_, i) => [45 + i / 1e4, 8] as [number, number],
  );
  const thin = thinned(line, 60);
  expect(thin.length).toBe(60);
  expect(thin[0]).toBe(line[0]);
  expect(thin[59]).toBe(line[499]);
  expect(thinned(line.slice(0, 10))).toHaveLength(10);

  const { route, detail } = asRecommended(vercelli, "heart", result);
  expect(route).toMatchObject({
    id: "example:heart:45.3252,8.4228",
    city: "Vercelli",
    shape: "heart",
    word: null,
    distance_m: EXAMPLE_DISTANCE_M,
    route_m: result.distance_m,
    similarity: result.similarity,
    start: result.points[0],
  });
  expect(route.away_m).toBeGreaterThan(0);
  expect(detail.points).toBe(result.points);
  expect(detail.license).toMatch(/OpenStreetMap/);
});

test("the heart is the first card, the circle the first asked, one at a time", async () => {
  const { request, asked } = api();
  const storage = memory();
  const { result: hook } = await renderHook(() =>
    useCityExamples("http://api", vercelli, { request, storage }),
  );
  const read = () => hook.current.examples;
  // The circle's zone holds the others': asked first, one download for all.
  expect(statuses("start", read)).toBe(
    "heart:waiting circle:drawing star:waiting (start)",
  );
  expect(asked.map((a) => a.shape)).toEqual(["circle"]);
  expect(request.mock.calls[0][1]).toEqual({
    shape: "circle",
    distance_m: EXAMPLE_DISTANCE_M,
    start: vercelli.point,
    activity: "running",
  });

  await act(async () => asked[0].answer({ kind: "route", result }));
  expect(statuses("circle", read)).toBe(
    "heart:drawing circle:ready star:waiting (circle)",
  );
  await act(async () => asked[1].answer(notDrawable));
  await act(async () => asked[2].answer({ kind: "route", result }));
  expect(statuses("end", read)).toBe("heart:failed circle:ready star:ready (end)");
  expect(asked.map((a) => a.shape).slice(0, 3)).toEqual(["circle", "heart", "star"]);

  // The ready ones open whole, and the file has them for next time.
  const circle = read()?.[1];
  expect(circle?.status === "ready" && exampleDetail(circle.route.id)?.points).toBe(
    result.points,
  );
  expect(storage.kept[cityKey(vercelli.point)].map((d) => d.shape)).toEqual([
    "circle",
    "star",
  ]);
});

test("the order of asking: the first three, then the others, largest zone first", () => {
  expect([...DRAW_ORDER].sort()).toEqual([...EXAMPLE_SHAPES, ...MORE_SHAPES].sort());
  expect(DRAW_ORDER.slice(0, EXAMPLE_SHAPES.length).sort()).toEqual(
    [...EXAMPLE_SHAPES].sort(),
  );
  // Measured on the engine (ADR-0144): the circle reaches farthest of all,
  // the moon of those drawn after the first three.
  expect(DRAW_ORDER[0]).toBe("circle");
  expect(DRAW_ORDER[EXAMPLE_SHAPES.length]).toBe("moon");
});

test("the next time, after closing the app: from the file, nothing asked", async () => {
  const first = api();
  const storage = memory();
  drawExamples("http://api", vercelli, { request: first.request, storage });
  for (let i = 0; i < EVERY_SHAPE; i += 1) {
    await act(async () => first.asked[i].answer({ kind: "route", result }));
  }
  forgetExamples(); // the app closed

  const again = api();
  const { result: hook } = await renderHook(() =>
    useCityExamples("http://api", vercelli, { request: again.request, storage }),
  );
  expect(hook.current.examples?.map((e) => e.status)).toEqual(
    Array.from({ length: EVERY_SHAPE }, () => "ready"),
  );
  expect(again.request).not.toHaveBeenCalled();
  const star = hook.current.examples?.[2];
  expect(star?.status === "ready" && exampleDetail(star.route.id)).toBeTruthy();
});

test("no map for the zone: every shape says so, and Try again asks again", async () => {
  const { request, asked } = api();
  const storage = memory();
  const { result: hook } = await renderHook(() =>
    useCityExamples("http://api", vercelli, { request, storage }),
  );
  await act(async () =>
    asked[0].answer({
      kind: "api_error",
      code: "map_data_unavailable",
      message: "Overpass refused",
    }),
  );
  const examples = hook.current.examples ?? [];
  expect(new Set(examples.map((e) => e.status))).toEqual(new Set(["failed"]));
  expect(examples).toHaveLength(EVERY_SHAPE);
  expect(examples[0].status === "failed" && examples[0].message).toMatch(
    /could not be downloaded/,
  );
  expect(asked).toHaveLength(1);

  await act(async () => hook.current.retry());
  expect(asked.map((a) => a.shape)).toEqual(["circle", "circle"]);
});

test("another city stops the one drawing; coming back asks what is missing", async () => {
  const { request, asked } = api();
  const storage = memory();
  drawExamples("http://api", vercelli, { request, storage });
  drawExamples("http://api", levico, { request, storage });
  expect(asked[0].signal?.aborted).toBe(true);
  expect(asked[1].shape).toBe("circle");
  await act(async () => asked[0].answer({ kind: "cancelled" }));

  // The same city twice asks once.
  drawExamples("http://api", levico, { request, storage });
  expect(asked).toHaveLength(2);

  drawExamples("http://api", vercelli, { request, storage });
  expect(asked[1].signal?.aborted).toBe(true);
  expect(asked[2].shape).toBe("circle");
});

test("the file keeps the last cities and drops what does not read", () => {
  const detail = asRecommended(vercelli, "heart", result).detail;
  expect(readKept({ a: [detail, { id: "bad" }], b: "nonsense" })).toEqual({
    a: [detail],
  });
  expect(readKept(null)).toEqual({});
  expect(readKept([detail])).toEqual({});
  expect(MAX_KEPT_CITIES).toBeGreaterThanOrEqual(5);
});

test("the file holds at most MAX_KEPT_CITIES cities, the last first", async () => {
  const storage = memory();
  for (let i = 0; i < MAX_KEPT_CITIES + 2; i += 1) {
    const city: Place = { label: `City ${i}`, point: [45 + i / 10, 8] };
    const { request, asked } = api();
    drawExamples("http://api", city, { request, storage });
    for (let j = 0; j < EXAMPLE_SHAPES.length; j += 1) {
      await act(async () => asked[j].answer({ kind: "route", result }));
    }
  }
  const keys = Object.keys(storage.kept);
  expect(keys).toHaveLength(MAX_KEPT_CITIES);
  expect(keys[0]).toBe(cityKey([45 + (MAX_KEPT_CITIES + 1) / 10, 8]));
});

test("no city or no API: no examples", async () => {
  const { request } = api();
  const { result: hook } = await renderHook(() =>
    useCityExamples(null, vercelli, { request, storage: memory() }),
  );
  expect(hook.current.examples).toBeNull();
  const { result: none } = await renderHook(() =>
    useCityExamples("http://api", null, { request, storage: memory() }),
  );
  expect(none.current.examples).toBeNull();
  expect(request).not.toHaveBeenCalled();
});

test("an example keeps the routes to choose from, and so does the file (TASK-151)", async () => {
  const [other] = result.alternatives ?? [];
  expect(other).toBeDefined();
  const { detail } = asRecommended(vercelli, "heart", result);
  expect(detail.alternatives).toHaveLength(1);
  expect(detail.alternatives?.[0]).toMatchObject({
    shape: "heart",
    distance_m: EXAMPLE_DISTANCE_M,
    route_m: other.distance_m,
    similarity: other.similarity,
    points: other.points,
  });
  // An older API sends none: an example with nothing else to choose.
  const alone = { ...result, alternatives: undefined };
  expect(asRecommended(vercelli, "heart", alone).detail.alternatives).toEqual([]);

  const { request, asked } = api();
  const storage = memory();
  drawExamples("http://api", vercelli, { request, storage });
  await act(async () => asked[0].answer({ kind: "route", result }));
  const [kept] = readKept(storage.load())[cityKey(vercelli.point)];
  expect(kept.alternatives?.map((a) => a.points)).toEqual([other.points]);
});

test("an example kept before the routes to choose from is drawn again", async () => {
  const storage = memory();
  const { alternatives: _none, ...old } = asRecommended(
    vercelli,
    "heart",
    result,
  ).detail;
  const star = asRecommended(vercelli, "star", result).detail;
  storage.kept = { [cityKey(vercelli.point)]: [old, star] };

  const { request, asked } = api();
  const { result: hook } = await renderHook(() =>
    useCityExamples("http://api", vercelli, { request, storage }),
  );
  expect(statuses("old file", () => hook.current.examples)).toBe(
    "heart:waiting circle:drawing star:ready (old file)",
  );
  expect(asked.map((a) => a.shape)).toEqual(["circle"]);
});

test("alternatives that do not read are as none kept", () => {
  const detail = asRecommended(vercelli, "heart", result).detail;
  const { alternatives: _none, ...route } = detail;
  expect(readKept({ a: [{ ...detail, alternatives: [{ id: "bad" }] }] })).toEqual({
    a: [route],
  });
  expect(readKept({ a: [{ ...detail, alternatives: "nonsense" }] })).toEqual({
    a: [route],
  });
});

test("after the first three, other shapes, one at a time (TASK-176)", async () => {
  const { request, asked } = api();
  const storage = memory();
  const { result: hook } = await renderHook(() =>
    useCityExamples("http://api", vercelli, { request, storage }),
  );
  const read = () => hook.current.examples;
  // While the first are drawn the others wait, and show no card.
  expect(others(read)).toBe(MORE_SHAPES.map((shape) => `${shape}:waiting`).join(" "));
  expect(shownExamples(read() ?? []).map((e) => e.shape)).toEqual([...EXAMPLE_SHAPES]);

  for (let i = 0; i < EXAMPLE_SHAPES.length; i += 1) {
    await act(async () => asked[i].answer({ kind: "route", result }));
  }
  expect(asked.map((a) => a.shape)).toEqual(DRAW_ORDER.slice(0, 4));
  expect(request.mock.calls[3][1]).toEqual({
    shape: MORE_SHAPES[0],
    distance_m: EXAMPLE_DISTANCE_M,
    start: vercelli.point,
    activity: "running",
  });
  // The one being drawn is a card; the ones after it are not, yet.
  expect(shownExamples(read() ?? []).map((e) => `${e.shape}:${e.status}`)).toEqual([
    "heart:ready",
    "circle:ready",
    "star:ready",
    `${MORE_SHAPES[0]}:drawing`,
  ]);

  await act(async () => asked[3].answer({ kind: "route", result }));
  expect(asked[4].shape).toBe(MORE_SHAPES[1]);
  const [first] = (read() ?? []).filter((e) => isMore(e.shape));
  expect(first.status === "ready" && exampleDetail(first.route.id)?.points).toBe(
    result.points,
  );
  // Kept with the first ones, for the next time.
  expect(storage.kept[cityKey(vercelli.point)].map((d) => d.shape)).toEqual([
    ...EXAMPLE_SHAPES,
    MORE_SHAPES[0],
  ]);
});

test("another shape that does not come out is left out, and not asked again", async () => {
  const { request, asked } = api();
  const storage = memory();
  const { result: hook } = await renderHook(() =>
    useCityExamples("http://api", vercelli, { request, storage }),
  );
  const read = () => hook.current.examples;
  for (let i = 0; i < EXAMPLE_SHAPES.length; i += 1) {
    await act(async () => asked[i].answer({ kind: "route", result }));
  }
  await act(async () => asked[3].answer(notDrawable));
  // No card for it, no error: the next one is drawn.
  expect(shownExamples(read() ?? []).map((e) => e.shape)).toEqual([
    ...EXAMPLE_SHAPES,
    MORE_SHAPES[1],
  ]);
  for (let i = 4; i < EVERY_SHAPE; i += 1) {
    await act(async () => asked[i].answer({ kind: "route", result }));
  }
  expect(asked).toHaveLength(EVERY_SHAPE);

  // Choosing the city again, or Try again, does not ask for it.
  await act(async () => hook.current.retry());
  await act(async () => {
    drawExamples("http://api", levico, { request, storage });
    drawExamples("http://api", vercelli, { request, storage });
  });
  expect(asked.map((a) => a.shape).slice(EVERY_SHAPE)).toEqual(["circle"]);
  expect(asked.filter((a) => a.shape === MORE_SHAPES[0])).toHaveLength(1);
});

test("trouble that is not a shape's stops the other shapes, quietly", async () => {
  const { request, asked } = api();
  const storage = memory();
  const { result: hook } = await renderHook(() =>
    useCityExamples("http://api", vercelli, { request, storage }),
  );
  const read = () => hook.current.examples;
  await act(async () => asked[0].answer({ kind: "route", result }));
  await act(async () => asked[1].answer(notDrawable));
  await act(async () => asked[2].answer({ kind: "route", result }));
  const heart = () => read()?.[0];
  const said = heart()?.status === "failed" ? heart() : undefined;
  expect(said).toBeDefined();

  // Too many requests in a minute, or no network: nothing to do with the moon.
  await act(async () =>
    asked[3].answer({
      kind: "api_error",
      code: "too_many_requests",
      message: "slow down",
      suggested_distance_m: null,
    }),
  );
  // The first three stay as they were, the heart with its own words; no
  // card and no error for the others, and none of them is asked.
  expect(statuses("stopped", read)).toBe(
    "heart:failed circle:ready star:ready (stopped)",
  );
  expect(heart()).toEqual(said);
  expect(shownExamples(read() ?? [])).toHaveLength(EXAMPLE_SHAPES.length);
  expect(others(read)).toBe(MORE_SHAPES.map((shape) => `${shape}:failed`).join(" "));
  expect(asked).toHaveLength(4);

  // The next time the city is chosen they are asked again, the heart first.
  await act(async () => {
    drawExamples("http://api", levico, { request, storage });
    drawExamples("http://api", vercelli, { request, storage });
  });
  expect(asked.at(-1)?.shape).toBe("heart");
  await act(async () => asked.at(-1)?.answer({ kind: "route", result }));
  expect(asked.at(-1)?.shape).toBe(MORE_SHAPES[0]);
});

test("examples kept before the other shapes: only those are asked", async () => {
  const storage = memory();
  storage.kept = {
    [cityKey(vercelli.point)]: EXAMPLE_SHAPES.map(
      (shape) => asRecommended(vercelli, shape, result).detail,
    ),
  };
  const { request, asked } = api();
  const { result: hook } = await renderHook(() =>
    useCityExamples("http://api", vercelli, { request, storage }),
  );
  expect(statuses("kept", () => hook.current.examples)).toBe(
    "heart:ready circle:ready star:ready (kept)",
  );
  expect(asked.map((a) => a.shape)).toEqual([MORE_SHAPES[0]]);
});
