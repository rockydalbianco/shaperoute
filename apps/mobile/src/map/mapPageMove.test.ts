/**
 * The map page's script run against a stand-in for MapLibre (TASK-238): one
 * finger drags the route in place of the map, only while the app asks, and
 * the app is told by how much when it is lifted.
 */
import vm from "node:vm";

import type { LatLon } from "@shaperoute/shared-types";

import { buildMapPage, MOVE_MIN_PX } from "./mapPage";
import {
  clearRoute,
  type FromPage,
  parsePageMessage,
  setMove,
  showRoute,
  type ToPage,
} from "./messages";

type Touch = { clientX: number; clientY: number };
type TouchEventLike = { touches: Touch[]; timeStamp: number };
type Listener = (event: TouchEventLike) => void;
type Geometry = { type: string; coordinates: unknown };
type Drawn = { geometry?: Geometry };

/** A pixel is a thousandth of a degree, north up. */
const DEG_PER_PX = 0.001;

/** The page's own scripts, the ones with no `src`, run in order. */
function runPage() {
  const listeners = new Map<string, Listener[]>();
  const sources = new Map<string, Drawn>();
  const surface = {
    style: { touchAction: "" },
    addEventListener(type: string, listener: Listener, options: unknown) {
      // Never in the way of MapLibre's own gestures.
      expect(options).toEqual({ passive: true });
      listeners.set(type, [...(listeners.get(type) ?? []), listener]);
    },
  };
  const drag = { enabled: true, changes: 0 };
  class Map_ {
    dragPan = {
      enable() {
        drag.enabled = true;
        drag.changes += 1;
      },
      disable() {
        drag.enabled = false;
        drag.changes += 1;
      },
    };
    doubleClickZoom = { enable() {}, disable() {} };
    addControl() {}
    on() {}
    once(event: string, then: () => void) {
      if (event === "style.load") {
        then();
      }
    }
    addSource(name: string, source: { data: Drawn }) {
      sources.set(name, source.data);
    }
    addLayer() {}
    getSource(name: string) {
      return sources.has(name)
        ? { setData: (data: Drawn) => sources.set(name, data) }
        : undefined;
    }
    setFeatureState() {}
    fitBounds() {}
    getCanvasContainer() {
      return surface;
    }
    unproject([x, y]: [number, number]) {
      return { lng: 11 + x * DEG_PER_PX, lat: 46 - y * DEG_PER_PX };
    }
  }
  class Bounds {
    extend() {
      return this;
    }
  }
  const posted: string[] = [];
  const context: Record<string, unknown> = {
    maplibregl: { Map: Map_, LngLatBounds: Bounds, AttributionControl: class {} },
    ReactNativeWebView: { postMessage: (data: string) => posted.push(data) },
  };
  context.window = context;
  vm.createContext(context);
  const scripts = [...buildMapPage().matchAll(/<script>([\s\S]*?)<\/script>/g)];
  for (const [, code] of scripts) {
    vm.runInContext(code, context);
  }
  const page = context.shaperoute as { receive: (message: ToPage) => void };
  const fire = (type: string, touches: Touch[]) =>
    (listeners.get(type) ?? []).forEach((listener) =>
      listener({ touches, timeStamp: 0 }),
    );
  const at = (x: number, y: number): Touch[] => [{ clientX: x, clientY: y }];
  return {
    drag,
    surface,
    listeners,
    // Through JSON, as injectJavaScript delivers it.
    send: (message: ToPage) => page.receive(JSON.parse(JSON.stringify(message))),
    /** What the app was told of moves, in order. */
    moves: () =>
      posted
        .map((data) => parsePageMessage(data))
        .filter(
          (message): message is Extract<FromPage, { type: "moved" }> =>
            message?.type === "moved",
        )
        .map((message) => message.by),
    /** The line drawn in a source of the map, as [lng, lat] pairs. */
    drawn: (name: string) => sources.get(name)?.geometry?.coordinates,
    down: (x: number, y: number) => fire("touchstart", at(x, y)),
    to: (x: number, y: number) => fire("touchmove", at(x, y)),
    up: () => fire("touchend", []),
    fire,
  };
}

const ROUTE: LatLon[] = [
  [46.0, 11.0],
  [46.001, 11.002],
  [46.002, 11.0],
  [46.0, 11.0],
];
const LINE = ROUTE.map(([lat, lon]) => [lon, lat]);

function close(drawn: unknown, expected: number[][]) {
  const line = drawn as number[][];
  expect(line).toHaveLength(expected.length);
  line.forEach(([lng, lat], i) => {
    expect(lng).toBeCloseTo(expected[i][0], 9);
    expect(lat).toBeCloseTo(expected[i][1], 9);
  });
}

test("until the app asks, a finger drags the map: no listener, the drag on", () => {
  const page = runPage();
  page.send(showRoute(ROUTE));
  expect(page.listeners.size).toBe(0);
  expect(page.drag).toEqual({ enabled: true, changes: 0 });
  expect(page.moves()).toEqual([]);
});

test("asked, one finger drags the route, and the app is told when it is lifted", () => {
  const page = runPage();
  page.send(showRoute(ROUTE));
  page.send(setMove(true));
  expect(page.drag.enabled).toBe(false);
  expect(page.surface.style.touchAction).toBe("none");

  page.down(100, 200);
  page.to(150, 180);
  // 50 px east and 20 px north: the route is drawn there, under the finger.
  const moved = LINE.map(([lng, lat]) => [lng + 0.05, lat + 0.02]);
  close(page.drawn("route"), moved);
  expect(page.moves()).toEqual([]);

  page.to(160, 180);
  page.up();
  const [by, ...more] = page.moves();
  expect(more).toEqual([]);
  expect(by[0]).toBeCloseTo(0.06, 9);
  expect(by[1]).toBeCloseTo(0.02, 9);
});

test("left somewhere, the route stays there until the app sends the one placed", () => {
  const page = runPage();
  page.send(showRoute(ROUTE));
  page.send(setMove(true));
  page.down(100, 200);
  page.to(150, 200);
  page.up();
  const left = LINE.map(([lng, lat]) => [lng + 0.05, lat]);

  // The app leaves the move and asks the engine: the map has its drag back.
  page.send(setMove(false));
  expect(page.drag.enabled).toBe(true);
  expect(page.surface.style.touchAction).toBe("");
  close(page.drawn("route"), left);

  const placed: LatLon[] = ROUTE.map(([lat, lon]) => [lat, lon + 0.04]);
  page.send(showRoute(placed));
  close(
    page.drawn("route"),
    placed.map(([lat, lon]) => [lon, lat]),
  );
});

test("the move left without a drag puts the route back where it was", () => {
  const page = runPage();
  page.send(showRoute(ROUTE));
  page.send(setMove(true));
  page.down(100, 200);
  page.to(150, 260);
  // «Cancel» with the finger still down.
  page.send(setMove(false));
  close(page.drawn("route"), LINE);
  page.up();
  expect(page.moves()).toEqual([]);
});

test("a finger that hardly moves has moved nothing", () => {
  const page = runPage();
  page.send(showRoute(ROUTE));
  page.send(setMove(true));
  page.down(100, 200);
  page.to(100 + MOVE_MIN_PX - 1, 200 - MOVE_MIN_PX + 1);
  page.up();
  expect(page.moves()).toEqual([]);
  close(page.drawn("route"), LINE);
});

test("a second finger is a zoom: the route goes back, and nothing is told", () => {
  const page = runPage();
  page.send(showRoute(ROUTE));
  page.send(setMove(true));
  page.down(100, 200);
  page.to(150, 200);
  page.fire("touchstart", [
    { clientX: 150, clientY: 200 },
    { clientX: 250, clientY: 300 },
  ]);
  close(page.drawn("route"), LINE);
  page.fire("touchend", [{ clientX: 250, clientY: 300 }]);
  page.up();
  expect(page.moves()).toEqual([]);
});

test("the walks of a shape in pieces move with it", () => {
  const page = runPage();
  page.send(showRoute(ROUTE, null, [[1, 2]]));
  page.send(setMove(true));
  page.down(10, 10);
  page.to(10, 60);
  const walks = page.drawn("walks") as number[][][];
  expect(walks).toHaveLength(1);
  close(walks[0], [
    [11.002, 46.001 - 0.05],
    [11.0, 46.002 - 0.05],
  ]);
  const letters = page.drawn("route") as number[][][];
  expect(letters.flat()).toHaveLength(ROUTE.length);
});

test("asked again and again, the fingers are listened to once", () => {
  const page = runPage();
  page.send(setMove(true));
  page.send(setMove(false));
  page.send(setMove(true));
  expect([...page.listeners.keys()].sort()).toEqual([
    "touchcancel",
    "touchend",
    "touchmove",
    "touchstart",
  ]);
  for (const added of page.listeners.values()) {
    expect(added).toHaveLength(1);
  }
});

test("with no route on the map a drag moves nothing, and breaks nothing", () => {
  const page = runPage();
  page.send(clearRoute());
  page.send(setMove(true));
  page.down(100, 200);
  page.to(150, 200);
  page.up();
  expect(page.drawn("route")).toBeUndefined();
});

test("only a well-made `moved` is read from the page", () => {
  expect(parsePageMessage('{"type":"moved","by":[0.001,-0.002]}')).toEqual({
    type: "moved",
    by: [0.001, -0.002],
  });
  for (const wrong of [
    '{"type":"moved"}',
    '{"type":"moved","by":[1]}',
    '{"type":"moved","by":["1","2"]}',
    '{"type":"moved","by":[1,null]}',
    '{"type":"moved","by":{"lng":1,"lat":2}}',
  ]) {
    expect(parsePageMessage(wrong)).toBeNull();
  }
});
