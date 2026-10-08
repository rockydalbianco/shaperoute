/**
 * The guide page: what it says, what it draws and the files it loads, checked
 * in Node without a browser. `cd site && npm test`.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import { downloadUrl } from "../config.js";
import { pages, postFilters, sports } from "../content.js";
import { box, posts, tryIt } from "../data/drawings.js";
import {
  chipsHtml,
  downloadHtml,
  drawingHtml,
  escapeHtml,
  factsHtml,
  isHttps,
  kmText,
  pagesHtml,
  postCardHtml,
  sportOf,
  stepsHtml,
  tryReadout,
  tryRoute,
  visiblePosts,
} from "../render.js";

const SITE = join(dirname(fileURLToPath(import.meta.url)), "..");
const PATH = /^M[\d.]+ [\d.]+(L[\d.]+ [\d.]+)+$/;

function insideBox(drawing) {
  const numbers = drawing.d.match(/[\d.]+/g).map(Number);
  return [...numbers, ...drawing.start].every((value) => value >= 0 && value <= box);
}

test("each sport has its facts and four steps", () => {
  assert.deepEqual(
    sports.map((sport) => sport.id),
    ["run", "bike", "paddle"],
  );
  for (const sport of sports) {
    assert.ok(sport.label.trim());
    assert.equal(sport.facts.length, 3, `${sport.id}: facts`);
    assert.equal(sport.steps.length, 4, `${sport.id}: steps`);
    for (const step of sport.steps) {
      assert.ok(step.title.trim() && step.text.trim());
    }
  }
  assert.deepEqual(
    pages.map((page) => page.name),
    ["Feed", "Draw", "Explore", "Profile"],
  );
});

test("the steps of a sport are numbered and escaped", () => {
  const html = stepsHtml({
    steps: [
      { title: "Pick <one>", text: "A & B" },
      { title: "Go", text: "Now" },
    ],
  });
  assert.equal(html.match(/<li class="step">/g).length, 2);
  assert.ok(html.includes('<span class="step__number" aria-hidden="true">01</span>'));
  assert.ok(html.includes('aria-hidden="true">02</span>'));
  assert.ok(html.includes("<h3>Pick &lt;one&gt;</h3><p>A &amp; B</p>"));
  assert.equal(factsHtml({ facts: ["Up to 21 km"] }), '<li class="fact">Up to 21 km</li>');
  assert.ok(pagesHtml(pages).includes(`<h3>${pages[0].name}</h3>`));
});

test("an unknown sport falls back to the first", () => {
  assert.equal(sportOf(sports, "paddle").id, "paddle");
  assert.equal(sportOf(sports, "swim").id, "run");
});

test("choices are buttons, and only the chosen one is pressed", () => {
  const html = chipsHtml("sport", sports, "bike");
  assert.equal(html.match(/<button type="button" class="chip"/g).length, 3);
  assert.ok(html.includes('data-sport="bike" aria-pressed="true">Bike</button>'));
  assert.equal(html.match(/aria-pressed="true"/g).length, 1);
  assert.equal(html.match(/aria-pressed="false"/g).length, 2);
});

test("Try it has a route for every shape and distance", () => {
  assert.ok(tryIt.city.trim());
  assert.ok(tryIt.shapes.length >= 3 && tryIt.distances.length >= 2);
  assert.equal(Object.keys(tryIt.routes).length, tryIt.shapes.length * tryIt.distances.length);
  for (const shape of tryIt.shapes) {
    for (const km of tryIt.distances) {
      const route = tryRoute(tryIt, shape.id, km);
      assert.ok(route, `${shape.id} ${km} km`);
      assert.match(route.d, PATH);
      assert.ok(insideBox(route), `${shape.id} ${km} km fits the square`);
      // The engine's length stays close to the distance that was asked.
      assert.ok(Math.abs(route.km - km) / km < 0.15, `${shape.id} ${km} km is ${route.km} km`);
    }
  }
});

test("the page opens on a route Try it has, the one drawn in the page", () => {
  const html = readFileSync(join(SITE, "index.html"), "utf8");
  const route = tryRoute(tryIt, "heart", 10);
  assert.ok(route);
  assert.equal(tryReadout(tryIt, "heart", 10), `Milano · Heart · ${kmText(route.km)}`);
  assert.ok(html.includes(`>${tryReadout(tryIt, "heart", 10)}</span`));
  assert.match(html, /<svg class="hero__drawing" data-try-drawing /);
  assert.match(html, /<path class="hero__line" pathLength="1" d="M/);
  assert.match(html, /<circle class="hero__start" /);
  assert.equal(tryReadout(tryIt, "dragon", 10), "");
  assert.equal(tryRoute(tryIt, "heart", 7), undefined);
});

test("Best drawings are ten, each complete", () => {
  assert.equal(posts.length, 10);
  assert.equal(new Set(posts.map((post) => post.id)).size, 10);
  for (const post of posts) {
    assert.ok(["run", "paddle"].includes(post.sport), post.id);
    assert.ok(post.title.trim() && post.place.trim(), post.id);
    assert.ok(post.km > 0, post.id);
    assert.match(post.d, PATH);
    assert.ok(insideBox(post), `${post.id} fits the square`);
  }
});

test("the filter of the drawings keeps one sport, or all", () => {
  assert.deepEqual(
    postFilters.map((filter) => filter.id),
    ["all", "run", "paddle"],
  );
  assert.equal(visiblePosts(posts, "all").length, 10);
  for (const sport of ["run", "paddle"]) {
    const shown = visiblePosts(posts, sport);
    assert.ok(shown.length > 0, sport);
    assert.ok(shown.every((post) => post.sport === sport));
  }
  assert.equal(
    visiblePosts(posts, "run").length + visiblePosts(posts, "paddle").length,
    posts.length,
  );
});

test("a drawing's card shows its line, title, place and length", () => {
  const post = {
    id: "x",
    sport: "paddle",
    title: 'Moon & "stars"',
    place: "Lago <di> Garda",
    km: 2,
    d: "M1 2L3 4",
    start: [1, 2],
  };
  const html = postCardHtml(post, 1000);
  assert.ok(html.startsWith('<li class="post post--paddle">'));
  assert.ok(html.includes('<path class="drawing__line" d="M1 2L3 4"/>'));
  assert.ok(html.includes('<circle class="drawing__start" cx="1" cy="2" r="30"/>'));
  assert.ok(html.includes('<span class="post__sport">Paddle</span>'));
  assert.ok(html.includes('<h3 class="post__title">Moon &amp; &quot;stars&quot;</h3>'));
  assert.ok(html.includes('<p class="post__facts">Lago &lt;di&gt; Garda · 2 km</p>'));
  assert.doesNotMatch(html, /<di>/);
  assert.match(drawingHtml(post, 1000, "A <b>"), /viewBox="0 0 1000 1000" role="img" aria-label="A &lt;b&gt;"/);
});

test("lengths read as km", () => {
  assert.equal(kmText(10.1), "10.1 km");
  assert.equal(kmText(2), "2 km");
  assert.equal(escapeHtml(`a<b>&"'`), "a&lt;b&gt;&amp;&quot;&#39;");
});

test("the download is a link only with an https address", () => {
  assert.equal(
    downloadHtml("https://apps.apple.com/app/id1"),
    '<a class="button button--primary" href="https://apps.apple.com/app/id1" rel="noopener noreferrer">Download the app</a>',
  );
  for (const url of [null, undefined, "", "soon", "http://x.example", "javascript:alert(1)"]) {
    assert.equal(isHttps(url), false, String(url));
    assert.equal(downloadHtml(url), '<span class="button button--soon">Download — coming soon</span>');
  }
  assert.ok(downloadUrl === null || isHttps(downloadUrl), "config.js: downloadUrl");
});

test("the page points only at files that exist, and loads nothing from elsewhere", () => {
  const html = readFileSync(join(SITE, "index.html"), "utf8");
  const targets = [...html.matchAll(/\s(?:src|href)="([^"]+)"/g)].map((match) => match[1]);
  assert.ok(targets.includes("styles.css") && targets.includes("main.js"));
  for (const target of targets) {
    if (target.startsWith("#")) {
      continue;
    }
    if (/^https?:/.test(target)) {
      // The only address outside the site is a link: the map data's credit.
      assert.equal(target, "https://www.openstreetmap.org/copyright");
      continue;
    }
    assert.ok(existsSync(join(SITE, target)), `${target} is missing`);
  }
  for (const anchor of targets.filter((target) => target.length > 1 && target.startsWith("#"))) {
    assert.ok(html.includes(`id="${anchor.slice(1)}"`), `${anchor} has no section`);
  }
  assert.ok(html.includes("© OpenStreetMap contributors"), "the map data's credit stays");
});

test("the page has a place for everything main.js fills", () => {
  const html = readFileSync(join(SITE, "index.html"), "utf8");
  const script = readFileSync(join(SITE, "main.js"), "utf8");
  const slots = [...script.matchAll(/"\[(data-[a-z-]+)\]/g)].map((match) => match[1]);
  assert.ok(slots.length >= 8);
  for (const slot of new Set(slots)) {
    assert.ok(html.includes(` ${slot}`), `index.html has no ${slot}`);
  }
  assert.equal(html.match(/ data-download>/g).length, 2, "the download slot: top and bottom");
});

test("the shop is parked: the page does not load it", () => {
  const html = readFileSync(join(SITE, "index.html"), "utf8");
  assert.doesNotMatch(html, /merch|products\.js/i);
});

test("the site carries the app's name, MuW, and never the old one", () => {
  const html = readFileSync(join(SITE, "index.html"), "utf8");
  assert.match(html, /<title>MuW — /);
  assert.match(html, /<img class="top__word" src="assets\/muw-logo.svg" alt="MuW"/);
  assert.match(html, /<link rel="icon" href="assets\/muw-mark.svg"/);
  for (const file of ["index.html", "content.js", "config.js", "products.js", "styles.css"]) {
    assert.doesNotMatch(readFileSync(join(SITE, file), "utf8"), /sgrava/i, file);
  }
});

test("the guide makes no promise the app dropped: no score", () => {
  const texts = JSON.stringify({ sports, pages });
  assert.doesNotMatch(texts, /score/i);
});
