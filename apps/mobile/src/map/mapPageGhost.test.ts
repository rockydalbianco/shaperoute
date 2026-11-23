/**
 * The map page's script run against a stand-in for MapLibre (TASK-442): the
 * shape asked for, as the search placed it, is a dotted line under the
 * other routes and under the route, and it comes and goes without moving
 * the map.
 */
import vm from "node:vm";

import type { LatLon } from "@shaperoute/shared-types";

import { shapeGhost } from "../theme/tokens";
import { buildMapPage } from "./mapPage";
import { showGhost, showOthers, showRoute, type ToPage } from "./messages";

type Geometry = { type: string; coordinates: unknown };
type Drawn = { type?: string; geometry?: Geometry; features?: unknown[] };
type Layer = { id: string; type: string; source?: string; paint?: unknown };

/** The page's own scripts, the ones with no `src`, run in order. */
function runPage() {
  const sources = new Map<string, Drawn>();
  const layers: Layer[] = [];
  let fits = 0;
  class Map_ {
    dragPan = { enable() {}, disable() {} };
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
    addLayer(layer: Layer) {
      layers.push(layer);
    }
    getSource(name: string) {
      return sources.has(name)
        ? { setData: (data: Drawn) => sources.set(name, data) }
        : undefined;
    }
    setFeatureState() {}
    fitBounds() {
      fits += 1;
    }
    getCanvasContainer() {
      return { style: {}, addEventListener() {} };
    }
  }
  class Bounds {
    extend() {
      return this;
    }
  }
  const context: Record<string, unknown> = {
    maplibregl: { Map: Map_, LngLatBounds: Bounds, AttributionControl: class {} },
    ReactNativeWebView: { postMessage() {} },
  };
  context.window = context;
  vm.createContext(context);
  const scripts = [...buildMapPage().matchAll(/<script>([\s\S]*?)<\/script>/g)];
  for (const [, code] of scripts) {
    vm.runInContext(code, context);
  }
  const page = context.shaperoute as { receive: (message: ToPage) => void };
  return {
    layers,
    // Through JSON, as injectJavaScript delivers it.
    send: (message: ToPage) => page.receive(JSON.parse(JSON.stringify(message))),
    /** What a source of the map holds. */
    held: (name: string) => sources.get(name),
    /** How many times the map was framed. */
    fits: () => fits,
  };
}

/** A heart as the search placed it would come: one closed line. */
const PLACED: LatLon[][] = [
  [
    [46.0676, 11.1201],
    [46.0712, 11.1189],
    [46.0731, 11.1242],
    [46.0676, 11.1201],
  ],
];
const PLACED_LNG_LAT = PLACED.map((line) => line.map(([lat, lon]) => [lon, lat]));

const ROUTE: LatLon[] = [
  [46.0679, 11.1211],
  [46.07, 11.12],
  [46.072, 11.124],
  [46.0679, 11.1211],
];

test("the shape's layer is under the other routes and under the route", () => {
  const page = runPage();
  const ids = page.layers.map((layer) => layer.id);
  expect(ids).toContain("ghost");
  expect(ids.indexOf("ghost")).toBeLessThan(ids.indexOf("others"));
  expect(ids.indexOf("ghost")).toBeLessThan(ids.indexOf("route"));
});

test("it is drawn as the tokens say: thin, faint and dotted, never yellow", () => {
  const page = runPage();
  const layer = page.layers.find(({ id }) => id === "ghost");
  expect(layer).toMatchObject({
    type: "line",
    source: "ghost",
    paint: {
      "line-color": shapeGhost.color,
      "line-width": shapeGhost.width,
      "line-opacity": shapeGhost.opacity,
      "line-dasharray": shapeGhost.dash,
    },
  });
  const route = page.layers.find(({ id }) => id === "route");
  expect((layer?.paint as Record<string, unknown>)["line-color"]).not.toBe(
    (route?.paint as Record<string, unknown>)["line-color"],
  );
});

test("nothing is drawn until the app sends a shape", () => {
  const page = runPage();
  expect(page.held("ghost")).toEqual({ type: "FeatureCollection", features: [] });
});

test("the shape sent is drawn where it was placed, as [lng, lat] lines", () => {
  const page = runPage();
  page.send(showGhost(PLACED));
  expect(page.held("ghost")?.geometry).toEqual({
    type: "MultiLineString",
    coordinates: PLACED_LNG_LAT,
  });
});

test("each piece of a shape drawn with the pen up is a line of its own", () => {
  const page = runPage();
  const pieces: LatLon[][] = [PLACED[0].slice(0, 2), PLACED[0].slice(2)];
  page.send(showGhost(pieces));
  expect(page.held("ghost")?.geometry?.coordinates).toHaveLength(2);
});

test("a new shape takes the place of the last, and none clears it", () => {
  const page = runPage();
  page.send(showGhost(PLACED));
  const other: LatLon[][] = [[...PLACED[0]].reverse()];
  page.send(showGhost(other));
  expect(page.held("ghost")?.geometry?.coordinates).toEqual(
    other.map((line) => line.map(([lat, lon]) => [lon, lat])),
  );
  page.send(showGhost([]));
  expect(page.held("ghost")).toEqual({ type: "FeatureCollection", features: [] });
});

test("the shape does not move the map: only the route frames it", () => {
  const page = runPage();
  page.send(showGhost(PLACED));
  expect(page.fits()).toBe(0);
  page.send(showRoute(ROUTE));
  const framed = page.fits();
  expect(framed).toBeGreaterThan(0);
  page.send(showGhost([]));
  page.send(showGhost(PLACED));
  expect(page.fits()).toBe(framed);
});

test("the route and the other routes are left as they are", () => {
  const page = runPage();
  page.send(showOthers([ROUTE]));
  page.send(showRoute(ROUTE));
  const others = page.held("others");
  const route = page.held("route");
  page.send(showGhost(PLACED));
  expect(page.held("others")).toBe(others);
  expect(page.held("route")).toBe(route);
});
