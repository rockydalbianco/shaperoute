/**
 * The map page's script against a stand-in for MapLibre (TASK-496): the new
 * fixes of a run are added to the line the page holds, so a fix sends its
 * own point; and the map follows the runner in a shorter move than the one
 * that brings it there as the run starts.
 */
import type { LatLon } from "@shaperoute/shared-types";
import vm from "node:vm";

import { buildMapPage, FOLLOW_MS, FOLLOW_START_MS, FOLLOW_ZOOM } from "./mapPage";
import {
  clearTrack,
  extendTrack,
  follow,
  showLifts,
  showTrack,
  stopFollow,
  type ToPage,
} from "./messages";

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
    /** How many times the track was drawn again. */
    drawn: () => drawn,
    eased,
  };
}

const LINE: LatLon[] = [
  [46.4, 11.8],
  [46.41, 11.8],
  [46.42, 11.81],
  [46.43, 11.81],
  [46.44, 11.82],
];
const lngLat = (points: LatLon[]) => points.map(([lat, lon]) => [lon, lat]);

test("new fixes go after the line the page holds: the same line as told whole", () => {
  const page = runPage();
  page.send(showTrack(LINE.slice(0, 2)));
  page.send(extendTrack(LINE.slice(2, 3)));
  page.send(extendTrack(LINE.slice(3)));
  expect(page.track()?.geometry).toEqual({
    type: "LineString",
    coordinates: lngLat(LINE),
  });
  expect(page.drawn()).toBe(3);

  const whole = runPage();
  whole.send(showTrack(LINE));
  expect(page.track()).toEqual(whole.track());
});

test("with no line to go on, new fixes draw nothing", () => {
  const page = runPage();
  page.send(extendTrack(LINE.slice(2)));
  expect(page.track()?.geometry).toBeUndefined();
  expect(page.drawn()).toBe(0);

  page.send(showTrack(LINE.slice(0, 2)));
  page.send(clearTrack());
  page.send(extendTrack(LINE.slice(2)));
  expect(page.track()?.geometry).toBeUndefined();
});

test("a day of skiing is not one line: new fixes leave it as it is", () => {
  const page = runPage();
  page.send(showLifts([LINE.slice(0, 2)], [LINE.slice(1, 3)]));
  const before = page.track();
  page.send(extendTrack(LINE.slice(3)));
  expect(page.track()).toEqual(before);
  expect(page.track()?.geometry?.type).toBe("MultiLineString");
});

test("the map comes to the runner as before, then follows in a shorter move", () => {
  expect(FOLLOW_MS).toBeLessThan(FOLLOW_START_MS);
  const page = runPage();
  page.send(follow(LINE[0], null));
  page.send(follow(LINE[1], 10));
  page.send(follow(LINE[2], 20));
  expect(page.eased).toEqual([
    { center: [11.8, 46.4], zoom: FOLLOW_ZOOM, bearing: 0, duration: FOLLOW_START_MS },
    { center: [11.8, 46.41], zoom: FOLLOW_ZOOM, bearing: 0, duration: FOLLOW_MS },
    { center: [11.81, 46.42], zoom: FOLLOW_ZOOM, bearing: 0, duration: FOLLOW_MS },
  ]);
  // The next run starts as the first did.
  page.send(stopFollow());
  page.send(follow(LINE[3], null));
  expect(page.eased[3].duration).toBe(FOLLOW_START_MS);
});
