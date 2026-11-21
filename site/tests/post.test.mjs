/**
 * The page of a post's link (TASK-455, ADR-0382): the id it asks with, what
 * an answer of GET /post becomes, the words it says, and that it shows
 * nothing a link should not. `cd site && npm test`.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import { fill, LANGUAGES, TEXTS as LIVE_TEXTS } from "../live/texts.js";
import { API, boundsOf } from "../live/view.js";
import { SPORTS, TEXTS } from "../p/texts.js";
import {
  distanceOf,
  factsOf,
  ID_PATTERN,
  idFromHash,
  isPost,
  lineOf,
  outcomeOf,
  postUrl,
  RETRY_AFTER_MS,
  titleOf,
} from "../p/view.js";

const SITE = join(dirname(fileURLToPath(import.meta.url)), "..");
const REPO = join(SITE, "..");
const PAGE = join(SITE, "p");
const read = (...parts) => readFileSync(join(...parts), "utf8");
/** The example the API's test_post_links.py validates too. */
const FIXTURE = JSON.parse(read(REPO, "packages", "shared-types", "fixtures", "post-link.json"));
const ID = FIXTURE.id;

test("the id comes from the `#`, and only a drawing's id is asked for", () => {
  assert.match(ID, ID_PATTERN);
  assert.equal(idFromHash(`#${ID}`), ID);
  assert.equal(idFromHash(ID), ID);
  assert.equal(idFromHash(`#${ID.toUpperCase()}`), ID);
  for (const none of ["", "#", "#nope", `#${ID}x`, `#${ID}?a=1`, "#../admin", undefined]) {
    assert.equal(idFromHash(none), null, String(none));
  }
  assert.equal(postUrl(API, ID), `https://api.getmuw.app/post?id=${ID}`);
});

test("the example is a drawing the page shows", () => {
  assert.equal(isPost(FIXTURE), true);
  assert.deepEqual(outcomeOf(200, FIXTURE, null), { kind: "shown", post: FIXTURE });
  assert.equal(titleOf(FIXTURE), "Sunday star");
  assert.equal(fill(TEXTS.en.by, { user: FIXTURE.username }), "cleo_draws drew this on MuW");
  assert.equal(factsOf(FIXTURE, SPORTS.en, "km", "en"), "Run · 4.0 km");
  assert.equal(factsOf(FIXTURE, SPORTS.it, "km", "it"), "Corsa · 4,0 km");
  assert.equal(factsOf(FIXTURE, SPORTS.en, "mi", "en"), "Run · 2.5 mi");
});

test("a drawing without a title is called by who drew it; an unknown sport is left unsaid", () => {
  assert.equal(titleOf({ ...FIXTURE, title: null }), null);
  assert.equal(titleOf({ ...FIXTURE, title: "   " }), null);
  assert.equal(factsOf({ ...FIXTURE, activity: "curling" }, SPORTS.en, "km", "en"), "4.0 km");
  assert.equal(distanceOf(-5, "km", "en"), "0.0 km");
});

test("the line goes to the map as it came, turned to [lon, lat]", () => {
  const line = lineOf(FIXTURE.track);
  assert.equal(line.geometry.type, "LineString");
  assert.equal(line.geometry.coordinates.length, FIXTURE.track.length);
  assert.deepEqual(line.geometry.coordinates[0], [FIXTURE.track[0][1], FIXTURE.track[0][0]]);
  const [[west, south], [east, north]] = boundsOf(FIXTURE.track);
  assert.ok(west < east && south < north);
});

test("a link that opens no drawing says so, whatever the reason", () => {
  // The API answers one 404 for a drawing for its followers, a private one,
  // one whose owner turned the links off, a deleted one, an id not there.
  const none = { error: { code: "http_error", message: "No drawing with this id." } };
  assert.deepEqual(outcomeOf(404, none, null), { kind: "gone" });
  // An answer that is not a drawing draws nothing.
  for (const wrong of [undefined, null, {}, { ...FIXTURE, track: [] }, { ...FIXTURE, username: "" }]) {
    assert.deepEqual(outcomeOf(200, wrong, null), { kind: "gone" });
  }
  assert.equal(isPost({ ...FIXTURE, track: [[95, 11], [46, 11]] }), false);
});

test("too many requests wait as long as the API says; a failure asks again a few times", () => {
  assert.deepEqual(outcomeOf(429, undefined, "12"), { kind: "busy", waitMs: 12_000 });
  assert.deepEqual(outcomeOf(429, undefined, null), { kind: "busy", waitMs: 30_000 });
  assert.deepEqual(outcomeOf(429, undefined, "99999"), { kind: "busy", waitMs: 120_000 });
  for (const status of [500, 502, 503, 401]) {
    assert.deepEqual(outcomeOf(status, undefined, null), { kind: "failed" });
  }
  assert.equal(RETRY_AFTER_MS.length, 3);
});

test("when the API still does not answer the page says so and offers to ask again", () => {
  // The words the user approved on 2026-11-21; «Try again» as the app says it.
  assert.equal(TEXTS.en.failed, "We couldn't load this drawing.");
  assert.equal(TEXTS.en.retry, "Try again");
  assert.equal(TEXTS.it.failed, "Non siamo riusciti a caricare questo disegno.");
  for (const language of ["it", "de", "fr", "es"]) {
    const table = read(REPO, "apps", "mobile", "src", "i18n", `${language}.ts`);
    assert.ok(table.includes(`"Try again": "${TEXTS[language].retry}"`), language);
    // Not the words of a drawing that is gone: it may well be there.
    assert.notEqual(TEXTS[language].failed, TEXTS[language].gone, language);
  }
  const script = read(PAGE, "post.js");
  // The button is the script's own, on the page only while it is there to
  // press: the page as it comes has none to show by mistake.
  assert.ok(!read(PAGE, "index.html").includes("<button"));
  assert.match(script, /again\.className = "button post__again";/);
  assert.match(script, /if \(retry\) \{\s*facts\.after\(again\);\s*\} else \{\s*again\.remove\(\);/);
  // Only after the last wait, and the button starts the asking over.
  assert.match(
    script,
    /attempt < RETRY_AFTER_MS\.length\) \{[^}]*\} else \{[^}]*showNothing\(text\.failed, true\);/,
  );
  assert.match(script, /again\.addEventListener\("click", start\);/);
  // A drawing that came, or a link that opens none, has no button.
  assert.match(script, /function showPost\(post\) \{\s*again\.remove\(\);/);
});

test("the words are the approved ones, in the five languages", () => {
  assert.equal(TEXTS.en.by, "{user} drew this on MuW");
  assert.equal(TEXTS.en.get, "Get MuW");
  assert.equal(TEXTS.en.gone, "This drawing is no longer available.");
  const task = read(REPO, "docs", "tasks", "TASK-455.md");
  for (const words of Object.values(TEXTS.en)) {
    assert.ok(task.includes(`«${words}»`), `«${words}» is not in the task file`);
  }
  assert.deepEqual(Object.keys(TEXTS).sort(), [...LANGUAGES].sort());
  assert.deepEqual(Object.keys(SPORTS).sort(), [...LANGUAGES].sort());
  for (const language of LANGUAGES) {
    assert.deepEqual(Object.keys(TEXTS[language]), Object.keys(TEXTS.en), language);
    assert.match(TEXTS[language].by, /\{user\}/, language);
    assert.deepEqual(Object.keys(SPORTS[language]), Object.keys(SPORTS.en), language);
    assert.ok(LIVE_TEXTS[language].privacy, language);
  }
});

test("the sports are called as the app calls them", () => {
  const sports = join(REPO, "apps", "mobile", "src", "sports");
  for (const [activity, name] of Object.entries(SPORTS.en)) {
    const profile = read(sports, `${activity}.ts`);
    assert.ok(
      profile.includes(`name: tLater("${name}")`) || profile.includes(`name: "${name}"`),
      `${activity}: «${name}»`,
    );
  }
  for (const language of ["it", "de", "fr", "es"]) {
    const table = read(REPO, "apps", "mobile", "src", "i18n", `${language}.ts`);
    for (const [activity, name] of Object.entries(SPORTS[language])) {
      const english = SPORTS.en[activity];
      // Snowshoes has no word of its own in the app's tables yet.
      if (activity === "snowshoeing") {
        continue;
      }
      assert.ok(
        new RegExp(`"?${english.replace(/[&]/g, "\\&")}"?:\\s*"${name}"`).test(table),
        `${language}.${activity}: «${name}»`,
      );
    }
  }
});

test("the page is not for search engines, and loads only the site's own files", () => {
  const html = read(PAGE, "index.html");
  assert.match(html, /<meta name="robots" content="noindex, nofollow, noarchive" \/>/);
  assert.match(html, /<meta name="referrer" content="no-referrer" \/>/);
  const loaded = [...html.matchAll(/\s(?:src|href)="([^"]+)"/g)].map((m) => m[1]);
  for (const target of loaded) {
    assert.doesNotMatch(target, /^[a-z]+:|^\/\//i, `${target} comes from outside`);
  }
  // MapLibre and the map's colours are the live page's: one copy to keep.
  for (const file of ["../live/maplibre-gl.js", "../live/maplibre-gl.css", "../live/live.css", "post.css", "post.js"]) {
    assert.ok(loaded.includes(file), file);
  }
  for (const file of ["post.js", "view.js", "texts.js"]) {
    const urls = read(PAGE, file).match(/https?:\/\/[^"'`\s)]+/g) ?? [];
    assert.deepEqual(urls, [], `${file} names no address of its own`);
  }
});

test("a chat app shows the same card for every link: the approved words and the site's own picture", () => {
  const html = read(PAGE, "index.html");
  const meta = (name) =>
    html.match(new RegExp(`<meta (?:property|name)="${name}" content="([^"]*)" />`))?.[1];
  // The words the user approved on 2026-11-21.
  assert.equal(meta("og:title"), "A drawing on MuW");
  assert.equal(meta("og:description"), "Open the link to see the line on the map.");
  assert.equal(meta("og:site_name"), "MuW");
  assert.equal(meta("twitter:card"), "summary_large_image");
  assert.ok(meta("og:image:alt"));
  // An app that followed og:url would open the page without the id.
  assert.equal(meta("og:url"), undefined);
  assert.ok(!/rel="canonical"/.test(html));
  // The picture is the site's, beside the page the link opens.
  const types = read(REPO, "packages", "shared-types", "src", "index.ts");
  const page = types.match(/POST_LINK_PAGE = "([^"#]+)#"/)?.[1];
  assert.ok(page, "POST_LINK_PAGE");
  assert.equal(meta("og:image"), `${page}link-card.png`);
  // A PNG of the size the page says, light enough for a chat app to take.
  const picture = readFileSync(join(PAGE, "link-card.png"));
  assert.equal(picture.subarray(1, 4).toString("latin1"), "PNG");
  assert.equal(String(picture.readUInt32BE(16)), meta("og:image:width"));
  assert.equal(String(picture.readUInt32BE(20)), meta("og:image:height"));
  assert.deepEqual([picture.readUInt32BE(16), picture.readUInt32BE(20)], [1200, 630]);
  assert.ok(picture.length < 300_000, `${picture.length} bytes`);
  // Drawn here, with no map tiles and no address: nothing of a place or a post.
  const drawing = read(SITE, "tools", "link-card.html");
  assert.deepEqual(drawing.match(/https?:\/\/(?!www\.w3\.org\/2000\/svg)[^"'`\s)]+/g) ?? [], []);
});

test("the page asks the API once, sends nothing of who reads, and keeps nothing", () => {
  const script = read(PAGE, "post.js");
  assert.match(script, /cache: "no-store"/);
  assert.match(script, /referrerPolicy: "no-referrer"/);
  for (const kept of ["localStorage", "sessionStorage", "document.cookie", "indexedDB"]) {
    assert.ok(!script.includes(kept), kept);
  }
  // No photos, no comments: the page has nowhere to put them.
  const html = read(PAGE, "index.html");
  assert.ok(!/<img[^>]+data-/.test(html));
});

test("the server's copy (DEPLOY.md F.14) takes the page and what it loads", () => {
  const deploy = read(REPO, "docs", "DEPLOY.md");
  const line = deploy.match(/git archive origin\/main ((?:site\/\S+ ?)+)\|/);
  const copied = line ? line[1].trim().split(/\s+/) : [];
  // The page's own folder, the live page's (MapLibre, the map's colours) and
  // the download address: without one of them a link opens a broken page.
  for (const path of ["site/p", "site/live", "site/config.js", "site/styles.css"]) {
    assert.ok(copied.includes(path), `DEPLOY.md F.14 copies ${path}`);
  }
});
