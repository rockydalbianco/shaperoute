/**
 * The map page's script run against a stand-in for MapLibre (TASK-224): the
 * route run solid, the route left dashed and blinking, still in pocket mode
 * and with "Reduce Motion", and whole again after the run.
 */
import type { LatLon } from "@shaperoute/shared-types";
import vm from "node:vm";

import { cumulative } from "../navigation/progress";
import { routeAhead } from "../theme/tokens";
import {
  AHEAD_BEAT_MS,
  AHEAD_DIM_OPACITY,
  AHEAD_OPACITY,
  buildMapPage,
} from "./mapPage";
import {
  clearProgress,
  clearRoute,
  showProgress,
  showRoute,
  type ToPage,
} from "./messages";
import { splitRoute } from "./routeSplit";

type Data = { type: string; geometry?: { type: string; coordinates: unknown } };
type Layer = { id: string; paint: Record<string, unknown> };

/** Just enough of MapLibre GL JS for the page's script. */
function fakeMapLibre() {
  const sources = new Map<string, { data: Data; setData: (data: Data) => void }>();
  const layers: Layer[] = [];
  const once = new Map<string, () => void>();
  class Map_ {
    addControl() {}
    once(event: string, handler: () => void) {
      once.set(event, handler);
    }
    on() {}
    addSource(id: string, source: { data: Data }) {
      const entry = {
        data: source.data,
        setData(data: Data) {
          entry.data = data;
        },
      };
      sources.set(id, entry);
    }
    getSource(id: string) {
      return sources.get(id);
    }
    addLayer(layer: Layer) {
      layers.push({ ...layer, paint: { ...layer.paint } });
    }
    getLayer(id: string) {
      return layers.find((layer) => layer.id === id);
    }
    setPaintProperty(id: string, name: string, value: unknown) {
      layers.find((layer) => layer.id === id)!.paint[name] = value;
    }
    fitBounds() {}
    flyTo() {}
    easeTo() {}
  }
  class LngLatBounds {
    extend() {
      return this;
    }
  }
  return {
    maplibregl: { Map: Map_, LngLatBounds, AttributionControl: class {} },
    sources,
    layers,
    once,
  };
}

/** The page's own scripts, the ones with no `src`, run in order. */
function runPage({ reduceMotion = false } = {}) {
  const fake = fakeMapLibre();
  const timers = new Map<number, { run: () => void; ms: number }>();
  let nextTimer = 1;
  const context: Record<string, unknown> = {
    maplibregl: fake.maplibregl,
    JSON,
    Boolean,
    matchMedia: (query: string) => ({
      matches: reduceMotion && query === "(prefers-reduced-motion: reduce)",
    }),
    setInterval: (run: () => void, ms: number) => {
      timers.set(nextTimer, { run, ms });
      return nextTimer++;
    },
    clearInterval: (id: number) => {
      timers.delete(id);
    },
  };
  context.window = context;
  vm.createContext(context);
  const scripts = [...buildMapPage().matchAll(/<script>([\s\S]*?)<\/script>/g)];
  for (const [, code] of scripts) {
    vm.runInContext(code, context);
  }
  const page = context.shaperoute as { receive: (message: ToPage) => void };
  return {
    ...fake,
    timers,
    styleLoads: () => fake.once.get("style.load")!(),
    // Through JSON, as injectJavaScript delivers it.
    send: (message: ToPage) => page.receive(JSON.parse(JSON.stringify(message))),
    data: (id: string) => fake.sources.get(id)!.data,
    opacity: () =>
      fake.layers.find((layer) => layer.id === "route-ahead")!.paint["line-opacity"],
  };
}

function beat(timers: Map<number, { run: () => void; ms: number }>) {
  for (const timer of timers.values()) {
    timer.run();
  }
}

// Five points 111 m apart along a meridian.
const ROUTE: LatLon[] = Array.from({ length: 5 }, (_, i) => [46 + i * 0.001, 11]);
const ALONG = cumulative(ROUTE);
const HALF_WAY = splitRoute(ROUTE, ALONG, ALONG[2]);

test("the part left is its own layer, dashed under the part run, with no fade", () => {
  const page = runPage();
  page.styleLoads();
  const ids = page.layers.map((layer) => layer.id);
  expect(ids.indexOf("walks")).toBeLessThan(ids.indexOf("route-ahead"));
  expect(ids.indexOf("route-ahead")).toBeLessThan(ids.indexOf("route"));
  const ahead = page.layers.find((layer) => layer.id === "route-ahead")!;
  expect(ahead.paint["line-dasharray"]).toEqual(routeAhead.dash);
  expect(ahead.paint["line-color"]).toBe(routeAhead.color);
  // A beat changes the opacity at once: the map is drawn again once, not at
  // every frame of a fade.
  expect(ahead.paint["line-opacity-transition"]).toEqual({ duration: 0, delay: 0 });
  expect(page.opacity()).toBe(AHEAD_OPACITY);
});

test("running, the part run is the route and the part left blinks in beats", () => {
  const page = runPage();
  page.styleLoads();
  page.send(showRoute(ROUTE));
  expect(page.data("route").geometry?.type).toBe("LineString");

  page.send(showProgress(HALF_WAY, true));
  expect(page.data("route").geometry).toEqual({
    type: "MultiLineString",
    coordinates: HALF_WAY.done.map((line) => line.map(([lat, lon]) => [lon, lat])),
  });
  expect(page.data("route-ahead").geometry).toEqual({
    type: "MultiLineString",
    coordinates: HALF_WAY.ahead.map((line) => line.map(([lat, lon]) => [lon, lat])),
  });
  expect([...page.timers.values()].map((timer) => timer.ms)).toEqual([AHEAD_BEAT_MS]);
  expect(page.opacity()).toBe(AHEAD_OPACITY);
  beat(page.timers);
  expect(page.opacity()).toBe(AHEAD_DIM_OPACITY);
  beat(page.timers);
  expect(page.opacity()).toBe(AHEAD_OPACITY);

  // Every step of the run keeps the one blinking, not a new one each time.
  page.send(showProgress(splitRoute(ROUTE, ALONG, ALONG[3]), true));
  expect(page.timers.size).toBe(1);
});

test("in pocket mode the dashes keep still, bright, and blink again after", () => {
  const page = runPage();
  page.styleLoads();
  page.send(showRoute(ROUTE));
  page.send(showProgress(HALF_WAY, true));
  beat(page.timers);
  expect(page.opacity()).toBe(AHEAD_DIM_OPACITY);

  page.send(showProgress(HALF_WAY, false));
  expect(page.timers.size).toBe(0);
  expect(page.opacity()).toBe(AHEAD_OPACITY);

  page.send(showProgress(HALF_WAY, true));
  expect(page.timers.size).toBe(1);
});

test('with "Reduce Motion" on the phone the dashes never blink', () => {
  const page = runPage({ reduceMotion: true });
  page.styleLoads();
  page.send(showRoute(ROUTE));
  page.send(showProgress(HALF_WAY, true));
  expect(page.timers.size).toBe(0);
  expect(page.opacity()).toBe(AHEAD_OPACITY);
  expect(page.data("route-ahead").geometry?.type).toBe("MultiLineString");
});

test("the route sent again during the run stays cut; after the run it is whole", () => {
  const page = runPage();
  page.styleLoads();
  page.send(showRoute(ROUTE));
  page.send(showProgress(HALF_WAY, true));

  page.send(showRoute(ROUTE));
  expect(page.data("route").geometry?.type).toBe("MultiLineString");
  expect(page.data("route-ahead").geometry?.type).toBe("MultiLineString");

  page.send(clearProgress());
  expect(page.data("route").geometry).toEqual({
    type: "LineString",
    coordinates: ROUTE.map(([lat, lon]) => [lon, lat]),
  });
  expect(page.data("route-ahead")).toEqual({ type: "FeatureCollection", features: [] });
  expect(page.timers.size).toBe(0);
});

test("nothing left ahead is drawn as nothing, not as an empty line", () => {
  const page = runPage();
  page.styleLoads();
  page.send(showRoute(ROUTE));
  page.send(showProgress(splitRoute(ROUTE, ALONG, Infinity), true));
  expect(page.data("route-ahead")).toEqual({ type: "FeatureCollection", features: [] });
  expect(page.data("route").geometry?.type).toBe("MultiLineString");
});

test("clearing the route clears the run on it and stops the blinking", () => {
  const page = runPage();
  page.styleLoads();
  page.send(showRoute(ROUTE));
  page.send(showProgress(HALF_WAY, true));
  page.send(clearRoute());
  expect(page.data("route")).toEqual({ type: "FeatureCollection", features: [] });
  expect(page.data("route-ahead")).toEqual({ type: "FeatureCollection", features: [] });
  expect(page.timers.size).toBe(0);
});

test("a run told before the style is ready is drawn when it loads", () => {
  const page = runPage();
  page.send(showRoute(ROUTE));
  page.send(showProgress(HALF_WAY, true));
  beat(page.timers);
  page.styleLoads();
  expect(page.data("route").geometry?.type).toBe("MultiLineString");
  expect(page.data("route-ahead").geometry?.type).toBe("MultiLineString");
  // In the beat it is in.
  expect(page.opacity()).toBe(AHEAD_DIM_OPACITY);
});
