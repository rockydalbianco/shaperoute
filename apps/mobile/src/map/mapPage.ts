import type { LatLon } from "@shaperoute/shared-types";

import { tLater } from "../i18n";
import { appLanguage } from "../i18n/language";
import type { Language } from "../i18n/languages";
import { translate } from "../i18n/translate";
import {
  color,
  type Palette,
  onFoot,
  otherRoute,
  route,
  routeAhead,
  routeCasing,
  shapeGhost,
  stop,
  track,
  walk,
} from "../theme/tokens";
import { BEND_SHARE, CORNER_SHARE } from "../mapdraw/tools";
import { MIN_TURN_DEG } from "../mapdraw/turn";
import { toLngLat } from "./coordinates";
import { kindLayers, PITCH_3D, TERRAIN_SPEC, withKinds } from "./mapKindStyle";
import { darkMapStyle, LABEL_FONT } from "./mapStyle";

/**
 * The map page shown in the WebView (ADR-0029): MapLibre GL JS from a CDN,
 * pinned with SRI hashes, and the app's own dark style over OpenFreeMap's
 * tiles (ADR-0046). No key is needed.
 *
 * 5.x is the last release shipped as a single script; 6.x is ES modules only,
 * with a separate worker file.
 */
export const MAPLIBRE_VERSION = "5.24.0";
export const MAPLIBRE_JS_URL = `https://unpkg.com/maplibre-gl@${MAPLIBRE_VERSION}/dist/maplibre-gl.js`;
export const MAPLIBRE_JS_SRI =
  "sha384-5+cfbwT0iiub6VsQAdn6yz16nr6sDiQoHx6tm4O8OVYXHYOxcffFmCJBL0dgdvGp";
export const MAPLIBRE_CSS_URL = `https://unpkg.com/maplibre-gl@${MAPLIBRE_VERSION}/dist/maplibre-gl.css`;
export const MAPLIBRE_CSS_SRI =
  "sha384-uTttxo/aOKbdE5RlD/SPzSDoDmNvGlUYPjONi2MN/b7c9HPSvW07OIuyP7uL6jxK";

/**
 * The style, written into the page: nothing to fetch, colours from the
 * tokens, the places named in the app's language (TASK-210 F).
 */
export function mapStyle(language: Language) {
  return darkMapStyle(language);
}

/**
 * The style in the app's language when the app opened. The Feed's maps
 * (`feed/feedMapPage.ts`) take `mapStyle(language)` instead, and follow a
 * new language (TASK-210, part H).
 */
export const MAP_STYLE = mapStyle(appLanguage());

/** What the map shows before a start is known: the whole of Italy. */
export const ITALY_BOUNDS: [southWest: LatLon, northEast: LatLon] = [
  [35.5, 6.6],
  [47.1, 18.6],
];

/** Zoom used to show a start: a few streets around it. */
export const START_ZOOM = 15;
/** A place of a themed route, tapped under the map (TASK-329): as close as
 * the street it is on, never farther than the map already was. */
export const PLACE_ZOOM = 16;

/** Zoom while navigating: the next junction and the streets around it. */
export const FOLLOW_ZOOM = 17;

/** The route line: the brand yellow, the one thing on the map that has it. */
export const ROUTE_COLOR = route.color;
export const ROUTE_WIDTH = route.width;
export const ROUTE_OPACITY = route.opacity;

/**
 * The route's dark edge, on the light map only (TASK-263, ADR-0231): a
 * wider dark line under the route and under the part left, since the
 * yellow alone does not show on light streets. None on the dark map.
 */
export const ROUTE_CASING = routeCasing;

/**
 * While running the route, the part left (TASK-224): dashed, under the part
 * run, blinking in steps. A beat changes the line's feature state, not the
 * style: a style change starts 300 ms of transitions on every property of
 * the layer, and the map was drawn 29 times a second instead of 1.4
 * (measured in the page, ADR-0186).
 */
export const AHEAD_COLOR = routeAhead.color;
export const AHEAD_WIDTH = routeAhead.width;
export const AHEAD_OPACITY = routeAhead.opacity;
export const AHEAD_DIM_OPACITY = routeAhead.dimOpacity;
export const AHEAD_DASH = routeAhead.dash;
export const AHEAD_BEAT_MS = routeAhead.beatMs;

/** The other routes to choose from, under the route (TASK-093). */
export const OTHER_ROUTE_COLOR = otherRoute.color;
export const OTHER_ROUTE_WIDTH = otherRoute.width;
export const OTHER_ROUTE_OPACITY = otherRoute.opacity;

/** The shape asked for as the search placed it, dotted under the route and
 * the other routes (TASK-442). */
export const GHOST_COLOR = shapeGhost.color;
export const GHOST_WIDTH = shapeGhost.width;
export const GHOST_OPACITY = shapeGhost.opacity;
export const GHOST_DASH = shapeGhost.dash;

/** The walks of a word with the pen up, dashed under the route (TASK-198). */
export const WALK_COLOR = walk.color;
export const WALK_WIDTH = walk.width;
export const WALK_OPACITY = walk.opacity;
export const WALK_DASH = walk.dash;

/** The stretches of a bike route with the bike on foot, dashed over the
 * route, which stays whole (TASK-206). */
export const ON_FOOT_COLOR = onFoot.color;
export const ON_FOOT_WIDTH = onFoot.width;
export const ON_FOOT_OPACITY = onFoot.opacity;
export const ON_FOOT_DASH = onFoot.dash;

/** Off the route (TASK-303): dots from the runner to where the route goes
 * on, over the route, in the colour of text: apart from the yellow route,
 * the dashes of its part left and the grey walks between letters. */
export const REJOIN_COLOR = color.text;
export const REJOIN_WIDTH = 4;
export const REJOIN_OPACITY = 0.9;
/** A dot and a gap, in line widths: the round caps make the dots. */
export const REJOIN_DASH = [0, 2];

/**
 * A double tap, as the page tells it to the app (TASK-119): two taps of one
 * finger, each shorter than `TAP_MS`, within `DOUBLE_TAP_MS` and
 * `DOUBLE_TAP_PX` of each other.
 */
export const TAP_MS = 300;
export const DOUBLE_TAP_MS = 350;
export const DOUBLE_TAP_PX = 40;

/**
 * Moving the shape of a route on the water (TASK-238): a finger that
 * travels less than this many pixels has not moved it, and the app is told
 * nothing.
 */
export const MOVE_MIN_PX = 8;

/**
 * «Draw on the map» (TASK-281): the zoom of a town around the start, where
 * a figure of a few km shows whole; a finger's step that adds a point to
 * the line drawn; how far around the figure a finger takes it; and the
 * room left around the figure when the map is framed on it.
 */
export const CANVAS_ZOOM = 13;
export const INK_STEP_PX = 3;
export const GRAB_PX = 24;
export const FIGURE_PADDING_PX = 60;

/**
 * The tools of TASK-331 part B: how far around a finger the eraser rubs a
 * line out, how near a finger takes a point or a line (closing a straight
 * line, holding a line to bend it), and how long it is held still before a
 * drag bends the line instead of moving the figure. The eraser's band on
 * the map, and the dots of a straight line being tapped.
 */
export const ERASER_PX = 14;
export const REACH_PX = 24;
export const HOLD_MS = 450;
export const ERASER_COLOR = color.text;
export const ERASER_OPACITY = 0.35;
export const MARK_RADIUS = 6;
export const FIRST_MARK_RADIUS = 9;

/** The pieces of TASK-402 part B: the lines of the pieces not chosen, this
 * faint; and the box round the piece chosen, a thin line. */
export const FAINT_OPACITY = 0.35;
export const BOX_WIDTH = 1.5;

/** Where the route of the figure starts (TASK-426, ADR-0354): a dot in the
 * colour of a start, which a finger drags with «Move». */
export const START_DOT_RADIUS = 9;
export const START_DOT_COLOR = color.startHere;

/** The run over its route (TASK-113). */
export const TRACK_COLOR = track.color;
export const TRACK_WIDTH = track.width;
export const TRACK_OPACITY = track.opacity;
/** The lifts of a day of skiing (TASK-375 part C2): the track's line,
 * dashed as the stretches with the bike on foot. */
export const LIFT_DASH = onFoot.dash;
/** A day of skiing in the ski mode (TASK-429 part B, ADR-0357): the
 * descents and the lifts in their colours, and the numbers on them, dark
 * in a dot of the line's colour. */
export const SKI_DESCENT_COLOR = color.ski.descent;
export const SKI_LIFT_COLOR = color.ski.lift;
export const SKI_LABEL_COLOR = color.ski.onLine;
export const SKI_LABEL_RADIUS = 10;

/**
 * The start asked for. MapLibre's default marker is a light blue that reads
 * as the cyan of "Start here" next to it, so it takes the text colour instead.
 */
export const POSITION_COLOR = color.text;

/**
 * The runner while running (TASK-164; drawn anew by TASK-431, ADR-0359,
 * the user's variant «B»): a large arrow in the marker's colour, turned
 * where the runner is heading, in a blue ring (`you`); the dark edge keeps
 * it readable over the yellow of the route. On «Compass» a blue cone,
 * fading outwards, opens ahead of it: where the phone points. The box is
 * the cone's, the arrow at its centre; it lets the fingers through.
 */
export const HEADING_ARROW_SIZE = 160;
/** The class of the cone in the arrow, shown on «Compass» only. */
export const FACING_CONE_CLASS = "facing-cone";
export const HEADING_ARROW_SVG =
  `<svg xmlns="http://www.w3.org/2000/svg" width="${HEADING_ARROW_SIZE}" height="${HEADING_ARROW_SIZE}" viewBox="0 0 160 160">` +
  `<defs><radialGradient id="facing-fade" cx="80" cy="80" r="78" gradientUnits="userSpaceOnUse">` +
  `<stop offset="0.25" stop-color="${color.you}" stop-opacity="0.6"/>` +
  `<stop offset="1" stop-color="${color.you}" stop-opacity="0"/>` +
  `</radialGradient></defs>` +
  `<path class="${FACING_CONE_CLASS}" display="none" d="M80 80 L52 8 A77 77 0 0 1 108 8 Z" fill="url(#facing-fade)"/>` +
  `<circle cx="80" cy="80" r="27" fill="${color.you}" fill-opacity="0.22" stroke="${color.you}" stroke-width="2.5"/>` +
  `<path d="M80 56 L96 98 L80 89 L64 98 Z" fill="${POSITION_COLOR}" stroke="${color.map.background}" stroke-width="2" stroke-linejoin="round"/>` +
  `</svg>`;

/**
 * Where a moved route begins (ADR-0040): a cyan marker and its label,
 * written in the page's language: «Hier starten» (TASK-210 F), the words
 * the moved-start warning sends the runner to (`route/warnings.ts`).
 */
export const START_HERE_COLOR = color.startHere;
export const START_HERE_LABEL = tLater("Start here");

/**
 * The mark of «Start here» (TASK-443): a flag in a disc, centred on the
 * point, so it is told from the pin of the start asked for by its shape and
 * not by its colour alone. The flag is in the map's own colour, which
 * reads on the cyan in every tone.
 */
export const START_PIN_SIZE = 32;
export const START_PIN_CLASS = "start-here";
export const START_PIN_SVG =
  `<svg xmlns="http://www.w3.org/2000/svg" width="${START_PIN_SIZE}" height="${START_PIN_SIZE}" viewBox="0 0 32 32">` +
  `<circle cx="16" cy="16" r="14" fill="${START_HERE_COLOR}" stroke="${color.map.background}" stroke-width="2"/>` +
  `<path d="M12.5 9 V23.5" fill="none" stroke="${color.map.background}" stroke-width="2.5" stroke-linecap="round"/>` +
  `<path d="M12.5 9.5 L23 13.5 L12.5 17.5 Z" fill="${color.map.background}" stroke="${color.map.background}" stroke-width="1.5" stroke-linejoin="round"/>` +
  `</svg>`;
/**
 * Its words, in the colours of a control of the app and no longer the
 * white of MapLibre's popup: over the mark, or under it where over it they
 * would be in the status bar or under a button; `START_LABEL_GAP_PX` from
 * the mark, never closer than `START_LABEL_EDGE_PX` to the sides.
 */
export const START_LABEL_CLASS = "start-here-label";
export const START_LABEL_BELOW_CLASS = "below";
export const START_LABEL_COLORS = {
  background: color.surfaceRaised,
  border: color.borderStrong,
  text: color.text,
};
export const START_LABEL_GAP_PX = 6;
export const START_LABEL_EDGE_PX = 8;

/**
 * Framing a route (TASK-443). A page told nothing of what lies over it
 * leaves `FRAME_PADDING_PX` on every side, as it always did. One told
 * (`setCover`) keeps the route under the status bar and over the
 * attribution with `FRAME_GAP_PX` to spare, as large as it gets with no
 * point of it within `BUTTON_GAP_PX` of a button: under the status bar if
 * that is so, or else under the first row of buttons, and so on down.
 * `ATTRIBUTION_PX` is the height of the attribution when the page cannot
 * measure it.
 */
export const FRAME_PADDING_PX = 40;
export const FRAME_GAP_PX = 16;
export const BUTTON_GAP_PX = 8;
export const ATTRIBUTION_PX = 20;

/**
 * The attribution in the colours of the app (TASK-443), in place of
 * MapLibre's light grey band: its words and its links stay as the style
 * gives them, always open, and readable in every tone (the licences of
 * OpenStreetMap and OpenFreeMap ask for it; `mapPageAttribution.test.ts`).
 */
export function attributionColors(of: Pick<Palette, "surface" | "textMuted" | "text">) {
  return { background: of.surface, text: of.textMuted, link: of.text };
}
export const ATTRIBUTION_COLORS = attributionColors(color);

/** Behind the map while it loads, so the page never flashes white. */
export const MAP_BACKGROUND = color.map.background;

/**
 * A value as a JavaScript literal inside the page's `<script>`. `<` is escaped
 * so that no string in it (the attribution has links) can close the script.
 */
/** The script that draws the route's edge under `source`'s line; none on the dark map. */
function casingScript(source: string): string {
  if (ROUTE_CASING === null) {
    return "";
  }
  return `map.addLayer({
        id: ${toScript(`${source}-casing`)},
        type: "line",
        source: ${toScript(source)},
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": ${toScript(ROUTE_CASING.color)},
          "line-width": ${ROUTE_CASING.width},
          "line-opacity": ${ROUTE_CASING.opacity},
        },
      });`;
}

function toScript(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

/**
 * Links the page tries to open (the attribution) go to the phone's browser:
 * the WebView only ever shows the map page.
 */
export function isExternalUrl(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

/** The page, with the map's names and «Start here» in `language`. */
export function buildMapPage(language: Language = appLanguage()): string {
  const bounds = JSON.stringify(ITALY_BOUNDS.map(toLngLat));
  // With the photos and the hills in it, hidden (TASK-264).
  const style = withKinds(mapStyle(language));
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<link rel="stylesheet" href="${MAPLIBRE_CSS_URL}" integrity="${MAPLIBRE_CSS_SRI}" crossorigin="anonymous">
<style>
  html, body, #map { margin: 0; width: 100%; height: 100%; background: ${MAP_BACKGROUND}; }
  .maplibregl-ctrl.maplibregl-ctrl-attrib {
    background-color: ${ATTRIBUTION_COLORS.background};
    color: ${ATTRIBUTION_COLORS.text};
    border-top-left-radius: 6px;
  }
  .maplibregl-ctrl.maplibregl-ctrl-attrib a { color: ${ATTRIBUTION_COLORS.link}; }
  .${START_PIN_CLASS} {
    width: ${START_PIN_SIZE}px;
    height: ${START_PIN_SIZE}px;
    line-height: 0;
    pointer-events: none;
  }
  .${START_LABEL_CLASS} {
    position: absolute;
    left: 50%;
    bottom: 100%;
    margin-bottom: ${START_LABEL_GAP_PX}px;
    transform: translateX(-50%);
    padding: 6px 10px;
    border: 1px solid ${START_LABEL_COLORS.border};
    border-radius: 8px;
    background: ${START_LABEL_COLORS.background};
    color: ${START_LABEL_COLORS.text};
    font: 600 14px/18px -apple-system, system-ui, sans-serif;
    white-space: nowrap;
  }
  .${START_LABEL_CLASS}.${START_LABEL_BELOW_CLASS} {
    bottom: auto;
    top: 100%;
    margin: ${START_LABEL_GAP_PX}px 0 0;
  }
</style>
</head>
<body>
<div id="map"></div>
<script>
  function post(message) {
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify(message));
    }
  }
  function fail(text) {
    post({ type: "error", message: text });
  }
</script>
<script src="${MAPLIBRE_JS_URL}" integrity="${MAPLIBRE_JS_SRI}" crossorigin="anonymous"
  onerror="fail('MapLibre GL JS did not load')"></script>
<script>
  (function () {
    if (!window.maplibregl) {
      return;
    }
    var styleLoaded = false;
    var marker = null;
    var arrow = null;
    var arrowElement = null;
    // Where the phone points, on «Compass» (TASK-431): the arrow turns there
    // and opens its cone. Null off that page.
    var facing = null;
    var startHere = null;
    // The words of «Start here», placed anew as the map moves (TASK-443).
    var startLabel = null;
    // What lies over the top of the map, when the app has told (TASK-443).
    var cover = null;
    // The points the map is framed on: none of them under a button.
    var framedPoints = [];
    var noRoute = { type: "FeatureCollection", features: [] };
    var route = noRoute;
    // The route as showRoute sent it: drawn whole when no run is on it.
    var fullRoute = noRoute;
    // While running it (TASK-224): the part left, and whether it blinks.
    var ahead = noRoute;
    var progressing = false;
    var blinking = null;
    var dim = false;
    var walks = noRoute;
    var onFoot = noRoute;
    // Off the route (TASK-303): the dotted line back to it.
    var rejoin = noRoute;
    var track = noRoute;
    // A day of skiing (TASK-375 part C2): its lifts, dashed.
    var lifts = noRoute;
    // A day of skiing shown (TASK-429 part B): its lines in the ski mode's
    // colours, and the numbers of its descents and lifts.
    var skiDay = false;
    var skiLabels = noRoute;
    var stops = noRoute;
    var others = noRoute;
    // The shape asked for, where the search placed it (TASK-442).
    var ghost = noRoute;
    // «Draw on the map» (TASK-281): the figure as drawn, its links dashed
    // and the dots of a straight line being tapped (TASK-331 part B), and
    // the line a finger is drawing.
    var figure = noRoute;
    var faint = noRoute;
    var chosenBox = noRoute;
    var links = noRoute;
    var marks = noRoute;
    var startDot = noRoute;
    var ink = [];
    // The bearing the map keeps (TASK-232): the one of the route shown, so
    // its drawing is upright, until the app or two fingers turn the map.
    var wanted = 0;
    // The bearing of the route shown, the route as framed, and whether the
    // map is still as framed: the user has not moved it since.
    var drawn = 0;
    var framed = null;
    var inFrame = false;
    var following = false;
    var toldBearing = 0;
    // The map's kind (TASK-264): standard until the app says another, and
    // the layers of the style each kind shows.
    var kind = "standard";
    var KIND_LAYERS = ${toScript(kindLayers(style))};
    var STYLE_LAYERS = ${toScript(style.layers.map((layer) => layer.id))};
    var map = new maplibregl.Map({
      container: "map",
      style: ${toScript(style)},
      bounds: ${bounds},
      fitBoundsOptions: { padding: 16 },
      attributionControl: false,
    });
    // No zoom buttons: the map zooms with two fingers only.
    map.addControl(new maplibregl.AttributionControl({ compact: false }));
    map.once("style.load", function () {
      styleLoaded = true;
      // The shape asked for as the search placed it, under everything
      // drawn: the route is compared with it (TASK-442).
      map.addSource("ghost", { type: "geojson", data: ghost });
      map.addLayer({
        id: "ghost",
        type: "line",
        source: "ghost",
        layout: { "line-join": "round", "line-cap": "butt" },
        paint: {
          "line-color": ${toScript(GHOST_COLOR)},
          "line-width": ${GHOST_WIDTH},
          "line-opacity": ${GHOST_OPACITY},
          "line-dasharray": ${toScript(GHOST_DASH)},
        },
      });
      // The other routes to choose from, under the route.
      map.addSource("others", { type: "geojson", data: others });
      map.addLayer({
        id: "others",
        type: "line",
        source: "others",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": ${toScript(OTHER_ROUTE_COLOR)},
          "line-width": ${OTHER_ROUTE_WIDTH},
          "line-opacity": ${OTHER_ROUTE_OPACITY},
        },
      });
      // The walks between the letters of a word with the pen up, dashed,
      // under its letters (TASK-198).
      map.addSource("walks", { type: "geojson", data: walks });
      map.addLayer({
        id: "walks",
        type: "line",
        source: "walks",
        layout: { "line-join": "round", "line-cap": "butt" },
        paint: {
          "line-color": ${toScript(WALK_COLOR)},
          "line-width": ${WALK_WIDTH},
          "line-opacity": ${WALK_OPACITY},
          "line-dasharray": ${toScript(WALK_DASH)},
        },
      });
      // While running the route, the part left: dashed, under the part run
      // (TASK-224). Its one line has id 0, and its beat is its "dim" state.
      map.addSource("route-ahead", { type: "geojson", data: ahead, generateId: true });
      ${casingScript("route-ahead")}
      map.addLayer({
        id: "route-ahead",
        type: "line",
        source: "route-ahead",
        layout: { "line-join": "round", "line-cap": "butt" },
        paint: {
          "line-color": ${toScript(AHEAD_COLOR)},
          "line-width": ${AHEAD_WIDTH},
          "line-opacity": [
            "case",
            ["boolean", ["feature-state", "dim"], false],
            ${AHEAD_DIM_OPACITY},
            ${AHEAD_OPACITY},
          ],
          "line-dasharray": ${toScript(AHEAD_DASH)},
        },
      });
      setAheadOpacity();
      // A route that arrived before the style is drawn now.
      map.addSource("route", { type: "geojson", data: route });
      ${casingScript("route")}
      map.addLayer({
        id: "route",
        type: "line",
        source: "route",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": ${toScript(ROUTE_COLOR)},
          "line-width": ${ROUTE_WIDTH},
          "line-opacity": ${ROUTE_OPACITY},
        },
      });
      // The stretches of a bike route with the bike on foot, dashed over
      // the route (TASK-206).
      map.addSource("on-foot", { type: "geojson", data: onFoot });
      map.addLayer({
        id: "on-foot",
        type: "line",
        source: "on-foot",
        layout: { "line-join": "round", "line-cap": "butt" },
        paint: {
          "line-color": ${toScript(ON_FOOT_COLOR)},
          "line-width": ${ON_FOOT_WIDTH},
          "line-opacity": ${ON_FOOT_OPACITY},
          "line-dasharray": ${toScript(ON_FOOT_DASH)},
        },
      });
      // Off the route, the dots from the runner back to it, over the route
      // (TASK-303).
      map.addSource("rejoin", { type: "geojson", data: rejoin });
      map.addLayer({
        id: "rejoin",
        type: "line",
        source: "rejoin",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": ${toScript(REJOIN_COLOR)},
          "line-width": ${REJOIN_WIDTH},
          "line-opacity": ${REJOIN_OPACITY},
          "line-dasharray": ${toScript(REJOIN_DASH)},
        },
      });
      // The places of a themed route, over the route (TASK-129).
      map.addSource("stops", { type: "geojson", data: stops });
      map.addLayer({
        id: "stops",
        type: "circle",
        source: "stops",
        paint: {
          "circle-radius": ${stop.radius},
          "circle-color": [
            "case",
            ["get", "passed"],
            ${toScript(stop.passed)},
            ${toScript(stop.missed)},
          ],
          "circle-stroke-color": ${toScript(stop.outline)},
          "circle-stroke-width": 2,
        },
      });
      map.addLayer({
        id: "stop-names",
        type: "symbol",
        source: "stops",
        filter: ["get", "passed"],
        layout: {
          "text-field": ["get", "name"],
          "text-font": ${toScript(LABEL_FONT)},
          "text-size": 12,
          "text-offset": [0, 1.1],
          "text-anchor": "top",
          "text-optional": true,
        },
        paint: {
          "text-color": ${toScript(stop.label)},
          "text-halo-color": ${toScript(stop.halo)},
          "text-halo-width": 1.5,
        },
      });
      // The run, over the route it followed.
      map.addSource("track", { type: "geojson", data: track });
      map.addLayer({
        id: "track",
        type: "line",
        source: "track",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": skiDay ? ${toScript(SKI_DESCENT_COLOR)} : ${toScript(TRACK_COLOR)},
          "line-width": ${TRACK_WIDTH},
          "line-opacity": ${TRACK_OPACITY},
        },
      });
      // The lifts of a day of skiing, beside its descents: the same line,
      // dashed.
      map.addSource("lifts", { type: "geojson", data: lifts });
      map.addLayer({
        id: "lifts",
        type: "line",
        source: "lifts",
        layout: { "line-join": "round" },
        paint: {
          "line-color": skiDay ? ${toScript(SKI_LIFT_COLOR)} : ${toScript(TRACK_COLOR)},
          "line-width": ${TRACK_WIDTH},
          "line-opacity": ${TRACK_OPACITY},
          "line-dasharray": ${toScript(LIFT_DASH)},
        },
      });
      // Their numbers (TASK-429 part B): a dot of the line's colour, the
      // number dark on it.
      map.addSource("ski-labels", { type: "geojson", data: skiLabels });
      map.addLayer({
        id: "ski-label-dots",
        type: "circle",
        source: "ski-labels",
        paint: {
          "circle-radius": ${SKI_LABEL_RADIUS},
          "circle-color": [
            "match",
            ["get", "kind"],
            "lift",
            ${toScript(SKI_LIFT_COLOR)},
            ${toScript(SKI_DESCENT_COLOR)},
          ],
        },
      });
      map.addLayer({
        id: "ski-label-text",
        type: "symbol",
        source: "ski-labels",
        layout: {
          "text-field": ["get", "text"],
          "text-font": ${toScript(LABEL_FONT)},
          "text-size": 11,
          "text-allow-overlap": true,
          "text-ignore-placement": true,
        },
        paint: { "text-color": ${toScript(SKI_LABEL_COLOR)} },
      });
      // «Draw on the map» (TASK-281): the figure in the route's yellow, as
      // the route will draw it, and the line a finger is drawing, over all.
      map.addSource("canvas", { type: "geojson", data: figure });
      map.addLayer({
        id: "canvas",
        type: "line",
        source: "canvas",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": ${toScript(ROUTE_COLOR)},
          "line-width": ${ROUTE_WIDTH},
          "line-opacity": ${ROUTE_OPACITY},
        },
      });
      // The pieces not chosen, faint, and the box round the one chosen
      // (TASK-402 part B).
      map.addSource("canvas-faint", { type: "geojson", data: faint });
      map.addLayer({
        id: "canvas-faint",
        type: "line",
        source: "canvas-faint",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": ${toScript(ROUTE_COLOR)},
          "line-width": ${ROUTE_WIDTH},
          "line-opacity": ${FAINT_OPACITY},
        },
      });
      map.addSource("canvas-box", { type: "geojson", data: chosenBox });
      map.addLayer({
        id: "canvas-box",
        type: "line",
        source: "canvas-box",
        paint: {
          "line-color": ${toScript(ROUTE_COLOR)},
          "line-width": ${BOX_WIDTH},
          "line-opacity": ${ROUTE_OPACITY},
        },
      });
      map.addSource("canvas-links", { type: "geojson", data: links });
      map.addLayer({
        id: "canvas-links",
        type: "line",
        source: "canvas-links",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": ${toScript(ROUTE_COLOR)},
          "line-width": ${ROUTE_WIDTH},
          "line-opacity": ${ROUTE_OPACITY},
          "line-dasharray": ${toScript(WALK_DASH)},
        },
      });
      map.addSource("ink", { type: "geojson", data: inkData() });
      map.addLayer({
        id: "ink",
        type: "line",
        source: "ink",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": ${toScript(ROUTE_COLOR)},
          "line-width": ${ROUTE_WIDTH},
          "line-opacity": ${ROUTE_OPACITY},
        },
      });
      map.addSource("canvas-marks", { type: "geojson", data: marks });
      map.addLayer({
        id: "canvas-marks",
        type: "circle",
        source: "canvas-marks",
        paint: {
          "circle-radius": [
            "case",
            ["get", "first"],
            ${FIRST_MARK_RADIUS},
            ${MARK_RADIUS},
          ],
          "circle-color": ${toScript(ROUTE_COLOR)},
          "circle-stroke-color": ${toScript(stop.outline)},
          "circle-stroke-width": 2,
        },
      });
      // Where the route of the figure starts (TASK-426), over all.
      map.addSource("canvas-start", { type: "geojson", data: startDot });
      map.addLayer({
        id: "canvas-start",
        type: "circle",
        source: "canvas-start",
        paint: {
          "circle-radius": ${START_DOT_RADIUS},
          "circle-color": ${toScript(START_DOT_COLOR)},
          "circle-stroke-color": ${toScript(stop.outline)},
          "circle-stroke-width": 3,
        },
      });
      if (canvas) {
        inkLooks(canvas.mode);
      }
      // A kind told before the style was drawn shows now.
      if (kind !== "standard") {
        showKind();
      }
    });
    // The position: a pin, or while running an arrow turned to the heading.
    function showPin(lngLat) {
      if (arrow) {
        arrow.remove();
        arrow = null;
        arrowElement = null;
      }
      if (marker) {
        marker.setLngLat(lngLat);
      } else {
        marker = new maplibregl.Marker({ color: ${toScript(POSITION_COLOR)} })
          .setLngLat(lngLat)
          .addTo(map);
      }
    }
    function showArrow(lngLat, heading) {
      if (marker) {
        marker.remove();
        marker = null;
      }
      if (!arrow) {
        var element = document.createElement("div");
        element.style.width = "${HEADING_ARROW_SIZE}px";
        element.style.height = "${HEADING_ARROW_SIZE}px";
        element.style.lineHeight = "0";
        // The cone is wide: a finger on it moves the map, not the arrow.
        element.style.pointerEvents = "none";
        element.innerHTML = ${toScript(HEADING_ARROW_SVG)};
        arrowElement = element;
        // Turned with the map: north of the arrow is north of the map.
        arrow = new maplibregl.Marker({ element: element, rotationAlignment: "map" })
          .setLngLat(lngLat)
          .addTo(map);
      }
      arrow.setLngLat(lngLat);
      // On «Compass» where the phone points, as the map (TASK-431).
      if (facing !== null) {
        heading = facing;
      }
      if (typeof heading === "number") {
        arrow.setRotation(heading);
      }
      showCone();
    }
    // The cone ahead of the arrow: open while the phone's direction is told.
    function showCone() {
      var cone =
        arrowElement && arrowElement.querySelector
          ? arrowElement.querySelector(".${FACING_CONE_CLASS}")
          : null;
      if (cone) {
        cone.style.display = facing !== null ? "inline" : "none";
      }
    }
    function setStartHere(lngLat) {
      if (startHere) {
        startHere.remove();
        startHere = null;
      }
      startLabel = null;
      if (lngLat) {
        // A flag in a disc, not a pin as the start asked for (TASK-443),
        // and its words in the app's colours. Fingers go through to the map.
        var element = document.createElement("div");
        element.className = ${toScript(START_PIN_CLASS)};
        element.innerHTML = ${toScript(START_PIN_SVG)};
        startLabel = document.createElement("div");
        startLabel.className = ${toScript(START_LABEL_CLASS)};
        startLabel.textContent = ${toScript(translate(language, START_HERE_LABEL))};
        element.appendChild(startLabel);
        startHere = new maplibregl.Marker({ element: element })
          .setLngLat(lngLat)
          .addTo(map);
        placeStartLabel();
      }
    }
    // The words of «Start here» over their mark, or under it where over it
    // they would be in the status bar or under a button; moved sideways
    // where they would leave the map (TASK-443).
    function placeStartLabel() {
      if (!startHere || !startLabel) {
        return;
      }
      var at = map.project(startHere.getLngLat());
      var width = startLabel.offsetWidth;
      var height = startLabel.offsetHeight;
      var half = width / 2;
      var edge = ${START_LABEL_EDGE_PX};
      var mapWidth = map.getContainer().clientWidth;
      var shift = 0;
      if (at.x - half < edge) {
        shift = edge + half - at.x;
      } else if (at.x + half > mapWidth - edge) {
        shift = mapWidth - edge - half - at.x;
      }
      var top = at.y - ${START_PIN_SIZE / 2 + START_LABEL_GAP_PX} - height;
      var left = at.x - half + shift;
      var hidden =
        top < (cover ? cover.top : 0) + edge ||
        (cover ? cover.buttons : []).some(function (button) {
          return (
            left < button.x + button.width &&
            left + width > button.x &&
            top < button.y + button.height &&
            top + height > button.y
          );
        });
      startLabel.className = hidden
        ? ${toScript(`${START_LABEL_CLASS} ${START_LABEL_BELOW_CLASS}`)}
        : ${toScript(START_LABEL_CLASS)};
      startLabel.style.transform = "translateX(calc(-50% + " + shift + "px))";
    }
    map.on("move", placeStartLabel);
    function setRoute(data) {
      route = data;
      var source = map.getSource("route");
      if (source) {
        source.setData(route);
      }
    }
    function setAhead(data) {
      ahead = data;
      var source = map.getSource("route-ahead");
      if (source) {
        source.setData(ahead);
      }
    }
    function setAheadOpacity() {
      if (map.getSource("route-ahead")) {
        map.setFeatureState({ source: "route-ahead", id: 0 }, { dim: dim });
      }
    }
    // With "Reduce Motion" on the phone the dashes keep still.
    function stillWanted() {
      return Boolean(
        window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      );
    }
    function setBlink(on) {
      if (on && !stillWanted()) {
        if (!blinking) {
          blinking = setInterval(function () {
            dim = !dim;
            setAheadOpacity();
          }, ${AHEAD_BEAT_MS});
        }
        return;
      }
      if (blinking) {
        clearInterval(blinking);
        blinking = null;
      }
      dim = false;
      setAheadOpacity();
    }
    function lines(coordinates) {
      return coordinates.length > 0
        ? {
            type: "Feature",
            properties: {},
            geometry: { type: "MultiLineString", coordinates: coordinates },
          }
        : noRoute;
    }
    // The part run takes the route's layer; the part left, the dashed one.
    function showProgress(message) {
      progressing = true;
      setRoute(lines(message.done));
      setAhead(lines(message.ahead));
      setBlink(message.blink);
    }
    function clearProgress() {
      progressing = false;
      setRoute(fullRoute);
      setAhead(noRoute);
      setBlink(false);
    }
    function setWalks(data) {
      walks = data;
      var source = map.getSource("walks");
      if (source) {
        source.setData(walks);
      }
    }
    function setOnFoot(data) {
      onFoot = data;
      var source = map.getSource("on-foot");
      if (source) {
        source.setData(onFoot);
      }
    }
    function setRejoin(data) {
      rejoin = data;
      var source = map.getSource("rejoin");
      if (source) {
        source.setData(rejoin);
      }
    }
    function setStops(data) {
      stops = data;
      var source = map.getSource("stops");
      if (source) {
        source.setData(stops);
      }
    }
    function setOthers(data) {
      others = data;
      var source = map.getSource("others");
      if (source) {
        source.setData(others);
      }
    }
    function setGhost(data) {
      ghost = data;
      var source = map.getSource("ghost");
      if (source) {
        source.setData(ghost);
      }
    }
    function setTrack(data) {
      track = data;
      var source = map.getSource("track");
      if (source) {
        source.setData(track);
      }
    }
    function setLifts(data) {
      lifts = data;
      var source = map.getSource("lifts");
      if (source) {
        source.setData(lifts);
      }
    }
    // The colours of a day of skiing on, or the run's back (TASK-429).
    function setSkiDay(on, labels) {
      skiDay = on;
      skiLabels = labels;
      if (map.getLayer("track")) {
        map.setPaintProperty(
          "track",
          "line-color",
          on ? ${toScript(SKI_DESCENT_COLOR)} : ${toScript(TRACK_COLOR)},
        );
      }
      if (map.getLayer("lifts")) {
        map.setPaintProperty(
          "lifts",
          "line-color",
          on ? ${toScript(SKI_LIFT_COLOR)} : ${toScript(TRACK_COLOR)},
        );
      }
      var source = map.getSource("ski-labels");
      if (source) {
        source.setData(skiLabels);
      }
    }
    // The map turned, by the app or by two fingers: the app is told each
    // whole degree, for its north arrow. Fingers leave it as they turn it.
    map.on("rotate", function (event) {
      if (event && event.originalEvent) {
        wanted = map.getBearing();
      }
      var now = Math.round(map.getBearing()) || 0;
      if (now !== toldBearing) {
        toldBearing = now;
        post({ type: "turned", bearing: now });
      }
    });
    map.on("movestart", function (event) {
      if (event && event.originalEvent) {
        inFrame = false;
      }
    });
    // The room the attribution takes at the bottom of the map.
    function attributionRoom() {
      var bar =
        typeof document !== "undefined" && document.querySelector
          ? document.querySelector(".maplibregl-ctrl-attrib")
          : null;
      return (bar && bar.offsetHeight) || ${ATTRIBUTION_PX};
    }
    // A place in the pixels of the whole world at a zoom, as MapLibre
    // counts them (Web Mercator, 512 to a tile).
    function worldOf(lng, lat, scale) {
      var sin = Math.sin((lat * Math.PI) / 180);
      return [
        ((lng + 180) / 360) * scale,
        (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * scale,
      ];
    }
    // Whether a point the map is framed on would be under a button, or
    // within ${BUTTON_GAP_PX} px of one, on the flat map as \`camera\` shows it.
    function underButtons(camera) {
      var box = map.getContainer();
      var scale = 512 * Math.pow(2, camera.zoom);
      var middle = worldOf(camera.center.lng, camera.center.lat, scale);
      var turn = ((camera.bearing || 0) * Math.PI) / 180;
      var cos = Math.cos(turn);
      var sin = Math.sin(turn);
      var gap = ${BUTTON_GAP_PX};
      return framedPoints.some(function (point) {
        var at = worldOf(point[0], point[1], scale);
        var dx = at[0] - middle[0];
        var dy = at[1] - middle[1];
        var x = box.clientWidth / 2 + dx * cos + dy * sin;
        var y = box.clientHeight / 2 - dx * sin + dy * cos;
        return cover.buttons.some(function (button) {
          return (
            x > button.x - gap &&
            x < button.x + button.width + gap &&
            y > button.y - gap &&
            y < button.y + button.height + gap
          );
        });
      });
    }
    // The room left around a route framed (TASK-443). Told what lies over
    // the map: under the status bar and over the attribution, and from the
    // top as little as leaves no point under a button, row after row of
    // them. The leaning map is not measured: under every button.
    function framePadding() {
      if (!cover) {
        return ${FRAME_PADDING_PX};
      }
      var gap = ${FRAME_GAP_PX};
      var bottom = attributionRoom() + gap;
      var height = map.getContainer().clientHeight;
      var tops = [cover.top];
      cover.buttons
        .map(function (button) {
          return button.y + button.height;
        })
        .sort(function (a, b) {
          return a - b;
        })
        .forEach(function (under) {
          if (under > tops[tops.length - 1]) {
            tops.push(under);
          }
        });
      var room = function (top) {
        return { top: top + gap, bottom: bottom, left: gap, right: gap };
      };
      var lowest = room(tops[tops.length - 1]);
      // A map too low to hold the route under its buttons: under the
      // status bar, whatever is under a button.
      if (height - lowest.top - lowest.bottom < ${FRAME_PADDING_PX}) {
        return room(tops[0]);
      }
      if (kind === "3d") {
        return lowest;
      }
      for (var i = 0; i < tops.length - 1; i += 1) {
        var tried = room(tops[i]);
        var camera = map.cameraForBounds(framed, { padding: tried, bearing: wanted });
        if (camera && !underButtons(camera)) {
          return tried;
        }
      }
      return lowest;
    }
    function frame() {
      inFrame = true;
      map.fitBounds(framed, { padding: framePadding(), bearing: wanted });
    }
    // The map's view changed its size: the card under it grew with its
    // route, or shrank (TASK-443). Still framed on its route, it frames it
    // again, at once; moved by the user, it stays where it was left.
    map.on("resize", function () {
      if (framed && inFrame && !following) {
        map.fitBounds(framed, {
          padding: framePadding(),
          bearing: wanted,
          animate: false,
        });
      }
      placeStartLabel();
    });
    function setCover(next) {
      cover = next;
      if (framed && inFrame && !following) {
        frame();
      }
      placeStartLabel();
    }
    // The map's kind (TASK-264, ADR-0232): the layers of the style it shows,
    // the hills under the 3D map, and how far the map leans. The route and
    // its marks are not in the style: they show over every kind.
    function showKind() {
      var shown = KIND_LAYERS[kind] || KIND_LAYERS.standard;
      STYLE_LAYERS.forEach(function (id) {
        map.setLayoutProperty(id, "visibility", shown.indexOf(id) >= 0 ? "visible" : "none");
      });
      map.setTerrain(kind === "3d" ? ${toScript(TERRAIN_SPEC)} : null);
      var pitch = kind === "3d" ? ${PITCH_3D} : 0;
      if (framed && inFrame && !following) {
        // Framed on its route, it is framed again, leaning or flat.
        map.fitBounds(framed, { padding: framePadding(), bearing: wanted, pitch: pitch });
      } else {
        map.easeTo({ pitch: pitch, duration: 600 });
      }
    }
    // Told before the style is drawn, the kind waits for it.
    function setKind(next) {
      if (next === kind || !KIND_LAYERS[next]) {
        return;
      }
      kind = next;
      if (styleLoaded) {
        showKind();
      }
    }
    // The north arrow (TASK-232): the map turns where the app asks. Still
    // framed on its route, it frames it again as turned; moved by the user
    // or following the runner, it turns where it is.
    function turnTo(bearing) {
      wanted = bearing;
      if (framed && inFrame && !following) {
        frame();
      } else {
        map.easeTo({ bearing: wanted, duration: 500 });
      }
    }
    // The first time every tile in view is drawn: the app hides its bar.
    map.once("idle", function () {
      post({ type: "loaded" });
    });
    map.on("error", function (event) {
      // Without a style there is no map, and the style is in the page: what
      // can fail is the tiles' description (TileJSON), an error of the source
      // with no tile. A missing tile later is not fatal.
      var noTiles = event.sourceId === "openmaptiles" && !event.tile;
      if (!styleLoaded || noTiles) {
        fail((event.error && event.error.message) || "The map style did not load");
      }
    });
    // On a drawing a double tap is its super like (TASK-119): told to the
    // app in place of the zoom, only while the app asks. Two fingers zoom
    // as ever. The fingers are listened to from the first time it asks.
    var doubleTapAsked = false;
    var tapListening = false;
    var tapStart = null;
    var lastTap = null;
    function near(a, b) {
      return Math.abs(a.x - b.x) <= ${DOUBLE_TAP_PX} && Math.abs(a.y - b.y) <= ${DOUBLE_TAP_PX};
    }
    function listenToTaps() {
      var surface = map.getCanvasContainer();
      var passive = { passive: true };
      surface.addEventListener("touchstart", function (event) {
        // A second finger is a zoom, never a tap.
        if (event.touches.length !== 1) {
          tapStart = null;
          lastTap = null;
          return;
        }
        var touch = event.touches[0];
        tapStart = { x: touch.clientX, y: touch.clientY, time: event.timeStamp };
      }, passive);
      surface.addEventListener("touchmove", function (event) {
        var touch = event.touches[0];
        if (tapStart && touch && !near(tapStart, { x: touch.clientX, y: touch.clientY })) {
          tapStart = null;
        }
      }, passive);
      surface.addEventListener("touchcancel", function () {
        tapStart = null;
        lastTap = null;
      }, passive);
      surface.addEventListener("touchend", function (event) {
        var tap = tapStart;
        tapStart = null;
        if (!tap || event.touches.length !== 0 || event.timeStamp - tap.time > ${TAP_MS}) {
          lastTap = null;
          return;
        }
        if (lastTap && event.timeStamp - lastTap.time <= ${DOUBLE_TAP_MS} && near(lastTap, tap)) {
          lastTap = null;
          if (doubleTapAsked) {
            post({ type: "doubleTap" });
          }
          return;
        }
        lastTap = { x: tap.x, y: tap.y, time: event.timeStamp };
      }, passive);
    }
    function setDoubleTap(on) {
      doubleTapAsked = on;
      lastTap = null;
      if (on) {
        map.doubleClickZoom.disable();
        if (!tapListening) {
          tapListening = true;
          listenToTaps();
        }
      } else {
        map.doubleClickZoom.enable();
      }
    }
    // The shape of a route on the water moved by the user (TASK-238): while
    // the app asks, one finger drags the route, its walks too, and no longer
    // the map; two fingers zoom as ever. Lifted, the app is told by how many
    // degrees, and the route stays where it was left until the app sends
    // the one the engine placed there. The fingers are listened to from the
    // first time the app asks.
    var moving = false;
    var moveListening = false;
    var moveFrom = null;
    var movedBy = null;
    var moveTold = false;
    function shifted(data, by) {
      if (!data.geometry) {
        return data;
      }
      function move(point) {
        return [point[0] + by[0], point[1] + by[1]];
      }
      var many = data.geometry.type === "MultiLineString";
      return {
        type: "Feature",
        properties: {},
        geometry: {
          type: data.geometry.type,
          coordinates: many
            ? data.geometry.coordinates.map(function (line) {
                return line.map(move);
              })
            : data.geometry.coordinates.map(move),
        },
      };
    }
    function drawMoved(by) {
      [["route", route], ["walks", walks], ["on-foot", onFoot]].forEach(function (drawn) {
        var source = map.getSource(drawn[0]);
        if (source) {
          source.setData(by ? shifted(drawn[1], by) : drawn[1]);
        }
      });
    }
    function dropMove() {
      moveFrom = null;
      movedBy = null;
    }
    function listenToMoves() {
      var surface = map.getCanvasContainer();
      var passive = { passive: true };
      surface.addEventListener("touchstart", function (event) {
        if (!moving) {
          return;
        }
        // A second finger is a zoom: the route goes back where it was.
        if (event.touches.length !== 1) {
          if (moveFrom && !moveTold) {
            drawMoved(null);
          }
          dropMove();
          return;
        }
        var touch = event.touches[0];
        moveFrom = { x: touch.clientX, y: touch.clientY };
        movedBy = null;
      }, passive);
      surface.addEventListener("touchmove", function (event) {
        var touch = event.touches[0];
        if (!moving || !moveFrom || event.touches.length !== 1 || !touch) {
          return;
        }
        var far =
          Math.abs(touch.clientX - moveFrom.x) >= ${MOVE_MIN_PX} ||
          Math.abs(touch.clientY - moveFrom.y) >= ${MOVE_MIN_PX};
        if (!movedBy && !far) {
          return;
        }
        var from = map.unproject([moveFrom.x, moveFrom.y]);
        var to = map.unproject([touch.clientX, touch.clientY]);
        movedBy = [to.lng - from.lng, to.lat - from.lat];
        moveTold = false;
        drawMoved(movedBy);
      }, passive);
      surface.addEventListener("touchcancel", function () {
        if (moving && moveFrom && !moveTold) {
          drawMoved(null);
        }
        dropMove();
      }, passive);
      surface.addEventListener("touchend", function (event) {
        if (!moving || !moveFrom || event.touches.length !== 0) {
          return;
        }
        var by = movedBy;
        dropMove();
        if (by) {
          moveTold = true;
          post({ type: "moved", by: by });
        }
      }, passive);
    }
    function setMove(on) {
      moving = on;
      dropMove();
      var surface = map.getCanvasContainer();
      if (on) {
        moveTold = false;
        map.dragPan.disable();
        // The page must not take the finger for a scroll of its own.
        surface.style.touchAction = "none";
        if (!moveListening) {
          moveListening = true;
          listenToMoves();
        }
      } else {
        map.dragPan.enable();
        surface.style.touchAction = "";
        // Left nowhere: the route is back where it was. Left somewhere, it
        // stays there until the app sends the route placed there.
        if (!moveTold) {
          drawMoved(null);
        }
      }
    }
    // «Draw on the map» (TASK-281, ADR-0245): while the app asks, the
    // fingers on the map are the page's own, and MapLibre's gestures are
    // off. With «Draw» one finger draws a yellow line, and two move and zoom
    // the map (TASK-331). With «Line» (TASK-331 part B) a finger taps the
    // points of a straight line, a band from the last one following it;
    // with «Erase» it rubs lines out, in a wide pale band; both are told as
    // a line drawn, and two fingers move and zoom the map. With «Move» one
    // finger drags the figure, when it starts on it, or the map, or bends a
    // line it held still first, or drags the start dot along the figure's
    // line (TASK-426); two fingers size the figure, when their middle is on
    // it, or zoom the map. The app is told of each line drawn (\`drawn\`)
    // and bent (\`bent\`), with the metres of a pixel, of the figure moved
    // or sized (\`figure\`), of the start left (\`started\`), and of where
    // the map is (\`centre\`): a figure is put there.
    var canvas = null;
    var canvasListening = false;
    var gesture = null;
    var inkLast = null;
    var GESTURES = ["dragPan", "touchZoomRotate", "doubleClickZoom", "dragRotate", "touchPitch"];
    var gesturesBefore = null;
    // The Earth's radius of the app's plane (mapdraw/plane.ts).
    var EARTH_M = 6371000;
    function inkData() {
      return ink.length > 1
        ? {
            type: "Feature",
            properties: {},
            geometry: { type: "LineString", coordinates: ink },
          }
        : noRoute;
    }
    function setSource(name, data) {
      var source = map.getSource(name);
      if (source) {
        source.setData(data);
      }
    }
    function drawInk() {
      setSource("ink", inkData());
    }
    // The eraser's band is wide and pale; the ink of a line, the route's.
    function inkLooks(mode) {
      if (!map.setPaintProperty || !map.getLayer || !map.getLayer("ink")) {
        return;
      }
      var rubbing = mode === "erase";
      map.setPaintProperty("ink", "line-color", rubbing ? ${toScript(ERASER_COLOR)} : ${toScript(ROUTE_COLOR)});
      map.setPaintProperty("ink", "line-width", rubbing ? ${2 * ERASER_PX} : ${ROUTE_WIDTH});
      map.setPaintProperty("ink", "line-opacity", rubbing ? ${ERASER_OPACITY} : ${ROUTE_OPACITY});
    }
    function multiLine(lines) {
      return lines.length > 0
        ? {
            type: "Feature",
            properties: {},
            geometry: { type: "MultiLineString", coordinates: lines },
          }
        : noRoute;
    }
    // Whether line \`i\` moves with the fingers: all of them, or those of
    // the piece chosen (TASK-402 part B).
    function moves(i) {
      return !canvas || canvas.chosen.length === 0 || canvas.chosen.indexOf(i) >= 0;
    }
    // The figure's lines; the first side of a line that is a link apart,
    // dashed (TASK-331 part B); the pieces not chosen faint.
    function drawFigure(lines) {
      var drawnLines = [];
      var faintLines = [];
      var linkLines = [];
      lines.forEach(function (line, i) {
        var to = moves(i) ? drawnLines : faintLines;
        if (canvas && canvas.links[i] && line.length > 2) {
          linkLines.push(line.slice(0, 2));
          to.push(line.slice(1));
        } else {
          to.push(line);
        }
      });
      figure = multiLine(drawnLines);
      faint = multiLine(faintLines);
      links = multiLine(linkLines);
      setSource("canvas", figure);
      setSource("canvas-faint", faint);
      setSource("canvas-links", links);
    }
    // The box round the piece chosen.
    function drawBox(ring) {
      chosenBox = ring.length > 1
        ? { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: ring } }
        : noRoute;
      setSource("canvas-box", chosenBox);
    }
    // The dots of a straight line being tapped: the first larger, to close
    // it on.
    function drawMarks(points) {
      marks = {
        type: "FeatureCollection",
        features: points.map(function (p, i) {
          return {
            type: "Feature",
            properties: { first: i === 0 && points.length > 1 },
            geometry: { type: "Point", coordinates: p },
          };
        }),
      };
      setSource("canvas-marks", marks);
    }
    // The dot where the route of the figure starts (TASK-426), or none.
    function drawStart(lngLat) {
      startDot = lngLat
        ? { type: "Feature", properties: {}, geometry: { type: "Point", coordinates: lngLat } }
        : noRoute;
      setSource("canvas-start", startDot);
    }
    // Whether a finger at \`point\` is on the start dot, which may move.
    function onStart(point) {
      return Boolean(
        canvas.start &&
          canvas.startLine.length > 1 &&
          screenDist(map.project(canvas.start), point) <= ${GRAB_PX},
      );
    }
    // Where the start goes for a finger at \`point\`: the point of its line
    // nearest on the screen, or the nearer of its two ends.
    function startAt(point) {
      var line = canvas.startLine;
      var best = null;
      if (canvas.startEnds) {
        [line[0], line[line.length - 1]].forEach(function (end) {
          var away = screenDist(map.project(end), point);
          if (!best || away < best.away) {
            best = { at: end, away: away };
          }
        });
        return best.at;
      }
      for (var i = 1; i < line.length; i += 1) {
        var at = nearestOnScreen(point, map.project(line[i - 1]), map.project(line[i]));
        var away = screenDist(at, point);
        if (!best || away < best.away) {
          best = { at: at, away: away };
        }
      }
      return lngLatAt(best.at);
    }
    // How many metres a pixel of the map is, in its middle.
    function metresPerPx() {
      var surface = map.getCanvasContainer();
      var x = surface.clientWidth / 2;
      var y = surface.clientHeight / 2;
      var a = map.unproject([x, y]);
      var b = map.unproject([x + 100, y]);
      var rad = Math.PI / 180;
      var east = (b.lng - a.lng) * rad * EARTH_M * Math.cos(a.lat * rad);
      var north = (b.lat - a.lat) * rad * EARTH_M;
      return Math.hypot(east, north) / 100;
    }
    // With «Line», a band from the last point tapped to the finger.
    function bandTo(at) {
      var last = canvas.marks[canvas.marks.length - 1];
      ink = last ? [last, lngLatAt(at)] : [];
      drawInk();
    }
    function screenDist(a, b) {
      return Math.hypot(a.x - b.x, a.y - b.y);
    }
    function nearestOnScreen(p, a, b) {
      var dx = b.x - a.x;
      var dy = b.y - a.y;
      var squared = dx * dx + dy * dy;
      var t = squared === 0 ? 0 : ((p.x - a.x) * dx + (p.y - a.y) * dy) / squared;
      t = Math.max(0, Math.min(1, t));
      return { x: a.x + t * dx, y: a.y + t * dy };
    }
    // The line a finger holds with «Move»: of those it may bend, the nearest
    // within ${REACH_PX} px, after its link, and its point there.
    function grabAt(point) {
      var best = null;
      canvas.bendable.forEach(function (index) {
        var line = canvas.lines[index];
        var from = canvas.links[index] ? 1 : 0;
        for (var i = from + 1; line && i < line.length; i += 1) {
          var at = nearestOnScreen(point, map.project(line[i - 1]), map.project(line[i]));
          var away = screenDist(at, point);
          if (away <= ${REACH_PX} && (!best || away < best.away)) {
            best = { index: index, side: i - 1, at: at, away: away };
          }
        }
      });
      return best;
    }
    // The bend of a line held at \`grab\`, the finger at \`start\`, as the app
    // makes it (mapdraw/tools.ts): the corner held, or a new one, goes as
    // far as the finger, and the line along ${BEND_SHARE} of the figure's
    // size either side, less and less. The outline goes round; the start of
    // a detail stays.
    function bendOf(grab, start) {
      var points = canvas.lines[grab.index].map(function (p) {
        var q = map.project(p);
        return { x: q.x, y: q.y };
      });
      var ring = grab.index === 0;
      var a = grab.side;
      var b = grab.side + 1;
      var corner = screenDist(points[a], grab.at) <= screenDist(points[b], grab.at) ? a : b;
      if (screenDist(points[corner], grab.at) > ${CORNER_SHARE * REACH_PX}) {
        points.splice(b, 0, grab.at);
        corner = b;
      }
      if (ring && corner === points.length - 1) {
        corner = 0;
      }
      if (!ring && corner === 0) {
        return null;
      }
      var along = [0];
      for (var i = 1; i < points.length; i += 1) {
        along.push(along[i - 1] + screenDist(points[i - 1], points[i]));
      }
      var box = screenBox();
      return {
        kind: "bend",
        index: grab.index,
        points: points,
        corner: corner,
        ring: ring,
        along: along,
        reach: ${BEND_SHARE} * Math.max(box.right - box.left, box.bottom - box.top),
        from: lngLatAt(points[corner]),
        start: start,
        at: start,
      };
    }
    function bendShare(away, reach) {
      if (away >= reach) {
        return 0;
      }
      var r = away / reach;
      return (1 - r * r) * (1 - r * r);
    }
    // Where the corner held goes: as far as the finger went.
    function bendTarget(bend) {
      var held = bend.points[bend.corner];
      return { x: held.x + bend.at.x - bend.start.x, y: held.y + bend.at.y - bend.start.y };
    }
    function bendTo(at) {
      gesture.at = at;
      var bend = gesture;
      var to = bendTarget(bend);
      var by = { x: to.x - bend.points[bend.corner].x, y: to.y - bend.points[bend.corner].y };
      var total = bend.along[bend.along.length - 1];
      var moved = bend.points.map(function (p, k) {
        var apartAlong = Math.abs(bend.along[k] - bend.along[bend.corner]);
        var away = bend.ring ? Math.min(apartAlong, total - apartAlong) : apartAlong;
        var part = !bend.ring && k === 0 ? 0 : bendShare(away, bend.reach);
        return lngLatAt({ x: p.x + part * by.x, y: p.y + part * by.y });
      });
      if (bend.ring) {
        moved[moved.length - 1] = moved[0];
      }
      var lines = canvas.lines.slice();
      lines[bend.index] = moved;
      drawFigure(lines);
      drawMarks([moved[bend.corner]]);
    }
    function pointOf(touch) {
      return { x: touch.clientX, y: touch.clientY };
    }
    function lngLatAt(point) {
      var at = map.unproject([point.x, point.y]);
      return [at.lng, at.lat];
    }
    function apart(a, b) {
      return Math.max(1, Math.hypot(a.x - b.x, a.y - b.y));
    }
    function middleOf(a, b) {
      return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    }
    // The direction from one finger to the other on the screen, in degrees,
    // growing clockwise (y down).
    function angleOf(a, b) {
      return (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
    }
    // How far two fingers turned from \`from\` to \`now\`, within (−180°,
    // 180°]; less than ${MIN_TURN_DEG}° is none, so sizing does not twist
    // the figure (TASK-402).
    function turnOf(from, now) {
      var turn = (((now - from) % 360) + 540) % 360 - 180;
      return Math.abs(turn) < ${MIN_TURN_DEG} ? 0 : turn;
    }
    function eachPoint(lines, visit) {
      lines.forEach(function (line) {
        line.forEach(visit);
      });
    }
    // The lines the fingers move: all, or those of the piece chosen.
    function movingLines() {
      return canvas.lines.filter(function (line, i) {
        return moves(i);
      });
    }
    // The figure's box on the screen, or the piece's chosen, with room for
    // a finger around it.
    function screenBox() {
      var box = null;
      eachPoint(movingLines(), function (lngLat) {
        var p = map.project(lngLat);
        box = box
          ? {
              left: Math.min(box.left, p.x),
              right: Math.max(box.right, p.x),
              top: Math.min(box.top, p.y),
              bottom: Math.max(box.bottom, p.y),
            }
          : { left: p.x, right: p.x, top: p.y, bottom: p.y };
      });
      return box;
    }
    function onFigure(point) {
      if (!canvas || canvas.lines.length === 0) {
        return false;
      }
      var box = screenBox();
      return (
        point.x >= box.left - ${GRAB_PX} &&
        point.x <= box.right + ${GRAB_PX} &&
        point.y >= box.top - ${GRAB_PX} &&
        point.y <= box.bottom + ${GRAB_PX}
      );
    }
    // The middle of the figure's box on the map, or the piece's chosen: it
    // grows from there.
    function figureMiddle() {
      var box = null;
      eachPoint(movingLines(), function (p) {
        box = box
          ? [Math.min(box[0], p[0]), Math.min(box[1], p[1]), Math.max(box[2], p[0]), Math.max(box[3], p[1])]
          : [p[0], p[1], p[0], p[1]];
      });
      return [(box[0] + box[2]) / 2, (box[1] + box[3]) / 2];
    }
    function shiftedPoint(p, by) {
      return [p[0] + by[0], p[1] + by[1]];
    }
    // Sized about \`anchor\` on the map: a similarity on the plane too, the
    // same factor along both axes.
    function sizedPoint(p, anchor, factor) {
      return [anchor[0] + factor * (p[0] - anchor[0]), anchor[1] + factor * (p[1] - anchor[1])];
    }
    // Sized and turned \`turn\` degrees clockwise about \`anchor\` (TASK-402):
    // turned on the screen, in pixels, where the map keeps its angles, not
    // in degrees of longitude and latitude.
    function heldPoint(p, anchor, factor, turn) {
      if (turn === 0) {
        return sizedPoint(p, anchor, factor);
      }
      var a = (turn * Math.PI) / 180;
      var at = map.project(p);
      var middle = map.project(anchor);
      var dx = at.x - middle.x;
      var dy = at.y - middle.y;
      var lngLat = map.unproject([
        middle.x + factor * (dx * Math.cos(a) - dy * Math.sin(a)),
        middle.y + factor * (dx * Math.sin(a) + dy * Math.cos(a)),
      ]);
      return [lngLat.lng, lngLat.lat];
    }
    // The lines that move changed, the others as they are.
    function mapLines(lines, change) {
      return lines.map(function (line, i) {
        return moves(i) ? line.map(change) : line;
      });
    }
    // The figure, or the piece chosen and its box, changed on the screen.
    function drawChanged(change) {
      drawFigure(mapLines(canvas.lines, change));
      drawBox(canvas.box.map(change));
      drawStart(canvas.start && moves(0) ? change(canvas.start) : canvas.start);
    }
    function tellCentre() {
      var centre = map.getCenter();
      post({ type: "centre", lngLat: [centre.lng, centre.lat] });
    }
    // A move or a size kept: the page draws the figure there until the app
    // sends it back, and the room to grow is what is left of it.
    function keepFigure(change, factor, turn) {
      var lines = mapLines(canvas.lines, change);
      var centre = canvas.centre && change(canvas.centre);
      canvas.lines = lines;
      canvas.centre = centre;
      canvas.box = canvas.box.map(change);
      if (moves(0)) {
        canvas.start = canvas.start && change(canvas.start);
        canvas.startLine = canvas.startLine.map(change);
      }
      drawStart(canvas.start);
      canvas.shrink /= factor;
      canvas.grow /= factor;
      drawFigure(lines);
      drawBox(canvas.box);
      if (centre) {
        post(
          turn
            ? { type: "figure", centre: centre, factor: factor, done: true, turn: turn }
            : { type: "figure", centre: centre, factor: factor, done: true },
        );
      }
      // Grown past the screen, the map steps back to show it whole: there
      // is room again to zoom the map around it.
      var surface = map.getCanvasContainer();
      var box = factor > 1 && lines.length > 0 ? screenBox() : null;
      if (
        box &&
        (box.left < 0 ||
          box.top < 0 ||
          box.right > surface.clientWidth ||
          box.bottom > surface.clientHeight)
      ) {
        frameCanvas();
      }
    }
    function startGesture(touches, time) {
      // A finger on the map stops it where it is: a line drawn while the
      // map still eases into place would not be where it was drawn.
      if (map.stop) {
        map.stop();
      }
      if (touches.length === 1) {
        var at = pointOf(touches[0]);
        if (canvas.mode === "draw" || canvas.mode === "erase") {
          ink = [lngLatAt(at)];
          inkLast = at;
          gesture = { kind: "ink" };
          drawInk();
        } else if (canvas.mode === "line") {
          gesture = { kind: "tap", at: at };
          bandTo(at);
        } else if (onStart(at)) {
          // The start dot, dragged along the figure's line (TASK-426).
          gesture = { kind: "start", from: at, at: canvas.start };
        } else if (onFigure(at)) {
          // Held still on a line first, the drag bends it.
          gesture = { kind: "drag", from: at, by: null, since: time, grab: grabAt(at) };
        } else {
          gesture = { kind: "pan", from: at, last: at };
        }
        return;
      }
      if (touches.length === 2) {
        var a = pointOf(touches[0]);
        var b = pointOf(touches[1]);
        var middle = middleOf(a, b);
        // Only with «Move» do two fingers size the figure; else they move
        // and zoom the map, the figure on it.
        gesture = canvas.mode === "move" && onFigure(middle)
          ? {
              kind: "size",
              from: apart(a, b),
              anchor: figureMiddle(),
              factor: 1,
              told: 1,
              angle: angleOf(a, b),
              turn: 0,
            }
          : {
              kind: "zoom",
              from: apart(a, b),
              zoom: map.getZoom(),
              anchor: map.unproject([middle.x, middle.y]),
            };
        return;
      }
      // Three fingers or more do nothing.
      gesture = { kind: "wait" };
    }
    // \`lifted\`: the fingers left the map; otherwise another one came, and
    // a line half drawn is dropped.
    function endGesture(lifted) {
      var was = gesture;
      gesture = null;
      if (!was) {
        return;
      }
      if (was.kind === "ink") {
        // With «Erase» a tap is enough: it rubs out where it is.
        if (lifted && (ink.length >= 3 || canvas.mode === "erase")) {
          // Shown until the app answers with the figure.
          post({ type: "drawn", line: ink, metresPerPx: metresPerPx() });
        } else {
          ink = [];
          drawInk();
        }
      } else if (was.kind === "tap") {
        // The point is where the finger left the map; the band shows until
        // the app answers.
        if (lifted) {
          post({ type: "drawn", line: [lngLatAt(was.at)], metresPerPx: metresPerPx() });
        } else {
          ink = [];
          drawInk();
        }
      } else if (was.kind === "bend") {
        if (lifted) {
          // The line stays bent until the app answers.
          post({
            type: "bent",
            from: was.from,
            to: lngLatAt(bendTarget(was)),
            metresPerPx: metresPerPx(),
          });
        } else {
          drawFigure(canvas.lines);
          drawMarks(canvas.marks);
        }
      } else if (was.kind === "start") {
        if (lifted && was.at !== canvas.start) {
          // The dot stays there until the app answers.
          post({ type: "started", lngLat: was.at, metresPerPx: metresPerPx() });
        } else {
          drawStart(canvas.start);
          if (lifted) {
            tellTap(was.from);
          }
        }
      } else if (was.kind === "drag") {
        if (was.by) {
          keepFigure(function (p) {
            return shiftedPoint(p, was.by);
          }, 1);
        } else if (lifted) {
          tellTap(was.from);
        }
      } else if (was.kind === "size") {
        if (was.factor !== 1 || was.turn !== 0) {
          keepFigure(
            function (p) {
              return heldPoint(p, was.anchor, was.factor, was.turn);
            },
            was.factor,
            was.turn,
          );
        }
      } else if (was.kind === "pan" || was.kind === "zoom") {
        if (lifted && was.kind === "pan" && screenDist(was.from, was.last) < ${MOVE_MIN_PX}) {
          tellTap(was.from);
        }
        tellCentre();
      }
    }
    // A tap with «Move» among pieces: the app chooses the one there, or
    // none (TASK-402 part B).
    function tellTap(at) {
      if (canvas.choosing && canvas.mode === "move") {
        post({ type: "tapped", lngLat: lngLatAt(at), metresPerPx: metresPerPx() });
      }
    }
    function dropGesture() {
      if (gesture && (gesture.kind === "drag" || gesture.kind === "size" || gesture.kind === "bend")) {
        drawFigure(canvas.lines);
        drawBox(canvas.box);
        drawMarks(canvas.marks);
      }
      if (gesture && (gesture.kind === "drag" || gesture.kind === "size" || gesture.kind === "start")) {
        drawStart(canvas.start);
      }
      if (gesture && (gesture.kind === "ink" || gesture.kind === "tap")) {
        ink = [];
        drawInk();
      }
      gesture = null;
    }
    function moveGesture(touches, time) {
      if (gesture.kind === "ink" && touches.length === 1) {
        var at = pointOf(touches[0]);
        if (Math.hypot(at.x - inkLast.x, at.y - inkLast.y) >= ${INK_STEP_PX}) {
          ink.push(lngLatAt(at));
          inkLast = at;
          drawInk();
        }
      } else if (gesture.kind === "tap" && touches.length === 1) {
        gesture.at = pointOf(touches[0]);
        bandTo(gesture.at);
      } else if (gesture.kind === "bend" && touches.length === 1) {
        bendTo(pointOf(touches[0]));
      } else if (gesture.kind === "start" && touches.length === 1) {
        gesture.at = startAt(pointOf(touches[0]));
        drawStart(gesture.at);
      } else if (gesture.kind === "drag" && touches.length === 1) {
        var now = pointOf(touches[0]);
        var from = gesture.from;
        var far =
          Math.abs(now.x - from.x) >= ${MOVE_MIN_PX} ||
          Math.abs(now.y - from.y) >= ${MOVE_MIN_PX};
        if (!gesture.by && !far) {
          return;
        }
        if (!gesture.by && gesture.grab && time - gesture.since >= ${HOLD_MS}) {
          var bend = bendOf(gesture.grab, from);
          if (bend) {
            gesture = bend;
            bendTo(now);
            return;
          }
        }
        var a = map.unproject([from.x, from.y]);
        var b = map.unproject([now.x, now.y]);
        var by = [b.lng - a.lng, b.lat - a.lat];
        gesture.by = by;
        drawChanged(function (p) {
          return shiftedPoint(p, by);
        });
      } else if (gesture.kind === "pan" && touches.length === 1) {
        var to = pointOf(touches[0]);
        map.panBy([gesture.last.x - to.x, gesture.last.y - to.y], { animate: false });
        gesture.last = to;
      } else if ((gesture.kind === "size" || gesture.kind === "zoom") && touches.length === 2) {
        var first = pointOf(touches[0]);
        var second = pointOf(touches[1]);
        var ratio = apart(first, second) / gesture.from;
        if (gesture.kind === "size") {
          var factor = Math.min(canvas.grow, Math.max(canvas.shrink, ratio));
          var anchor = gesture.anchor;
          var turn = turnOf(gesture.angle, angleOf(first, second));
          gesture.factor = factor;
          gesture.turn = turn;
          drawChanged(function (p) {
            return heldPoint(p, anchor, factor, turn);
          });
          // The distance on screen follows, a step at a time.
          if (canvas.centre && Math.abs(factor / gesture.told - 1) >= 0.01) {
            gesture.told = factor;
            post({
              type: "figure",
              centre: sizedPoint(canvas.centre, anchor, factor),
              factor: factor,
              done: false,
            });
          }
        } else {
          var middle = middleOf(first, second);
          map.jumpTo({ zoom: gesture.zoom + Math.log2(ratio) });
          var held = map.project(gesture.anchor);
          map.panBy([held.x - middle.x, held.y - middle.y], { animate: false });
        }
      }
    }
    function listenToCanvas() {
      var surface = map.getCanvasContainer();
      var passive = { passive: true };
      surface.addEventListener("touchstart", function (event) {
        if (!canvas) {
          return;
        }
        // Another finger ends what one was doing.
        endGesture(false);
        startGesture(event.touches, event.timeStamp);
      }, passive);
      surface.addEventListener("touchmove", function (event) {
        if (canvas && gesture) {
          moveGesture(event.touches, event.timeStamp);
        }
      }, passive);
      surface.addEventListener("touchend", function (event) {
        if (!canvas || !gesture) {
          return;
        }
        if (event.touches.length === 0) {
          endGesture(true);
        } else if (gesture.kind === "size" || gesture.kind === "zoom") {
          // One of two fingers up: what they did is kept, and the one left
          // does nothing until it is lifted too.
          endGesture(true);
          gesture = { kind: "wait" };
        }
      }, passive);
      surface.addEventListener("touchcancel", function () {
        if (canvas) {
          dropGesture();
        }
      }, passive);
      // Where the map is, once it stops: a figure is put in its middle.
      map.on("moveend", function () {
        if (canvas && !gesture) {
          tellCentre();
        }
      });
    }
    // Framed on the figure, or on the start without one: north up, as the
    // engine keeps a shape upright.
    function frameCanvas() {
      wanted = 0;
      if (canvas.lines.length > 0) {
        var first = canvas.lines[0][0];
        var bounds = new maplibregl.LngLatBounds(first, first);
        eachPoint(canvas.lines, function (p) {
          bounds.extend(p);
        });
        map.fitBounds(bounds, { padding: ${FIGURE_PADDING_PX}, bearing: 0 });
      } else {
        map.easeTo({
          center: marker ? marker.getLngLat() : map.getCenter(),
          zoom: ${CANVAS_ZOOM},
          bearing: 0,
          duration: 500,
        });
      }
    }
    function setCanvas(message) {
      if (!canvas) {
        gesturesBefore = {};
        GESTURES.forEach(function (name) {
          var handler = map[name];
          if (handler) {
            gesturesBefore[name] = handler.isEnabled ? handler.isEnabled() : true;
            handler.disable();
          }
        });
        // The page must not take the finger for a scroll of its own.
        map.getCanvasContainer().style.touchAction = "none";
        if (!canvasListening) {
          canvasListening = true;
          listenToCanvas();
        }
      }
      gesture = null;
      canvas = {
        mode: message.mode,
        lines: message.lines,
        links: message.links,
        bendable: message.bendable,
        marks: message.marks,
        centre: message.centre,
        shrink: message.shrink,
        grow: message.grow,
        choosing: message.choosing === true,
        chosen: message.chosen || [],
        box: message.box || [],
        start: message.start || null,
        startLine: message.startLine || [],
        startEnds: message.startEnds === true,
      };
      // The app has answered the line drawn: the figure takes its place.
      ink = [];
      inkLooks(message.mode);
      drawInk();
      drawFigure(message.lines);
      drawBox(canvas.box);
      drawMarks(message.marks);
      drawStart(canvas.start);
      if (message.frame) {
        frameCanvas();
      }
    }
    function clearCanvas() {
      if (!canvas) {
        return;
      }
      canvas = null;
      gesture = null;
      ink = [];
      inkLooks("draw");
      drawInk();
      drawFigure([]);
      drawBox([]);
      drawMarks([]);
      drawStart(null);
      GESTURES.forEach(function (name) {
        var handler = map[name];
        if (handler && gesturesBefore && gesturesBefore[name]) {
          handler.enable();
        }
      });
      map.getCanvasContainer().style.touchAction = "";
    }
    // Choosing the start on the map (TASK-292, ADR-0252): the start's pin
    // is hidden and one like it stays in the middle of the map, which the
    // fingers move under it as always. The map is framed on the start,
    // north up, and the app is told where the middle is each time it stops.
    var picking = null;
    function setPick(on) {
      if (on && !picking) {
        var target = marker ? marker.getLngLat() : map.getCenter();
        if (marker) {
          marker.getElement().style.visibility = "hidden";
        }
        picking = new maplibregl.Marker({ color: ${toScript(POSITION_COLOR)} })
          .setLngLat(target)
          .addTo(map);
        // Without a start the map stays where it is.
        if (marker) {
          wanted = 0;
          map.easeTo({ center: target, zoom: ${START_ZOOM}, bearing: 0, duration: 500 });
        }
        post({ type: "centre", lngLat: [target.lng, target.lat] });
      } else if (!on && picking) {
        picking.remove();
        picking = null;
        if (marker) {
          marker.getElement().style.visibility = "";
        }
      }
    }
    map.on("move", function () {
      if (picking) {
        picking.setLngLat(map.getCenter());
      }
    });
    map.on("moveend", function () {
      if (picking) {
        tellCentre();
      }
    });
    window.shaperoute = {
      receive: function (message) {
        if (message.type === "setPosition") {
          showPin(message.lngLat);
          map.flyTo({ center: message.lngLat, zoom: ${START_ZOOM}, bearing: wanted });
        } else if (message.type === "showRoute") {
          var points = message.coordinates;
          // A word with the pen up: its letters are the route, its walks dashed.
          fullRoute = {
            type: "Feature",
            properties: {},
            geometry: message.walks
              ? { type: "MultiLineString", coordinates: message.letters }
              : { type: "LineString", coordinates: points },
          };
          // The route the engine placed where the shape was left (TASK-238).
          moveTold = false;
          // Running it, the route stays cut where the runner is.
          if (!progressing) {
            setRoute(fullRoute);
          }
          setWalks(
            message.walks
              ? {
                  type: "Feature",
                  properties: {},
                  geometry: { type: "MultiLineString", coordinates: message.walks },
                }
              : noRoute,
          );
          // A bike route: the stretches with the bike on foot, over it.
          setOnFoot(
            message.onFoot
              ? {
                  type: "Feature",
                  properties: {},
                  geometry: { type: "MultiLineString", coordinates: message.onFoot },
                }
              : noRoute,
          );
          var bounds = points.reduce(function (box, point) {
            return box.extend(point);
          }, new maplibregl.LngLatBounds(points[0], points[0]));
          framedPoints = points.slice();
          // The shape asked for under the route (TASK-442), whole in view
          // with it (TASK-443).
          if (ghost.geometry) {
            ghost.geometry.coordinates.forEach(function (line) {
              line.forEach(function (point) {
                bounds.extend(point);
                framedPoints.push(point);
              });
            });
          }
          setStartHere(message.startHere);
          if (message.startHere && marker) {
            // Where the user is and where to go, both in view.
            var asked = marker.getLngLat();
            bounds.extend(asked);
            framedPoints.push([asked.lng, asked.lat]);
          }
          // Turned as its drawing is (TASK-232): the shape reads upright.
          drawn = message.bearing || 0;
          wanted = drawn;
          framed = bounds;
          frame();
        } else if (message.type === "follow") {
          // An arrow once the heading is known; it stays one when a fix
          // comes without it. On «Compass» the phone's direction is one.
          if (typeof message.heading === "number" || arrow || facing !== null) {
            showArrow(message.lngLat, message.heading);
          } else {
            showPin(message.lngLat);
          }
          // The map stays turned as the drawing while it is run.
          following = true;
          map.easeTo({
            center: message.lngLat,
            zoom: ${FOLLOW_ZOOM},
            bearing: wanted,
            duration: 500,
          });
        } else if (message.type === "face") {
          // Where the phone points, on «Compass» (TASK-431): the arrow
          // turns there with the map, standing still too, and opens its
          // cone; null closes it, and the next fix turns the arrow as the
          // line run.
          facing = typeof message.heading === "number" ? message.heading : null;
          if (arrow) {
            showArrow(arrow.getLngLat(), null);
          } else if (marker && following && facing !== null) {
            showArrow(marker.getLngLat(), null);
          }
        } else if (message.type === "stopFollow") {
          following = false;
          facing = null;
          if (arrow) {
            showPin(arrow.getLngLat());
          }
        } else if (message.type === "showTrack") {
          setTrack({
            type: "Feature",
            properties: {},
            geometry: { type: "LineString", coordinates: message.coordinates },
          });
        } else if (message.type === "showStops") {
          setStops({
            type: "FeatureCollection",
            features: message.stops.map(function (s) {
              return {
                type: "Feature",
                properties: { name: s.name, passed: s.passed },
                geometry: { type: "Point", coordinates: s.lngLat },
              };
            }),
          });
        } else if (message.type === "clearStops") {
          setStops(noRoute);
        } else if (message.type === "focus") {
          map.flyTo({
            center: message.lngLat,
            zoom: Math.max(map.getZoom(), ${PLACE_ZOOM}),
            bearing: wanted,
          });
        } else if (message.type === "showOthers") {
          setOthers({
            type: "Feature",
            properties: {},
            geometry: { type: "MultiLineString", coordinates: message.lines },
          });
        } else if (message.type === "setCover") {
          setCover(message.cover);
        } else if (message.type === "showGhost") {
          setGhost(
            message.lines.length === 0
              ? noRoute
              : {
                  type: "Feature",
                  properties: {},
                  geometry: { type: "MultiLineString", coordinates: message.lines },
                },
          );
        } else if (message.type === "clearTrack") {
          setTrack(noRoute);
        } else if (message.type === "showLifts") {
          setTrack({
            type: "Feature",
            properties: {},
            geometry: { type: "MultiLineString", coordinates: message.skied },
          });
          setLifts({
            type: "Feature",
            properties: {},
            geometry: { type: "MultiLineString", coordinates: message.lifts },
          });
          setSkiDay(true, {
            type: "FeatureCollection",
            features: (message.labels || []).map(function (label) {
              return {
                type: "Feature",
                properties: { text: label.text, kind: label.kind },
                geometry: { type: "Point", coordinates: label.point },
              };
            }),
          });
        } else if (message.type === "clearLifts") {
          setLifts(noRoute);
          setSkiDay(false, noRoute);
        } else if (message.type === "showProgress") {
          showProgress(message);
        } else if (message.type === "clearProgress") {
          clearProgress();
        } else if (message.type === "setDoubleTap") {
          setDoubleTap(message.on);
        } else if (message.type === "setMove") {
          setMove(message.on);
        } else if (message.type === "clearRoute") {
          moveTold = false;
          fullRoute = noRoute;
          clearProgress();
          setWalks(noRoute);
          setOnFoot(noRoute);
          setRejoin(noRoute);
          setStartHere(null);
          // A map turned for its route is north-up again without it; one
          // turned by the user stays as it was left.
          framed = null;
          framedPoints = [];
          if (drawn !== 0) {
            drawn = 0;
            wanted = 0;
          }
        } else if (message.type === "turn") {
          turnTo(message.bearing);
        } else if (message.type === "setKind") {
          setKind(message.kind);
        } else if (message.type === "setCanvas") {
          setCanvas(message);
        } else if (message.type === "clearCanvas") {
          clearCanvas();
        } else if (message.type === "setPick") {
          setPick(message.on);
        } else if (message.type === "showRejoin") {
          setRejoin({
            type: "Feature",
            properties: {},
            geometry: { type: "LineString", coordinates: message.line },
          });
        } else if (message.type === "clearRejoin") {
          setRejoin(noRoute);
        }
      },
    };
    post({ type: "ready" });
  })();
</script>
</body>
</html>
`;
}
