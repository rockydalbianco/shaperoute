import type { FlyingSite } from "@shaperoute/shared-types";

import type { Language } from "../i18n/languages";
import {
  MAPLIBRE_CSS_SRI,
  MAPLIBRE_CSS_URL,
  MAPLIBRE_JS_SRI,
  MAPLIBRE_JS_URL,
} from "../map/mapPage";
import { mapStyleFor } from "../map/mapStyle";
import type { Palette } from "../theme/tokens";

/**
 * The map of takeoffs (TASK-493 part C, ADR-0400): MapLibre in a WebView,
 * with the app's style, a page of its own as the flight map's
 * (air/flightMapPage.ts). It moves under a finger; when it stops it tells
 * the box it shows, and the phone sends back the sites of that box. A
 * takeoff is a filled dot in the text's colour, a landing a ring in the
 * muted one: never the yellow, which is the route's. Their names show
 * when the map is close enough. A tap on a site tells its id. The
 * attribution of OpenStreetMap is always visible, never folded.
 *
 * The phone calls `window.takeoffs.*`; the page tells `ready`, `loaded`,
 * `error`, `box` and `site`.
 */

/** Where the map starts without a place: the Alps. */
export const START_CENTER: [number, number] = [46.2, 10.8];
export const START_ZOOM = 7;
/** A place known: about thirty kilometres around. */
export const PLACE_ZOOM = 10;
/** From here on the names of the sites are written. */
export const NAMES_ZOOM = 11;
export const DOT_RADIUS = 6;
export const SELECTED_RADIUS = 10;
export const ATTRIBUTION = "© OpenStreetMap contributors";

function toScript(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

/** The sites as the page draws them. */
export function sitesCollection(sites: readonly FlyingSite[]): unknown {
  return {
    type: "FeatureCollection",
    features: sites.map((site) => ({
      type: "Feature",
      id: site.id,
      properties: { id: site.id, kind: site.kind, name: site.name ?? "" },
      geometry: { type: "Point", coordinates: [site.lon, site.lat] },
    })),
  };
}

export function buildTakeoffsMapPage(
  palette: Palette,
  language: Language,
  center: [number, number] | null,
): string {
  const style = mapStyleFor(palette, language);
  const [lat, lon] = center ?? START_CENTER;
  const zoom = center === null ? START_ZOOM : PLACE_ZOOM;
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<link rel="stylesheet" href="${MAPLIBRE_CSS_URL}" integrity="${MAPLIBRE_CSS_SRI}" crossorigin="anonymous">
<style>
  html, body, #map { margin: 0; width: 100%; height: 100%; background: ${palette.map.background}; }
  .maplibregl-ctrl.maplibregl-ctrl-attrib { font-size: 10px; }
</style>
</head>
<body>
<div id="map"></div>
<script src="${MAPLIBRE_JS_URL}" integrity="${MAPLIBRE_JS_SRI}" crossorigin="anonymous"></script>
<script>
  var STYLE = ${toScript(style)};
  var NONE = { type: "FeatureCollection", features: [] };
  var selected = null;

  function post(message) {
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify(message));
    }
  }

  if (typeof maplibregl === "undefined") {
    post({ type: "error" });
  } else {
    var map = new maplibregl.Map({
      container: "map",
      style: STYLE,
      center: [${lon}, ${lat}],
      zoom: ${zoom},
      attributionControl: false,
      dragRotate: false,
      touchPitch: false,
      keyboard: false,
    });
    map.touchZoomRotate.disableRotation();
    map.addControl(
      new maplibregl.AttributionControl({
        compact: false,
        customAttribution: ${toScript(ATTRIBUTION)},
      }),
    );
    map.on("error", function () {});
    map.once("idle", function () {
      post({ type: "loaded" });
    });

    function tellBox() {
      var b = map.getBounds();
      post({
        type: "box",
        south: b.getSouth(),
        west: b.getWest(),
        north: b.getNorth(),
        east: b.getEast(),
        zoom: map.getZoom(),
      });
    }

    map.on("load", function () {
      map.addSource("sites", { type: "geojson", data: NONE });
      map.addLayer({
        id: "sites-landing",
        type: "circle",
        source: "sites",
        filter: ["==", ["get", "kind"], "landing"],
        paint: {
          "circle-radius": ["case", ["boolean", ["feature-state", "selected"], false], ${SELECTED_RADIUS}, ${DOT_RADIUS}],
          "circle-color": ${toScript(palette.map.background)},
          "circle-stroke-color": ${toScript(palette.textMuted)},
          "circle-stroke-width": 3,
        },
      });
      map.addLayer({
        id: "sites-takeoff",
        type: "circle",
        source: "sites",
        filter: ["==", ["get", "kind"], "takeoff"],
        paint: {
          "circle-radius": ["case", ["boolean", ["feature-state", "selected"], false], ${SELECTED_RADIUS}, ${DOT_RADIUS}],
          "circle-color": ${toScript(palette.text)},
          "circle-stroke-color": ${toScript(palette.map.background)},
          "circle-stroke-width": 2,
        },
      });
      map.addLayer({
        id: "sites-names",
        type: "symbol",
        source: "sites",
        minzoom: ${NAMES_ZOOM},
        layout: {
          "text-field": ["get", "name"],
          "text-size": 12,
          "text-offset": [0, 1.2],
          "text-anchor": "top",
          "text-optional": true,
        },
        paint: {
          "text-color": ${toScript(palette.text)},
          "text-halo-color": ${toScript(palette.map.background)},
          "text-halo-width": 1.5,
        },
      });
      ["sites-takeoff", "sites-landing"].forEach(function (layer) {
        map.on("click", layer, function (event) {
          var feature = event.features && event.features[0];
          if (feature) {
            post({ type: "site", id: feature.properties.id });
          }
        });
      });
      map.on("moveend", tellBox);
      post({ type: "ready" });
      tellBox();
    });
  }

  function setSites(collection) {
    if (typeof map === "undefined" || !map.getSource("sites")) {
      return;
    }
    map.getSource("sites").setData(collection);
    if (selected !== null) {
      map.setFeatureState({ source: "sites", id: selected }, { selected: true });
    }
  }

  function select(id) {
    if (typeof map === "undefined" || !map.getSource("sites")) {
      return;
    }
    if (selected !== null) {
      map.setFeatureState({ source: "sites", id: selected }, { selected: false });
    }
    selected = id;
    if (id !== null) {
      map.setFeatureState({ source: "sites", id: id }, { selected: true });
    }
  }

  function center(lat, lon, zoom) {
    if (typeof map !== "undefined") {
      map.easeTo({ center: [lon, lat], zoom: zoom, duration: 600 });
    }
  }

  window.takeoffs = { setSites: setSites, select: select, center: center };
</script>
</body>
</html>`;
}

export type TakeoffsMapMessage =
  | { type: "ready" }
  | { type: "loaded" }
  | { type: "error" }
  | {
      type: "box";
      south: number;
      west: number;
      north: number;
      east: number;
      zoom: number;
    }
  | { type: "site"; id: number };

const isNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

export function parseTakeoffsMapMessage(data: string): TakeoffsMapMessage | null {
  try {
    const message: unknown = JSON.parse(data);
    if (typeof message !== "object" || message === null) {
      return null;
    }
    const one = message as Record<string, unknown>;
    if (one.type === "ready" || one.type === "loaded" || one.type === "error") {
      return { type: one.type };
    }
    if (
      one.type === "box" &&
      isNumber(one.south) &&
      isNumber(one.west) &&
      isNumber(one.north) &&
      isNumber(one.east) &&
      isNumber(one.zoom)
    ) {
      return {
        type: "box",
        south: one.south,
        west: one.west,
        north: one.north,
        east: one.east,
        zoom: one.zoom,
      };
    }
    if (one.type === "site" && isNumber(one.id) && Number.isInteger(one.id)) {
      return { type: "site", id: one.id };
    }
    return null;
  } catch {
    return null;
  }
}
