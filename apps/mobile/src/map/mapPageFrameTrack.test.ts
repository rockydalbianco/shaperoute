/**
 * The map page's script against a stand-in for MapLibre (TASK-478): a track
 * without a route, told to frame, frames the map on all of it; a track as it
 * is recorded never moves the map by itself.
 */
import type { LatLon } from "@shaperoute/shared-types";
import vm from "node:vm";

import { buildMapPage } from "./mapPage";
import { showLifts, showTrack, showTrackFramed, type ToPage } from "./messages";

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
  const fits: unknown[] = [];
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
    fitBounds(bounds: unknown) {
      fits.push(bounds);
    }
    flyTo() {}
    easeTo() {}
  }
  class LngLatBounds {
    points: unknown[];
    constructor(...corners: unknown[]) {
      this.points = [...corners];
    }
    extend(point: unknown) {
      this.points.push(point);
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
    fits,
  };
}

const LINE: LatLon[] = [
  [46.4, 11.8],
  [46.41, 11.8],
  [46.42, 11.81],
];

test("a track without a route that ended: the map framed on all of it", () => {
  const page = runPage();
  page.styleLoads();
  page.send(showTrackFramed(LINE));
  expect(page.fits).toHaveLength(1);
  const bounds = page.fits[0] as { points: number[][] };
  expect(bounds.points).toEqual(
    expect.arrayContaining([
      [11.8, 46.4],
      [11.8, 46.41],
      [11.81, 46.42],
    ]),
  );
});

test("a day of skiing that ended: framed on its descents and its lifts", () => {
  const page = runPage();
  page.styleLoads();
  page.send(showLifts([LINE.slice(0, 2)], [LINE.slice(1)], [], true));
  expect(page.fits).toHaveLength(1);
  const bounds = page.fits[0] as { points: number[][] };
  expect(bounds.points).toEqual(expect.arrayContaining([[11.81, 46.42]]));
});

test("while recording the map is never framed by itself: it follows", () => {
  const page = runPage();
  page.styleLoads();
  // The track growing as it is recorded: told without `frame`.
  for (let i = 2; i <= LINE.length; i += 1) {
    page.send(showTrack(LINE.slice(0, i)));
  }
  page.send(showLifts([LINE.slice(0, 2)], [LINE.slice(1)]));
  expect(page.fits).toEqual([]);
});
