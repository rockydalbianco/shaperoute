import type { Tone } from "../theme/tone";
import { color, type Palette, tone } from "../theme/tokens";
import type { MapKind } from "./mapKind";

/**
 * The map's three kinds in one style (TASK-264, ADR-0232): the app's dark
 * style with, hidden, the aerial photos and their names, and the hills'
 * shading. A kind shows some layers and hides the others (`kindLayers`),
 * and the page turns the terrain on for 3D: the style is not loaded again,
 * so the route, its marks and the camera stay as they are.
 *
 * A hidden layer costs nothing: MapLibre asks no tile of a source none of
 * whose layers is shown.
 *
 * The 3D map is the hills, as in Strava and komoot, not the buildings: on
 * the terrain the route is laid on the ground, and buildings standing up
 * hid it street after street (tried in the browser, 2026-10-08).
 */

/**
 * Esri's World Imagery (the user's choice, 2026-10-08): photos down to
 * about a metre in Italy. With a key of a free ArcGIS Location Platform
 * account, in `EXPO_PUBLIC_ARCGIS_API_KEY` of `apps/mobile/.env`, the tiles
 * come from the address the key is for; without, from the public one.
 */
export const SATELLITE_TILES_URL =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
export const SATELLITE_KEY_TILES_URL =
  "https://ibasemaps-api.arcgis.com/arcgis/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";

/** The credit Esri asks for, with the sources of the photos as its service names them. */
export const SATELLITE_ATTRIBUTION =
  '<a href="https://www.esri.com" target="_blank">Powered by Esri</a> ' +
  "Source: Esri, Vantor, Earthstar Geographics, and the GIS User Community";

/** Beyond this zoom the photos are the last ones, enlarged. */
export const SATELLITE_MAX_ZOOM = 19;

/**
 * Heights for the hills of the 3D map: the Terrain Tiles of the AWS open
 * data registry (Mapzen's, "terrarium" encoding), free and with no key.
 */
export const TERRAIN_TILES_URL =
  "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png";
export const TERRAIN_ATTRIBUTION =
  '<a href="https://github.com/tilezen/joerd/blob/master/docs/attribution.md" target="_blank">Terrain Tiles</a>';
export const TERRAIN_MAX_ZOOM = 15;

/** The hills a little higher than they are, so they read on a phone. */
export const TERRAIN_EXAGGERATION = 1.3;

/**
 * How far the 3D map leans: the hills stand up, the route stays readable.
 * Leaning, a route framed as if flat takes less of the screen, never more
 * (measured in the browser): the framing needs no change.
 */
export const PITCH_3D = 55;

/** The ids of what this file adds to the style. */
export const SATELLITE = "satellite";
export const TERRAIN = "terrain";
export const HILLSHADE = "hillshade";
/** Added to the id of a layer of names: the same names, readable on the photos. */
export const ON_PHOTOS = "-on-photos";

/** What the page hands to `map.setTerrain` for the 3D map. */
export const TERRAIN_SPEC = { source: TERRAIN, exaggeration: TERRAIN_EXAGGERATION };

/** A layer as this file reads it: the rest of it is the base style's business. */
type Layer = {
  readonly id: string;
  readonly type: string;
  readonly layout?: object;
  readonly paint?: object;
};
type Style = {
  readonly sources: Readonly<Record<string, unknown>>;
  readonly layers: readonly Layer[];
};

/** The tile address of the photos, with the key when there is one. */
export function satelliteTiles(
  key: string | undefined = process.env.EXPO_PUBLIC_ARCGIS_API_KEY,
): string {
  const token = key?.trim();
  return token
    ? `${SATELLITE_KEY_TILES_URL}?token=${encodeURIComponent(token)}`
    : SATELLITE_TILES_URL;
}

/**
 * The hills' shading in a tone (TASK-263): the shadow is the darker of
 * the tone's ends and the light the lighter, so the hills are not lit from
 * below on the light map.
 */
export function hillshadeOf(shown: Tone, palette: Palette = color) {
  const light = shown === "light";
  return {
    "hillshade-shadow-color": light ? palette.borderStrong : palette.background,
    "hillshade-highlight-color": light ? palette.background : palette.borderStrong,
    "hillshade-accent-color": palette.map.background,
    "hillshade-exaggeration": 0.7,
  };
}

function hidden<T extends Layer>(layer: T): T {
  return { ...layer, layout: { ...layer.layout, visibility: "none" } };
}

/** The names of a layer in the text's colour on a dark halo: grey on the photos does not read. */
function onPhotos(layer: Layer): Layer {
  return hidden({
    ...layer,
    id: `${layer.id}${ON_PHOTOS}`,
    paint: {
      ...layer.paint,
      "text-color": color.text,
      "text-halo-color": color.background,
      "text-halo-width": 1.5,
    },
  });
}

/**
 * `style` with the photos, their names and the hills' shading in it,
 * hidden: it shows as the standard map until the page is told another kind.
 */
export function withKinds<S extends Style>(
  style: S,
  key: string | undefined = process.env.EXPO_PUBLIC_ARCGIS_API_KEY,
) {
  const layers: Layer[] = style.layers.flatMap((layer) =>
    layer.type === "symbol" ? [layer, onPhotos(layer)] : [layer],
  );
  // The photos over the background, under everything else.
  const backgrounds = layers.filter((layer) => layer.type === "background").length;
  layers.splice(
    backgrounds,
    0,
    hidden({ id: SATELLITE, type: "raster", source: SATELLITE }),
  );
  // The hills' shading over the land, under the roads and the names.
  const lastFill = layers.map((layer) => layer.type).lastIndexOf("fill");
  layers.splice(
    lastFill + 1,
    0,
    hidden({
      id: HILLSHADE,
      type: "hillshade",
      source: HILLSHADE,
      paint: hillshadeOf(tone.tone),
    }),
  );
  // Two sources of the same heights: MapLibre draws the shading poorly from
  // the one the terrain uses, and says so.
  const heights = {
    type: "raster-dem",
    tiles: [TERRAIN_TILES_URL],
    encoding: "terrarium",
    tileSize: 256,
    maxzoom: TERRAIN_MAX_ZOOM,
    attribution: TERRAIN_ATTRIBUTION,
  };
  return {
    ...style,
    sources: {
      ...style.sources,
      [SATELLITE]: {
        type: "raster",
        tiles: [satelliteTiles(key)],
        tileSize: 256,
        maxzoom: SATELLITE_MAX_ZOOM,
        attribution: SATELLITE_ATTRIBUTION,
      },
      [TERRAIN]: heights,
      [HILLSHADE]: heights,
    },
    layers,
  };
}

/**
 * The ids of the layers each kind shows; every other layer of `style` (as
 * `withKinds` gives it) is hidden. The layers the page adds itself, the
 * route and its marks, are not in the style and always show.
 */
export function kindLayers(style: Style): Record<MapKind, string[]> {
  const added = (id: string) =>
    id === SATELLITE || id === HILLSHADE || id.endsWith(ON_PHOTOS);
  const base = style.layers.filter((layer) => !added(layer.id));
  return {
    standard: base.map((layer) => layer.id),
    // The background under the photos, the names over them.
    satellite: [
      ...base.filter((layer) => layer.type === "background").map((layer) => layer.id),
      SATELLITE,
      ...style.layers
        .filter((layer) => layer.id.endsWith(ON_PHOTOS))
        .map((layer) => layer.id),
    ],
    "3d": [...base.map((layer) => layer.id), HILLSHADE],
  };
}
