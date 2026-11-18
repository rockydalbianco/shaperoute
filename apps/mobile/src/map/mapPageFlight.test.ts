/**
 * The map page's script run against a stand-in for MapLibre (TASK-305 part
 * R6c): a race on foot and in the air draws the parts on foot as the run's
 * white line and the flights over it in the route's yellow, solid; without
 * flights the track is a run's.
 */
import type { LatLon } from "@shaperoute/shared-types";
import vm from "node:vm";

import {
  buildMapPage,
  FLIGHT_AIR_COLOR,
  ROUTE_COLOR,
  TRACK_COLOR,
  TRACK_OPACITY,
  TRACK_WIDTH,
} from "./mapPage";
import {
  clearFlight,
  clearTrack,
  showFlight,
  showTrack,
  type ToPage,
} from "./messages";

type Data = { type: string; geometry?: { type: string; coordinates: unknown } };
type Layer = {
  id: string;
  layout?: Record<string, unknown>;
  paint: Record<string, unknown>;
};

/** Just enough of MapLibre GL JS for the page's script. */
function runPage() {
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
      layers.push(layer);
    }
    getLayer(id: string) {
      return layers.find((layer) => layer.id === id);
    }
    setPaintProperty(id: string, name: string, value: unknown) {
      const layer = layers.find((each) => each.id === id);
      if (layer) {
        layer.paint[name] = value;
      }
    }
    setFeatureState() {}
    fitBounds() {}
    flyTo() {}
    easeTo() {}
  }
  class LngLatBounds {
    extend() {
      return this;
    }
  }
  const context: Record<string, unknown> = {
    maplibregl: { Map: Map_, LngLatBounds, AttributionControl: class {} },
    JSON,
    Boolean,
    matchMedia: () => ({ matches: false }),
    setInterval: () => 0,
    clearInterval: () => {},
  };
  context.window = context;
  vm.createContext(context);
  for (const [, code] of buildMapPage().matchAll(/<script>([\s\S]*?)<\/script>/g)) {
    vm.runInContext(code, context);
  }
  const page = context.shaperoute as { receive: (message: ToPage) => void };
  return {
    layers,
    styleLoads: () => once.get("style.load")!(),
    // Through JSON, as injectJavaScript delivers it.
    send: (message: ToPage) => page.receive(JSON.parse(JSON.stringify(message))),
    data: (id: string) => sources.get(id)?.data,
  };
}

const UP: LatLon[] = [
  [45.7355, 10.835],
  [45.7375, 10.838],
];
const FLY: LatLon[] = [
  [45.7375, 10.838],
  [45.76, 10.815],
];
const WALK: LatLon[] = [
  [45.76, 10.815],
  [45.7615, 10.813],
];
const lngLat = (line: LatLon[]) => line.map(([lat, lon]) => [lon, lat]);

test("the flights are their own layer over the track: yellow, solid", () => {
  const page = runPage();
  page.styleLoads();
  const ids = page.layers.map((layer) => layer.id);
  expect(ids.indexOf("track")).toBeLessThan(ids.indexOf("flight-air"));
  const air = page.layers.find((layer) => layer.id === "flight-air")!;
  expect(FLIGHT_AIR_COLOR).toBe(ROUTE_COLOR);
  expect(air.paint["line-color"]).toBe(FLIGHT_AIR_COLOR);
  expect(air.paint["line-width"]).toBe(TRACK_WIDTH);
  expect(air.paint["line-opacity"]).toBe(TRACK_OPACITY);
  expect(air.paint["line-dasharray"]).toBeUndefined();
  expect(page.data("flight-air")?.geometry).toBeUndefined();
});

test("a race: the parts on foot in the white track, the flights yellow", () => {
  const page = runPage();
  page.styleLoads();
  page.send(showFlight([UP, WALK], [FLY]));
  expect(page.data("track")?.geometry).toEqual({
    type: "MultiLineString",
    coordinates: [lngLat(UP), lngLat(WALK)],
  });
  expect(page.data("flight-air")?.geometry).toEqual({
    type: "MultiLineString",
    coordinates: [lngLat(FLY)],
  });
  const track = page.layers.find((layer) => layer.id === "track")!;
  expect(track.paint["line-color"]).toBe(TRACK_COLOR);
});

test("cleared, the race leaves no line and no yellow", () => {
  const page = runPage();
  page.styleLoads();
  page.send(showFlight([UP, WALK], [FLY]));
  page.send(clearTrack());
  page.send(clearFlight());
  expect(page.data("track")?.geometry).toBeUndefined();
  expect(page.data("flight-air")?.geometry).toBeUndefined();
});

test("a run's track has no yellow; a race sent before the style loads is drawn with it", () => {
  const run = runPage();
  run.styleLoads();
  run.send(showTrack([...UP, ...WALK]));
  expect(run.data("flight-air")?.geometry).toBeUndefined();
  const race = runPage();
  race.send(showFlight([UP], [FLY]));
  race.styleLoads();
  expect(race.data("flight-air")?.geometry?.type).toBe("MultiLineString");
  expect(race.data("track")?.geometry?.type).toBe("MultiLineString");
});
