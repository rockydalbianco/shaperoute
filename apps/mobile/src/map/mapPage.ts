import type { LatLon } from "@shaperoute/shared-types";

import { color, route } from "../theme/tokens";
import { toLngLat } from "./coordinates";
import { sgravaDarkStyle } from "./mapStyle";

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
 * The start asked for. MapLibre's default marker is a light blue that reads
 * as the cyan of "Start here" next to it, so it takes the text colour instead.
 */
export const POSITION_COLOR = color.text;

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
    var startHere = null;
    var noRoute = { type: "FeatureCollection", features: [] };
    var route = noRoute;
    var map = new maplibregl.Map({
      container: "map",
      style: ${toScript(MAP_STYLE)},
      bounds: ${bounds},
      fitBoundsOptions: { padding: 16 },
      attributionControl: false,
    });
    map.addControl(new maplibregl.AttributionControl({ compact: false }));
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }));
    map.once("style.load", function () {
      styleLoaded = true;
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
    });
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
          if (marker) {
            marker.setLngLat(message.lngLat);
          } else {
            marker = new maplibregl.Marker({ color: ${toScript(POSITION_COLOR)} })
              .setLngLat(message.lngLat)
              .addTo(map);
          }
          map.flyTo({ center: message.lngLat, zoom: ${START_ZOOM} });
        } else if (message.type === "showRoute") {
          var points = message.coordinates;
          setRoute({
            type: "Feature",
            properties: {},
            geometry: { type: "LineString", coordinates: points },
          });
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
          if (marker) {
            marker.setLngLat(message.lngLat);
          } else {
            marker = new maplibregl.Marker({ color: ${toScript(POSITION_COLOR)} })
              .setLngLat(message.lngLat)
              .addTo(map);
          }
          map.easeTo({ center: message.lngLat, zoom: ${FOLLOW_ZOOM}, duration: 500 });
        } else if (message.type === "clearRoute") {
          setRoute(noRoute);
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
