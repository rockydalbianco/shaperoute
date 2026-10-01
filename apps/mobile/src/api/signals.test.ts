import type { ImageRouteRequest, RouteRequest } from "@shaperoute/shared-types";
import imageRequest from "@shaperoute/shared-types/fixtures/image-route-request.json";
import signals from "@shaperoute/shared-types/fixtures/signals.json";
import type { Signal } from "@shaperoute/shared-types/src/signals";

import { drawnOf, sendSignal } from "./signals";

// The contract's bodies, as the API's tests read them (test_insights_signals.py).
const bodies = signals as Signal[];

function answering(status: number) {
  return jest.fn().mockResolvedValue(new Response(null, { status }));
}

test("a signal is posted to /signals, with the key when there is one", async () => {
  const fetchFn = answering(204);
  const sent = await sendSignal(bodies[0], {
    baseUrl: "http://api",
    fetchFn,
    key: "k",
  });
  expect(sent).toBe(true);
  const [url, init] = fetchFn.mock.calls[0];
  expect(url).toBe("http://api/signals");
  expect(init.method).toBe("POST");
  expect(init.headers).toEqual({
    "Content-Type": "application/json",
    "X-API-Key": "k",
  });
  expect(JSON.parse(init.body)).toEqual(bodies[0]);
});

test("without an API nothing is sent, and a failure never throws", async () => {
  const fetchFn = answering(204);
  expect(await sendSignal(bodies[2], { baseUrl: null, fetchFn })).toBe(false);
  expect(fetchFn).not.toHaveBeenCalled();
  const down = jest.fn().mockRejectedValue(new TypeError("Network request failed"));
  expect(await sendSignal(bodies[2], { baseUrl: "http://api", fetchFn: down })).toBe(
    false,
  );
  expect(
    await sendSignal(bodies[2], { baseUrl: "http://api", fetchFn: answering(422) }),
  ).toBe(false);
});

test("every body of the contract is a signal of its kind", () => {
  expect(bodies.map((s) => s.kind)).toEqual([
    "city_chosen",
    "city_chosen",
    "route_chosen",
    "route_chosen",
    "hint_taken",
    "hint_taken",
  ]);
  for (const s of bodies) {
    if (s.kind !== "city_chosen") {
      // A shape or a word, never both, never the start.
      expect((s.shape === undefined) !== (s.word === undefined)).toBe(true);
      expect(s).not.toHaveProperty("start");
    }
  }
});

test("what a request draws, without its start", () => {
  const start: [number, number] = [46.0671, 11.1214];
  const shape: RouteRequest = {
    start,
    shape: "heart",
    distance_m: 5000,
    activity: "running",
  };
  const word: RouteRequest = {
    start,
    word: "ciao",
    distance_m: 8000,
    activity: "running",
  };
  expect(drawnOf(shape)).toEqual({ shape: "heart" });
  expect(drawnOf(word)).toEqual({ word: "CIAO" });
  expect(drawnOf(imageRequest as ImageRouteRequest)).toEqual({ shape: "image" });
});
