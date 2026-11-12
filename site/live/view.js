/**
 * What the live page shows, worked out without the DOM (TASK-424, ADR-0352,
 * docs/API.md «Live shares»): the token from the address, the request, what
 * an answer of GET /live changes, the line under the title, the numbers and
 * the map's style. `live.js` puts it on the page; tests/live.test.mjs tries
 * it with packages/shared-types/fixtures/live-view.json.
 *
 * The shapes mirror packages/shared-types/src/liveShare.ts (`LiveView`).
 */

/** The API that answers the page; only this site may read it (CORS). */
export const API = "https://api.getmuw.app";
/** The page asks this often (LIVE_VIEW_EVERY_S). */
export const VIEW_EVERY_MS = 10_000;
/** Once finished nothing moves: the page asks seldom, to see it expire. */
export const FINISHED_EVERY_MS = 60_000;
/** Too many requests, and the browser cannot read `Retry-After`. */
export const BUSY_EVERY_MS = 30_000;
/** Without an update this long, «No update since». The phone sends every
 * 15 s while moving and every 60 s while paused. */
export const STALE_MS = 120_000;
/** What secrets.token_urlsafe(16) gives (live_shares.TOKEN_PATTERN). */
export const TOKEN_PATTERN = /^[A-Za-z0-9_-]{22}$/;

const METRES_PER_MILE = 1609.344;
const METRES_PER_FOOT = 0.3048;
/** The regions with roads in miles, as the app counts them
 * (apps/mobile/src/units/phoneUnits.ts). */
const MILE_REGIONS = new Set(["US", "GB", "LR", "MM"]);
/** The rides of the app (sports/*.ts, `rides`) and alpine skiing, whose
 * numbers are a ride's: a speed. */
const SPEED_ACTIVITIES = new Set([
  "cycling",
  "gravel_biking",
  "mountain_biking",
  "inline_skating",
  "skiing",
  "paragliding",
]);
/** The flights (TASK-305 R3, ADR-0375): with the numbers of the air. */
const FLIGHT_ACTIVITIES = new Set(["paragliding"]);
const FEET_PER_MINUTE_PER_MPS = 60 / METRES_PER_FOOT;
/** Tracks of a few metres give no pace worth showing. */
const PACE_FROM_M = 10;

/**
 * The token after the `#`, or null when there is none worth asking for.
 * @param {string} hash location.hash
 * @returns {string | null}
 */
export function tokenFromHash(hash) {
  const token = String(hash ?? "").replace(/^#/, "");
  return TOKEN_PATTERN.test(token) ? token : null;
}

/**
 * The API to ask: always api.getmuw.app, except on the Mac, where
 * `?api=http://127.0.0.1:8000` points a local copy at a local API.
 * @param {{hostname: string, search: string}} location
 * @returns {string}
 */
export function apiBase(location) {
  if (location.hostname === "127.0.0.1" || location.hostname === "localhost") {
    const wanted = new URLSearchParams(location.search).get("api");
    if (wanted && /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(wanted)) {
      return wanted;
    }
  }
  return API;
}

/**
 * GET /live with the points after `after`.
 * @param {string} api
 * @param {string} token
 * @param {number} after
 * @returns {string}
 */
export function viewUrl(api, token, after) {
  return `${api}/live?t=${encodeURIComponent(token)}&after=${Math.max(0, Math.floor(after))}`;
}

/**
 * What the page knows before the first answer.
 */
export function emptyState() {
  return {
    /** null until the first answer; then the LiveStatus. */
    status: null,
    activity: null,
    poolLengthM: null,
    updatedAtMs: null,
    finishedAtMs: null,
    /** On this browser's clock, when the phone's last update came. */
    lastUpdateMs: null,
    stats: null,
    /** [lat, lon, epoch seconds], every point so far. */
    points: [],
    lastSeq: 0,
  };
}

function timeOf(text) {
  if (typeof text !== "string") {
    return null;
  }
  const ms = Date.parse(text);
  return Number.isFinite(ms) ? ms : null;
}

function isPoint(point) {
  return (
    Array.isArray(point) &&
    point.length >= 2 &&
    Number.isFinite(point[0]) &&
    Number.isFinite(point[1]) &&
    Math.abs(point[0]) <= 90 &&
    Math.abs(point[1]) <= 180
  );
}

/**
 * The state after an answer of GET /live, received at `nowMs`. A link
 * stopped or expired shows nothing more: its points are gone on the server,
 * and here too.
 *
 * The phone's clock and this browser's may differ: the first update is
 * dated by the server's time, the later ones as come since the last request.
 * @param {ReturnType<typeof emptyState>} state
 * @param {any} view a LiveView
 * @param {number} nowMs
 */
export function applyView(state, view, nowMs) {
  if (!view || typeof view.status !== "string") {
    return state;
  }
  if (view.status === "stopped" || view.status === "expired") {
    return { ...emptyState(), status: view.status };
  }
  const updatedAtMs = timeOf(view.updated_at) ?? timeOf(view.started_at);
  let lastUpdateMs = state.lastUpdateMs;
  if (updatedAtMs !== null && updatedAtMs !== state.updatedAtMs) {
    const age = Math.max(0, nowMs - updatedAtMs);
    lastUpdateMs = nowMs - (state.updatedAtMs === null ? age : Math.min(age, VIEW_EVERY_MS));
  }
  const fresh = Array.isArray(view.points) ? view.points.filter(isPoint) : [];
  return {
    status: view.status,
    activity: typeof view.activity === "string" ? view.activity : state.activity,
    poolLengthM: Number.isFinite(view.pool_length_m) ? view.pool_length_m : null,
    updatedAtMs: updatedAtMs ?? state.updatedAtMs,
    finishedAtMs: timeOf(view.finished_at),
    lastUpdateMs,
    stats: view.stats && typeof view.stats === "object" ? view.stats : state.stats,
    points: fresh.length
      ? state.points.concat(fresh.map((p) => [p[0], p[1], p[2] ?? null]))
      : state.points,
    lastSeq: Number.isInteger(view.last_seq) ? Math.max(state.lastSeq, view.last_seq) : state.lastSeq,
  };
}

/**
 * How long until the next request, or null to ask no more.
 * @param {any} view a LiveView
 * @returns {number | null}
 */
export function nextDelayMs(view) {
  if (view?.status === "stopped" || view?.status === "expired") {
    return null;
  }
  if (view?.more) {
    return 0;
  }
  return view?.status === "finished" ? FINISHED_EVERY_MS : VIEW_EVERY_MS;
}

/**
 * After a 429: the wait the API asks, when the browser lets the page read it.
 * @param {string | null} retryAfter
 * @returns {number}
 */
export function busyDelayMs(retryAfter) {
  const seconds = Number(retryAfter);
  return retryAfter && Number.isFinite(seconds) && seconds > 0
    ? Math.min(seconds, 300) * 1000
    : BUSY_EVERY_MS;
}

/**
 * True when the phone has said nothing for a while, and the link should.
 * @param {ReturnType<typeof emptyState>} state
 * @param {number} nowMs
 */
export function isStale(state, nowMs) {
  return (
    (state.status === "live" || state.status === "paused") &&
    state.lastUpdateMs !== null &&
    nowMs - state.lastUpdateMs >= STALE_MS
  );
}

/**
 * The time of the activity, in seconds: the phone's, and while it is live
 * the seconds since. Once the link goes quiet, the phone's last one: what
 * happened since is not known.
 * @param {ReturnType<typeof emptyState>} state
 * @param {number} nowMs
 */
export function elapsedS(state, nowMs) {
  const base = Number(state.stats?.duration_s) || 0;
  if (state.status !== "live" || state.lastUpdateMs === null || isStale(state, nowMs)) {
    return base;
  }
  return base + Math.max(0, nowMs - state.lastUpdateMs) / 1000;
}

/**
 * The badge by the title and the line under it, as text keys with what fills
 * them: `time` is an epoch in milliseconds.
 * @param {ReturnType<typeof emptyState>} state
 * @param {number} nowMs
 * @returns {{badge: "live" | "paused" | null, line: {key: string, n?: number, time?: number} | null}}
 */
export function statusOf(state, nowMs) {
  switch (state.status) {
    case "expired":
    case "stopped":
      return { badge: null, line: { key: state.status } };
    case "finished":
      return {
        badge: null,
        line: { key: "finishedAt", time: state.finishedAtMs ?? state.updatedAtMs ?? nowMs },
      };
    case "live":
    case "paused": {
      const badge = state.status;
      if (state.lastUpdateMs === null) {
        return { badge, line: null };
      }
      if (isStale(state, nowMs)) {
        return { badge, line: { key: "noUpdateSince", time: state.updatedAtMs ?? state.lastUpdateMs } };
      }
      const n = Math.max(0, Math.round((nowMs - state.lastUpdateMs) / 1000));
      return { badge, line: { key: "updated", n } };
    }
    default:
      return { badge: null, line: null };
  }
}

/**
 * What the page is about: a track on a map, a swim in a pool or a workout at
 * the gym, the last two with no map.
 * @param {ReturnType<typeof emptyState>} state
 * @returns {"map" | "pool" | "gym" | null}
 */
export function kindOf(state) {
  if (state.status === null || state.status === "stopped" || state.status === "expired") {
    return null;
  }
  if (state.activity === "gym") {
    return "gym";
  }
  if (state.activity === "swimming" && state.poolLengthM !== null) {
    return "pool";
  }
  return "map";
}

/**
 * How the average is written for an activity: a pace per km (or mile), a
 * speed, or a pace per 500 m on the water and per 100 m swimming, as the app.
 * @param {string | null} activity
 * @returns {"pace" | "speed" | "paddle" | "swim"}
 */
export function measureOf(activity) {
  if (activity === "paddling") {
    return "paddle";
  }
  if (activity === "swimming") {
    return "swim";
  }
  return SPEED_ACTIVITIES.has(activity) ? "speed" : "pace";
}

/**
 * Miles for a browser in a region that drives in miles, as the app does from
 * the phone's region.
 * @param {readonly string[] | undefined} languages navigator.languages
 * @returns {"km" | "mi"}
 */
export function unitsOf(languages) {
  const first = (languages ?? [])[0];
  const region = first ? String(first).split(/[-_]/)[1] : undefined;
  return region && MILE_REGIONS.has(region.toUpperCase()) ? "mi" : "km";
}

/**
 * Seconds as a clock: «12:34», «1:02:03».
 * @param {number} seconds
 */
export function clock(seconds) {
  const whole = Math.max(0, Math.floor(seconds));
  const h = Math.floor(whole / 3600);
  const m = Math.floor((whole % 3600) / 60);
  const s = String(whole % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
}

function decimals(lang, digits) {
  return new Intl.NumberFormat(lang, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function whole(lang, value) {
  return new Intl.NumberFormat(lang, { maximumFractionDigits: 0 }).format(value);
}

function present(value) {
  return value !== null && value !== undefined && Number.isFinite(Number(value));
}

/**
 * The average pace or speed, from the distance and the time of the update.
 * @returns {{key: "pace" | "speed", value: string, unit: string}}
 */
function average(stats, activity, units, lang) {
  const metres = Number(stats?.distance_m) || 0;
  const seconds = Number(stats?.duration_s) || 0;
  const measure = measureOf(activity);
  if (measure === "speed") {
    const perHour = units === "mi" ? METRES_PER_MILE : 1000;
    const value = seconds > 0 ? (metres / perHour) * (3600 / seconds) : 0;
    return { key: "speed", value: decimals(lang, 1).format(value), unit: units === "mi" ? "mph" : "km/h" };
  }
  const per = measure === "paddle" ? 500 : measure === "swim" ? 100 : units === "mi" ? METRES_PER_MILE : 1000;
  const unit = measure === "paddle" ? "/500 m" : measure === "swim" ? "/100 m" : units === "mi" ? "/mi" : "/km";
  const pace = metres >= PACE_FROM_M && seconds > 0 ? (seconds * per) / metres : null;
  // Rounded, as the app's paceClock (navigation/runStats.ts).
  return { key: "pace", value: pace === null || pace >= 6000 ? "–" : clock(Math.round(pace)), unit };
}

/** A height in metres or, with miles, in feet. */
function height(key, metres, units, lang) {
  return units === "mi"
    ? { key, value: whole(lang, metres / METRES_PER_FOOT), unit: "ft" }
    : { key, value: whole(lang, metres), unit: "m" };
}

/**
 * The numbers of the air, after the time (TASK-305 R3): the speed of the
 * moment, the altitude, the vario (+ climbing, − sinking) and the highest
 * altitude. An app of before sends none: then the average speed, as a ride.
 * @returns {{key: string, value: string, unit: string}[]}
 */
function flightNumbers(stats, units, lang) {
  const rows = [];
  if (present(stats.speed_mps)) {
    const perHour = (Number(stats.speed_mps) * 3600) / (units === "mi" ? METRES_PER_MILE : 1000);
    rows.push({ key: "speed", value: decimals(lang, 1).format(perHour), unit: units === "mi" ? "mph" : "km/h" });
  } else {
    rows.push(average(stats, "paragliding", units, lang));
  }
  if (present(stats.alt_m)) {
    rows.push(height("altitude", Number(stats.alt_m), units, lang));
  }
  if (present(stats.vario_mps)) {
    const vario = Number(stats.vario_mps);
    const signed = (digits) =>
      new Intl.NumberFormat(lang, {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
        signDisplay: "exceptZero",
      });
    rows.push(
      units === "mi"
        ? { key: "vario", value: signed(0).format(Math.round(vario * FEET_PER_MINUTE_PER_MPS)), unit: "ft/min" }
        : { key: "vario", value: signed(1).format(Math.round(vario * 10) / 10), unit: "m/s" },
    );
  }
  if (present(stats.max_alt_m)) {
    rows.push(height("maxAltitude", Number(stats.max_alt_m), units, lang));
  }
  return rows;
}

/**
 * The numbers under the map, in order, as text keys with their value and
 * unit. Missing ones are left out: no heart rate without a watch, no climb
 * on the water. A flight shows the numbers of the air in place of the
 * average.
 * @param {ReturnType<typeof emptyState>} state
 * @param {number} nowMs
 * @param {{lang: string, units: "km" | "mi"}} options
 * @returns {{key: string, value: string, unit: string}[]}
 */
export function numbersOf(state, nowMs, { lang, units }) {
  const kind = kindOf(state);
  if (kind === null) {
    return [];
  }
  const stats = state.stats ?? {};
  const rows = [];
  if (kind === "map") {
    const metres = Number(stats.distance_m) || 0;
    const distance = units === "mi" ? metres / METRES_PER_MILE : metres / 1000;
    rows.push({
      key: "distance",
      value: decimals(lang, distance >= 100 ? 1 : 2).format(distance),
      unit: units === "mi" ? "mi" : "km",
    });
  }
  rows.push({ key: "time", value: clock(elapsedS(state, nowMs)), unit: "" });
  if (kind === "map") {
    if (FLIGHT_ACTIVITIES.has(state.activity)) {
      rows.push(...flightNumbers(stats, units, lang));
    } else {
      rows.push(average(stats, state.activity, units, lang));
    }
    if (present(stats.climb_m)) {
      rows.push(height("climb", Number(stats.climb_m), units, lang));
    }
  }
  if (kind === "pool" && present(stats.lengths)) {
    rows.push({ key: "lengths", value: whole(lang, Number(stats.lengths)), unit: "" });
  }
  if (kind === "gym" && typeof stats.exercise === "string" && stats.exercise.trim()) {
    rows.push({ key: "exercise", value: stats.exercise.trim(), unit: "" });
  }
  if (present(stats.kcal)) {
    rows.push({ key: "calories", value: whole(lang, Number(stats.kcal)), unit: "kcal" });
  }
  if (present(stats.heart_bpm)) {
    rows.push({ key: "heart", value: whole(lang, Number(stats.heart_bpm)), unit: "bpm" });
  }
  return rows;
}

/**
 * A time of day in the viewer's language and time zone: «10:42».
 * @param {number} ms
 * @param {string} lang
 * @param {string} [timeZone] for the tests
 */
export function timeOfDay(ms, lang, timeZone) {
  return new Intl.DateTimeFormat(lang, {
    hour: "2-digit",
    minute: "2-digit",
    ...(timeZone ? { timeZone } : {}),
  }).format(new Date(ms));
}

/**
 * The track as GeoJSON, [lon, lat] as MapLibre wants it, and the position:
 * the last point.
 * @param {[number, number, number | null][]} points
 */
export function trackOf(points) {
  const line = points.map((p) => [p[1], p[0]]);
  return {
    line: {
      type: "Feature",
      properties: {},
      geometry: { type: "LineString", coordinates: line },
    },
    position: line.length
      ? { type: "Feature", properties: {}, geometry: { type: "Point", coordinates: line[line.length - 1] } }
      : null,
  };
}

/**
 * The corners of the track, [[west, south], [east, north]], or null.
 * @param {[number, number, number | null][]} points
 */
export function boundsOf(points) {
  if (!points.length) {
    return null;
  }
  let [south, west, north, east] = [90, 180, -90, -180];
  for (const [lat, lon] of points) {
    south = Math.min(south, lat);
    north = Math.max(north, lat);
    west = Math.min(west, lon);
    east = Math.max(east, lon);
  }
  return [
    [west, south],
    [east, north],
  ];
}

/* The map: the app's dark style (apps/mobile/src/map/mapStyle.ts), over
 * OpenFreeMap's tiles and fonts, the only things the page loads from
 * outside the site (the user's choice 8). */

export const TILE_SOURCE_URL = "https://tiles.openfreemap.org/planet";
export const GLYPHS_URL = "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf";
export const LABEL_FONT = ["Noto Sans Regular"];
/** Word for word the app's: OpenFreeMap, OpenMapTiles and OpenStreetMap
 * all ask for it to stay visible. */
export const ATTRIBUTION =
  '<a href="https://openfreemap.org" target="_blank">OpenFreeMap</a> ' +
  '<a href="https://www.openmaptiles.org/" target="_blank">&copy; OpenMapTiles</a> ' +
  'Data from <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>';

/** The colours the style takes, read from live.css (`--map-…`). */
export const MAP_COLOURS = [
  "background",
  "built-up",
  "green",
  "water",
  "water-line",
  "building",
  "road-faint",
  "road-minor",
  "road-medium",
  "road-major",
  "label",
  "label-halo",
];

function roadFilter(classes) {
  return ["match", ["get", "class"], classes, true, false];
}

function roadWidth(far, mid, near) {
  return ["interpolate", ["linear"], ["zoom"], 10, far, 14, mid, 18, near];
}

function road(id, minzoom, classes, colour, width) {
  return {
    id,
    type: "line",
    source: "openmaptiles",
    "source-layer": "transportation",
    ...(minzoom ? { minzoom } : {}),
    filter: roadFilter(classes),
    layout: { "line-join": "round", "line-cap": "round" },
    paint: { "line-color": colour, "line-width": width },
  };
}

/**
 * The style of the map, the app's, with the places named in `lang`.
 * @param {Record<string, string>} colours by the names of MAP_COLOURS
 * @param {string} lang
 */
export function mapStyle(colours, lang) {
  return {
    version: 8,
    name: "MuW Dark",
    glyphs: GLYPHS_URL,
    sources: {
      openmaptiles: { type: "vector", url: TILE_SOURCE_URL, attribution: ATTRIBUTION },
    },
    layers: [
      { id: "background", type: "background", paint: { "background-color": colours.background } },
      {
        id: "landuse-built-up",
        type: "fill",
        source: "openmaptiles",
        "source-layer": "landuse",
        filter: roadFilter(["residential", "suburb", "neighbourhood"]),
        paint: { "fill-color": colours["built-up"] },
      },
      {
        id: "landcover-green",
        type: "fill",
        source: "openmaptiles",
        "source-layer": "landcover",
        filter: roadFilter(["wood", "grass", "farmland"]),
        paint: { "fill-color": colours.green },
      },
      {
        id: "park",
        type: "fill",
        source: "openmaptiles",
        "source-layer": "park",
        paint: { "fill-color": colours.green },
      },
      {
        id: "water",
        type: "fill",
        source: "openmaptiles",
        "source-layer": "water",
        paint: { "fill-color": colours.water },
      },
      {
        id: "waterway",
        type: "line",
        source: "openmaptiles",
        "source-layer": "waterway",
        minzoom: 9,
        paint: { "line-color": colours["water-line"], "line-width": roadWidth(0.4, 1, 2.5) },
      },
      {
        id: "building",
        type: "fill",
        source: "openmaptiles",
        "source-layer": "building",
        minzoom: 13,
        paint: { "fill-color": colours.building, "fill-opacity": 0.85 },
      },
      road("road-faint", 13, ["path", "track", "service"], colours["road-faint"], roadWidth(0.3, 0.8, 3)),
      road("road-minor", 11, ["minor"], colours["road-minor"], roadWidth(0.4, 1.2, 5)),
      road("road-medium", 0, ["secondary", "tertiary"], colours["road-medium"], roadWidth(0.7, 2, 7)),
      road("road-major", 0, ["motorway", "trunk", "primary"], colours["road-major"], roadWidth(1, 3, 10)),
      {
        id: "place-label",
        type: "symbol",
        source: "openmaptiles",
        "source-layer": "place",
        filter: roadFilter(["city", "town", "village"]),
        layout: {
          "text-field": ["coalesce", ["get", `name:${lang}`], ["get", "name"]],
          "text-font": LABEL_FONT,
          "text-size": ["interpolate", ["linear"], ["zoom"], 8, 11, 14, 15],
          "text-letter-spacing": 0.08,
          "text-max-width": 8,
        },
        paint: {
          "text-color": colours.label,
          "text-halo-color": colours["label-halo"],
          "text-halo-width": 1.2,
        },
      },
    ],
  };
}
