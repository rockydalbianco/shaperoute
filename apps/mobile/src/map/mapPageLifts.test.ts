/**
 * The map page's script run against a stand-in for MapLibre (TASK-375 part
 * C2): a day of skiing draws what was skied as the run's solid line and its
 * lifts as the same line, dashed; without lifts the track is a run's.
 */
import type { LatLon } from "@shaperoute/shared-types";
import vm from "node:vm";

import { color, onFoot } from "../theme/tokens";
import {
  buildMapPage,
  LIFT_DASH,
  SKI_DESCENT_COLOR,
  SKI_LABEL_COLOR,
  SKI_LIFT_COLOR,
  TRACK_COLOR,
  TRACK_OPACITY,
  TRACK_WIDTH,
} from "./mapPage";
import { clearLifts, clearTrack, showLifts, showTrack, type ToPage } from "./messages";

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

const DOWN: LatLon[] = [
  [46.4, 11.8],
  [46.41, 11.8],
];
const UP: LatLon[] = [
  [46.41, 11.8],
  [46.4, 11.801],
];
const AGAIN: LatLon[] = [
  [46.4, 11.801],
  [46.41, 11.801],
];
const lngLat = (line: LatLon[]) => line.map(([lat, lon]) => [lon, lat]);

test("the lifts are their own layer over the track: its line, dashed", () => {
  const page = runPage();
  page.styleLoads();
  const ids = page.layers.map((layer) => layer.id);
  expect(ids.indexOf("track")).toBeLessThan(ids.indexOf("lifts"));
  const lifts = page.layers.find((layer) => layer.id === "lifts")!;
  expect(lifts.paint["line-color"]).toBe(TRACK_COLOR);
  expect(lifts.paint["line-width"]).toBe(TRACK_WIDTH);
  expect(lifts.paint["line-opacity"]).toBe(TRACK_OPACITY);
  expect(lifts.paint["line-dasharray"]).toEqual(LIFT_DASH);
  expect(LIFT_DASH).toEqual(onFoot.dash);
  expect(page.data("lifts")?.geometry).toBeUndefined();
});

test("a day of skiing: the descents in the track, the lifts dashed", () => {
  const page = runPage();
  page.styleLoads();
  page.send(showLifts([DOWN, AGAIN], [UP]));
  expect(page.data("track")?.geometry).toEqual({
    type: "MultiLineString",
    coordinates: [lngLat(DOWN), lngLat(AGAIN)],
  });
  expect(page.data("lifts")?.geometry).toEqual({
    type: "MultiLineString",
    coordinates: [lngLat(UP)],
  });
});

test("cleared, the day leaves no line and no dashes", () => {
  const page = runPage();
  page.styleLoads();
  page.send(showLifts([DOWN, AGAIN], [UP]));
  page.send(clearTrack());
  page.send(clearLifts());
  expect(page.data("track")?.geometry).toBeUndefined();
  expect(page.data("lifts")?.geometry).toBeUndefined();
});

test("a run's track has no dashes", () => {
  const page = runPage();
  page.styleLoads();
  page.send(showTrack([...DOWN, ...AGAIN]));
  expect(page.data("track")?.geometry?.type).toBe("LineString");
  expect(page.data("lifts")?.geometry).toBeUndefined();
});

test("lifts sent before the style loads are drawn with it", () => {
  const page = runPage();
  page.send(showLifts([DOWN], [UP]));
  page.styleLoads();
  expect(page.data("lifts")?.geometry?.type).toBe("MultiLineString");
  expect(page.data("track")?.geometry?.type).toBe("MultiLineString");
});

// TASK-429 part B: a day of skiing in the ski mode's colours, the descents
// and the lifts numbered; the run's white comes back when it is cleared.

/** A layer's paint, by its id. */
function paintOf(page: ReturnType<typeof runPage>, id: string) {
  return page.layers.find((layer) => layer.id === id)!.paint;
}

test("the ski colours are tokens: yellow descents, red lifts, dark numbers", () => {
  expect(SKI_DESCENT_COLOR).toBe(color.ski.descent);
  expect(SKI_LIFT_COLOR).toBe(color.ski.lift);
  expect(SKI_LABEL_COLOR).toBe(color.ski.onLine);
});

test("a day of skiing: yellow descents, red dashed lifts, and their numbers", () => {
  const page = runPage();
  page.styleLoads();
  page.send(
    showLifts(
      [DOWN, AGAIN],
      [UP],
      [
        { point: DOWN[1], text: "1", kind: "descent" },
        { point: UP[1], text: "L1", kind: "lift" },
      ],
    ),
  );
  expect(paintOf(page, "track")["line-color"]).toBe(SKI_DESCENT_COLOR);
  expect(paintOf(page, "lifts")["line-color"]).toBe(SKI_LIFT_COLOR);
  expect(paintOf(page, "lifts")["line-dasharray"]).toEqual(LIFT_DASH);
  const labels = page.data("ski-labels") as unknown as {
    features: { properties: { text: string; kind: string }; geometry: unknown }[];
  };
  expect(labels.features.map((feature) => feature.properties)).toEqual([
    { text: "1", kind: "descent" },
    { text: "L1", kind: "lift" },
  ]);
  expect(labels.features[1].geometry).toEqual({
    type: "Point",
    coordinates: [UP[1][1], UP[1][0]],
  });
  const ids = page.layers.map((layer) => layer.id);
  expect(ids.indexOf("lifts")).toBeLessThan(ids.indexOf("ski-label-dots"));
  expect(ids.indexOf("ski-label-dots")).toBeLessThan(ids.indexOf("ski-label-text"));
});

test("cleared, the run's white comes back and the numbers go", () => {
  const page = runPage();
  page.styleLoads();
  page.send(showLifts([DOWN], [UP], [{ point: UP[0], text: "L1", kind: "lift" }]));
  page.send(clearLifts());
  expect(paintOf(page, "track")["line-color"]).toBe(TRACK_COLOR);
  expect(paintOf(page, "lifts")["line-color"]).toBe(TRACK_COLOR);
  expect(
    (page.data("ski-labels") as unknown as { features: unknown[] }).features,
  ).toEqual([]);
});

test("a day sent before the style loads is drawn in its colours", () => {
  const page = runPage();
  page.send(showLifts([DOWN], [UP], [{ point: UP[0], text: "L1", kind: "lift" }]));
  page.styleLoads();
  expect(paintOf(page, "track")["line-color"]).toBe(SKI_DESCENT_COLOR);
  expect(paintOf(page, "lifts")["line-color"]).toBe(SKI_LIFT_COLOR);
  expect(
    (page.data("ski-labels") as unknown as { features: unknown[] }).features,
  ).toHaveLength(1);
});
