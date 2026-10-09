/**
 * The map page's script run against a stand-in for MapLibre (TASK-264): a
 * kind shows its layers of the style and hides the others, the 3D map has
 * its hills and leans, and a route framed stays framed.
 */
import vm from "node:vm";

import type { LatLon } from "@shaperoute/shared-types";

import { MAP_KINDS, type MapKind } from "./mapKind";
import {
  HILLSHADE,
  kindLayers,
  ON_PHOTOS,
  PITCH_3D,
  SATELLITE,
  TERRAIN_SPEC,
  withKinds,
} from "./mapKindStyle";
import { buildMapPage, MAP_STYLE } from "./mapPage";
import { follow, setKind, showRoute, type ToPage } from "./messages";

type Camera = {
  bearing?: number;
  center?: unknown;
  zoom?: number;
  padding?: number;
  pitch?: number;
  duration?: number;
};

/** The page's own scripts, the ones with no `src`, run in order. */
function runPage({ styleLater = false } = {}) {
  let styleLoad: (() => void) | null = null;
  const visibility = new Map<string, string>();
  const terrain: unknown[] = [];
  const calls: { how: string; camera: Camera }[] = [];
  class Map_ {
    dragPan = { enable() {}, disable() {} };
    doubleClickZoom = { enable() {}, disable() {} };
    addControl() {}
    on() {}
    once(event: string, then: () => void) {
      if (event === "style.load") {
        if (styleLater) {
          styleLoad = then;
        } else {
          then();
        }
      }
    }
    addSource() {}
    addLayer() {}
    getSource() {
      return undefined;
    }
    setFeatureState() {}
    getBearing() {
      return 0;
    }
    setLayoutProperty(id: string, name: string, value: string) {
      if (name === "visibility") {
        visibility.set(id, value);
      }
    }
    setTerrain(spec: unknown) {
      terrain.push(spec);
    }
    fitBounds(_bounds: unknown, camera: Camera) {
      calls.push({ how: "fitBounds", camera });
    }
    easeTo(camera: Camera) {
      calls.push({ how: "easeTo", camera });
    }
    flyTo(camera: Camera) {
      calls.push({ how: "flyTo", camera });
    }
    getCanvasContainer() {
      return { style: {}, addEventListener() {} };
    }
  }
  class Bounds {
    extend() {
      return this;
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
      return [11, 46];
    }
    setRotation() {}
  }
  const context: Record<string, unknown> = {
    maplibregl: {
      Map: Map_,
      LngLatBounds: Bounds,
      Marker,
      AttributionControl: class {},
    },
    ReactNativeWebView: { postMessage() {} },
    document: { createElement: () => ({ style: {} }) },
  };
  context.window = context;
  vm.createContext(context);
  const scripts = [...buildMapPage().matchAll(/<script>([\s\S]*?)<\/script>/g)];
  for (const [, code] of scripts) {
    vm.runInContext(code, context);
  }
  const page = context.shaperoute as { receive: (message: ToPage) => void };
  return {
    // Through JSON, as injectJavaScript delivers it.
    send: (message: ToPage) => page.receive(JSON.parse(JSON.stringify(message))),
    loadStyle: () => styleLoad?.(),
    /** The layers shown now, of those the page was told about. */
    shown: () =>
      [...visibility].filter(([, value]) => value === "visible").map(([id]) => id),
    hidden: () =>
      [...visibility].filter(([, value]) => value === "none").map(([id]) => id),
    terrain,
    calls,
    last: () => calls[calls.length - 1],
  };
}

const style = withKinds(MAP_STYLE);
const allIds = style.layers.map((layer) => layer.id);
const ROUTE: LatLon[] = [
  [46.0, 11.0],
  [46.001, 11.002],
  [46.002, 11.0],
  [46.0, 11.0],
];

test.each(MAP_KINDS.filter((kind) => kind !== "standard"))(
  "%s shows its layers and hides every other one of the style",
  (kind: MapKind) => {
    const page = runPage();
    page.send(setKind(kind));
    const shown = kindLayers(style)[kind];
    expect(new Set(page.shown())).toEqual(new Set(shown));
    expect(new Set(page.hidden())).toEqual(
      new Set(allIds.filter((id) => !shown.includes(id))),
    );
  },
);

test("the photos hide the dark map, its names in light letters over them", () => {
  const page = runPage();
  page.send(setKind("satellite"));
  expect(page.shown()).toContain(SATELLITE);
  expect(page.shown()).toContain(`place-label${ON_PHOTOS}`);
  expect(page.hidden()).toContain("place-label");
  expect(page.hidden()).toContain("road-minor");
  expect(page.hidden()).toContain("water");
  expect(page.terrain).toEqual([null]);
  expect(page.last()).toEqual({ how: "easeTo", camera: { pitch: 0, duration: 600 } });
});

test("the 3D map has its hills, and leans", () => {
  const page = runPage();
  page.send(setKind("3d"));
  expect(page.shown()).toEqual(expect.arrayContaining([HILLSHADE, "road-minor"]));
  expect(new Set(page.hidden())).toEqual(
    new Set([SATELLITE, `place-label${ON_PHOTOS}`]),
  );
  expect(page.terrain).toEqual([TERRAIN_SPEC]);
  expect(page.last()).toEqual({
    how: "easeTo",
    camera: { pitch: PITCH_3D, duration: 600 },
  });
});

test("back to the standard map, flat, with no hills and nothing added", () => {
  const page = runPage();
  page.send(setKind("3d"));
  page.send(setKind("standard"));
  expect(new Set(page.hidden())).toEqual(
    new Set([SATELLITE, HILLSHADE, `place-label${ON_PHOTOS}`]),
  );
  expect(page.terrain).toEqual([TERRAIN_SPEC, null]);
  expect(page.last()).toEqual({ how: "easeTo", camera: { pitch: 0, duration: 600 } });
});

test("the same kind again changes nothing, and an unknown one is ignored", () => {
  const page = runPage();
  page.send(setKind("satellite"));
  const told = page.calls.length;
  page.send(setKind("satellite"));
  page.send({ type: "setKind", kind: "terrain" as MapKind });
  expect(page.calls.length).toBe(told);
  expect(page.terrain).toEqual([null]);
});

test("a kind told before the style is drawn shows once it is", () => {
  const page = runPage({ styleLater: true });
  page.send(setKind("satellite"));
  expect(page.shown()).toEqual([]);
  page.loadStyle();
  expect(new Set(page.shown())).toEqual(new Set(kindLayers(style).satellite));
});

test("on the 3D map a route is framed as before: leaning, it takes less room", () => {
  const page = runPage();
  page.send(setKind("3d"));
  page.send(showRoute(ROUTE, null, null, null, -30));
  expect(page.last()).toEqual({
    how: "fitBounds",
    camera: { padding: 40, bearing: -30 },
  });
});

test("a framed route is framed again when the kind leans or stands up", () => {
  const page = runPage();
  page.send(showRoute(ROUTE, null, null, null, -30));
  page.send(setKind("3d"));
  expect(page.last()).toEqual({
    how: "fitBounds",
    camera: { padding: 40, bearing: -30, pitch: PITCH_3D },
  });
  page.send(setKind("satellite"));
  expect(page.last()).toEqual({
    how: "fitBounds",
    camera: { padding: 40, bearing: -30, pitch: 0 },
  });
});

test("following the runner, the map leans where it is", () => {
  const page = runPage();
  page.send(showRoute(ROUTE));
  page.send(follow([46.001, 11.001], 90));
  page.send(setKind("3d"));
  expect(page.last()).toEqual({
    how: "easeTo",
    camera: { pitch: PITCH_3D, duration: 600 },
  });
});
