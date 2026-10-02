import type { LatLon } from "@shaperoute/shared-types";

import { color, otherRoute, route, stop, track, walk } from "../theme/tokens";
import { toLngLat } from "./coordinates";
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

/** The other routes to choose from, under the route (TASK-093). */
export const OTHER_ROUTE_COLOR = otherRoute.color;
export const OTHER_ROUTE_WIDTH = otherRoute.width;
export const OTHER_ROUTE_OPACITY = otherRoute.opacity;

/** The walks of a word with the pen up, dashed under the route (TASK-198). */
export const WALK_COLOR = walk.color;
export const WALK_WIDTH = walk.width;
export const WALK_OPACITY = walk.opacity;
export const WALK_DASH = walk.dash;

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
    var walks = noRoute;
    var track = noRoute;
    var stops = noRoute;
    var others = noRoute;
    var map = new maplibregl.Map({
      container: "map",
      style: ${toScript(MAP_STYLE)},
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
    function setWalks(data) {
      walks = data;
      var source = map.getSource("walks");
      if (source) {
        source.setData(walks);
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
    window.shaperoute = {
      receive: function (message) {
        if (message.type === "setPosition") {
          showPin(message.lngLat);
          map.flyTo({ center: message.lngLat, zoom: ${START_ZOOM} });
        } else if (message.type === "showRoute") {
          var points = message.coordinates;
          // A word with the pen up: its letters are the route, its walks dashed.
          setRoute({
            type: "Feature",
            properties: {},
            geometry: message.walks
              ? { type: "MultiLineString", coordinates: message.letters }
              : { type: "LineString", coordinates: points },
          });
          setWalks(
            message.walks
              ? {
                  type: "Feature",
                  properties: {},
                  geometry: { type: "MultiLineString", coordinates: message.walks },
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
          map.fitBounds(bounds, { padding: 40 });
        } else if (message.type === "follow") {
          // An arrow once the heading is known; it stays one when a fix
          // comes without it.
          if (typeof message.heading === "number" || arrow) {
            showArrow(message.lngLat, message.heading);
          } else {
            showPin(message.lngLat);
          }
          map.easeTo({ center: message.lngLat, zoom: ${FOLLOW_ZOOM}, duration: 500 });
        } else if (message.type === "stopFollow") {
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
        } else if (message.type === "clearRoute") {
          setRoute(noRoute);
          setWalks(noRoute);
          setStartHere(null);
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
