import type { RouteResult, Shape } from "@shaperoute/shared-types";
import fixture from "@shaperoute/shared-types/fixtures/route-result.json";
import { act, renderHook } from "@testing-library/react-native";

import type { requestRoute, RouteOutcome } from "../api/routes";
import type { Place } from "../places/photon";
import {
  asRecommended,
  cityKey,
  drawExamples,
  EXAMPLE_DISTANCE_M,
  EXAMPLE_SHAPES,
  exampleDetail,
  type Example,
  forgetExamples,
  MAX_KEPT_CITIES,
  readKept,
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

function statuses(key: string, read: () => Example[] | null): string {
  return (read() ?? []).map((e) => `${e.shape}:${e.status}`).join(" ") + ` (${key})`;
}

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

test("the heart first, then the circle and the star, one at a time", async () => {
  const { request, asked } = api();
  const storage = memory();
  const { result: hook } = await renderHook(() =>
    useCityExamples("http://api", vercelli, { request, storage }),
  );
  const read = () => hook.current.examples;
  expect(statuses("start", read)).toBe(
    "heart:drawing circle:waiting star:waiting (start)",
  );
  expect(asked.map((a) => a.shape)).toEqual(["heart"]);
  expect(request.mock.calls[0][1]).toEqual({
    shape: "heart",
    distance_m: EXAMPLE_DISTANCE_M,
    start: vercelli.point,
    activity: "running",
  });

  await act(async () => asked[0].answer({ kind: "route", result }));
  expect(statuses("heart", read)).toBe(
    "heart:ready circle:drawing star:waiting (heart)",
  );
  await act(async () =>
    asked[1].answer({
      kind: "api_error",
      code: "shape_not_drawable",
      message: "no",
      suggested_distance_m: null,
    }),
  );
  await act(async () => asked[2].answer({ kind: "route", result }));
  expect(statuses("end", read)).toBe("heart:ready circle:failed star:ready (end)");

  // The ready ones open whole, and the file has them for next time.
  const heart = read()?.[0];
  expect(heart?.status === "ready" && exampleDetail(heart.route.id)?.points).toBe(
    result.points,
  );
  expect(storage.kept[cityKey(vercelli.point)].map((d) => d.shape)).toEqual([
    "heart",
    "star",
  ]);
});

test("the next time, after closing the app: from the file, nothing asked", async () => {
  const first = api();
  const storage = memory();
  drawExamples("http://api", vercelli, { request: first.request, storage });
  for (let i = 0; i < EXAMPLE_SHAPES.length; i += 1) {
    await act(async () => first.asked[i].answer({ kind: "route", result }));
  }
  forgetExamples(); // the app closed

  const again = api();
  const { result: hook } = await renderHook(() =>
    useCityExamples("http://api", vercelli, { request: again.request, storage }),
  );
  expect(hook.current.examples?.map((e) => e.status)).toEqual([
    "ready",
    "ready",
    "ready",
  ]);
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
  expect(examples.map((e) => e.status)).toEqual(["failed", "failed", "failed"]);
  expect(examples[0].status === "failed" && examples[0].message).toMatch(
    /could not be downloaded/,
  );
  expect(asked).toHaveLength(1);

  await act(async () => hook.current.retry());
  expect(asked.map((a) => a.shape)).toEqual(["heart", "heart"]);
});

test("another city stops the one drawing; coming back asks what is missing", async () => {
  const { request, asked } = api();
  const storage = memory();
  drawExamples("http://api", vercelli, { request, storage });
  drawExamples("http://api", levico, { request, storage });
  expect(asked[0].signal?.aborted).toBe(true);
  expect(asked[1].shape).toBe("heart");
  await act(async () => asked[0].answer({ kind: "cancelled" }));

  // The same city twice asks once.
  drawExamples("http://api", levico, { request, storage });
  expect(asked).toHaveLength(2);

  drawExamples("http://api", vercelli, { request, storage });
  expect(asked[1].signal?.aborted).toBe(true);
  expect(asked[2].shape).toBe("heart");
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
