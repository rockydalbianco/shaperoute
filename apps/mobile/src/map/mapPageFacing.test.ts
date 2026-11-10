/**
 * The runner's arrow on «Compass» (TASK-431, ADR-0359), the map page's
 * script run against a stand-in for MapLibre: told where the phone points,
 * the arrow turns there, standing still too, and opens its cone; told
 * nothing more, the cone closes and the line run turns the arrow again.
 */
import vm from "node:vm";

import type { LatLon } from "@shaperoute/shared-types";

import { buildMapPage, FACING_CONE_CLASS, HEADING_ARROW_SVG } from "./mapPage";
import { face, follow, setPosition, stopFollow, type ToPage } from "./messages";
import { color } from "../theme/tokens";

type Cone = { style: { display?: string } };
type Element = {
  style: Record<string, string>;
  innerHTML: string;
  querySelector: (selector: string) => Cone | null;
};

function runPage() {
  /** Every marker made, the last one on the map. */
  const markers: {
    options: { element?: Element; color?: string };
    rotation: number | null;
    removed: boolean;
  }[] = [];
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
    addSource() {}
    addLayer() {}
    getSource() {
      return { setData() {} };
    }
    setFeatureState() {}
    getBearing() {
      return 0;
    }
    fitBounds() {}
    easeTo() {}
    flyTo() {}
    getCanvasContainer() {
      return { style: {}, addEventListener() {} };
    }
  }
  class Marker {
    state: (typeof markers)[number];
    constructor(options: { element?: Element; color?: string }) {
      this.state = { options, rotation: null, removed: false };
      markers.push(this.state);
    }
    setLngLat() {
      return this;
    }
    addTo() {
      return this;
    }
    remove() {
      this.state.removed = true;
    }
    getLngLat() {
      return [11, 46];
    }
    setRotation(deg: number) {
      this.state.rotation = deg;
    }
  }
  const createElement = (): Element => {
    const cone: Cone = { style: {} };
    const element: Element = {
      style: {},
      innerHTML: "",
      querySelector: (selector) =>
        selector === `.${FACING_CONE_CLASS}` &&
        element.innerHTML.includes(`class="${FACING_CONE_CLASS}"`)
          ? cone
          : null,
    };
    return element;
  };
  const context: Record<string, unknown> = {
    maplibregl: {
      Map: Map_,
      LngLatBounds: class {
        extend() {
          return this;
        }
      },
      Marker,
      AttributionControl: class {},
    },
    ReactNativeWebView: { postMessage() {} },
    document: { createElement },
  };
  context.window = context;
  vm.createContext(context);
  for (const [, code] of buildMapPage().matchAll(/<script>([\s\S]*?)<\/script>/g)) {
    vm.runInContext(code, context);
  }
  const page = context.shaperoute as { receive: (message: ToPage) => void };
  const live = () => markers.filter((marker) => !marker.removed);
  return {
    send: (message: ToPage) => page.receive(JSON.parse(JSON.stringify(message))),
    /** The arrow on the map, or undefined while the position is a pin. */
    arrow: () => live().find((marker) => marker.options.element !== undefined),
    pin: () => live().find((marker) => marker.options.element === undefined),
    cone: () =>
      live()
        .find((marker) => marker.options.element !== undefined)
        ?.options.element?.querySelector(`.${FACING_CONE_CLASS}`)?.style.display,
  };
}

const HERE: LatLon = [46.0005, 11.001];

test("the arrow is large, white on a blue ring, its cone closed at first", () => {
  expect(HEADING_ARROW_SVG).toContain(`stroke="${color.you}"`);
  expect(HEADING_ARROW_SVG).toContain(`stop-color="${color.you}"`);
  expect(HEADING_ARROW_SVG).toContain(`class="${FACING_CONE_CLASS}" display="none"`);
});

test("on Compass the arrow turns where the phone points and opens its cone", () => {
  const page = runPage();
  page.send(follow(HERE, 30));
  expect(page.arrow()?.rotation).toBe(30);
  page.send(face(200));
  expect(page.arrow()?.rotation).toBe(200);
  expect(page.cone()).toBe("inline");
  // A fix brings the line run's heading: the phone still wins.
  page.send(follow(HERE, 35));
  expect(page.arrow()?.rotation).toBe(200);
  // The fingers go through the cone to the map.
  expect(page.arrow()?.options.element?.style.pointerEvents).toBe("none");
});

test("standing still, before any heading, the pin becomes the arrow", () => {
  const page = runPage();
  page.send(follow(HERE));
  expect(page.pin()).toBeDefined();
  expect(page.arrow()).toBeUndefined();
  page.send(face(90));
  expect(page.pin()).toBeUndefined();
  expect(page.arrow()?.rotation).toBe(90);
  expect(page.cone()).toBe("inline");
});

test("off Compass the cone closes and the line run turns the arrow again", () => {
  const page = runPage();
  page.send(follow(HERE, 30));
  page.send(face(200));
  page.send(face(null));
  expect(page.cone()).toBe("none");
  page.send(follow(HERE, 40));
  expect(page.arrow()?.rotation).toBe(40);
});

test("the phone's direction does not turn a position that is not followed", () => {
  const page = runPage();
  page.send(setPosition(HERE));
  page.send(face(90));
  expect(page.arrow()).toBeUndefined();
  expect(page.pin()).toBeDefined();
});

test("at the end of the run the arrow is the pin again and forgets the phone", () => {
  const page = runPage();
  page.send(follow(HERE, 30));
  page.send(face(200));
  page.send(stopFollow());
  expect(page.arrow()).toBeUndefined();
  page.send(follow(HERE, 50));
  expect(page.arrow()?.rotation).toBe(50);
});
