#!/usr/bin/env node
// Writes src/explore/catalog.json from catalog/seed/*.json (TASK-420,
// ADR-0348): the routes of the seed as the «Catalog» page of «Explore»
// shows them, light. Node alone, no dependencies:
//
//     node apps/mobile/scripts/catalog-data.mjs
//
// from anywhere. Run it again whenever the seed changes (TASK-419).
//
// Each route keeps the id the API gives it (services/api/shaperoute_api/
// recommended.py, parse_city: "<city>-<shape|word>-<distance_m>-<i>"), so a
// card opens through GET /recommended-routes/{id} as every route of
// «Explore»; a preview of PREVIEW_POINTS points; and the key the favorites
// give the whole line (src/favorites/favoriteKey.ts, copied here: the one
// place the app and this script must agree, catalog.test.ts checks it), so
// the heart on a card knows whether the route is kept without downloading
// it.

import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..", "..");
const SEED = join(ROOT, "catalog", "seed");
const OUT = join(HERE, "..", "src", "explore", "catalog.json");

/** As the API's preview (PREVIEW_POINTS in recommended.py is 64): fewer,
 * since hundreds are on screen at once. */
const PREVIEW_POINTS = 48;
const PREVIEW_DECIMALS = 5;

/** The country of each city of the seed, in English (the app translates
 * it). A city not here has no country: its card says the city alone. */
const COUNTRIES = {
  amsterdam: "Netherlands",
  barcelona: "Spain",
  bari: "Italy",
  bologna: "Italy",
  dubai: "United Arab Emirates",
  firenze: "Italy",
  genova: "Italy",
  levico: "Italy",
  lisbon: "Portugal",
  london: "United Kingdom",
  milano: "Italy",
  napoli: "Italy",
  newyork: "United States",
  padova: "Italy",
  palermo: "Italy",
  paris: "France",
  roma: "Italy",
  sanfrancisco: "United States",
  sydney: "Australia",
  tokyo: "Japan",
  torino: "Italy",
  trento: "Italy",
  verona: "Italy",
};

/** The category of each shape (the user's seven, catalogo-esplora.md):
 * until TASK-418 writes them beside the shapes. A word is "words"; a shape
 * not here is a "symbols". */
const CATEGORIES = {
  horse: "animals",
  cat: "animals",
  fish: "animals",
  butterfly: "animals",
  snail: "animals",
  dog_head: "animals",
  rabbit_head: "animals",
  circle: "symbols",
  heart: "symbols",
  star: "symbols",
  moon: "symbols",
  sun: "symbols",
  smiley: "symbols",
  pumpkin: "holidays",
  christmas_tree: "holidays",
  ghost: "holidays",
  donut: "food",
};

/** favoriteKey, as src/favorites/favoriteKey.ts writes it. */
function favoriteKey(points) {
  let a = 0x811c9dc5;
  let b = 0x01000193;
  for (const [lat, lon] of points) {
    for (const value of [Math.round(lat * 1e5), Math.round(lon * 1e5)]) {
      for (let shift = 0; shift < 32; shift += 8) {
        const byte = (value >> shift) & 0xff;
        a = Math.imul(a ^ byte, 0x01000193);
        b = Math.imul(b ^ byte, 0x85ebca6b) + 0x9e3779b9;
      }
    }
  }
  return hex(a) + hex(b);
}

function hex(value) {
  return (value >>> 0).toString(16).padStart(8, "0");
}

/** At most `size` points, evenly spread by index, first and last kept. */
function preview(points, size = PREVIEW_POINTS) {
  const chosen =
    points.length <= size
      ? points
      : Array.from(
          { length: size },
          (_, i) => points[Math.round((i * (points.length - 1)) / (size - 1))],
        );
  return chosen.map(([lat, lon]) => [
    Number(lat.toFixed(PREVIEW_DECIMALS)),
    Number(lon.toFixed(PREVIEW_DECIMALS)),
  ]);
}

function routesOf(body) {
  const city = String(body.city);
  const routes = [];
  body.routes.forEach((r, i) => {
    const points = r.points.map(([lat, lon]) => [Number(lat), Number(lon)]);
    const shape = r.shape ?? null;
    const word = r.word ?? null;
    if (points.length < 2 || (shape === null) === (word === null)) {
      return;
    }
    const name = shape !== null ? String(shape) : String(word).toLowerCase();
    const turn = Number(r.rotation_deg ?? 0);
    routes.push({
      id: `${city}-${name}-${Math.trunc(r.distance_m)}-${i}`,
      city,
      country: COUNTRIES[city] ?? "",
      shape: shape === null ? null : String(shape),
      word: word === null ? null : String(word),
      style: word === null ? null : String(r.style ?? "round"),
      category: shape === null ? "words" : (CATEGORIES[shape] ?? "symbols"),
      activity: "running",
      distance_m: Math.trunc(r.distance_m),
      route_m: Math.trunc(r.route_m),
      similarity: Number(r.similarity),
      start: preview(points.slice(0, 1))[0],
      ...(Number.isFinite(turn) && turn !== 0 ? { rotation_deg: turn } : {}),
      preview: preview(points),
      favorite_key: favoriteKey(points),
    });
  });
  return routes;
}

const files = readdirSync(SEED)
  .filter((name) => name.endsWith(".json"))
  .sort();
const routes = files.flatMap((name) =>
  routesOf(JSON.parse(readFileSync(join(SEED, name), "utf8"))),
);
const out = {
  written_from: "catalog/seed",
  license: "Routes on OpenStreetMap data, (c) OpenStreetMap contributors, ODbL 1.0",
  routes,
};
// Indented, as the repository's formatter writes JSON (`npm run format`).
writeFileSync(OUT, `${JSON.stringify(out, null, 2)}\n`);
console.log(`${routes.length} routes of ${files.length} cities → ${OUT}`);
