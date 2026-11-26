/**
 * The map page's script against a stand-in for MapLibre (TASK-496 part D):
 * the new points of a day of skiing or of a race go at the end of the last
 * line of their layer, and the page ends up holding what `showLifts` or
 * `showFlight` would have drawn whole.
 */
import type { LatLon } from "@shaperoute/shared-types";
import vm from "node:vm";

import { buildMapPage } from "./mapPage";
import { extendPiece, showFlight, showLifts, type ToPage } from "./messages";

type Data = { type: string; geometry?: { type: string; coordinates: unknown } };
type Camera = { center?: unknown; zoom?: number; bearing?: number; duration?: number };

/** Just enough of MapLibre GL JS for the page's script. */
function runPage() {
  const sources = new Map<string, { data: Data; setData: (data: Data) => void }>();
  const once = new Map<string, () => void>();
  const eased: Camera[] = [];
  let drawn = 0;
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
          if (id === "track") {
            drawn += 1;
          }
        },
      };
      sources.set(id, entry);
    }
    getSource(id: string) {
      return sources.get(id);
    }
    addLayer() {}
    getLayer() {
      return undefined;
    }
    setPaintProperty() {}
    setFeatureState() {}
    fitBounds() {}
    flyTo() {}
    easeTo(camera: Camera) {
      eased.push(camera);
    }
  }
  class LngLatBounds {
    extend() {
      return this;
    }
  }
  class Marker {
    at: unknown = null;
    setLngLat(at: unknown) {
      this.at = at;
      return this;
    }
    addTo() {
      return this;
    }
    remove() {}
    getLngLat() {
      return this.at;
    }
    setRotation() {}
  }
  const context: Record<string, unknown> = {
    maplibregl: { Map: Map_, LngLatBounds, Marker, AttributionControl: class {} },
    JSON,
    Boolean,
    matchMedia: () => ({ matches: false }),
    setInterval: () => 0,
    clearInterval: () => {},
    document: { createElement: () => ({ style: {} }) },
  };
  context.window = context;
  vm.createContext(context);
  for (const [, code] of buildMapPage().matchAll(/<script>([\s\S]*?)<\/script>/g)) {
    vm.runInContext(code, context);
  }
  const page = context.shaperoute as { receive: (message: ToPage) => void };
  once.get("style.load")?.();
  return {
    // Through JSON, as injectJavaScript delivers it.
    send: (message: ToPage) => page.receive(JSON.parse(JSON.stringify(message))),
    track: () => sources.get("track")?.data,
    layer: (id: string) => sources.get(id)?.data,
    /** How many times the track was drawn again. */
    drawn: () => drawn,
    eased,
  };
}

const p = (n: number): LatLon => [46 + n / 1000, 11 + n / 2000];
const line = (from: number, to: number): LatLon[] =>
  Array.from({ length: to - from + 1 }, (_, i) => p(from + i));

test("a descent going on: its points after the last line skied, as told whole", () => {
  const page = runPage();
  page.send(showLifts([line(0, 5), line(9, 11)], [line(5, 9)]));
  page.send(extendPiece("track", [p(12), p(13)]));
  page.send(extendPiece("track", [p(14)]));

  const whole = runPage();
  whole.send(showLifts([line(0, 5), line(9, 14)], [line(5, 9)]));
  expect(page.track()).toEqual(whole.track());
  expect(page.layer("lifts")).toEqual(whole.layer("lifts"));
});

test("a lift being ridden grows the lifts, the line skied stays", () => {
  const page = runPage();
  page.send(showLifts([line(0, 5)], [line(5, 7)]));
  page.send(extendPiece("lifts", [p(8), p(9)]));

  const whole = runPage();
  whole.send(showLifts([line(0, 5)], [line(5, 9)]));
  expect(page.layer("lifts")).toEqual(whole.layer("lifts"));
  expect(page.track()).toEqual(whole.track());
});

test("a flight going on grows the yellow; a walk after it, the white", () => {
  const page = runPage();
  page.send(showFlight([line(0, 3)], [line(3, 6)]));
  page.send(extendPiece("air", [p(7)]));
  const flying = runPage();
  flying.send(showFlight([line(0, 3)], [line(3, 7)]));
  expect(page.layer("flight-air")).toEqual(flying.layer("flight-air"));

  page.send(showFlight([line(0, 3), line(7, 8)], [line(3, 7)]));
  page.send(extendPiece("track", [p(9), p(10)]));
  const landed = runPage();
  landed.send(showFlight([line(0, 3), line(7, 10)], [line(3, 7)]));
  expect(page.track()).toEqual(landed.track());
  expect(page.layer("flight-air")).toEqual(landed.layer("flight-air"));
});

test("with no pieces to go on, new points draw nothing", () => {
  const page = runPage();
  page.send(extendPiece("track", [p(1), p(2)]));
  page.send(extendPiece("lifts", [p(1), p(2)]));
  expect(page.track()?.geometry).toBeUndefined();
  expect(page.layer("lifts")?.geometry).toBeUndefined();
  expect(page.drawn()).toBe(0);
});
