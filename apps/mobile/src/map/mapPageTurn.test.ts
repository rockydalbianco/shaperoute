/**
 * The map page's script run against a stand-in for MapLibre (TASK-232): a
 * route whose shape is turned is framed with the bearing that makes it
 * upright, the map stays so while it is run, the north arrow turns it, and
 * the app is told how the map is turned.
 */
import vm from "node:vm";

import type { LatLon } from "@shaperoute/shared-types";

import { buildMapPage, FOLLOW_ZOOM } from "./mapPage";
import {
  clearRoute,
  follow,
  type FromPage,
  parsePageMessage,
  setMove,
  setPosition,
  showRoute,
  stopFollow,
  type ToPage,
  turn,
} from "./messages";

type Touch = { clientX: number; clientY: number };
type TouchEventLike = { touches: Touch[]; timeStamp: number };
type Listener = (event: TouchEventLike) => void;
type Geometry = { type: string; coordinates: unknown };
type Drawn = { geometry?: Geometry };
type MapEvent = { originalEvent?: object };
type Camera = { bearing?: number; center?: unknown; zoom?: number; padding?: number };

/** A pixel is a thousandth of a degree. */
const DEG_PER_PX = 0.001;

/** The page's own scripts, the ones with no `src`, run in order. */
function runPage() {
  const listeners = new Map<string, Listener[]>();
  const handlers = new Map<string, ((event: MapEvent) => void)[]>();
  const sources = new Map<string, Drawn>();
  const calls: { how: string; camera: Camera }[] = [];
  let bearing = 0;
  const surface = {
    style: { touchAction: "" },
    addEventListener(type: string, listener: Listener) {
      listeners.set(type, [...(listeners.get(type) ?? []), listener]);
    },
  };
  const tell = (event: string, data: MapEvent) =>
    (handlers.get(event) ?? []).forEach((handler) => handler(data));
  /** The map moved by the app: its events carry no finger. */
  function moveTo(how: string, camera: Camera) {
    calls.push({ how, camera });
    tell("movestart", {});
    if (camera.bearing !== undefined && camera.bearing !== bearing) {
      bearing = camera.bearing;
      tell("rotate", {});
    }
  }
  class Map_ {
    dragPan = { enable() {}, disable() {} };
    doubleClickZoom = { enable() {}, disable() {} };
    addControl() {}
    on(event: string, handler: (event: MapEvent) => void) {
      handlers.set(event, [...(handlers.get(event) ?? []), handler]);
    }
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
    getBearing() {
      return bearing;
    }
    fitBounds(_bounds: unknown, camera: Camera) {
      moveTo("fitBounds", camera);
    }
    easeTo(camera: Camera) {
      moveTo("easeTo", camera);
    }
    flyTo(camera: Camera) {
      moveTo("flyTo", camera);
    }
    getCanvasContainer() {
      return surface;
    }
    /** As MapLibre: up on the screen is the map's bearing, right a quarter
     * turn clockwise from it. */
    unproject([x, y]: [number, number]) {
      const turn = (bearing * Math.PI) / 180;
      const east = x * Math.cos(turn) - y * Math.sin(turn);
      const north = -x * Math.sin(turn) - y * Math.cos(turn);
      return { lng: 11 + east * DEG_PER_PX, lat: 46 + north * DEG_PER_PX };
    }
  }
  class Bounds {
    extend() {
      return this;
    }
  }
  class Marker {
    setLngLat() {
      return this;
    }
    addTo() {
      return this;
    }
    remove() {}
    getLngLat() {
      return [11, 46];
    }
    setRotation() {}
  }
  const posted: string[] = [];
  const context: Record<string, unknown> = {
    maplibregl: {
      Map: Map_,
      LngLatBounds: Bounds,
      Marker,
      AttributionControl: class {},
    },
    ReactNativeWebView: { postMessage: (data: string) => posted.push(data) },
    document: { createElement: () => ({ style: {} }) },
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
  const told = <T extends FromPage["type"]>(type: T) =>
    posted
      .map((data) => parsePageMessage(data))
      .filter(
        (message): message is Extract<FromPage, { type: T }> => message?.type === type,
      );
  return {
    // Through JSON, as injectJavaScript delivers it.
    send: (message: ToPage) => page.receive(JSON.parse(JSON.stringify(message))),
    /** How the app moved the map, in order. */
    calls,
    last: () => calls[calls.length - 1],
    bearing: () => bearing,
    /** Two fingers turn the map: MapLibre's events carry the fingers. */
    fingersTurn(to: number) {
      tell("movestart", { originalEvent: {} });
      bearing = to;
      tell("rotate", { originalEvent: {} });
    },
    /** One finger drags the map. */
    fingerDrags() {
      tell("movestart", { originalEvent: {} });
    },
    /** The bearings the app was told, in order. */
    turned: () => told("turned").map((message) => message.bearing),
    moves: () => told("moved").map((message) => message.by),
    drawn: (name: string) => sources.get(name)?.geometry?.coordinates,
    down: (x: number, y: number) => fire("touchstart", at(x, y)),
    to: (x: number, y: number) => fire("touchmove", at(x, y)),
    up: () => fire("touchend", []),
  };
}

const ROUTE: LatLon[] = [
  [46.0, 11.0],
  [46.001, 11.002],
  [46.002, 11.0],
  [46.0, 11.0],
];
const LINE = ROUTE.map(([lat, lon]) => [lon, lat]);
const HERE: LatLon = [46.0005, 11.001];

test("a turned route is framed with its bearing, and the app is told", () => {
  const page = runPage();
  page.send(showRoute(ROUTE, null, null, null, -30));
  expect(page.calls).toEqual([
    { how: "fitBounds", camera: { padding: 40, bearing: -30 } },
  ]);
  expect(page.turned()).toEqual([-30]);
});

test("a route that is not turned is framed with north up", () => {
  const page = runPage();
  page.send(showRoute(ROUTE));
  expect(page.last()).toEqual({
    how: "fitBounds",
    camera: { padding: 40, bearing: 0 },
  });
  // The map was north-up already: nothing to tell.
  expect(page.turned()).toEqual([]);
});

test("the next route turns the map as its own drawing, or back north up", () => {
  const page = runPage();
  page.send(showRoute(ROUTE, null, null, null, -30));
  page.send(showRoute(ROUTE, null, null, null, 20));
  page.send(showRoute(ROUTE));
  expect(page.calls.map((call) => call.camera.bearing)).toEqual([-30, 20, 0]);
  expect(page.turned()).toEqual([-30, 20, 0]);
});

test("the map stays turned as the drawing while the route is run", () => {
  const page = runPage();
  page.send(showRoute(ROUTE, null, null, null, -30));
  page.send(follow(HERE, 90));
  expect(page.last()).toEqual({
    how: "easeTo",
    camera: {
      center: [HERE[1], HERE[0]],
      zoom: FOLLOW_ZOOM,
      bearing: -30,
      duration: 500,
    },
  });
});

test("the arrow tapped on the framed route frames it again, north up and back", () => {
  const page = runPage();
  page.send(showRoute(ROUTE, null, null, null, -30));
  page.send(turn(0));
  expect(page.last()).toEqual({
    how: "fitBounds",
    camera: { padding: 40, bearing: 0 },
  });
  page.send(turn(-30));
  expect(page.last()).toEqual({
    how: "fitBounds",
    camera: { padding: 40, bearing: -30 },
  });
  expect(page.turned()).toEqual([-30, 0, -30]);
});

test("the arrow tapped on a map the user moved turns it where it is", () => {
  const page = runPage();
  page.send(showRoute(ROUTE, null, null, null, -30));
  page.fingerDrags();
  page.send(turn(0));
  expect(page.last()).toEqual({ how: "easeTo", camera: { bearing: 0, duration: 500 } });
});

test("the arrow tapped during the run turns the map, and it stays so", () => {
  const page = runPage();
  page.send(showRoute(ROUTE, null, null, null, -30));
  page.send(follow(HERE, 90));
  page.send(turn(0));
  expect(page.last()).toEqual({ how: "easeTo", camera: { bearing: 0, duration: 500 } });
  // The next fix keeps north up: the runner chose it.
  page.send(follow(HERE, 90));
  expect(page.last().camera.bearing).toBe(0);
  // After the run the app shows the route again, as its drawing.
  page.send(stopFollow());
  page.send(showRoute(ROUTE, null, null, null, -30));
  expect(page.last()).toEqual({
    how: "fitBounds",
    camera: { padding: 40, bearing: -30 },
  });
});

test("two fingers turn the map: the app is told, and the map is left so", () => {
  const page = runPage();
  page.send(showRoute(ROUTE));
  page.fingersTurn(17.4);
  expect(page.turned()).toEqual([17]);
  // Half a degree more is the same whole degree: not told again.
  page.fingersTurn(17.2);
  expect(page.turned()).toEqual([17]);
  // Following keeps it as the fingers left it, as before.
  page.send(follow(HERE, null));
  expect(page.last().camera.bearing).toBe(17.2);
  // The arrow puts north up.
  page.send(turn(0));
  expect(page.bearing()).toBe(0);
  expect(page.turned()).toEqual([17, 0]);
});

test("without its turned route the map goes back north up at the next move", () => {
  const page = runPage();
  page.send(showRoute(ROUTE, null, null, null, -30));
  page.send(clearRoute());
  page.send(setPosition(HERE));
  expect(page.last().how).toBe("flyTo");
  expect(page.last().camera.bearing).toBe(0);
  // With no route to frame, the arrow turns the map where it is.
  page.send(turn(10));
  expect(page.last()).toEqual({
    how: "easeTo",
    camera: { bearing: 10, duration: 500 },
  });
});

test("a map the user turned stays so when a north-up route is cleared", () => {
  const page = runPage();
  page.send(showRoute(ROUTE));
  page.fingersTurn(40);
  page.send(clearRoute());
  page.send(setPosition(HERE));
  expect(page.last().camera.bearing).toBe(40);
});

test("on a turned map the shape moves where the finger goes on the screen", () => {
  const page = runPage();
  // A quarter turn: up on the screen is east, right is south.
  page.send(showRoute(ROUTE, null, null, null, 90));
  page.send(setMove(true));
  page.down(100, 200);
  page.to(150, 200);
  // 50 px to the right: 0.05° south, and no longer east as with north up.
  const moved = page.drawn("route") as number[][];
  moved.forEach(([lng, lat], i) => {
    expect(lng).toBeCloseTo(LINE[i][0], 9);
    expect(lat).toBeCloseTo(LINE[i][1] - 0.05, 9);
  });
  page.to(150, 180);
  page.up();
  // 20 px up as well: 0.02° east.
  const [by, ...more] = page.moves();
  expect(more).toEqual([]);
  expect(by[0]).toBeCloseTo(0.02, 9);
  expect(by[1]).toBeCloseTo(-0.05, 9);
});

test("only a well-made `turned` is read from the page", () => {
  expect(parsePageMessage('{"type":"turned","bearing":-30}')).toEqual({
    type: "turned",
    bearing: -30,
  });
  for (const wrong of [
    '{"type":"turned"}',
    '{"type":"turned","bearing":"30"}',
    '{"type":"turned","bearing":null}',
  ]) {
    expect(parsePageMessage(wrong)).toBeNull();
  }
});

test("a route with north up is sent as before: no bearing in its message", () => {
  expect("bearing" in showRoute(ROUTE)).toBe(false);
  expect(showRoute(ROUTE, null, null, null, -30)).toMatchObject({ bearing: -30 });
  expect(turn(-30)).toEqual({ type: "turn", bearing: -30 });
});
