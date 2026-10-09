import { DEFAULT_TONE, type Tone } from "../theme/tone";
import { color, paletteOf } from "../theme/tokens";
import { MAP_KINDS } from "./mapKind";
import {
  HILLSHADE,
  hillshadeOf,
  kindLayers,
  ON_PHOTOS,
  SATELLITE,
  SATELLITE_ATTRIBUTION,
  SATELLITE_KEY_TILES_URL,
  SATELLITE_TILES_URL,
  satelliteTiles,
  TERRAIN,
  TERRAIN_ATTRIBUTION,
  TERRAIN_SPEC,
  TERRAIN_TILES_URL,
  withKinds,
} from "./mapKindStyle";
import { MAP_STYLE } from "./mapPage";

/**
 * Like the dark style's tests, these catch what makes MapLibre fail
 * silently: a layer on a source that is not there draws nothing, and a
 * layer hidden by mistake is a map with a hole in it.
 */

const style = withKinds(MAP_STYLE, "");
const ids: string[] = style.layers.map((layer) => layer.id);
const layer = (id: string) => style.layers.find((each) => each.id === id);
const PLACE_ON_PHOTOS = `place-label${ON_PHOTOS}`;

test("the dark style is all there, in its order, and still shows", () => {
  const base = MAP_STYLE.layers.map((each) => each.id);
  expect(ids.filter((id) => (base as readonly string[]).includes(id))).toEqual(base);
  for (const id of base) {
    expect(layer(id)).toEqual(MAP_STYLE.layers.find((each) => each.id === id));
  }
  expect(style.sources).toMatchObject(MAP_STYLE.sources);
});

test("the photos, their names and the hills are in it, hidden", () => {
  expect(ids.length).toBe(MAP_STYLE.layers.length + 3);
  for (const id of [SATELLITE, HILLSHADE, PLACE_ON_PHOTOS]) {
    expect(layer(id)).toHaveProperty(["layout", "visibility"], "none");
  }
  expect(new Set(ids).size).toBe(ids.length);
});

test("each layer is where it reads", () => {
  // The photos over the background, under the rest.
  expect(ids.indexOf(SATELLITE)).toBe(ids.indexOf("background") + 1);
  // The hills over the land, under the roads.
  const fills = style.layers.filter((each) => each.type === "fill");
  const lines = style.layers.filter((each) => each.type === "line");
  for (const fill of fills) {
    expect(ids.indexOf(fill.id)).toBeLessThan(ids.indexOf(HILLSHADE));
  }
  expect(ids.indexOf(HILLSHADE)).toBeLessThan(ids.indexOf(lines[lines.length - 1].id));
  // The names on the photos where the names are.
  expect(ids.indexOf(PLACE_ON_PHOTOS)).toBe(ids.indexOf("place-label") + 1);
});

test("on the photos the names are the same ones, light on a dark halo", () => {
  const names = layer("place-label") as { layout: object; paint: object };
  expect(layer(PLACE_ON_PHOTOS)).toEqual({
    ...names,
    id: PLACE_ON_PHOTOS,
    layout: { ...names.layout, visibility: "none" },
    paint: {
      ...names.paint,
      "text-color": color.text,
      "text-halo-color": color.background,
      "text-halo-width": 1.5,
    },
  });
});

test("every layer draws from a source the style has", () => {
  for (const each of style.layers) {
    if ("source" in each) {
      expect(Object.keys(style.sources)).toContain(each.source);
    }
  }
  expect(Object.keys(style.sources)).toContain(TERRAIN_SPEC.source);
});

test("the photos come from Esri, with its credit", () => {
  expect(style.sources[SATELLITE]).toEqual({
    type: "raster",
    tiles: [SATELLITE_TILES_URL],
    tileSize: 256,
    maxzoom: 19,
    attribution: SATELLITE_ATTRIBUTION,
  });
  expect(SATELLITE_ATTRIBUTION).toContain("Powered by Esri");
});

test("with an ArcGIS key the photos come from the address the key is for", () => {
  expect(satelliteTiles("")).toBe(SATELLITE_TILES_URL);
  expect(satelliteTiles("  ")).toBe(SATELLITE_TILES_URL);
  expect(satelliteTiles(undefined)).toBe(SATELLITE_TILES_URL);
  expect(satelliteTiles(" AAPK+1/2 ")).toBe(
    `${SATELLITE_KEY_TILES_URL}?token=AAPK%2B1%2F2`,
  );
  expect(withKinds(MAP_STYLE, "AAPK1").sources[SATELLITE].tiles).toEqual([
    `${SATELLITE_KEY_TILES_URL}?token=AAPK1`,
  ]);
});

test("the hills come from the open Terrain Tiles, no key, with their credit", () => {
  for (const id of [TERRAIN, HILLSHADE] as const) {
    expect(style.sources[id]).toMatchObject({
      type: "raster-dem",
      tiles: [TERRAIN_TILES_URL],
      encoding: "terrarium",
      attribution: TERRAIN_ATTRIBUTION,
    });
  }
  expect(layer(HILLSHADE)).toHaveProperty("source", HILLSHADE);
  expect(TERRAIN_SPEC.source).toBe(TERRAIN);
});

test("the standard map shows the dark style and nothing added", () => {
  expect(kindLayers(style).standard).toEqual(MAP_STYLE.layers.map((each) => each.id));
});

test("on the photos only the background under them and their names stay", () => {
  expect(kindLayers(style).satellite).toEqual([
    "background",
    SATELLITE,
    PLACE_ON_PHOTOS,
  ]);
});

test("the 3D map is the dark one with the hills' shading", () => {
  const shown = kindLayers(style);
  expect(shown["3d"]).toEqual([...shown.standard, HILLSHADE]);
});

test("every kind shows only layers the style has", () => {
  const shown = kindLayers(style);
  for (const kind of MAP_KINDS) {
    for (const id of shown[kind]) {
      expect(ids).toContain(id);
    }
  }
});

test("nothing added is the route's yellow", () => {
  const added = style.layers.filter(
    (each) => !MAP_STYLE.layers.some((base) => base.id === each.id),
  );
  expect(added).toHaveLength(3);
  expect(JSON.stringify(added)).not.toContain(color.accent);
});

/** How light a colour is, 0 to 255: enough to say which of two is darker. */
function lightness(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((at) => parseInt(hex.slice(at, at + 2), 16));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

test.each(["dark", "light"] as const)(
  "on the %s map the hills are shaded dark and lit light, never the other way",
  (shown: Tone) => {
    const palette = paletteOf({ ...DEFAULT_TONE, tone: shown });
    const paint = hillshadeOf(shown, palette);
    expect(lightness(paint["hillshade-shadow-color"])).toBeLessThan(
      lightness(paint["hillshade-highlight-color"]),
    );
  },
);

test("the style carries the shading of the tone the app is in", () => {
  expect(layer(HILLSHADE)).toHaveProperty("paint", hillshadeOf("dark"));
});
