/**
 * The map page's script with a drawing anchored to the roads (TASK-347 part
 * C), run against a stand-in for MapLibre: the figure a ghost under the
 * route of its strokes, the stretches far from the finger in their own
 * colour, and the figure as before once nothing is anchored.
 */
import vm from "node:vm";

import type { LatLon } from "@shaperoute/shared-types";

import {
  buildMapPage,
  DRAWN_GHOST_OPACITY,
  DRAWN_GHOST_WIDTH,
  FAR_COLOR,
  ROUTE_COLOR,
  ROUTE_OPACITY,
  ROUTE_WIDTH,
} from "./mapPage";
import { clearCanvas, setAnchored, setCanvas, type ToPage } from "./messages";

type Drawn = { geometry?: { coordinates: unknown } };

function handler() {
  return { enable() {}, disable() {}, isEnabled: () => true };
}

function runPage() {
  const sources = new Map<string, Drawn>();
  const layers = new Map<string, { paint?: Record<string, unknown> }>();
  const paints: Record<string, unknown> = {};
  const surface = {
    style: { touchAction: "" },
    clientWidth: 400,
    clientHeight: 600,
    addEventListener() {},
  };
  class Map_ {
    dragPan = handler();
    touchZoomRotate = handler();
    doubleClickZoom = handler();
    dragRotate = handler();
    touchPitch = handler();
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
    addLayer(layer: { id: string; paint?: Record<string, unknown> }) {
      layers.set(layer.id, layer);
    }
    getLayer(id: string) {
      return layers.get(id);
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
    fitBounds() {}
    easeTo() {}
    stop() {}
    getCanvasContainer() {
      return surface;
    }
    getCenter() {
      return { lng: 11, lat: 46 };
    }
    getZoom() {
      return 14;
    }
    jumpTo() {}
    panBy() {}
    project() {
      return { x: 0, y: 0 };
    }
    unproject() {
      return { lng: 11, lat: 46 };
    }
  }
  class Bounds {
    extend() {
      return this;
    }
  }
  const context: Record<string, unknown> = {
    maplibregl: { Map: Map_, LngLatBounds: Bounds, AttributionControl: class {} },
    ReactNativeWebView: { postMessage: () => {} },
  };
  context.window = context;
  vm.createContext(context);
  for (const [, code] of buildMapPage().matchAll(/<script>([\s\S]*?)<\/script>/g)) {
    vm.runInContext(code, context);
  }
  const page = context.shaperoute as { receive: (message: ToPage) => void };
  return {
    layers,
    paints,
    send: (message: ToPage) => page.receive(JSON.parse(JSON.stringify(message))),
    drawn: (name: string) => sources.get(name)?.geometry?.coordinates,
  };
}

const SQUARE: LatLon[] = [
  [45.995, 10.995],
  [45.995, 11.005],
  [46.005, 11.005],
  [46.005, 10.995],
  [45.995, 10.995],
];
const ROAD: LatLon[] = [
  [45.9951, 10.995],
  [45.9952, 11.0],
  [45.995, 11.005],
];
const FAR: LatLon[] = [
  [45.9952, 11.0],
  [45.995, 11.005],
];

const FIGURE = setCanvas({
  mode: "draw",
  lines: [SQUARE],
  links: [false],
  bendable: [0],
  marks: [],
  centre: [46, 11],
  shrink: 0.5,
  grow: 2,
  frame: false,
});

const lngLat = (line: LatLon[]) => line.map(([lat, lon]) => [lon, lat]);

test("the route and the far stretches have layers of their own, in their colours", () => {
  const { layers } = runPage();
  expect(layers.get("canvas-snapped")?.paint).toMatchObject({
    "line-color": ROUTE_COLOR,
    "line-width": ROUTE_WIDTH,
    "line-opacity": ROUTE_OPACITY,
  });
  expect(layers.get("canvas-far")?.paint).toMatchObject({ "line-color": FAR_COLOR });
  expect(FAR_COLOR).not.toBe(ROUTE_COLOR);
});

test("setAnchored sends the lines as [lon, lat]", () => {
  expect(setAnchored({ ghost: true, snapped: [ROAD], far: [FAR] })).toEqual({
    type: "setAnchored",
    ghost: true,
    snapped: [lngLat(ROAD)],
    far: [lngLat(FAR)],
  });
});

test("an anchored drawing: the figure a ghost under the route, the far stretch apart", () => {
  const page = runPage();
  page.send(FIGURE);
  page.send(setAnchored({ ghost: true, snapped: [ROAD], far: [FAR] }));
  expect(page.drawn("canvas-snapped")).toEqual([lngLat(ROAD)]);
  expect(page.drawn("canvas-far")).toEqual([lngLat(FAR)]);
  expect(page.paints["canvas line-width"]).toBe(DRAWN_GHOST_WIDTH);
  expect(page.paints["canvas line-opacity"]).toBe(DRAWN_GHOST_OPACITY);
  // The figure itself stays as drawn.
  expect(page.drawn("canvas")).toEqual([lngLat(SQUARE)]);
});

test("the figure told again keeps the route drawn over it", () => {
  const page = runPage();
  page.send(FIGURE);
  page.send(setAnchored({ ghost: true, snapped: [ROAD], far: [] }));
  page.send(FIGURE);
  expect(page.drawn("canvas-snapped")).toEqual([lngLat(ROAD)]);
  expect(page.paints["canvas line-width"]).toBe(DRAWN_GHOST_WIDTH);
});

test("nothing anchored any more: the figure as before", () => {
  const page = runPage();
  page.send(FIGURE);
  page.send(setAnchored({ ghost: true, snapped: [ROAD], far: [FAR] }));
  page.send(setAnchored({ ghost: false, snapped: [], far: [] }));
  expect(page.drawn("canvas-snapped")).toBeUndefined();
  expect(page.drawn("canvas-far")).toBeUndefined();
  expect(page.paints["canvas line-width"]).toBe(ROUTE_WIDTH);
  expect(page.paints["canvas line-opacity"]).toBe(ROUTE_OPACITY);
});

test("the figure gone takes its route with it, and no figure takes none", () => {
  const page = runPage();
  page.send(FIGURE);
  page.send(setAnchored({ ghost: true, snapped: [ROAD], far: [FAR] }));
  page.send(clearCanvas());
  expect(page.drawn("canvas-snapped")).toBeUndefined();
  expect(page.paints["canvas line-width"]).toBe(ROUTE_WIDTH);

  page.send(setAnchored({ ghost: true, snapped: [ROAD], far: [] }));
  expect(page.drawn("canvas-snapped")).toBeUndefined();
});
