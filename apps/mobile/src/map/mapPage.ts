import type { LatLon } from "@shaperoute/shared-types";

import {
  color,
  onFoot,
  otherRoute,
  route,
  routeAhead,
  stop,
  track,
  walk,
} from "../theme/tokens";
import { toLngLat } from "./coordinates";
import { kindLayers, PITCH_3D, TERRAIN_SPEC, withKinds } from "./mapKindStyle";
import { LABEL_FONT, sgravaDarkStyle } from "./mapStyle";

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

/** The style, written into the page: nothing to fetch, colours from the tokens. */
export const MAP_STYLE = sgravaDarkStyle;

/** What the map shows before a start is known: the whole of Italy. */
export const ITALY_BOUNDS: [southWest: LatLon, northEast: LatLon] = [
  [35.5, 6.6],
  [47.1, 18.6],
];

/** Zoom used to show a start: a few streets around it. */
export const START_ZOOM = 15;

/** Zoom while navigating: the next junction and the streets around it. */
export const FOLLOW_ZOOM = 17;

/** The route line: the brand yellow, the one thing on the map that has it. */
export const ROUTE_COLOR = route.color;
export const ROUTE_WIDTH = route.width;
export const ROUTE_OPACITY = route.opacity;

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

/** The run over its route (TASK-113). */
export const TRACK_COLOR = track.color;
export const TRACK_WIDTH = track.width;
export const TRACK_OPACITY = track.opacity;

/**
 * The start asked for. MapLibre's default marker is a light blue that reads
 * as the cyan of "Start here" next to it, so it takes the text colour instead.
 */
export const POSITION_COLOR = color.text;

/**
 * The runner while running (TASK-164): an arrow in the marker's colour,
 * turned where the runner is heading, on a faint disc of the same colour;
 * the dark edge keeps it readable over the yellow of the route.
 */
export const HEADING_ARROW_SIZE = 36;
export const HEADING_ARROW_SVG =
  `<svg xmlns="http://www.w3.org/2000/svg" width="${HEADING_ARROW_SIZE}" height="${HEADING_ARROW_SIZE}" viewBox="0 0 36 36">` +
  `<circle cx="18" cy="18" r="17" fill="${POSITION_COLOR}" fill-opacity="0.18"/>` +
  `<path d="M18 5 L27.5 28 L18 23 L8.5 28 Z" fill="${POSITION_COLOR}" stroke="${color.map.background}" stroke-width="1.5" stroke-linejoin="round"/>` +
  `</svg>`;

/** Where a moved route begins (ADR-0040): a cyan marker and its label. */
export const START_HERE_COLOR = color.startHere;
export const START_HERE_LABEL = "Start here";

/** Behind the map while it loads, so the page never flashes white. */
export const MAP_BACKGROUND = color.map.background;

/**
 * A value as a JavaScript literal inside the page's `<script>`. `<` is escaped
 * so that no string in it (the attribution has links) can close the script.
 */
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

export function buildMapPage(): string {
  const bounds = JSON.stringify(ITALY_BOUNDS.map(toLngLat));
  // With the photos and the hills in it, hidden (TASK-264).
  const style = withKinds(MAP_STYLE);
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<link rel="stylesheet" href="${MAPLIBRE_CSS_URL}" integrity="${MAPLIBRE_CSS_SRI}" crossorigin="anonymous">
<style>
  html, body, #map { margin: 0; width: 100%; height: 100%; background: ${MAP_BACKGROUND}; }
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
    var startHere = null;
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
    var track = noRoute;
    var stops = noRoute;
    var others = noRoute;
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
          "line-color": ${toScript(TRACK_COLOR)},
          "line-width": ${TRACK_WIDTH},
          "line-opacity": ${TRACK_OPACITY},
        },
      });
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
        element.innerHTML = ${toScript(HEADING_ARROW_SVG)};
        // Turned with the map: north of the arrow is north of the map.
        arrow = new maplibregl.Marker({ element: element, rotationAlignment: "map" })
          .setLngLat(lngLat)
          .addTo(map);
      }
      arrow.setLngLat(lngLat);
      if (typeof heading === "number") {
        arrow.setRotation(heading);
      }
    }
    function setStartHere(lngLat) {
      if (startHere) {
        startHere.remove();
        startHere = null;
      }
      if (lngLat) {
        var label = new maplibregl.Popup({ closeButton: false, closeOnClick: false })
          .setText(${JSON.stringify(START_HERE_LABEL)});
        startHere = new maplibregl.Marker({ color: ${toScript(START_HERE_COLOR)} })
          .setLngLat(lngLat)
          .setPopup(label)
          .addTo(map)
          .togglePopup();
      }
    }
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
    function setTrack(data) {
      track = data;
      var source = map.getSource("track");
      if (source) {
        source.setData(track);
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
    function frame() {
      inFrame = true;
      map.fitBounds(framed, { padding: 40, bearing: wanted });
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
        map.fitBounds(framed, { padding: 40, bearing: wanted, pitch: pitch });
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
          setStartHere(message.startHere);
          if (message.startHere && marker) {
            // Where the user is and where to go, both in view.
            bounds.extend(marker.getLngLat());
          }
          // Turned as its drawing is (TASK-232): the shape reads upright.
          drawn = message.bearing || 0;
          wanted = drawn;
          framed = bounds;
          frame();
        } else if (message.type === "follow") {
          // An arrow once the heading is known; it stays one when a fix
          // comes without it.
          if (typeof message.heading === "number" || arrow) {
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
        } else if (message.type === "stopFollow") {
          following = false;
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
        } else if (message.type === "showOthers") {
          setOthers({
            type: "Feature",
            properties: {},
            geometry: { type: "MultiLineString", coordinates: message.lines },
          });
        } else if (message.type === "clearTrack") {
          setTrack(noRoute);
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
          setStartHere(null);
          // A map turned for its route is north-up again without it; one
          // turned by the user stays as it was left.
          framed = null;
          if (drawn !== 0) {
            drawn = 0;
            wanted = 0;
          }
        } else if (message.type === "turn") {
          turnTo(message.bearing);
        } else if (message.type === "setKind") {
          setKind(message.kind);
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
