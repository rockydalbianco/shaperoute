/**
 * The flight map's page (TASK-479 part A1) run against a stand-in for
 * MapLibre: the track in the colours of the climb from the tokens, the
 * take-off, the hills on in 3D and off flat, the camera on the pilot,
 * turned by the course or north up, and the frames it drew told.
 */
import vm from "node:vm";

import { color, vario } from "../theme/tokens";
import { PITCH_3D, TERRAIN_SPEC } from "../map/mapKindStyle";
import {
  buildFlightMapPage,
  parseFlightMapMessage,
  TRACK_WIDTH,
  VARIO_STOPS,
} from "./flightMapPage";

type Layer = {
  id: string;
  paint?: Record<string, unknown>;
  layout?: Record<string, unknown>;
};

function runPage() {
  const posts: Record<string, unknown>[] = [];
  const sources = new Map<
    string,
    { data: unknown; setData: (data: unknown) => void }
  >();
  const layers: Layer[] = [];
  const handlers = new Map<string, (event?: unknown) => void>();
  let timer: (() => void) | null = null;
  const visibility = new Map<string, string>();
  const eases: Record<string, unknown>[] = [];
  let terrain: unknown = "unset";
  const centerElevations: number[] = [];
  let interval: (() => void) | null = null;
  const marker = { lngLat: null as unknown, rotation: null as unknown, added: false };
  class Map_ {
    touchZoomRotate = { disableRotation() {} };
    setCenterClampedToGround() {}
    setCenterElevation(metres: number) {
      centerElevations.push(metres);
    }
    queryTerrainElevation() {
      return 2600;
    }
    addControl() {}
    on(event: string, handler: (event?: unknown) => void) {
      handlers.set(event, handler);
    }
    once(event: string, handler: () => void) {
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
    getLayer(id: string) {
      return { id };
    }
    setLayoutProperty(id: string, _name: string, value: string) {
      visibility.set(id, value);
    }
    setTerrain(value: unknown) {
      terrain = value;
    }
    easeTo(options: Record<string, unknown>) {
      eases.push(options);
    }
  }
  class Marker {
    setLngLat(value: unknown) {
      marker.lngLat = value;
      return this;
    }
    setRotation(value: unknown) {
      marker.rotation = value;
      return this;
    }
    addTo() {
      marker.added = true;
      return this;
    }
  }
  const context: Record<string, unknown> = {
    maplibregl: { Map: Map_, Marker, AttributionControl: class {} },
    JSON,
    Math,
    // The clock moves 5 s at each look.
    Date: {
      now: (() => {
        let ms = 0;
        return () => (ms += 5_000);
      })(),
    },
    document: { createElement: () => ({}) },
    setInterval: (handler: () => void) => {
      interval = handler;
      return 0;
    },
    setTimeout: (handler: () => void) => {
      timer = handler;
      return 1;
    },
    clearTimeout: () => {
      timer = null;
    },
    ReactNativeWebView: {
      postMessage: (text: string) =>
        posts.push(JSON.parse(text) as Record<string, unknown>),
    },
  };
  context.window = context;
  vm.createContext(context);
  for (const [, code] of buildFlightMapPage(color, "it").matchAll(
    /<script>([\s\S]*?)<\/script>/g,
  )) {
    vm.runInContext(code, context);
  }
  const flight = context.flight as {
    setView: (threeD: boolean, headingUp: boolean) => void;
    setPilot: (
      lat: number,
      lon: number,
      heading: number | null,
      course: number | null,
    ) => void;
    setTrack: (data: unknown) => void;
    setTakeoff: (lat: number | null, lon: number | null) => void;
  };
  return {
    posts,
    layers,
    eases,
    visibility,
    marker,
    terrain: () => terrain,
    centerElevations,
    load: () => handlers.get("load")!(),
    render: () => handlers.get("render")!(),
    tick: () => interval!(),
    fire: (event: string, value: unknown) => handlers.get(event)!(value),
    timeUp: () => {
      const run = timer;
      timer = null;
      run?.();
    },
    data: (id: string) => sources.get(id)?.data,
    flight,
  };
}

it("draws the track in the colours of the climb, −3 to +3 m/s, from the tokens", () => {
  const page = runPage();
  page.load();
  const track = page.layers.find((layer) => layer.id === "flight-track")!;
  expect(track.paint?.["line-width"]).toBe(TRACK_WIDTH);
  expect(track.paint?.["line-color"]).toEqual([
    "interpolate",
    ["linear"],
    ["get", "v"],
    ...VARIO_STOPS.flat(),
  ]);
  expect(VARIO_STOPS[0]).toEqual([-3, vario.sinkStrong]);
  expect(VARIO_STOPS[VARIO_STOPS.length - 1]).toEqual([3, vario.climbStrong]);
  const line = { type: "FeatureCollection", features: [] };
  page.flight.setTrack(line);
  expect(page.data("flight-track")).toBe(line);
  expect(page.posts).toContainEqual({ type: "ready" });
});

it("starts in 3D, with the hills; flat without them", () => {
  const page = runPage();
  page.load();
  expect(page.terrain()).toEqual(TERRAIN_SPEC);
  expect(page.visibility.get("hillshade")).toBe("visible");
  page.flight.setView(false, true);
  expect(page.terrain()).toBeNull();
  expect(page.visibility.get("hillshade")).toBe("none");
});

it("follows the pilot, turned by the course, or north up, on the ground under them", () => {
  const page = runPage();
  page.load();
  page.flight.setPilot(45.87, 11.8, 120, 110);
  expect(page.marker.added).toBe(true);
  expect(page.marker.lngLat).toEqual([11.8, 45.87]);
  expect(page.marker.rotation).toBe(120);
  expect(page.eases[page.eases.length - 1]).toMatchObject({
    center: [11.8, 45.87],
    bearing: 110,
    pitch: PITCH_3D,
  });
  // In 3D the camera looks at the ground under the pilot.
  expect(page.centerElevations[page.centerElevations.length - 1]).toBe(2600);
  page.flight.setView(false, false);
  page.flight.setPilot(45.871, 11.8, 120, 110);
  expect(page.eases[page.eases.length - 1]).toMatchObject({ bearing: 0, pitch: 0 });
  expect(page.centerElevations[page.centerElevations.length - 1]).toBe(0);
});

it("marks the take-off", () => {
  const page = runPage();
  page.load();
  page.flight.setTakeoff(45.86, 11.79);
  expect(page.data("flight-takeoff")).toMatchObject({
    geometry: { type: "Point", coordinates: [11.79, 45.86] },
  });
  page.flight.setTakeoff(null, null);
  expect(page.data("flight-takeoff")).toEqual({
    type: "FeatureCollection",
    features: [],
  });
});

it("tells the frames it drew", () => {
  const page = runPage();
  page.load();
  for (let i = 0; i < 10; i += 1) {
    page.render();
  }
  page.tick();
  const fps = page.posts.find((post) => post.type === "fps");
  expect(fps).toBeDefined();
  // Ten frames in 5 s.
  expect(fps?.fps).toBe(2);
});

it("reads only its own messages", () => {
  expect(parseFlightMapMessage('{"type":"loaded"}')).toEqual({ type: "loaded" });
  expect(parseFlightMapMessage('{"type":"fps","fps":42}')).toEqual({
    type: "fps",
    fps: 42,
  });
  expect(parseFlightMapMessage('{"type":"fps","fps":"x"}')).toBeNull();
  expect(parseFlightMapMessage("{")).toBeNull();
});

it("draws the pilot's airspaces: volumes in 3D, areas on the plain map, under the track", () => {
  const page = runPage();
  page.load();
  const ids = page.layers.map((layer) => layer.id);
  expect(ids).toEqual(
    expect.arrayContaining([
      "flight-airspace-volume",
      "flight-airspace-area",
      "flight-airspace-edge",
    ]),
  );
  const volume = page.layers.find((layer) => layer.id === "flight-airspace-volume")!;
  expect(volume.paint?.["fill-extrusion-color"]).toEqual([
    "case",
    ["get", "danger"],
    color.error,
    color.warning,
  ]);
  expect(page.visibility.get("flight-airspace-volume")).toBe("visible");
  expect(page.visibility.get("flight-airspace-area")).toBe("none");
  page.flight.setView(false, true);
  expect(page.visibility.get("flight-airspace-volume")).toBe("none");
  expect(page.visibility.get("flight-airspace-area")).toBe("visible");
  const areas = { type: "FeatureCollection", features: [] };
  (page.flight as unknown as { setAirspace: (data: unknown) => void }).setAirspace(
    areas,
  );
  expect(page.data("flight-airspace")).toBe(areas);
});

it("draws the pilot's task: the next cylinder filled, the edges, the way left dashed (D2)", () => {
  const page = runPage();
  page.load();
  const ids = page.layers.map((layer) => layer.id);
  expect(ids).toEqual(
    expect.arrayContaining([
      "flight-task-next",
      "flight-task-edge",
      "flight-task-route",
    ]),
  );
  const edge = page.layers.find((layer) => layer.id === "flight-task-edge")!;
  // Not by colour alone: the next one is thicker too.
  expect(edge.paint?.["line-width"]).toEqual(["case", ["get", "next"], 4, 2]);
  const route = page.layers.find((layer) => layer.id === "flight-task-route")!;
  expect(route.paint?.["line-dasharray"]).toEqual([2, 2]);
  const task = { type: "FeatureCollection", features: [] };
  (page.flight as unknown as { setTask: (data: unknown) => void }).setTask(task);
  expect(page.data("flight-task")).toBe(task);
});

describe("the pilot's waypoints (D5)", () => {
  const touchAt = (x: number, fingers = 1) => ({
    lngLat: { lat: 46.1, lng: 11.2 },
    point: { x, y: 100 },
    originalEvent: { touches: new Array(fingers).fill({}) },
  });

  it("tells the app where the map was pressed long", () => {
    const page = runPage();
    page.load();
    page.fire("touchstart", touchAt(100));
    page.timeUp();
    expect(page.posts).toContainEqual({ type: "press", lat: 46.1, lon: 11.2 });
  });

  it("is no press when the finger moves or lifts, or with two fingers", () => {
    const page = runPage();
    page.load();
    page.fire("touchstart", touchAt(100));
    page.fire("touchmove", touchAt(130));
    page.timeUp();
    page.fire("touchstart", touchAt(100));
    page.fire("touchend", touchAt(100));
    page.timeUp();
    page.fire("touchstart", touchAt(100, 2));
    page.timeUp();
    expect(page.posts.filter((one) => one.type === "press")).toEqual([]);
  });

  it("draws the waypoints, a landing as a ring, each with its name", () => {
    const page = runPage();
    page.load();
    const dot = page.layers.find((layer) => layer.id === "flight-waypoint-dot")!;
    expect(dot.paint?.["circle-opacity"]).toEqual(["case", ["get", "landing"], 0, 1]);
    expect(page.layers.map((layer) => layer.id)).toContain("flight-waypoint-name");
    const points = { type: "FeatureCollection", features: [] };
    (page.flight as unknown as { setWaypoints: (data: unknown) => void }).setWaypoints(
      points,
    );
    expect(page.data("flight-waypoints")).toBe(points);
  });

  it("reads a press back, on the earth only", () => {
    expect(
      parseFlightMapMessage(JSON.stringify({ type: "press", lat: 46, lon: 11 })),
    ).toEqual({
      type: "press",
      point: [46, 11],
    });
    expect(
      parseFlightMapMessage(JSON.stringify({ type: "press", lat: 95, lon: 11 })),
    ).toBeNull();
    expect(
      parseFlightMapMessage(JSON.stringify({ type: "press", lat: "46" })),
    ).toBeNull();
  });
});

it("draws the wind aloft as an arrow turned where it comes from, with its label (H)", () => {
  const page = runPage();
  page.load();
  const arrow = page.layers.find((layer) => layer.id === "flight-wind-arrow")!;
  expect(arrow.layout?.["text-rotate"]).toEqual(["get", "from"]);
  expect(page.layers.map((layer) => layer.id)).toContain("flight-wind-label");
  const wind = { type: "FeatureCollection", features: [] };
  (page.flight as unknown as { setWind: (data: unknown) => void }).setWind(wind);
  expect(page.data("flight-wind")).toBe(wind);
});
