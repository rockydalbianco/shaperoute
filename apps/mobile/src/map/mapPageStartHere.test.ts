/**
 * The map page's script run against a stand-in for MapLibre (TASK-443):
 * where a moved route begins there is a flag in a disc, not a pin as the
 * start asked for, and the words «Start here» in the colours of the app,
 * never in the status bar, under a button or off the map.
 */
import vm from "node:vm";

import type { LatLon } from "@shaperoute/shared-types";

import type { Language } from "../i18n/languages";
import { color } from "../theme/tokens";
import { mapCover } from "./mapCover";
import {
  buildMapPage,
  POSITION_COLOR,
  START_HERE_COLOR,
  START_LABEL_BELOW_CLASS,
  START_LABEL_CLASS,
  START_LABEL_COLORS,
  START_LABEL_EDGE_PX,
  START_LABEL_GAP_PX,
  START_PIN_CLASS,
  START_PIN_SIZE,
  START_PIN_SVG,
} from "./mapPage";
import { clearRoute, setCover, setPosition, showRoute, type ToPage } from "./messages";

type Handler = () => void;

/** As much of an element as the page asks of one; the words are as large
 * as `LABEL`. */
const LABEL = { width: 90, height: 32 };
class Element {
  className = "";
  innerHTML = "";
  textContent = "";
  style: Record<string, string> = {};
  children: Element[] = [];
  offsetWidth = LABEL.width;
  offsetHeight = LABEL.height;
  appendChild(child: Element) {
    this.children.push(child);
  }
}

type MarkerOptions = { color?: string; element?: Element };

/** The page's own scripts, the ones with no `src`, run in order. The start
 * of the route is drawn at `spot`, on a map 402 by 335. */
function runPage(language: Language = "en") {
  const spot = { x: 201, y: 200 };
  const handlers = new Map<string, Handler[]>();
  const markers: Marker[] = [];
  class Marker {
    options: MarkerOptions;
    on = false;
    at: unknown = null;
    constructor(options: MarkerOptions = {}) {
      this.options = options;
      markers.push(this);
    }
    setLngLat(at: unknown) {
      this.at = at;
      return this;
    }
    addTo() {
      this.on = true;
      return this;
    }
    remove() {
      this.on = false;
    }
    getLngLat() {
      return { lng: 11.1211, lat: 46.0679 };
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
    addSource() {}
    addLayer() {}
    getSource() {
      return undefined;
    }
    setFeatureState() {}
    fitBounds() {}
    flyTo() {}
    getCanvasContainer() {
      return { style: {}, addEventListener() {} };
    }
    getContainer() {
      return { clientWidth: 402, clientHeight: 335 };
    }
    cameraForBounds() {
      return undefined;
    }
    project() {
      return { ...spot };
    }
  }
  class Bounds {
    extend() {
      return this;
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
    document: { createElement: () => new Element() },
  };
  context.window = context;
  vm.createContext(context);
  const scripts = [...buildMapPage(language).matchAll(/<script>([\s\S]*?)<\/script>/g)];
  for (const [, code] of scripts) {
    vm.runInContext(code, context);
  }
  const page = context.shaperoute as { receive: (message: ToPage) => void };
  /** The marks on the map now that are drawn by the page itself. */
  const flags = () => markers.filter((marker) => marker.on && marker.options.element);
  return {
    spot,
    markers,
    flags,
    /** The words of the one flag on the map. */
    label: () => flags()[0].options.element!.children[0],
    // Through JSON, as injectJavaScript delivers it.
    send: (message: ToPage) => page.receive(JSON.parse(JSON.stringify(message))),
    fire: (event: string) => (handlers.get(event) ?? []).forEach((then) => then()),
  };
}

const DUOMO: LatLon = [46.0679, 11.1211];
/** A route that begins 300 m north of the start asked for. */
const MOVED: LatLon[] = [
  [46.0706, 11.1211],
  [46.072, 11.124],
  [46.0706, 11.1211],
];
const TOP = 62;
const COVER = mapCover({
  insetTop: TOP,
  width: 402,
  bannerHeight: null,
  compass: true,
});

const OVER = START_LABEL_CLASS;
const UNDER = `${START_LABEL_CLASS} ${START_LABEL_BELOW_CLASS}`;
/** How far over the start the words begin. */
const REACH = START_PIN_SIZE / 2 + START_LABEL_GAP_PX + LABEL.height;

function shown() {
  const page = runPage();
  page.send(setCover(COVER));
  page.send(setPosition(DUOMO));
  page.send(showRoute(MOVED, DUOMO));
  return page;
}

test("where a moved route begins there is a flag in a disc, not a pin", () => {
  const page = shown();
  expect(page.flags()).toHaveLength(1);
  const [flag] = page.flags();
  // Its own drawing, centred on the point: MapLibre's pin is drawn when a
  // colour is asked, as for the start asked for.
  expect(flag.options.color).toBeUndefined();
  expect(flag.options.element?.className).toBe(START_PIN_CLASS);
  expect(flag.options.element?.innerHTML).toBe(START_PIN_SVG);
  expect(flag.at).toEqual([MOVED[0][1], MOVED[0][0]]);
  const pin = page.markers.find((marker) => marker.options.color !== undefined);
  expect(pin?.options).toEqual({ color: POSITION_COLOR });
  expect(pin?.on).toBe(true);
});

test("the flag is cyan with the map's colour on it: a shape, not a colour alone", () => {
  expect(START_PIN_SVG).toContain(
    `<circle cx="16" cy="16" r="14" fill="${START_HERE_COLOR}"`,
  );
  expect(START_PIN_SVG.match(/<path /g)).toHaveLength(2);
  expect(START_PIN_SVG).toContain(`fill="${color.map.background}"`);
  // No colour of its own: the two of the tokens.
  const colours = new Set(START_PIN_SVG.match(/#[0-9A-Fa-f]{6}/g));
  expect([...colours].sort()).toEqual([START_HERE_COLOR, color.map.background].sort());
});

test("a route that begins at the start asked for has no flag", () => {
  const page = runPage();
  page.send(setPosition(MOVED[0]));
  page.send(showRoute(MOVED, MOVED[0]));
  expect(page.flags()).toHaveLength(0);
});

test("the words are written in the page's language, in the app's colours", () => {
  expect(shown().label().textContent).toBe("Start here");
  const german = runPage("de");
  german.send(showRoute(MOVED, DUOMO));
  expect(german.label().textContent).toBe("Hier starten");
  const css = buildMapPage().match(/<style>([\s\S]*?)<\/style>/)?.[1] ?? "";
  const rule = css.match(new RegExp(`\\.${START_LABEL_CLASS} \\{([^}]*)\\}`))?.[1];
  expect(rule).toContain(`background: ${START_LABEL_COLORS.background};`);
  expect(rule).toContain(`color: ${START_LABEL_COLORS.text};`);
  expect(rule).toContain(`border: 1px solid ${START_LABEL_COLORS.border};`);
  expect(START_LABEL_COLORS).toEqual({
    background: color.surfaceRaised,
    border: color.borderStrong,
    text: color.text,
  });
  // MapLibre's white popup is gone.
  expect(buildMapPage()).not.toContain("maplibregl.Popup");
});

test("with room over the flag the words are over it, in the middle", () => {
  const page = shown();
  expect(page.label().className).toBe(OVER);
  expect(page.label().style.transform).toBe("translateX(calc(-50% + 0px))");
});

test("where they would be in the status bar they go under the flag", () => {
  const page = shown();
  // The last place with room over it, and one pixel higher.
  page.spot.y = TOP + START_LABEL_EDGE_PX + REACH;
  page.fire("move");
  expect(page.label().className).toBe(OVER);
  page.spot.y -= 1;
  page.fire("move");
  expect(page.label().className).toBe(UNDER);
});

test("where they would be under a button they go under the flag", () => {
  const page = shown();
  const [back, kind, arrow] = COVER.buttons;
  // Just under the way back and under the north arrow; under the map's
  // kind is the north arrow itself.
  for (const button of [back, arrow]) {
    page.spot.x = button.x + button.width / 2;
    page.spot.y = button.y + button.height + REACH - 1;
    page.fire("move");
    expect(page.label().className).toBe(UNDER);
    // One pixel lower, the words are clear of it.
    page.spot.y += 1;
    page.fire("move");
    expect(page.label().className).toBe(OVER);
  }
  page.spot.x = kind.x + kind.width / 2;
  page.spot.y = kind.y + kind.height + REACH;
  page.fire("move");
  expect(page.label().className).toBe(UNDER);
});

test("near a side of the map they move in, never closer than the edge", () => {
  const page = shown();
  page.spot.x = 20;
  page.spot.y = 250;
  page.fire("move");
  // From the left edge: 8 + half the words - 20.
  expect(page.label().style.transform).toBe(
    `translateX(calc(-50% + ${START_LABEL_EDGE_PX + LABEL.width / 2 - 20}px))`,
  );
  page.spot.x = 395;
  page.fire("move");
  expect(page.label().style.transform).toBe(
    `translateX(calc(-50% + ${402 - START_LABEL_EDGE_PX - LABEL.width / 2 - 395}px))`,
  );
});

test("they are placed again when the map moves, changes size or is told its cover", () => {
  const page = runPage();
  page.send(showRoute(MOVED, DUOMO));
  // Nothing told: the top of the map is the limit.
  page.spot.y = 80;
  page.fire("move");
  expect(page.label().className).toBe(OVER);
  page.send(setCover(COVER));
  expect(page.label().className).toBe(UNDER);
  page.spot.y = 250;
  page.fire("resize");
  expect(page.label().className).toBe(OVER);
});

test("the flag goes with its route, and a new route has its own", () => {
  const page = shown();
  const [first] = page.flags();
  page.send(showRoute([...MOVED].reverse(), DUOMO));
  expect(first.on).toBe(false);
  expect(page.flags()).toHaveLength(1);
  page.send(clearRoute());
  expect(page.flags()).toHaveLength(0);
  // With no flag, a map that moves has nothing to place.
  expect(() => page.fire("move")).not.toThrow();
});
