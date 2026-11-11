/**
 * The map page's script run against a stand-in for MapLibre (TASK-443): a
 * route is framed whole, under the status bar, clear of the buttons over
 * the map and over the attribution, and framed again when the map's view
 * changes its size, as when the card under it grows.
 */
import vm from "node:vm";

import type { LatLon } from "@shaperoute/shared-types";

import { mapCover } from "./mapCover";
import {
  ATTRIBUTION_PX,
  buildMapPage,
  FRAME_GAP_PX,
  FRAME_PADDING_PX,
} from "./mapPage";
import {
  follow,
  setCover,
  setKind,
  showGhost,
  showRoute,
  type ToPage,
} from "./messages";

type Pair = [number, number];
type Padding = { top: number; bottom: number; left: number; right: number };
type Fit = {
  points: Pair[];
  padding: number | Padding;
  bearing?: number;
  pitch?: number;
  animate?: boolean;
};
type Handler = (event?: { originalEvent?: unknown }) => void;

/** A place in the pixels of the world at zoom 0, 512 to the tile. */
function world([lng, lat]: Pair): Pair {
  const y = Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));
  return [((lng + 180) / 360) * 512, (0.5 - y / (2 * Math.PI)) * 512];
}

function place([x, y]: Pair): { lng: number; lat: number } {
  const lat =
    (2 * Math.atan(Math.exp((0.5 - y / 512) * 2 * Math.PI)) - Math.PI / 2) *
    (180 / Math.PI);
  return { lng: (x / 512) * 360 - 180, lat };
}

/** The page's own scripts, the ones with no `src`, run in order, on a map
 * of `size` that fits bounds north up as MapLibre does. */
function runPage(size = { width: 402, height: 335 }) {
  const fits: Fit[] = [];
  const handlers = new Map<string, Handler[]>();
  const sources = new Map<string, unknown>();
  class Bounds {
    points: Pair[] = [];
    extend(point: Pair | { lng: number; lat: number }) {
      this.points.push(Array.isArray(point) ? point : [point.lng, point.lat]);
      return this;
    }
  }
  class Map_ {
    dragPan = { enable() {}, disable() {} };
    doubleClickZoom = { enable() {}, disable() {} };
    addControl() {}
    on(event: string, then: Handler) {
      handlers.set(event, [...(handlers.get(event) ?? []), then]);
    }
    once(event: string, then: () => void) {
      if (event === "style.load") {
        then();
      }
    }
    addSource(name: string, source: { data: unknown }) {
      sources.set(name, source.data);
    }
    addLayer() {}
    getLayer() {
      return undefined;
    }
    getSource(name: string) {
      return sources.has(name)
        ? { setData: (data: unknown) => sources.set(name, data) }
        : undefined;
    }
    setFeatureState() {}
    setLayoutProperty() {}
    setTerrain() {}
    easeTo() {}
    flyTo() {}
    getCanvasContainer() {
      return { style: {}, addEventListener() {} };
    }
    getContainer() {
      return { clientWidth: size.width, clientHeight: size.height };
    }
    /** North up: the box in the room the padding leaves, in its middle. */
    cameraForBounds(bounds: Bounds, options: { padding: Padding; bearing: number }) {
      const at = bounds.points.map(world);
      const xs = at.map(([x]) => x);
      const ys = at.map(([, y]) => y);
      const { top, bottom, left, right } = options.padding;
      const scale = Math.min(
        (size.width - left - right) / (Math.max(...xs) - Math.min(...xs)),
        (size.height - top - bottom) / (Math.max(...ys) - Math.min(...ys)),
      );
      return {
        center: place([
          (Math.max(...xs) + Math.min(...xs)) / 2 - (left - right) / 2 / scale,
          (Math.max(...ys) + Math.min(...ys)) / 2 - (top - bottom) / 2 / scale,
        ]),
        zoom: Math.log2(scale),
        bearing: options.bearing,
      };
    }
    fitBounds(bounds: Bounds, options: Omit<Fit, "points">) {
      fits.push({ ...options, points: bounds.points.slice() });
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
      return { lng: 11.1211, lat: 46.0679 };
    }
  }
  const context: Record<string, unknown> = {
    maplibregl: {
      Map: Map_,
      LngLatBounds: Bounds,
      Marker,
      AttributionControl: class {},
    },
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
    size,
    fits,
    /** The last framing asked of the map. */
    last: () => fits[fits.length - 1],
    // Through JSON, as injectJavaScript delivers it.
    send: (message: ToPage) => page.receive(JSON.parse(JSON.stringify(message))),
    fire: (event: string, with_?: { originalEvent?: unknown }) =>
      (handlers.get(event) ?? []).forEach((then) => then(with_)),
    held: (name: string) => sources.get(name),
  };
}

const TOP = 62;
/** An iPhone 17: the way back and the map's kind under the Dynamic Island. */
const COVER = mapCover({
  insetTop: TOP,
  width: 402,
  bannerHeight: null,
  compass: false,
});
const WITH_ARROW = mapCover({
  insetTop: TOP,
  width: 402,
  bannerHeight: null,
  compass: true,
});
const ROW = COVER.buttons[0].y + COVER.buttons[0].height;
const ARROW = WITH_ARROW.buttons[2].y + WITH_ARROW.buttons[2].height;

/** Under `top`, over the attribution, the gap to spare all around. */
function room(top: number): Padding {
  return {
    top: top + FRAME_GAP_PX,
    bottom: ATTRIBUTION_PX + FRAME_GAP_PX,
    left: FRAME_GAP_PX,
    right: FRAME_GAP_PX,
  };
}

/** A box around Piazza del Duomo, Trento, `wide` degrees of longitude by
 * `high` of latitude: its corners are a route's farthest points. */
function box(wide: number, high: number): LatLon[] {
  const [lat, lon] = [46.0679, 11.1211];
  return [
    [lat + high / 2, lon - wide / 2],
    [lat + high / 2, lon + wide / 2],
    [lat - high / 2, lon + wide / 2],
    [lat - high / 2, lon - wide / 2],
    [lat + high / 2, lon - wide / 2],
  ];
}
/** As high as wide on the map, as a heart is: its corners far from the
 * buttons in the corners of the map. */
const SQUARE = box(0.012, 0.0083);
/** Twice as wide as high: as wide as the map, its corners under the buttons. */
const WIDE = box(0.02, 0.0069);

test("a page told nothing frames as it always did", () => {
  const page = runPage();
  page.send(showRoute(SQUARE, null));
  expect(page.fits).toHaveLength(1);
  expect(page.last().padding).toBe(FRAME_PADDING_PX);
  expect(FRAME_PADDING_PX).toBe(40);
});

test("told, the route is under the status bar and over the attribution", () => {
  const page = runPage();
  page.send(setCover(COVER));
  page.send(showRoute(SQUARE, null));
  expect(page.last().padding).toEqual(room(TOP));
  // The whole route is what is framed.
  expect(page.last().points).toEqual(
    expect.arrayContaining(SQUARE.map(([lat, lon]) => [lon, lat])),
  );
});

test("a route that would pass under a button is framed under the buttons", () => {
  const page = runPage();
  page.send(setCover(COVER));
  page.send(showRoute(WIDE, null));
  expect(page.last().padding).toEqual(room(ROW));
});

test("with the north arrow under them: under that too, if the route reaches it", () => {
  const page = runPage();
  page.send(setCover(WITH_ARROW));
  page.send(showRoute(WIDE, null));
  expect(page.last().padding).toEqual(room(ARROW));
  // A route clear of every button stays as large as it gets.
  page.send(showRoute(SQUARE, null));
  expect(page.last().padding).toEqual(room(TOP));
});

test("each route chosen is framed anew: A, then B, then A again", () => {
  const page = runPage();
  page.send(setCover(COVER));
  page.send(showRoute(SQUARE, null));
  page.send(showRoute(WIDE, null));
  page.send(showRoute(SQUARE, null));
  expect(page.fits.map((fit) => fit.padding)).toEqual([
    room(TOP),
    room(ROW),
    room(TOP),
  ]);
});

test("the card under the map grows: the route is framed again, at once", () => {
  const page = runPage();
  page.send(setCover(COVER));
  page.send(showRoute(SQUARE, null));
  expect(page.last().animate).toBeUndefined();
  page.size.height = 250;
  page.fire("resize");
  expect(page.fits).toHaveLength(2);
  expect(page.last()).toMatchObject({ padding: room(TOP), animate: false, bearing: 0 });
  expect(page.last().points).toEqual(page.fits[0].points);
});

test("a map the user moved stays where it was left when its size changes", () => {
  const page = runPage();
  page.send(setCover(COVER));
  page.send(showRoute(SQUARE, null));
  page.fire("movestart", { originalEvent: {} });
  page.fire("resize");
  expect(page.fits).toHaveLength(1);
  // The next route is framed all the same.
  page.send(showRoute(WIDE, null));
  page.fire("resize");
  expect(page.fits).toHaveLength(3);
});

test("following the runner, a new size does not take the map off them", () => {
  const page = runPage();
  page.send(setCover(COVER));
  page.send(showRoute(SQUARE, null));
  page.send(follow([46.0679, 11.1211]));
  page.fire("resize");
  expect(page.fits).toHaveLength(1);
});

test("told what lies over it while framed, the map frames its route again", () => {
  const page = runPage();
  page.send(showRoute(SQUARE, null));
  page.send(setCover(COVER));
  expect(page.fits.map((fit) => fit.padding)).toEqual([FRAME_PADDING_PX, room(TOP)]);
  page.send(setCover(null));
  expect(page.last().padding).toBe(FRAME_PADDING_PX);
  // With no route there is nothing to frame.
  const empty = runPage();
  empty.send(setCover(COVER));
  expect(empty.fits).toHaveLength(0);
});

test("the leaning map is framed under every button, unmeasured", () => {
  const page = runPage();
  page.send(setCover(WITH_ARROW));
  page.send(showRoute(SQUARE, null));
  page.send(setKind("3d"));
  expect(page.last().padding).toEqual(room(ARROW));
  expect(page.last().pitch).toBeGreaterThan(0);
});

test("a map too low for a route under its buttons keeps it under the status bar", () => {
  const page = runPage({ width: 402, height: 190 });
  page.send(setCover(WITH_ARROW));
  page.send(showRoute(WIDE, null));
  expect(page.last().padding).toEqual(room(TOP));
});

test("a turned route is framed turned, with the same room", () => {
  const page = runPage();
  page.send(setCover(COVER));
  page.send(showRoute(SQUARE, null, null, null, 30));
  expect(page.last().bearing).toBe(30);
  expect(page.last().padding).toMatchObject({ bottom: ATTRIBUTION_PX + FRAME_GAP_PX });
});

/** The shape asked for, a little larger than its route (TASK-442). */
const PLACED: LatLon[][] = [box(0.013, 0.009)];

test("the shape under the route is framed with it, and stays where it is", () => {
  const page = runPage();
  page.send(setCover(COVER));
  page.send(showGhost(PLACED));
  page.send(showRoute(SQUARE, null));
  expect(page.last().points).toEqual(
    expect.arrayContaining(PLACED[0].map(([lat, lon]) => [lon, lat])),
  );
  // Framing moves the map, not what is drawn on it: the shape is told to
  // the map in the places the search gave, and no framing changes them.
  const drawn = page.held("ghost");
  page.size.height = 250;
  page.fire("resize");
  page.send(setCover(WITH_ARROW));
  expect(page.fits).toHaveLength(3);
  expect(page.held("ghost")).toBe(drawn);
  expect(drawn).toMatchObject({
    geometry: {
      type: "MultiLineString",
      coordinates: PLACED.map((line) => line.map(([lat, lon]) => [lon, lat])),
    },
  });
});

test("a shape taken away is no longer framed", () => {
  const page = runPage();
  page.send(showGhost(PLACED));
  page.send(showGhost([]));
  page.send(showRoute(SQUARE, null));
  expect(page.last().points).toHaveLength(SQUARE.length);
});
