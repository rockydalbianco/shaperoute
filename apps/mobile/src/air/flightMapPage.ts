import type { Language } from "../i18n/languages";
import { kindLayers, PITCH_3D, TERRAIN_SPEC, withKinds } from "../map/mapKindStyle";
import {
  MAPLIBRE_CSS_SRI,
  MAPLIBRE_CSS_URL,
  MAPLIBRE_JS_SRI,
  MAPLIBRE_JS_URL,
} from "../map/mapPage";
import { LABEL_FONT, mapStyleFor } from "../map/mapStyle";
import { type Palette, vario } from "../theme/tokens";

/**
 * The flight map's page (TASK-479 part A1, ADR-0388): MapLibre in a
 * WebView, as the app's map, but a page of its own, small, for a widget of
 * the flight screen. It draws:
 * - the hills in 3D (the app's terrain), or the map flat;
 * - the track since the take-off in the colours of the climb, a fixed
 *   scale from −3 to +3 m/s (`vario` of the tokens);
 * - the take-off, and the pilot as an arrow the way they go;
 * - the camera on the pilot, turned the way they fly («Heading up», the
 *   course of the last 5 s, held while circling) or north up;
 * - the airspaces of the pilot's file near them (part E2): see-through
 *   volumes on the hills in 3D, outlines on the plain map.
 *
 * The map follows: it does not pan under a finger, it only zooms with two.
 * The phone calls `window.flight.*`; the page tells `ready`, `loaded`,
 * `error`, and every 5 s the frames a second the map drew (`fps`), to
 * measure what the 3D costs.
 */

/** Where a flight map starts: some kilometres around. */
export const FLIGHT_ZOOM = 13;
/** How long the camera takes to reach the pilot's new place, ms. */
export const FOLLOW_MS = 900;
/** The frames are counted over this long, ms. */
export const FPS_EVERY_MS = 5_000;
export const TRACK_WIDTH = 4;
export const PILOT_PX = 34;
/** How see-through the airspaces are. */
export const AIRSPACE_OPACITY = 0.2;
/** A press this long on the map marks a place (part D5). */
export const PRESS_MS = 600;
/** A finger moving farther than this is no press, points. */
export const PRESS_SLOP_PX = 12;
/** How see-through the next cylinder of the task is. */
export const TASK_FILL_OPACITY = 0.15;

/** The scale of the climb: m/s and its colour, from the tokens. */
export const VARIO_STOPS: readonly [number, string][] = [
  [-3, vario.sinkStrong],
  [-1, vario.sink],
  [0, vario.level],
  [1, vario.climb],
  [3, vario.climbStrong],
];

function toScript(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

export function buildFlightMapPage(palette: Palette, language: Language): string {
  const style = withKinds(mapStyleFor(palette, language));
  const layers = kindLayers(style);
  const lineColor = ["interpolate", ["linear"], ["get", "v"], ...VARIO_STOPS.flat()];
  // Prohibited, restricted and danger areas in the error colour, the others
  // in the warning colour: the palette's, as everywhere.
  const airspaceColor = ["case", ["get", "danger"], palette.error, palette.warning];
  // The task (part D2): the next cylinder in the accent and thicker, the
  // ones taken muted, the others in the text's colour.
  const taskColor = [
    "case",
    ["get", "next"],
    palette.accent,
    ["get", "taken"],
    palette.textMuted,
    palette.text,
  ];
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<link rel="stylesheet" href="${MAPLIBRE_CSS_URL}" integrity="${MAPLIBRE_CSS_SRI}" crossorigin="anonymous">
<style>
  html, body, #map { margin: 0; width: 100%; height: 100%; background: ${palette.map.background}; }
  .maplibregl-ctrl.maplibregl-ctrl-attrib { font-size: 9px; }
  .pilot { width: ${PILOT_PX}px; height: ${PILOT_PX}px; line-height: 0; pointer-events: none; }
</style>
</head>
<body>
<div id="map"></div>
<script src="${MAPLIBRE_JS_URL}" integrity="${MAPLIBRE_JS_SRI}" crossorigin="anonymous"></script>
<script>
  var STYLE = ${toScript(style)};
  var LAYERS = ${toScript(layers)};
  var TERRAIN = ${toScript(TERRAIN_SPEC)};
  var PITCH_3D = ${PITCH_3D};
  var FOLLOW_MS = ${FOLLOW_MS};
  var NONE = { type: "FeatureCollection", features: [] };
  var view = { threeD: true, headingUp: true };
  var pilot = null;
  var marker = null;
  var pilotShown = false;

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
      center: [11, 46],
      zoom: ${FLIGHT_ZOOM},
      attributionControl: false,
      dragPan: false,
      dragRotate: false,
      touchPitch: false,
      doubleClickZoom: false,
      keyboard: false,
    });
    map.touchZoomRotate.disableRotation();
    // The page sets the height the camera looks at itself (follow).
    map.setCenterClampedToGround(false);
    map.addControl(new maplibregl.AttributionControl({ compact: true }));
    map.on("error", function () {});
    // A long press marks a place (part D5): the app asks what to put there.
    var press = null;
    function pressCancel() {
      if (press !== null) {
        clearTimeout(press.timer);
        press = null;
      }
    }
    map.on("touchstart", function (event) {
      pressCancel();
      var touches = event.originalEvent && event.originalEvent.touches;
      if (touches && touches.length > 1) {
        return;
      }
      var at = event.lngLat;
      press = {
        point: event.point,
        timer: setTimeout(function () {
          press = null;
          post({ type: "press", lat: at.lat, lon: at.lng });
        }, ${PRESS_MS}),
      };
    });
    map.on("touchmove", function (event) {
      if (press !== null && Math.hypot(event.point.x - press.point.x, event.point.y - press.point.y) > ${PRESS_SLOP_PX}) {
        pressCancel();
      }
    });
    map.on("touchend", pressCancel);
    map.on("touchcancel", pressCancel);
    map.once("idle", function () {
      post({ type: "loaded" });
    });
    map.on("load", function () {
      map.addSource("flight-track", { type: "geojson", data: NONE });
      map.addLayer({
        id: "flight-track",
        type: "line",
        source: "flight-track",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": ${toScript(lineColor)}, "line-width": ${TRACK_WIDTH} },
      });
      // The pilot's airspaces (part E2): under the track, see-through.
      map.addSource("flight-airspace", { type: "geojson", data: NONE });
      map.addLayer(
        {
          id: "flight-airspace-volume",
          type: "fill-extrusion",
          source: "flight-airspace",
          filter: ["!", ["get", "flat"]],
          paint: {
            "fill-extrusion-color": ${toScript(airspaceColor)},
            "fill-extrusion-base": ["*", ["get", "base"], TERRAIN.exaggeration],
            "fill-extrusion-height": ["*", ["get", "top"], TERRAIN.exaggeration],
            "fill-extrusion-opacity": ${AIRSPACE_OPACITY},
          },
        },
        "flight-track",
      );
      map.addLayer(
        {
          id: "flight-airspace-area",
          type: "fill",
          source: "flight-airspace",
          paint: { "fill-color": ${toScript(airspaceColor)}, "fill-opacity": ${AIRSPACE_OPACITY} },
        },
        "flight-track",
      );
      map.addLayer(
        {
          id: "flight-airspace-edge",
          type: "line",
          source: "flight-airspace",
          paint: { "line-color": ${toScript(airspaceColor)}, "line-width": 2 },
        },
        "flight-track",
      );
      // The pilot's task (part D2): rings and the goal line on the ground,
      // the way left dashed; under the track.
      map.addSource("flight-task", { type: "geojson", data: NONE });
      map.addLayer(
        {
          id: "flight-task-next",
          type: "fill",
          source: "flight-task",
          filter: ["all", ["==", ["get", "part"], "cylinder"], ["get", "next"]],
          paint: { "fill-color": ${toScript(palette.accent)}, "fill-opacity": ${TASK_FILL_OPACITY} },
        },
        "flight-track",
      );
      map.addLayer(
        {
          id: "flight-task-edge",
          type: "line",
          source: "flight-task",
          filter: ["!=", ["get", "part"], "route"],
          paint: {
            "line-color": ${toScript(taskColor)},
            "line-width": ["case", ["get", "next"], 4, 2],
          },
        },
        "flight-track",
      );
      map.addLayer(
        {
          id: "flight-task-route",
          type: "line",
          source: "flight-task",
          filter: ["==", ["get", "part"], "route"],
          layout: { "line-cap": "round" },
          paint: {
            "line-color": ${toScript(palette.accent)},
            "line-width": 2,
            "line-dasharray": [2, 2],
          },
        },
        "flight-track",
      );
      // The pilot's waypoints (part D5): a turnpoint a filled dot, a
      // landing a ring, each with its name; under the track.
      map.addSource("flight-waypoints", { type: "geojson", data: NONE });
      map.addLayer(
        {
          id: "flight-waypoint-dot",
          type: "circle",
          source: "flight-waypoints",
          paint: {
            "circle-radius": 7,
            "circle-color": ${toScript(palette.text)},
            "circle-opacity": ["case", ["get", "landing"], 0, 1],
            "circle-stroke-color": ${toScript(palette.text)},
            "circle-stroke-width": 3,
          },
        },
        "flight-track",
      );
      map.addLayer(
        {
          id: "flight-waypoint-name",
          type: "symbol",
          source: "flight-waypoints",
          layout: {
            "text-field": ["get", "name"],
            "text-font": ${toScript(LABEL_FONT)},
            "text-size": 13,
            "text-offset": [0, 1.3],
            "text-anchor": "top",
          },
          paint: {
            "text-color": ${toScript(palette.text)},
            "text-halo-color": ${toScript(palette.background)},
            "text-halo-width": 1.5,
          },
        },
        "flight-track",
      );
      map.addSource("flight-takeoff", { type: "geojson", data: NONE });
      map.addLayer({
        id: "flight-takeoff",
        type: "circle",
        source: "flight-takeoff",
        paint: {
          "circle-radius": 7,
          "circle-color": ${toScript(palette.surface)},
          "circle-stroke-color": ${toScript(palette.text)},
          "circle-stroke-width": 3,
        },
      });
      var element = document.createElement("div");
      element.className = "pilot";
      element.innerHTML =
        '<svg viewBox="0 0 24 24" width="${PILOT_PX}" height="${PILOT_PX}">' +
        '<path d="M12 2 L20 21 L12 16.5 L4 21 Z" fill=${toScript(palette.accent)} ' +
        'stroke=${toScript(palette.onAccent)} stroke-width="1.6" stroke-linejoin="round"/></svg>';
      marker = new maplibregl.Marker({
        element: element,
        rotationAlignment: "map",
        pitchAlignment: "map",
      });
      setView(view.threeD, view.headingUp);
      post({ type: "ready" });
    });
  }

  function showKind(threeD) {
    var shown = LAYERS[threeD ? "3d" : "standard"];
    STYLE.layers.forEach(function (layer) {
      if (map.getLayer(layer.id)) {
        map.setLayoutProperty(layer.id, "visibility", shown.indexOf(layer.id) >= 0 ? "visible" : "none");
      }
    });
    map.setTerrain(threeD ? TERRAIN : null);
    // The airspaces: standing up on the hills, lying flat on the plain map.
    if (map.getLayer("flight-airspace-volume")) {
      map.setLayoutProperty("flight-airspace-volume", "visibility", threeD ? "visible" : "none");
      map.setLayoutProperty("flight-airspace-area", "visibility", threeD ? "none" : "visible");
    }
  }

  function follow(duration) {
    if (pilot === null) {
      return;
    }
    // On the hills the camera looks at the ground under the pilot, not at
    // the sea's level under it: else the pilot is above the screen, hidden
    // by the mountain (seen on the simulator, 2026-11-22). The terrain's
    // height as drawn, exaggerated as the hills are.
    var ground = view.threeD ? map.queryTerrainElevation([pilot.lon, pilot.lat]) : null;
    map.setCenterElevation(typeof ground === "number" && isFinite(ground) ? ground : 0);
    map.easeTo({
      center: [pilot.lon, pilot.lat],
      bearing: view.headingUp && pilot.course !== null ? pilot.course : 0,
      pitch: view.threeD ? PITCH_3D : 0,
      duration: duration,
      essential: true,
    });
  }

  function setView(threeD, headingUp) {
    view = { threeD: threeD, headingUp: headingUp };
    showKind(threeD);
    follow(600);
  }

  function setPilot(lat, lon, headingDeg, course) {
    pilot = { lat: lat, lon: lon, course: course };
    marker.setLngLat([lon, lat]);
    if (headingDeg !== null) {
      marker.setRotation(headingDeg);
    }
    if (!pilotShown) {
      pilotShown = true;
      marker.addTo(map);
      follow(0);
    } else {
      follow(FOLLOW_MS);
    }
  }

  function setTrack(collection) {
    var source = map.getSource("flight-track");
    if (source) {
      source.setData(collection);
    }
  }

  function setAirspace(collection) {
    var source = map.getSource("flight-airspace");
    if (source) {
      source.setData(collection);
    }
  }

  function setWaypoints(collection) {
    var source = map.getSource("flight-waypoints");
    if (source) {
      source.setData(collection);
    }
  }

  function setTask(collection) {
    var source = map.getSource("flight-task");
    if (source) {
      source.setData(collection);
    }
  }

  function setTakeoff(lat, lon) {
    var source = map.getSource("flight-takeoff");
    if (source) {
      source.setData(
        lat === null
          ? NONE
          : { type: "Feature", properties: {}, geometry: { type: "Point", coordinates: [lon, lat] } },
      );
    }
  }

  window.flight = {
    setView: setView,
    setPilot: setPilot,
    setTrack: setTrack,
    setTakeoff: setTakeoff,
    setAirspace: setAirspace,
    setTask: setTask,
    setWaypoints: setWaypoints,
  };

  // The frames the map drew a second, told every few seconds: what the
  // hills in 3D cost while the camera follows.
  var frames = 0;
  var since = Date.now();
  if (typeof map !== "undefined") {
    map.on("render", function () {
      frames += 1;
    });
  }
  setInterval(function () {
    var now = Date.now();
    if (now > since) {
      post({ type: "fps", fps: Math.round((frames * 1000) / (now - since)) });
    }
    frames = 0;
    since = now;
  }, ${FPS_EVERY_MS});
</script>
</body>
</html>`;
}

export type FlightMapMessage =
  | { type: "ready" }
  | { type: "loaded" }
  | { type: "error" }
  | { type: "fps"; fps: number }
  | { type: "press"; point: [number, number] };

export function parseFlightMapMessage(data: string): FlightMapMessage | null {
  try {
    const message: unknown = JSON.parse(data);
    if (typeof message !== "object" || message === null) {
      return null;
    }
    const one = message as Record<string, unknown>;
    if (one.type === "ready" || one.type === "loaded" || one.type === "error") {
      return { type: one.type };
    }
    if (one.type === "fps" && typeof one.fps === "number" && Number.isFinite(one.fps)) {
      return { type: "fps", fps: one.fps };
    }
    if (
      one.type === "press" &&
      typeof one.lat === "number" &&
      typeof one.lon === "number" &&
      Math.abs(one.lat) <= 90 &&
      Math.abs(one.lon) <= 180
    ) {
      return { type: "press", point: [one.lat, one.lon] };
    }
    return null;
  } catch {
    return null;
  }
}
