import type { LatLon, RouteRequest, RouteResult } from "@shaperoute/shared-types";
import { act, renderHook } from "@testing-library/react-native";

import type { RouteState } from "../route/useRouteRequest";
import { movedCentre } from "./shapeMove";
import { useMoveShape } from "./useMoveShape";

const RICCIONE: LatLon = [44.0007, 12.6513];
const CENTRE: LatLon = [44.0041, 12.655];
const REQUEST: RouteRequest = {
  start: RICCIONE,
  shape: "smiley",
  pen_up: true,
  distance_m: 2000,
  activity: "paddling",
};

function drawn(centre: LatLon | null = CENTRE): RouteResult {
  return {
    points: [RICCIONE, CENTRE, [44.005, 12.656], CENTRE, RICCIONE],
    distance_m: 1984,
    similarity: 1,
    shape: "smiley",
    warnings: [],
    directions: [],
    walks: [[1, 2]],
    centre,
  };
}

function done(request: RouteRequest, result: RouteResult): RouteState {
  return { status: "done", request, result };
}

type Props = { view: RouteState; shown: RouteResult | null };

async function hook(view: RouteState, shown: RouteResult | null) {
  const draw = jest.fn();
  const rendered = await renderHook(
    (props: Props) => useMoveShape(props.view, props.shown, draw),
    { initialProps: { view, shown } },
  );
  return { ...rendered, draw };
}

test("a drawn route on the water can be moved; nothing moves until asked", async () => {
  const result = drawn();
  const { result: move } = await hook(done(REQUEST, result), result);
  expect(move.current.available).toBe(true);
  expect(move.current.moving).toBe(false);
  expect(move.current.left).toBeNull();
  expect(move.current.elsewhere).toBe(false);
});

test("without a route, or without its centre, there is nothing to move", async () => {
  const idle = await hook({ status: "idle" }, null);
  expect(idle.result.current.available).toBe(false);
  await act(async () => idle.result.current.begin());
  expect(idle.result.current.moving).toBe(false);

  const older = drawn(null);
  const before = await hook(done(REQUEST, older), older);
  expect(before.result.current.available).toBe(false);
});

test("«Move the shape», then «Cancel»: the route is as it was, nothing asked", async () => {
  const result = drawn();
  const { result: move, draw } = await hook(done(REQUEST, result), result);
  await act(async () => move.current.begin());
  expect(move.current.moving).toBe(true);
  await act(async () => move.current.cancel());
  expect(move.current.moving).toBe(false);
  expect(draw).not.toHaveBeenCalled();
});

test("left somewhere, the same route is asked for there, and kept on the map meanwhile", async () => {
  const result = drawn();
  const { result: move, draw, rerender } = await hook(done(REQUEST, result), result);
  await act(async () => move.current.begin());
  await act(async () => move.current.onMoved([0.002, -0.001]));

  expect(move.current.moving).toBe(false);
  const [[asked]] = draw.mock.calls as [[RouteRequest]];
  expect(asked).toEqual({ ...REQUEST, near: movedCentre(CENTRE, [0.002, -0.001]) });

  // While it is drawn the map keeps the route of before: the same arrays.
  await rerender({
    view: { status: "waiting", request: asked, startedAt: 0, phase: "sending" },
    shown: null,
  });
  expect(move.current.left?.points).toBe(result.points);
  expect(move.current.left?.walks).toBe(result.walks);

  // Placed where it was left.
  const placed = { ...drawn(asked.near), points: [...result.points] };
  await rerender({ view: done(asked, placed), shown: placed });
  expect(move.current.left).toBeNull();
  expect(move.current.elsewhere).toBe(false);
  expect(move.current.available).toBe(true);
  expect(move.current.moving).toBe(false);
});

test("placed away from where it was left, the screen is told", async () => {
  const result = drawn();
  const { result: move, draw, rerender } = await hook(done(REQUEST, result), result);
  await act(async () => move.current.begin());
  await act(async () => move.current.onMoved([0, 0.01]));
  const [[asked]] = draw.mock.calls as [[RouteRequest]];
  // On the beach: the engine keeps the shape about where it was.
  const placed = drawn([CENTRE[0] + 0.0004, CENTRE[1]]);
  await rerender({ view: done(asked, placed), shown: placed });
  expect(move.current.elsewhere).toBe(true);
});

test("the route of before is not kept on the map for another request", async () => {
  const result = drawn();
  const { result: move, draw, rerender } = await hook(done(REQUEST, result), result);
  await act(async () => move.current.begin());
  await act(async () => move.current.onMoved([0.002, 0]));
  expect(draw).toHaveBeenCalledTimes(1);
  const other: RouteRequest = { ...REQUEST, distance_m: 3000 };
  await rerender({
    view: { status: "waiting", request: other, startedAt: 0, phase: "sending" },
    shown: null,
  });
  expect(move.current.left).toBeNull();
});

test("another route on screen is not the one being moved", async () => {
  const result = drawn();
  const { result: move, rerender } = await hook(done(REQUEST, result), result);
  await act(async () => move.current.begin());
  expect(move.current.moving).toBe(true);
  const next = drawn([44.006, 12.66]);
  await rerender({ view: done(REQUEST, next), shown: next });
  expect(move.current.available).toBe(true);
  expect(move.current.moving).toBe(false);
});

test("a drag that arrives with no route to move asks for nothing", async () => {
  const { result: move, draw } = await hook({ status: "idle" }, null);
  await act(async () => move.current.onMoved([0.002, 0]));
  expect(draw).not.toHaveBeenCalled();
});

test("a drag told when the route is not being moved asks for nothing", async () => {
  const result = drawn();
  const { result: move, draw } = await hook(done(REQUEST, result), result);
  await act(async () => move.current.onMoved([0.002, 0]));
  expect(draw).not.toHaveBeenCalled();
});
