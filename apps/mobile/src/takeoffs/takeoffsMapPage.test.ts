/**
 * The map of takeoffs' page (TASK-493 part C) run against a stand-in for
 * MapLibre: the box it shows told when it stops, the sites drawn in the
 * text's colours and never in the route's yellow, a tap telling the site,
 * the selected one bigger, and OpenStreetMap credited unfolded.
 */
import box from "@shaperoute/shared-types/fixtures/flying-sites.json";
import type { FlyingSites } from "@shaperoute/shared-types";
import vm from "node:vm";

import { color } from "../theme/tokens";
import {
  ATTRIBUTION,
  buildTakeoffsMapPage,
  parseTakeoffsMapMessage,
  PLACE_ZOOM,
  sitesCollection,
  START_CENTER,
  START_ZOOM,
} from "./takeoffsMapPage";

type Layer = { id: string; paint?: Record<string, unknown> };
type Handler = (event?: unknown) => void;

function runPage(center: [number, number] | null = null) {
  const posts: Record<string, unknown>[] = [];
  const sources = new Map<string, { data: unknown; setData: (d: unknown) => void }>();
  const layers: Layer[] = [];
  const handlers = new Map<string, Handler>();
  const states = new Map<unknown, unknown>();
  const made: Record<string, unknown>[] = [];
  const attributions: Record<string, unknown>[] = [];
  const eases: Record<string, unknown>[] = [];
  class Map_ {
    constructor(options: Record<string, unknown>) {
      made.push(options);
    }
    touchZoomRotate = { disableRotation() {} };
    addControl() {}
    on(event: string, layerOrHandler: string | Handler, handler?: Handler) {
      if (typeof layerOrHandler === "string") {
        handlers.set(`${event}:${layerOrHandler}`, handler!);
      } else {
        handlers.set(event, layerOrHandler);
      }
    }
    once(event: string, handler: Handler) {
      handlers.set(event, handler);
    }
    addSource(id: string, source: { data: unknown }) {
      const entry = {
        data: source.data,
        setData(data: unknown) {
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
    getBounds() {
      return {
        getSouth: () => 45.9,
        getWest: () => 10.9,
        getNorth: () => 46.1,
        getEast: () => 11.1,
      };
    }
    getZoom() {
      return 11.5;
    }
    setFeatureState(feature: { id: unknown }, state: { selected: boolean }) {
      states.set(feature.id, state.selected);
    }
    easeTo(options: Record<string, unknown>) {
      eases.push(options);
    }
  }
  class AttributionControl {
    constructor(options: Record<string, unknown>) {
      attributions.push(options);
    }
  }
  const context: Record<string, unknown> = {
    maplibregl: { Map: Map_, AttributionControl },
    JSON,
    ReactNativeWebView: {
      postMessage: (text: string) =>
        posts.push(JSON.parse(text) as Record<string, unknown>),
    },
  };
  context.window = context;
  vm.createContext(context);
  for (const [, code] of buildTakeoffsMapPage(color, "it", center).matchAll(
    /<script>([\s\S]*?)<\/script>/g,
  )) {
    vm.runInContext(code, context);
  }
  const takeoffs = context.takeoffs as {
    setSites: (data: unknown) => void;
    select: (id: number | null) => void;
    center: (lat: number, lon: number, zoom: number) => void;
  };
  return {
    posts,
    sources,
    layers,
    handlers,
    states,
    made,
    attributions,
    eases,
    takeoffs,
  };
}

test("it starts on the Alps, or on a place known", () => {
  const alps = runPage();
  expect(alps.made[0].center).toEqual([START_CENTER[1], START_CENTER[0]]);
  expect(alps.made[0].zoom).toBe(START_ZOOM);
  const near = runPage([46.07, 11.12]);
  expect(near.made[0].center).toEqual([11.12, 46.07]);
  expect(near.made[0].zoom).toBe(PLACE_ZOOM);
});

test("once loaded it tells it is ready and the box it shows, and again when it stops", () => {
  const page = runPage();
  page.handlers.get("load")!();
  const box = {
    type: "box",
    south: 45.9,
    west: 10.9,
    north: 46.1,
    east: 11.1,
    zoom: 11.5,
  };
  expect(page.posts).toEqual([{ type: "ready" }, box]);
  page.handlers.get("moveend")!();
  expect(page.posts[2]).toEqual(box);
});

test("the sites in the text's colours, never the route's yellow", () => {
  const page = runPage();
  page.handlers.get("load")!();
  const takeoff = page.layers.find((l) => l.id === "sites-takeoff")!;
  const landing = page.layers.find((l) => l.id === "sites-landing")!;
  expect(takeoff.paint!["circle-color"]).toBe(color.text);
  expect(landing.paint!["circle-stroke-color"]).toBe(color.textMuted);
  expect(JSON.stringify(page.layers)).not.toContain(color.accent);
});

test("OpenStreetMap is credited, never folded", () => {
  const page = runPage();
  expect(page.attributions).toEqual([
    { compact: false, customAttribution: ATTRIBUTION },
  ]);
  expect(ATTRIBUTION).toBe((box as FlyingSites).attribution);
});

test("the sites go to the map, a tap tells which, the chosen one is bigger", () => {
  const page = runPage();
  page.handlers.get("load")!();
  const collection = sitesCollection((box as FlyingSites).sites);
  page.takeoffs.setSites(collection);
  expect(page.sources.get("sites")!.data).toBe(collection);
  page.handlers.get("click:sites-takeoff")!({
    features: [{ properties: { id: 101 } }],
  });
  expect(page.posts.at(-1)).toEqual({ type: "site", id: 101 });
  page.takeoffs.select(101);
  page.takeoffs.select(102);
  expect(page.states.get(101)).toBe(false);
  expect(page.states.get(102)).toBe(true);
  page.takeoffs.center(46, 11, 13);
  expect(page.eases.at(-1)).toMatchObject({ center: [11, 46], zoom: 13 });
});

test("the sites as the page draws them: their id, kind and name", () => {
  const collection = sitesCollection((box as FlyingSites).sites) as {
    features: { id: number; properties: Record<string, unknown>; geometry: unknown }[];
  };
  expect(collection.features[0]).toEqual({
    type: "Feature",
    id: 101,
    properties: { id: 101, kind: "takeoff", name: "Monte Prova" },
    geometry: { type: "Point", coordinates: [11.0, 46.0] },
  });
  expect(collection.features[2].properties.name).toBe("");
});

test("only the page's own messages are read", () => {
  expect(parseTakeoffsMapMessage('{"type":"ready"}')).toEqual({ type: "ready" });
  expect(parseTakeoffsMapMessage('{"type":"site","id":7}')).toEqual({
    type: "site",
    id: 7,
  });
  expect(parseTakeoffsMapMessage('{"type":"site","id":7.5}')).toBeNull();
  expect(
    parseTakeoffsMapMessage(
      '{"type":"box","south":1,"west":2,"north":3,"east":4,"zoom":9}',
    ),
  ).toEqual({ type: "box", south: 1, west: 2, north: 3, east: 4, zoom: 9 });
  expect(parseTakeoffsMapMessage('{"type":"box","south":1}')).toBeNull();
  expect(parseTakeoffsMapMessage("nope")).toBeNull();
});
