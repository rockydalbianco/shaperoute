/**
 * The live page (TASK-424, ADR-0352): what it asks, what an answer of
 * GET /live changes, the line under the title, the numbers, the texts, the
 * map. `cd site && npm test`.
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import { fill, LANGUAGES, pickLanguage, TEXTS } from "../live/texts.js";
import {
  API,
  apiBase,
  applyView,
  boundsOf,
  busyDelayMs,
  BUSY_EVERY_MS,
  clock,
  elapsedS,
  emptyState,
  FINISHED_EVERY_MS,
  kindOf,
  MAP_COLOURS,
  mapStyle,
  measureOf,
  nextDelayMs,
  numbersOf,
  STALE_MS,
  statusOf,
  timeOfDay,
  tokenFromHash,
  trackOf,
  unitsOf,
  VIEW_EVERY_MS,
  viewUrl,
} from "../live/view.js";
import { SUPPORT } from "../tools/support_text.mjs";

const SITE = join(dirname(fileURLToPath(import.meta.url)), "..");
const REPO = join(SITE, "..");
const LIVE = join(SITE, "live");
const read = (...parts) => readFileSync(join(...parts), "utf8");
const FIXTURE = JSON.parse(read(REPO, "packages", "shared-types", "fixtures", "live-view.json"));
const TOKEN = "AbCdEfGhIjKlMnOpQrStUv";
/** When the fixture's update came: 2026-11-09T07:00:15Z. */
const UPDATED = Date.parse(FIXTURE.updated_at);
const EN = { lang: "en", units: "km" };

const values = (rows) => Object.fromEntries(rows.map((row) => [row.key, `${row.value} ${row.unit}`.trim()]));

test("the token comes from the `#`, and only one the server could have made", () => {
  assert.equal(tokenFromHash(`#${TOKEN}`), TOKEN);
  assert.equal(tokenFromHash(TOKEN), TOKEN);
  assert.equal(tokenFromHash(""), null);
  assert.equal(tokenFromHash("#"), null);
  assert.equal(tokenFromHash(`#${TOKEN}x`), null);
  assert.equal(tokenFromHash("#AbCdEfGhIjKlMnOpQrSt=="), null);
});

test("the page asks api.getmuw.app, a local API only from a local copy", () => {
  assert.equal(API, "https://api.getmuw.app");
  assert.equal(apiBase({ hostname: "getmuw.app", search: "?api=http://127.0.0.1:8000" }), API);
  assert.equal(apiBase({ hostname: "127.0.0.1", search: "?api=http://127.0.0.1:8000" }), "http://127.0.0.1:8000");
  assert.equal(apiBase({ hostname: "localhost", search: "?api=https://example.com" }), API);
  assert.equal(apiBase({ hostname: "127.0.0.1", search: "" }), API);
  assert.equal(viewUrl(API, TOKEN, 0), `https://api.getmuw.app/live?t=${TOKEN}&after=0`);
  assert.equal(viewUrl(API, TOKEN, 42), `https://api.getmuw.app/live?t=${TOKEN}&after=42`);
});

test("the first answer brings the points, the numbers and the next `after`", () => {
  const state = applyView(emptyState(), FIXTURE, UPDATED + 4000);
  assert.equal(state.status, "live");
  assert.equal(state.activity, "running");
  assert.equal(state.points.length, 3);
  assert.deepEqual(state.points[0], [46.06712, 11.12108, 1794207605]);
  assert.equal(state.lastSeq, 3);
  assert.equal(state.lastUpdateMs, UPDATED);
  assert.equal(kindOf(state), "map");
  assert.equal(nextDelayMs(FIXTURE), VIEW_EVERY_MS);
});

test("later answers add their points; `more` asks again at once", () => {
  let state = applyView(emptyState(), FIXTURE, UPDATED);
  const next = {
    ...FIXTURE,
    updated_at: "2026-11-09T07:00:30Z",
    stats: { ...FIXTURE.stats, distance_m: 120, duration_s: 30 },
    points: [[46.0677, 11.122, 1794207620.0]],
    last_seq: 4,
    more: true,
  };
  state = applyView(state, next, Date.parse(next.updated_at) + 3000);
  assert.equal(state.points.length, 4);
  assert.equal(state.lastSeq, 4);
  assert.equal(state.stats.distance_m, 120);
  assert.equal(nextDelayMs(next), 0);
  // An answer with nothing new keeps what the page has.
  const quiet = { ...next, points: [], last_seq: 4, more: false };
  assert.equal(applyView(state, quiet, Date.parse(next.updated_at) + 9000).points.length, 4);
});

test("a later update is dated by when it came, whatever the phone's clock", () => {
  let state = applyView(emptyState(), FIXTURE, UPDATED);
  // This browser's clock is five minutes behind the server's.
  const behind = -5 * 60_000;
  const next = { ...FIXTURE, updated_at: "2026-11-09T07:00:30Z", points: [], last_seq: 3 };
  const now = Date.parse(next.updated_at) + behind;
  state = applyView(state, next, now);
  assert.equal(state.lastUpdateMs, now);
  // Five minutes ahead: at most one round old.
  const later = { ...next, updated_at: "2026-11-09T07:00:45Z" };
  const ahead = Date.parse(later.updated_at) + 5 * 60_000;
  state = applyView(state, later, ahead);
  assert.equal(state.lastUpdateMs, ahead - VIEW_EVERY_MS);
});

test("a link stopped or expired shows nothing more and is asked no more", () => {
  const live = applyView(emptyState(), FIXTURE, UPDATED);
  for (const status of ["stopped", "expired"]) {
    const view = { status, points: [], last_seq: 0, more: false };
    const state = applyView(live, view, UPDATED + 1000);
    assert.equal(state.status, status);
    assert.deepEqual(state.points, []);
    assert.equal(state.stats, null);
    assert.equal(kindOf(state), null);
    assert.deepEqual(numbersOf(state, UPDATED, EN), []);
    assert.equal(nextDelayMs(view), null);
    assert.deepEqual(statusOf(state, UPDATED), { badge: null, line: { key: status } });
  }
  const finished = { ...FIXTURE, status: "finished", finished_at: FIXTURE.updated_at };
  assert.equal(nextDelayMs(finished), FINISHED_EVERY_MS);
  assert.equal(nextDelayMs({ ...finished, more: true }), 0);
});

test("a 429 waits what the API asks, or half a minute", () => {
  assert.equal(busyDelayMs("12"), 12_000);
  assert.equal(busyDelayMs(null), BUSY_EVERY_MS);
  assert.equal(busyDelayMs("soon"), BUSY_EVERY_MS);
});

test("the line under the title: updated, then quiet, paused, finished", () => {
  const live = applyView(emptyState(), FIXTURE, UPDATED);
  assert.deepEqual(statusOf(emptyState(), UPDATED), { badge: null, line: null });
  assert.deepEqual(statusOf(live, UPDATED + 7400), { badge: "live", line: { key: "updated", n: 7 } });
  assert.deepEqual(statusOf(live, UPDATED + STALE_MS - 1000).line.key, "updated");
  assert.deepEqual(statusOf(live, UPDATED + STALE_MS), {
    badge: "live",
    line: { key: "noUpdateSince", time: UPDATED },
  });
  const paused = applyView(emptyState(), { ...FIXTURE, status: "paused" }, UPDATED);
  assert.deepEqual(statusOf(paused, UPDATED + 2000), { badge: "paused", line: { key: "updated", n: 2 } });
  const finishedAt = "2026-11-09T07:42:00Z";
  const finished = applyView(live, { ...FIXTURE, status: "finished", finished_at: finishedAt }, UPDATED);
  assert.deepEqual(statusOf(finished, UPDATED + 10 * STALE_MS), {
    badge: null,
    line: { key: "finishedAt", time: Date.parse(finishedAt) },
  });
});

test("the time moves while live, stops when paused, finished or quiet", () => {
  const live = applyView(emptyState(), FIXTURE, UPDATED);
  assert.equal(elapsedS(live, UPDATED), 15);
  assert.equal(elapsedS(live, UPDATED + 9000), 24);
  assert.equal(elapsedS(live, UPDATED + STALE_MS - 1000), 15 + STALE_MS / 1000 - 1);
  assert.equal(elapsedS(live, UPDATED + 10 * STALE_MS), 15);
  const paused = applyView(emptyState(), { ...FIXTURE, status: "paused" }, UPDATED);
  assert.equal(elapsedS(paused, UPDATED + 9000), 15);
  const finished = applyView(emptyState(), { ...FIXTURE, status: "finished" }, UPDATED);
  assert.equal(elapsedS(finished, UPDATED + 9000), 15);
  assert.equal(clock(15), "0:15");
  assert.equal(clock(754.9), "12:34");
  assert.equal(clock(3723), "1:02:03");
});

test("the numbers of a run: distance, time, pace, climb, calories, heart rate", () => {
  const state = applyView(emptyState(), FIXTURE, UPDATED);
  const rows = numbersOf(state, UPDATED, EN);
  assert.deepEqual(
    rows.map((row) => row.key),
    ["distance", "time", "pace", "climb", "calories", "heart"],
  );
  assert.deepEqual(values(rows), {
    distance: "0.06 km",
    time: "0:15",
    pace: "4:02 /km",
    climb: "1 m",
    calories: "4 kcal",
    heart: "128 bpm",
  });
  // In Italian the decimal comma; in the US, miles and feet.
  assert.equal(values(numbersOf(state, UPDATED, { lang: "it", units: "km" })).distance, "0,06 km");
  const far = applyView(emptyState(), { ...FIXTURE, stats: { distance_m: 10_000, duration_s: 3000, climb_m: 100 } }, UPDATED);
  assert.deepEqual(values(numbersOf(far, UPDATED, { lang: "en", units: "mi" })), {
    distance: "6.21 mi",
    time: "50:00",
    pace: "8:03 /mi",
    climb: "328 ft",
  });
});

test("without a watch, calories or climb, those numbers are left out", () => {
  const bare = { ...FIXTURE, stats: { distance_m: 3, duration_s: 5 } };
  const state = applyView(emptyState(), bare, UPDATED);
  assert.deepEqual(values(numbersOf(state, UPDATED, EN)), {
    distance: "0.00 km",
    time: "0:05",
    pace: "– /km",
  });
  // A link made a moment ago, with no update yet.
  const made = { ...FIXTURE, updated_at: null, stats: null, points: [], last_seq: 0 };
  const fresh = applyView(emptyState(), made, Date.parse(FIXTURE.started_at) + 2000);
  assert.deepEqual(statusOf(fresh, Date.parse(FIXTURE.started_at) + 2000).line, { key: "updated", n: 2 });
  assert.equal(values(numbersOf(fresh, Date.parse(FIXTURE.started_at), EN)).distance, "0.00 km");
});

test("pace or speed as the app writes it, sport by sport", () => {
  assert.equal(measureOf("running"), "pace");
  assert.equal(measureOf("walking"), "pace");
  assert.equal(measureOf("hiking"), "pace");
  assert.equal(measureOf("xc_skiing"), "pace");
  for (const ride of ["cycling", "gravel_biking", "mountain_biking", "inline_skating", "skiing"]) {
    assert.equal(measureOf(ride), "speed", ride);
  }
  assert.equal(measureOf("paddling"), "paddle");
  assert.equal(measureOf("swimming"), "swim");
  const stats = { distance_m: 24_000, duration_s: 3600 };
  const at = (activity, units = "km") =>
    values(numbersOf(applyView(emptyState(), { ...FIXTURE, activity, stats }, UPDATED), UPDATED, { lang: "en", units }));
  assert.equal(at("cycling").speed, "24.0 km/h");
  assert.equal(at("cycling", "mi").speed, "14.9 mph");
  assert.equal(at("paddling").pace, "1:15 /500 m");
  assert.equal(at("swimming").pace, "0:15 /100 m");
});

test("a pool swim and a gym workout have no map", () => {
  const pool = applyView(
    emptyState(),
    { ...FIXTURE, activity: "swimming", pool_length_m: 25, points: [], stats: { duration_s: 600, lengths: 18, kcal: 90 } },
    UPDATED,
  );
  assert.equal(kindOf(pool), "pool");
  assert.deepEqual(values(numbersOf(pool, UPDATED, EN)), { time: "10:00", lengths: "18", calories: "90 kcal" });
  const gym = applyView(
    emptyState(),
    { ...FIXTURE, activity: "gym", points: [], stats: { duration_s: 1500, exercise: "Bench press", kcal: 120, heart_bpm: 110 } },
    UPDATED,
  );
  assert.equal(kindOf(gym), "gym");
  assert.deepEqual(values(numbersOf(gym, UPDATED, EN)), {
    time: "25:00",
    exercise: "Bench press",
    calories: "120 kcal",
    heart: "110 bpm",
  });
  // Swimming without a pool is open water: on the map.
  const open = applyView(emptyState(), { ...FIXTURE, activity: "swimming" }, UPDATED);
  assert.equal(kindOf(open), "map");
});

test("miles in the regions that drive in miles, as the app", () => {
  assert.equal(unitsOf(["en-US", "en"]), "mi");
  assert.equal(unitsOf(["en-GB"]), "mi");
  assert.equal(unitsOf(["en"]), "km");
  assert.equal(unitsOf(["it-IT", "en-US"]), "km");
  assert.equal(unitsOf([]), "km");
});

test("the track on the map: [lon, lat], the position at its end", () => {
  const state = applyView(emptyState(), FIXTURE, UPDATED);
  const { line, position } = trackOf(state.points);
  assert.deepEqual(line.geometry.coordinates[0], [11.12108, 46.06712]);
  assert.deepEqual(position.geometry.coordinates, [11.12171, 46.06752]);
  assert.equal(trackOf([]).position, null);
  assert.deepEqual(boundsOf(state.points), [
    [11.12108, 46.06712],
    [11.12171, 46.06752],
  ]);
  assert.equal(boundsOf([]), null);
});

test("times of day in the viewer's language", () => {
  assert.equal(timeOfDay(Date.parse("2026-11-09T10:42:00Z"), "it", "UTC"), "10:42");
  assert.equal(timeOfDay(Date.parse("2026-11-09T10:42:00Z"), "de", "UTC"), "10:42");
});

test("the language comes from the browser, English otherwise", () => {
  assert.equal(pickLanguage(["it-IT", "en"]), "it");
  assert.equal(pickLanguage(["pt-BR", "fr-CA"]), "fr");
  assert.equal(pickLanguage(["ja"]), "en");
  assert.equal(pickLanguage(undefined), "en");
  assert.equal(fill(TEXTS.it.updated, { n: 8 }), "Aggiornato 8 s fa");
  assert.equal(fill(TEXTS.es.noUpdateSince, { time: "10:42" }), "Sin actualizaciones desde las 10:42");
});

test("the texts are the approved ones, in every language (TASK-424 «Testi»)", () => {
  const task = read(REPO, "docs", "tasks", "TASK-424.md");
  const keys = Object.keys(TEXTS.en);
  assert.deepEqual(Object.keys(TEXTS).sort(), [...LANGUAGES].sort());
  for (const language of LANGUAGES) {
    const words = TEXTS[language];
    assert.deepEqual(Object.keys(words), keys, language);
    for (const key of ["title", "live", "updated", "noUpdateSince", "paused", "finishedAt", "stopped", "expired", "footer"]) {
      assert.ok(task.includes(`| ${words[key]} |`), `${language}.${key}: «${words[key]}» is not in the task file`);
    }
    const labels = ["distance", "time", "pace", "speed", "climb", "calories", "heart"].map((key) => words[key]);
    assert.ok(task.includes(`| ${labels.join(" · ")} |`), `${language}: the labels`);
    assert.ok(task.includes(`| ${words.lengths} · ${words.exercise} |`), `${language}: lengths, exercise`);
    assert.equal(words.privacy, SUPPORT[language].privacy, `${language}: the privacy page's name`);
    assert.match(words.updated, /\{n\}/);
    assert.match(words.noUpdateSince, /\{time\}/);
    assert.match(words.finishedAt, /\{time\}/);
  }
});

test("MapLibre is the app's very file, copied into the site", () => {
  const page = read(REPO, "apps", "mobile", "src", "map", "mapPage.ts");
  const version = page.match(/MAPLIBRE_VERSION = "([\d.]+)"/)[1];
  const js = readFileSync(join(LIVE, "maplibre-gl.js"));
  assert.ok(js.toString("utf8", 0, 300).includes(`v${version}/LICENSE.txt`), `MapLibre ${version}`);
  const sri = (bytes) => `sha384-${createHash("sha384").update(bytes).digest("base64")}`;
  assert.equal(sri(js), page.match(/MAPLIBRE_JS_SRI =\s*"([^"]+)"/)[1]);
  assert.equal(sri(readFileSync(join(LIVE, "maplibre-gl.css"))), page.match(/MAPLIBRE_CSS_SRI =\s*"([^"]+)"/)[1]);
});

test("the map is the app's style; only OpenFreeMap comes from outside", () => {
  const app = read(REPO, "apps", "mobile", "src", "map", "mapStyle.ts");
  const colours = Object.fromEntries(MAP_COLOURS.map((name) => [name, `#${name}`]));
  const style = mapStyle(colours, "it");
  assert.ok(app.includes(`"${style.glyphs}"`));
  assert.ok(app.includes(`"${style.sources.openmaptiles.url}"`));
  for (const part of style.sources.openmaptiles.attribution.split(/(?<=>) /)) {
    assert.ok(app.includes(part.trim()), `the credit: ${part}`);
  }
  assert.match(style.sources.openmaptiles.attribution, /OpenStreetMap/);
  const outside = JSON.stringify(style).match(/https?:\/\/[^"\\\s]+/g);
  for (const url of outside) {
    assert.match(url, /^https:\/\/(tiles\.openfreemap\.org|openfreemap\.org|www\.openmaptiles\.org|www\.openstreetmap\.org)(\/|$)/, url);
  }
  assert.deepEqual(style.layers.at(-1).layout["text-field"], ["coalesce", ["get", "name:it"], ["get", "name"]]);
  // Every colour the style takes is one.
  for (const name of MAP_COLOURS) {
    assert.ok(JSON.stringify(style).includes(`"#${name}"`), name);
  }
});

test("the map's colours in live.css are the app's dark ones", () => {
  const css = read(LIVE, "live.css");
  const tokens = read(REPO, "apps", "mobile", "src", "theme", "tokens.ts");
  const dark = tokens.slice(tokens.indexOf("darkest: {"));
  const block = dark.slice(dark.indexOf("map: {"), dark.indexOf("}", dark.indexOf("map: {")));
  for (const name of MAP_COLOURS) {
    const camel = name.replace(/-(\w)/g, (_, c) => c.toUpperCase()).replace("builtUp", "builtUp");
    const app = block.match(new RegExp(`\\b${camel}: "(#[0-9A-Fa-f]{6})"`));
    assert.ok(app, `tokens.ts has map.${camel}`);
    const site = css.match(new RegExp(`--map-${name}: (#[0-9a-f]{6});`));
    assert.ok(site, `live.css declares --map-${name}`);
    assert.equal(site[1], app[1].toLowerCase(), name);
  }
});

test("the page loads only its own files, and the server's copy takes them", () => {
  const html = read(LIVE, "index.html");
  const loaded = [...html.matchAll(/\s(?:src|href)="([^"]+)"/g)].map((m) => m[1]);
  for (const target of loaded) {
    assert.doesNotMatch(target, /^[a-z]+:|^\/\//i, `${target} comes from outside`);
  }
  for (const file of ["maplibre-gl.js", "maplibre-gl.css", "live.css", "live.js"]) {
    assert.ok(loaded.includes(file), file);
  }
  for (const file of ["live.js", "view.js", "texts.js"]) {
    const urls = read(LIVE, file).match(/https?:\/\/[^"'`\s)]+/g) ?? [];
    for (const url of urls) {
      assert.match(
        url,
        /^(https:\/\/(api\.getmuw\.app|getmuw\.app|tiles\.openfreemap\.org|openfreemap\.org|www\.openmaptiles\.org|www\.openstreetmap\.org)|http:\/\/127\.0\.0\.1)/,
        `${file}: ${url}`,
      );
    }
  }
  const deploy = read(REPO, "docs", "DEPLOY.md");
  const line = deploy.match(/git archive origin\/main ((?:site\/\S+ ?)+)\|/);
  assert.ok(line && line[1].split(/\s+/).includes("site/live"), "DEPLOY.md F.14 copies site/live");
});
