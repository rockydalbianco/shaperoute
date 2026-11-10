/**
 * The live page on the screen (TASK-424, ADR-0352): asks GET /live every
 * 10 s with the token after the `#`, and shows the track on the map, the
 * numbers and the line under the title. What to show is worked out in
 * view.js, without the DOM; here only the page, the map and the timers.
 */
import { fill, pickLanguage, TEXTS } from "./texts.js";
import {
  apiBase,
  applyView,
  boundsOf,
  busyDelayMs,
  emptyState,
  kindOf,
  MAP_COLOURS,
  mapStyle,
  nextDelayMs,
  numbersOf,
  statusOf,
  timeOfDay,
  tokenFromHash,
  trackOf,
  unitsOf,
  VIEW_EVERY_MS,
  viewUrl,
} from "./view.js";

const lang = pickLanguage(navigator.languages ?? [navigator.language]);
const units = unitsOf(navigator.languages ?? [navigator.language]);
const text = TEXTS[lang];
const api = apiBase(window.location);

const badge = document.querySelector("[data-badge]");
const status = document.querySelector("[data-status]");
const mapBox = document.querySelector("[data-map-box]");
const mapElement = document.querySelector("[data-map]");
const numbers = document.querySelector("[data-numbers]");

let state = emptyState();
let token = null;
let timer = null;
/** A new token (the `#` changed) leaves the answers of the old one unread. */
let round = 0;
/** One request at a time. */
let asking = false;

let map = null;
let mapReady = false;
let framed = false;

function putTexts() {
  document.documentElement.lang = lang;
  document.title = `${text.title} — MuW`;
  for (const element of document.querySelectorAll("[data-text]")) {
    element.textContent = text[element.dataset.text];
  }
  const privacy = document.querySelector("[data-privacy]");
  if (privacy && lang !== "en") {
    privacy.setAttribute("href", `../privacy/${lang}/`);
  }
}

function showStatus() {
  const now = Date.now();
  const { badge: which, line } = statusOf(state, now);
  badge.hidden = which === null;
  if (which !== null) {
    badge.textContent = text[which];
    badge.className = `live__badge live__badge--${which}`;
  }
  status.textContent = line
    ? fill(text[line.key], {
        n: line.n ?? "",
        time: line.time === undefined ? "" : timeOfDay(line.time, lang),
      })
    : "";
  status.classList.toggle(
    "live__status--ended",
    state.status === "stopped" || state.status === "expired" || state.status === "finished",
  );
}

function showNumbers() {
  const rows = numbersOf(state, Date.now(), { lang, units });
  numbers.replaceChildren(
    ...rows.map((row) => {
      const item = document.createElement("div");
      if (row.key === "exercise") {
        item.className = "live__wide";
      }
      const name = document.createElement("dt");
      name.textContent = text[row.key];
      const value = document.createElement("dd");
      value.textContent = row.value;
      if (row.unit) {
        const unit = document.createElement("small");
        unit.textContent = row.unit;
        value.append(unit);
      }
      item.append(name, value);
      return item;
    }),
  );
}

function mapColours() {
  const css = getComputedStyle(document.documentElement);
  const read = (name) => css.getPropertyValue(`--map-${name}`).trim();
  return {
    colours: Object.fromEntries(MAP_COLOURS.map((name) => [name, read(name)])),
    track: read("track"),
    casing: read("track-casing"),
    position: read("position"),
  };
}

function startMap() {
  if (map || !window.maplibregl) {
    return;
  }
  const { colours, track, casing, position } = mapColours();
  try {
    map = new window.maplibregl.Map({
      container: mapElement,
      style: mapStyle(colours, lang),
      center: [state.points[0][1], state.points[0][0]],
      zoom: 15,
      attributionControl: false,
      dragRotate: false,
      pitchWithRotate: false,
    });
  } catch {
    // No WebGL: the numbers stay, without the map.
    map = null;
    mapBox.hidden = true;
    return;
  }
  map.addControl(new window.maplibregl.AttributionControl({ compact: false }));
  map.addControl(new window.maplibregl.NavigationControl({ showCompass: false }), "top-right");
  // The style is written here: the track can draw before the tiles come.
  map.once("style.load", () => {
    const empty = trackOf([]);
    map.addSource("track", { type: "geojson", data: empty.line });
    map.addSource("position", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
    map.addLayer({
      id: "track-casing",
      type: "line",
      source: "track",
      layout: { "line-join": "round", "line-cap": "round" },
      paint: { "line-color": casing, "line-width": 8, "line-opacity": 0.6 },
    });
    map.addLayer({
      id: "track",
      type: "line",
      source: "track",
      layout: { "line-join": "round", "line-cap": "round" },
      paint: { "line-color": track, "line-width": 4.5 },
    });
    map.addLayer({
      id: "position",
      type: "circle",
      source: "position",
      paint: {
        "circle-radius": 7,
        "circle-color": position,
        "circle-stroke-color": casing,
        "circle-stroke-width": 3,
      },
    });
    mapReady = true;
    showTrack();
  });
}

function showTrack() {
  const onMap = kindOf(state) === "map" && state.points.length > 0;
  mapBox.hidden = !onMap;
  if (!onMap) {
    return;
  }
  startMap();
  if (!map || !mapReady) {
    return;
  }
  const { line, position } = trackOf(state.points);
  map.getSource("track").setData(line);
  map.getSource("position").setData(position ?? { type: "FeatureCollection", features: [] });
  if (!framed) {
    framed = true;
    const bounds = boundsOf(state.points);
    if (state.points.length > 1) {
      map.fitBounds(bounds, { padding: 48, maxZoom: 16, animate: false });
    } else {
      map.jumpTo({ center: bounds[0], zoom: 15 });
    }
  } else if (position && !map.getBounds().contains(position.geometry.coordinates)) {
    // The position left the view: the map follows, at the zoom chosen.
    map.easeTo({ center: position.geometry.coordinates });
  }
}

function show() {
  showStatus();
  showNumbers();
  showTrack();
}

async function ask(mine) {
  if (asking) {
    return;
  }
  asking = true;
  let delay = VIEW_EVERY_MS;
  try {
    const answer = await fetch(viewUrl(api, token, state.lastSeq), {
      cache: "no-store",
      credentials: "omit",
      referrerPolicy: "no-referrer",
    });
    if (answer.status === 429) {
      delay = busyDelayMs(answer.headers.get("Retry-After"));
    } else if (answer.ok) {
      const view = await answer.json();
      if (mine === round) {
        state = applyView(state, view, Date.now());
        delay = nextDelayMs(view);
        show();
      }
    }
  } catch {
    // No network: the next round asks again, and after a while the line
    // under the title says since when nothing came.
  } finally {
    asking = false;
  }
  if (mine !== round) {
    // The `#` changed meanwhile: the new link is asked now.
    if (token !== null) {
      ask(round);
    }
  } else if (delay !== null) {
    timer = setTimeout(() => ask(mine), delay);
  }
}

function start() {
  round += 1;
  clearTimeout(timer);
  state = emptyState();
  framed = false;
  token = tokenFromHash(window.location.hash);
  if (token === null) {
    // No token, or not one the server ever made: as the API answers it.
    state = applyView(state, { status: "expired" }, Date.now());
    show();
    return;
  }
  show();
  ask(round);
}

putTexts();
start();
window.addEventListener("hashchange", start);
// The time and «Updated N s ago» move between two answers.
setInterval(showStatus, 1000);
setInterval(showNumbers, 1000);
// Back on a tab the browser slowed down: ask at once.
document.addEventListener("visibilitychange", () => {
  const ended = state.status === "stopped" || state.status === "expired";
  if (document.visibilityState === "visible" && token !== null && !ended && !asking) {
    clearTimeout(timer);
    ask(round);
  }
});
