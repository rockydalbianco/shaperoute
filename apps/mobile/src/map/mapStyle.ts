import { color } from "../theme/tokens";

/**
 * A dark MapLibre style for Sgrava, written here instead of fetched.
 *
 * `mapPage.ts` currently points at OpenFreeMap's "liberty" style, which is
 * light: a yellow route on it is close to invisible, and the app's own dark
 * chrome sits on a white map. Liberty is also somebody else's file, so its
 * colours can change under us.
 *
 * This style uses the same tiles — OpenFreeMap's OpenMapTiles vector source,
 * no key needed — and decides every colour from `theme/tokens`. The map and
 * the panel above it can no longer drift apart.
 *
 * Source schema: OpenMapTiles. The `source-layer` names below (water, park,
 * landcover, landuse, building, transportation, place) are that schema's, not
 * ours: renaming them breaks the map silently.
 */

/** TileJSON for OpenFreeMap's planet-wide vector tiles. */
export const TILE_SOURCE_URL = "https://tiles.openfreemap.org/planet";

/**
 * Glyphs for the labels. The font stack must be one OpenFreeMap actually
 * serves: a name it does not have means labels quietly do not draw, while the
 * rest of the map is fine. Check the labels on the phone, not in a test.
 */
export const GLYPHS_URL = "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf";
const LABEL_FONT = ["Noto Sans Regular"];

/** OpenStreetMap's licence requires this line to stay visible. */
export const ATTRIBUTION =
  '<a href="https://www.openstreetmap.org/copyright" target="_blank">&copy; OpenStreetMap</a>';

/** Roads grouped the way they should look, not the way OSM tags them. */
const FAINT_ROADS = ["path", "track", "service"];
const MINOR_ROADS = ["minor"];
const MEDIUM_ROADS = ["secondary", "tertiary"];
const MAJOR_ROADS = ["motorway", "trunk", "primary"];

function roadFilter(classes: readonly string[]) {
  return ["match", ["get", "class"], [...classes], true, false];
}

/** Line width by zoom: hairlines when far out, walkable streets when close. */
function roadWidth(far: number, mid: number, near: number) {
  return ["interpolate", ["linear"], ["zoom"], 10, far, 14, mid, 18, near];
}

export const sgravaDarkStyle = {
  version: 8,
  name: "Sgrava Dark",
  glyphs: GLYPHS_URL,
  sources: {
    openmaptiles: {
      type: "vector",
      url: TILE_SOURCE_URL,
      attribution: ATTRIBUTION,
    },
  },
  layers: [
    {
      id: "background",
      type: "background",
      paint: { "background-color": color.map.background },
    },
    {
      id: "landuse-built-up",
      type: "fill",
      source: "openmaptiles",
      "source-layer": "landuse",
      filter: [
        "match",
        ["get", "class"],
        ["residential", "suburb", "neighbourhood"],
        true,
        false,
      ],
      paint: { "fill-color": color.map.builtUp },
    },
    {
      id: "landcover-green",
      type: "fill",
      source: "openmaptiles",
      "source-layer": "landcover",
      filter: ["match", ["get", "class"], ["wood", "grass", "farmland"], true, false],
      paint: { "fill-color": color.map.green },
    },
    {
      id: "park",
      type: "fill",
      source: "openmaptiles",
      "source-layer": "park",
      paint: { "fill-color": color.map.green },
    },
    {
      id: "water",
      type: "fill",
      source: "openmaptiles",
      "source-layer": "water",
      paint: { "fill-color": color.map.water },
    },
    {
      id: "waterway",
      type: "line",
      source: "openmaptiles",
      "source-layer": "waterway",
      minzoom: 9,
      paint: {
        "line-color": color.map.waterLine,
        "line-width": roadWidth(0.4, 1, 2.5),
      },
    },
    {
      id: "building",
      type: "fill",
      source: "openmaptiles",
      "source-layer": "building",
      minzoom: 13,
      paint: { "fill-color": color.map.building, "fill-opacity": 0.85 },
    },
    // Roads, faintest first: the later a layer is listed, the higher it draws.
    {
      id: "road-faint",
      type: "line",
      source: "openmaptiles",
      "source-layer": "transportation",
      minzoom: 13,
      filter: roadFilter(FAINT_ROADS),
      layout: { "line-join": "round", "line-cap": "round" },
      paint: {
        "line-color": color.map.roadFaint,
        "line-width": roadWidth(0.3, 0.8, 3),
      },
    },
    {
      id: "road-minor",
      type: "line",
      source: "openmaptiles",
      "source-layer": "transportation",
      minzoom: 11,
      filter: roadFilter(MINOR_ROADS),
      layout: { "line-join": "round", "line-cap": "round" },
      paint: {
        "line-color": color.map.roadMinor,
        "line-width": roadWidth(0.4, 1.2, 5),
      },
    },
    {
      id: "road-medium",
      type: "line",
      source: "openmaptiles",
      "source-layer": "transportation",
      filter: roadFilter(MEDIUM_ROADS),
      layout: { "line-join": "round", "line-cap": "round" },
      paint: {
        "line-color": color.map.roadMedium,
        "line-width": roadWidth(0.7, 2, 7),
      },
    },
    {
      id: "road-major",
      type: "line",
      source: "openmaptiles",
      "source-layer": "transportation",
      filter: roadFilter(MAJOR_ROADS),
      layout: { "line-join": "round", "line-cap": "round" },
      paint: {
        "line-color": color.map.roadMajor,
        "line-width": roadWidth(1, 3, 10),
      },
    },
    {
      id: "place-label",
      type: "symbol",
      source: "openmaptiles",
      "source-layer": "place",
      filter: ["match", ["get", "class"], ["city", "town", "village"], true, false],
      layout: {
        "text-field": ["coalesce", ["get", "name:it"], ["get", "name"]],
        "text-font": LABEL_FONT,
        "text-size": ["interpolate", ["linear"], ["zoom"], 8, 11, 14, 15],
        "text-letter-spacing": 0.08,
        "text-max-width": 8,
      },
      paint: {
        "text-color": color.map.label,
        "text-halo-color": color.map.labelHalo,
        "text-halo-width": 1.2,
      },
    },
  ],
} as const;
