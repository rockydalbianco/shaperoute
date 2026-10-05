import type { LatLon, RouteResult } from "@shaperoute/shared-types";
import fixture from "@shaperoute/shared-types/fixtures/route-result.json";
import { act, renderHook } from "@testing-library/react-native";

import type { requestRoute, RouteOutcome } from "../api/routes";
import {
  exampleDetail,
  forgetExamples,
  PADDLE_EXAMPLES,
  RUN_EXAMPLES,
  type Storage,
  useCityExamples,
} from "../explore/exampleRoutes";
import { useExplored } from "../explore/explored";
import type { RecommendedRoute } from "../explore/recommendedRoutes";
import type { Place } from "../places/photon";
import { useMoveExample } from "./useMoveExample";

const API = "http://api";
// A place of «Explore»: its examples come with the app, with their centre.
const garda: Place = { label: "Lago di Garda", point: [45.88114, 10.84559] };
const HEART_CENTRE: LatLon = [45.878804, 10.844628];
const NO_FILE: Storage = { load: () => ({}), save: () => {} };

/** The API by hand: each request waits until the test answers it. */
function api() {
  const asked: {
    body: Record<string, unknown>;
    signal?: AbortSignal;
    answer: (outcome: RouteOutcome) => void;
  }[] = [];
  const request = jest.fn(
    (_url: string, body: Record<string, unknown>, options?: { signal?: AbortSignal }) =>
      new Promise<RouteOutcome>((resolve) => {
        asked.push({ body, signal: options?.signal, answer: resolve });
      }),
  ) as unknown as typeof requestRoute & jest.Mock;
  return { request, asked };
}

/** The route the engine answers for a shape wanted at `centre`. */
function placed(centre: LatLon, by: number): RouteResult {
  return {
    points: [
      [centre[0] + by, centre[1]],
      [centre[0], centre[1] + by],
      [centre[0] - by, centre[1]],
      [centre[0] + by, centre[1]],
    ],
    distance_m: 1975,
    similarity: 1,
    shape: "heart",
    warnings: [],
    directions: [],
    // As the API answers on the water: none, but there.
    walks: [],
    on_foot: [],
    centre,
  };
}

/** The cards of a place, as «Explore» shows them. */
async function cardsOf(place: Place, set = PADDLE_EXAMPLES, request = api().request) {
  const { result } = await renderHook(() =>
    useCityExamples(API, place, { request, storage: NO_FILE, set }),
  );
  return () => result.current.examples ?? [];
}

/** A card's route open on the map, with its shape to move. */
async function opened(
  route: RecommendedRoute,
  request: typeof requestRoute,
  apiUrl: string | null = API,
) {
  const { result } = await renderHook(() => {
    const door = useExplored(apiUrl);
    const move = useMoveExample(apiUrl, door.explored, door.redraw, request);
    return { door, move };
  });
  await act(async () => result.current.door.open(route));
  return result;
}

async function heartOfGarda(): Promise<RecommendedRoute> {
  const [heart] = (await cardsOf(garda))();
  if (heart.status !== "ready") {
    throw new Error("the app's heart should be ready");
  }
  return heart.route;
}

beforeEach(() => {
  forgetExamples();
});

afterAll(() => {
  forgetExamples();
});

test("an example on the water can be moved; nothing moves until asked", async () => {
  const { request } = api();
  const hook = await opened(await heartOfGarda(), request);
  expect(hook.current.move).toMatchObject({
    available: true,
    moving: false,
    waiting: false,
    elsewhere: false,
    problem: null,
  });
  await act(async () => hook.current.move.begin());
  expect(hook.current.move.moving).toBe(true);
  await act(async () => hook.current.move.cancel());
  expect(hook.current.move.moving).toBe(false);
  expect(request).not.toHaveBeenCalled();
});

test("without an API, a centre or the water there is nothing to move", async () => {
  const heart = await heartOfGarda();
  const offline = await opened(heart, api().request, null);
  expect(offline.current.move.available).toBe(false);
  await act(async () => offline.current.move.begin());
  expect(offline.current.move.moving).toBe(false);

  // Asked to an API of before TASK-238: its answer says no centre.
  const malcesine: Place = { label: "Malcesine", point: [45.7636, 10.8098] };
  const old = api();
  const cards = await cardsOf(malcesine, PADDLE_EXAMPLES, old.request);
  await act(async () =>
    old.asked[0].answer({
      kind: "route",
      result: { ...placed(HEART_CENTRE, 0.001), centre: null },
    }),
  );
  const circle = cards().find((e) => e.shape === "circle");
  if (circle?.status !== "ready") {
    throw new Error("the circle should be ready");
  }
  const kept = await opened(circle.route, api().request);
  expect(kept.current.door.explored?.status).toBe("done");
  expect(kept.current.move.available).toBe(false);

  // A run's example is on the roads: the search finds its place.
  forgetExamples();
  const vercelli: Place = { label: "Vercelli", point: [45.3252, 8.4228] };
  const roads = api();
  const run = await cardsOf(vercelli, RUN_EXAMPLES, roads.request);
  await act(async () =>
    roads.asked[0].answer({
      kind: "route",
      result: { ...(fixture as unknown as RouteResult), centre: HEART_CENTRE },
    }),
  );
  const drawn = run().find((e) => e.shape === "circle");
  if (drawn?.status !== "ready") {
    throw new Error("the run's circle should be ready");
  }
  const onRoads = await opened(drawn.route, api().request);
  expect(onRoads.current.move.available).toBe(false);
});

test("left somewhere, the example is asked again from its place, wanted there", async () => {
  const { request, asked } = api();
  const heart = await heartOfGarda();
  const hook = await opened(heart, request);
  const before = hook.current.door.explored;
  await act(async () => hook.current.move.begin());
  await act(async () => hook.current.move.onMoved([0.002, -0.001]));

  expect(request).toHaveBeenCalledTimes(1);
  expect(request.mock.calls[0][0]).toBe(API);
  const { near, ...same } = asked[0].body as { near: LatLon };
  // The request the example was drawn for: from the place of «Explore».
  expect(same).toEqual({
    shape: "heart",
    distance_m: 2000,
    start: garda.point,
    activity: "paddling",
  });
  expect(near[0]).toBeCloseTo(HEART_CENTRE[0] - 0.001, 9);
  expect(near[1]).toBeCloseTo(HEART_CENTRE[1] + 0.002, 9);
  // The move is over; the route of before is still the one on the map, the
  // very line, so the map keeps it where the finger left it.
  expect(hook.current.move).toMatchObject({ moving: false, waiting: true });
  expect(hook.current.door.explored).toBe(before);

  const answer = placed(near, 0.001);
  await act(async () => asked[0].answer({ kind: "route", result: answer }));
  const after = hook.current.door.explored;
  if (after?.status !== "done") {
    throw new Error("the moved heart should be open");
  }
  expect(after.detail.points).toBe(answer.points);
  expect(after.result.centre).toEqual(near);
  expect(after.route).toMatchObject({ id: heart.id, route_m: 1975 });
  expect(hook.current.move).toMatchObject({
    available: true,
    waiting: false,
    elsewhere: false,
    problem: null,
  });
  // The list keeps the example as it was drawn.
  expect(exampleDetail(heart.id)?.centre).toEqual(HEART_CENTRE);

  // And it can be moved again, from where it is now.
  await act(async () => hook.current.move.begin());
  await act(async () => hook.current.move.onMoved([0.001, 0]));
  const again = asked[1].body as { near: LatLon; start: LatLon };
  expect(again.start).toEqual(garda.point);
  expect(again.near[0]).toBeCloseTo(near[0], 9);
  expect(again.near[1]).toBeCloseTo(near[1] + 0.001, 9);
});

test("where the shape does not fit, it says it is at the nearest place", async () => {
  const { request, asked } = api();
  const hook = await opened(await heartOfGarda(), request);
  await act(async () => hook.current.move.begin());
  // Left on the land, 1 km north: the engine keeps it about where it was.
  await act(async () => hook.current.move.onMoved([0, 0.01]));
  await act(async () =>
    asked[0].answer({ kind: "route", result: placed(HEART_CENTRE, 0.001) }),
  );
  expect(hook.current.move.elsewhere).toBe(true);
  // Moving it again takes the line away.
  await act(async () => hook.current.move.begin());
  expect(hook.current.move.elsewhere).toBe(false);
});

test("a move that fails says why, and the route of before is back on the map", async () => {
  const { request, asked } = api();
  const hook = await opened(await heartOfGarda(), request);
  const before = hook.current.door.explored;
  if (before?.status !== "done") {
    throw new Error("the heart should be open");
  }
  await act(async () => hook.current.move.begin());
  await act(async () => hook.current.move.onMoved([0.002, 0]));
  await act(async () => asked[0].answer({ kind: "unreachable", url: API }));

  const after = hook.current.door.explored;
  if (after?.status !== "done") {
    throw new Error("the heart should still be open");
  }
  // The same route in a new line: the map is told again, and draws it
  // where it was.
  expect(after.detail.points).toEqual(before.detail.points);
  expect(after.detail.points).not.toBe(before.detail.points);
  expect(hook.current.move).toMatchObject({
    available: true,
    waiting: false,
    elsewhere: false,
  });
  expect(hook.current.move.problem).toMatch(/\S/);
});

test("a drag told when nobody is moving asks for nothing", async () => {
  const { request } = api();
  const hook = await opened(await heartOfGarda(), request);
  await act(async () => hook.current.move.onMoved([0.002, -0.001]));
  expect(request).not.toHaveBeenCalled();
  expect(hook.current.move.waiting).toBe(false);
});

test("the route closed while its moved one is drawn: nobody waits for it", async () => {
  const { request, asked } = api();
  const heart = await heartOfGarda();
  const hook = await opened(heart, request);
  await act(async () => hook.current.move.begin());
  await act(async () => hook.current.move.onMoved([0.002, 0]));
  expect(asked[0].signal?.aborted).toBe(false);

  await act(async () => hook.current.door.close());
  expect(asked[0].signal?.aborted).toBe(true);
  // Opened again, it is the example as it was, and a late answer is nobody's.
  await act(async () => hook.current.door.open(heart));
  await act(async () =>
    asked[0].answer({ kind: "route", result: placed([45.87, 10.85], 0.001) }),
  );
  const after = hook.current.door.explored;
  expect(after?.status === "done" && after.result.centre).toEqual(HEART_CENTRE);
  expect(hook.current.move).toMatchObject({ waiting: false, moving: false });
});
