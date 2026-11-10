/**
 * The start dot on the map page (TASK-426, ADR-0354), with the page's
 * script run against a stand-in for MapLibre as in mapPageCanvas.test.ts:
 * with «Move» a finger on the dot drags it along the figure's line, and the
 * page tells where it was left (`started`).
 */
import vm from "node:vm";

import type { LatLon } from "@shaperoute/shared-types";

import { buildMapPage, CANVAS_ZOOM, GRAB_PX } from "../map/mapPage";
import {
  type CanvasMode,
  clearCanvas,
  type FromPage,
  parsePageMessage,
  setCanvas,
  type ToPage,
} from "../map/messages";

type Touch = { clientX: number; clientY: number };
type TouchEventLike = { touches: Touch[]; timeStamp: number };
type Listener = (event: TouchEventLike) => void;
type Drawn = {
  geometry?: { type: string; coordinates: unknown };
  features?: {
    properties: Record<string, unknown>;
    geometry: { coordinates: unknown };
  }[];
};

const WIDTH = 400;
const HEIGHT = 600;
/** Pixels per degree at CANVAS_ZOOM, north up, the same both ways. */
const PX_PER_DEG = 10_000;

/** A handler of MapLibre's own gestures, on until the page turns it off. */
function handler() {
  const state = { enabled: true };
  return {
    state,
    enable: () => {
      state.enabled = true;
    },
    disable: () => {
      state.enabled = false;
    },
    isEnabled: () => state.enabled,
  };
}

function runPage() {
  const listeners = new Map<string, Listener[]>();
  const sources = new Map<string, Drawn>();
  const mapEvents = new Map<string, (() => void)[]>();
  const surface = {
    style: { touchAction: "" },
    clientWidth: WIDTH,
    clientHeight: HEIGHT,
    addEventListener(type: string, listener: Listener, options: unknown) {
      // Never in the way of MapLibre's own gestures.
      expect(options).toEqual({ passive: true });
      listeners.set(type, [...(listeners.get(type) ?? []), listener]);
    },
  };
  const view = { lng: 11, lat: 46, zoom: CANVAS_ZOOM };
  const scale = () => PX_PER_DEG * 2 ** (view.zoom - CANVAS_ZOOM);
  const framed: { bounds: unknown; options: unknown }[] = [];
  const eased: Record<string, unknown>[] = [];
  const halts = { times: 0 };
  // The time of the touches, and the paint of the layers as the page sets it.
  const clock = { now: 0 };
  const paints: Record<string, unknown> = {};
  const handlers = {
    dragPan: handler(),
    touchZoomRotate: handler(),
    doubleClickZoom: handler(),
    dragRotate: handler(),
    touchPitch: handler(),
  };
  class Map_ {
    dragPan = handlers.dragPan;
    touchZoomRotate = handlers.touchZoomRotate;
    doubleClickZoom = handlers.doubleClickZoom;
    dragRotate = handlers.dragRotate;
    touchPitch = handlers.touchPitch;
    addControl() {}
    on(event: string, then: () => void) {
      mapEvents.set(event, [...(mapEvents.get(event) ?? []), then]);
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
    getLayer(id: string) {
      return { id };
    }
    setPaintProperty(layer: string, name: string, value: unknown) {
      paints[`${layer} ${name}`] = value;
    }
    getSource(name: string) {
      return sources.has(name)
        ? { setData: (data: Drawn) => sources.set(name, data) }
        : undefined;
    }
    setFeatureState() {}
    fitBounds(bounds: unknown, options: unknown) {
      framed.push({ bounds, options });
    }
    easeTo(options: Record<string, unknown>) {
      eased.push(options);
    }
    stop() {
      halts.times += 1;
    }
    getCanvasContainer() {
      return surface;
    }
    getCenter() {
      return { lng: view.lng, lat: view.lat };
    }
    getZoom() {
      return view.zoom;
    }
    jumpTo({ zoom }: { zoom: number }) {
      view.zoom = zoom;
    }
    panBy([dx, dy]: [number, number]) {
      view.lng += dx / scale();
      view.lat -= dy / scale();
    }
    project(lngLat: [number, number] | { lng: number; lat: number }) {
      const [lng, lat] = Array.isArray(lngLat) ? lngLat : [lngLat.lng, lngLat.lat];
      return {
        x: WIDTH / 2 + (lng - view.lng) * scale(),
        y: HEIGHT / 2 - (lat - view.lat) * scale(),
      };
    }
    unproject([x, y]: [number, number]) {
      return {
        lng: view.lng + (x - WIDTH / 2) / scale(),
        lat: view.lat - (y - HEIGHT / 2) / scale(),
      };
    }
  }
  class Bounds {
    points: unknown[];
    constructor(a: unknown, b: unknown) {
      this.points = [a, b];
    }
    extend(point: unknown) {
      this.points.push(point);
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
      listener({ touches, timeStamp: clock.now }),
    );
  /** Fingers at x, y, then x, y of the next one. */
  const at = (...xy: number[]): Touch[] =>
    Array.from({ length: xy.length / 2 }, (_, i) => ({
      clientX: xy[2 * i],
      clientY: xy[2 * i + 1],
    }));
  return {
    view,
    surface,
    handlers,
    framed,
    eased,
    halts,
    // Through JSON, as injectJavaScript delivers it.
    send: (message: ToPage) => page.receive(JSON.parse(JSON.stringify(message))),
    /** What the page told the app, read as the app reads it. */
    told: () =>
      posted
        .map((data) => parsePageMessage(data))
        .filter((message): message is FromPage => message !== null),
    drawn: (name: string) => sources.get(name)?.geometry?.coordinates,
    /** The dots a source holds: where, and whether each is the first. */
    dots: (name: string) =>
      (sources.get(name)?.features ?? []).map((f) => ({
        at: f.geometry.coordinates,
        first: f.properties.first,
      })),
    paints,
    /** Time goes by between touches. */
    wait: (ms: number) => {
      clock.now += ms;
    },
    down: (...xy: number[]) => fire("touchstart", at(...xy)),
    to: (...xy: number[]) => fire("touchmove", at(...xy)),
    /** Fingers lifted; those given stay on the map. */
    up: (...left: number[]) => fire("touchend", at(...left)),
    stopped: () => (mapEvents.get("moveend") ?? []).forEach((then) => then()),
  };
}

/** A square figure 0.01° wide around the middle of the map: on the screen,
 * from (150, 250) to (250, 350), starting at its south-west corner, at
 * (150, 350). */
const SQUARE: LatLon[] = [
  [45.995, 10.995],
  [45.995, 11.005],
  [46.005, 11.005],
  [46.005, 10.995],
  [45.995, 10.995],
];

function canvas(
  mode: CanvasMode,
  start: { line?: LatLon[]; ends?: boolean; at?: LatLon | null } = {},
) {
  return setCanvas({
    mode,
    lines: [SQUARE],
    links: [false],
    bendable: [0],
    marks: [],
    centre: [46, 11],
    shrink: 0.5,
    grow: 2,
    frame: false,
    start: start.at === undefined ? SQUARE[0] : start.at,
    startLine: start.line ?? SQUARE,
    startEnds: start.ends ?? false,
  });
}

function only<T extends FromPage["type"]>(
  told: FromPage[],
  type: T,
): Extract<FromPage, { type: T }>[] {
  return told.filter((m): m is Extract<FromPage, { type: T }> => m.type === type);
}

/** Where the dot is drawn, [lng, lat]; undefined for none. */
function dotOf(page: ReturnType<typeof runPage>): [number, number] | undefined {
  return page.drawn("canvas-start") as [number, number] | undefined;
}

test("the dot is drawn on the start, and goes with the figure", () => {
  const page = runPage();
  page.send(canvas("draw"));
  expect(dotOf(page)).toEqual([10.995, 45.995]);
  // None on the water: the app sends none.
  page.send(canvas("draw", { at: null, line: [] }));
  expect(dotOf(page)).toBeUndefined();
  // The figure dragged with «Move»: the dot goes with it.
  page.send(canvas("move"));
  page.down(200, 250);
  page.to(220, 250);
  expect(dotOf(page)?.[0]).toBeCloseTo(10.997, 9);
  expect(dotOf(page)?.[1]).toBeCloseTo(45.995, 9);
  page.up();
  expect(dotOf(page)?.[0]).toBeCloseTo(10.997, 9);
  page.send(clearCanvas());
  expect(dotOf(page)).toBeUndefined();
});

test("with «Move» a finger on the dot drags it along the outline, and tells where", () => {
  const page = runPage();
  page.send(canvas("move"));
  page.down(152, 348);
  page.to(180, 340);
  // On the south side, under the finger.
  expect(dotOf(page)?.[0]).toBeCloseTo(10.998, 9);
  expect(dotOf(page)?.[1]).toBeCloseTo(45.995, 9);
  page.to(262, 300);
  // Off the figure, the dot keeps to the east side.
  expect(dotOf(page)?.[0]).toBeCloseTo(11.005, 9);
  expect(dotOf(page)?.[1]).toBeCloseTo(46, 9);
  page.up();
  const told = page.told();
  const [started] = only(told, "started");
  expect(started.lngLat[0]).toBeCloseTo(11.005, 9);
  expect(started.lngLat[1]).toBeCloseTo(46, 9);
  expect(started.metresPerPx).toBeGreaterThan(0);
  // The figure and the map stay where they are; the dot, until the app
  // answers.
  expect(only(told, "figure")).toEqual([]);
  expect(page.view).toEqual({ lng: 11, lat: 46, zoom: CANVAS_ZOOM });
  expect(page.drawn("canvas")).toEqual([SQUARE.map(([lat, lng]) => [lng, lat])]);
  expect(dotOf(page)?.[0]).toBeCloseTo(11.005, 9);
  page.send(canvas("move", { at: [46, 11.005] }));
  expect(dotOf(page)).toEqual([11.005, 46]);
});

test("an open line's dot goes only to one of its two ends", () => {
  const page = runPage();
  const ends: LatLon[] = [SQUARE[0], SQUARE[2]];
  page.send(canvas("move", { line: ends, ends: true }));
  page.down(150, 350);
  page.to(200, 310);
  expect(dotOf(page)).toEqual([10.995, 45.995]);
  page.to(230, 270);
  expect(dotOf(page)).toEqual([11.005, 46.005]);
  page.up();
  const [started] = only(page.told(), "started");
  expect(started.lngLat).toEqual([11.005, 46.005]);
});

test("a tap on the dot tells nothing; dragged back on the start, the app is told", () => {
  const page = runPage();
  page.send(canvas("move"));
  page.down(150, 350);
  page.up();
  page.down(150 + GRAB_PX / 2, 350);
  page.to(150 + GRAB_PX / 2, 352);
  page.to(150, 350 - GRAB_PX / 3);
  // Back on the corner: the same point.
  page.to(149, 351);
  page.up();
  expect(only(page.told(), "started").map((m) => m.lngLat)).toEqual([[10.995, 45.995]]);
  expect(only(page.told(), "figure")).toEqual([]);
});

test("a dot with no line to go along stays, and the finger moves the figure", () => {
  const page = runPage();
  page.send(canvas("move", { line: [] }));
  page.down(152, 348);
  page.to(172, 348);
  expect(dotOf(page)?.[0]).toBeCloseTo(10.997, 9);
  page.up();
  expect(only(page.told(), "started")).toEqual([]);
  expect(only(page.told(), "figure")).toHaveLength(1);
});

test("with «Draw» a finger on the dot draws", () => {
  const page = runPage();
  page.send(canvas("draw"));
  page.down(150, 350);
  page.to(170, 340);
  page.to(190, 330);
  page.up();
  expect(only(page.told(), "started")).toEqual([]);
  expect(only(page.told(), "drawn")).toHaveLength(1);
  expect(dotOf(page)).toEqual([10.995, 45.995]);
});

test("a second finger drops the drag, the dot back on the start", () => {
  const page = runPage();
  page.send(canvas("move"));
  page.down(150, 350);
  page.to(200, 360);
  page.down(200, 360, 300, 400);
  expect(dotOf(page)).toEqual([10.995, 45.995]);
  page.up();
  expect(only(page.told(), "started")).toEqual([]);
});
