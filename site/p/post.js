/**
 * The page of a post's link on the screen (TASK-455, ADR-0382): asks GET
 * /post once with the id after the `#`, and shows the drawing on the map,
 * its title, who drew it, the sport and the distance, and the way to the
 * app. What to show is worked out in view.js, without the DOM; here only
 * the page and the map, which is the live page's.
 */
import { downloadUrl } from "../config.js";
import { fill, pickLanguage, TEXTS as LIVE_TEXTS } from "../live/texts.js";
import { apiBase, boundsOf, MAP_COLOURS, mapStyle, unitsOf } from "../live/view.js";
import { SPORTS, TEXTS } from "./texts.js";
import {
  appBarOf,
  bearingOf,
  factsOf,
  idFromHash,
  lineOf,
  outcomeOf,
  postUrl,
  RETRY_AFTER_MS,
  titleOf,
  TURNED_MIN_DEG,
} from "./view.js";

const languages = navigator.languages ?? [navigator.language];
const lang = pickLanguage(languages);
const units = unitsOf(languages);
const text = TEXTS[lang];
const api = apiBase(window.location);

const title = document.querySelector("[data-title]");
const by = document.querySelector("[data-by]");
const facts = document.querySelector("[data-facts]");
const mapBox = document.querySelector("[data-map-box]");
const mapElement = document.querySelector("[data-map]");
/** «Try again», made here and put under the words only while it is there to
 * press: a browser that kept an older copy of the page or of its styles
 * shows no stray button. */
const again = document.createElement("button");
again.type = "button";
again.className = "button post__again";

/** A new id (the `#` changed) leaves the answers of the old one unread. */
let round = 0;
let map = null;

function putTexts() {
  document.documentElement.lang = lang;
  const get = document.querySelector("[data-get]");
  get.textContent = text.get;
  get.setAttribute("href", downloadUrl);
  again.textContent = text.retry;
  const privacy = document.querySelector("[data-privacy]");
  privacy.textContent = LIVE_TEXTS[lang].privacy;
  if (lang !== "en") {
    privacy.setAttribute("href", `../privacy/${lang}/`);
  }
}

function clearMap() {
  if (map) {
    map.remove();
    map = null;
  }
  mapBox.hidden = true;
}

/** Nothing of a drawing on the page: before the answer, after a link that
 * opens none, and, with the way to ask again, when the API did not answer. */
function showNothing(words, retry = false) {
  clearMap();
  if (retry) {
    facts.after(again);
  } else {
    again.remove();
  }
  title.hidden = true;
  title.textContent = "";
  facts.textContent = "";
  by.textContent = words;
  by.className = words === "" ? "post__by" : "post__by post__by--gone";
  document.title = "MuW";
}

function mapColours() {
  const css = getComputedStyle(document.documentElement);
  const read = (name) => css.getPropertyValue(`--map-${name}`).trim();
  return {
    colours: Object.fromEntries(MAP_COLOURS.map((name) => [name, read(name)])),
    track: read("track"),
    casing: read("track-casing"),
  };
}

function showMap(post) {
  clearMap();
  if (!window.maplibregl) {
    return;
  }
  mapBox.hidden = false;
  const { colours, track, casing } = mapColours();
  // Turned as the drawing, so its shape reads upright, as in the app.
  const bearing = bearingOf(post.rotation_deg);
  try {
    map = new window.maplibregl.Map({
      container: mapElement,
      style: mapStyle(colours, lang),
      bearing,
      bounds: boundsOf(post.track),
      fitBoundsOptions: { padding: 48, maxZoom: 16, bearing },
      attributionControl: false,
      dragRotate: false,
      pitchWithRotate: false,
    });
  } catch {
    // No WebGL: the words stay, without the map.
    map = null;
    mapBox.hidden = true;
    return;
  }
  map.addControl(new window.maplibregl.AttributionControl({ compact: false }));
  // On a turned map the compass says where north is; a tap puts it up.
  const turned = Math.abs(bearing) >= TURNED_MIN_DEG;
  map.addControl(
    new window.maplibregl.NavigationControl({ showCompass: turned, visualizePitch: false }),
    "top-right",
  );
  const drawn = map;
  // The style is written here: the line can draw before the tiles come.
  drawn.once("style.load", () => {
    drawn.addSource("track", { type: "geojson", data: lineOf(post.track) });
    drawn.addLayer({
      id: "track-casing",
      type: "line",
      source: "track",
      layout: { "line-join": "round", "line-cap": "round" },
      paint: { "line-color": casing, "line-width": 8, "line-opacity": 0.6 },
    });
    drawn.addLayer({
      id: "track",
      type: "line",
      source: "track",
      layout: { "line-join": "round", "line-cap": "round" },
      paint: { "line-color": track, "line-width": 4.5 },
    });
  });
}

function showPost(post) {
  again.remove();
  const who = fill(text.by, { user: post.username });
  const named = titleOf(post);
  title.hidden = named === null;
  title.textContent = named ?? "";
  by.textContent = who;
  by.className = named === null ? "post__by post__by--title" : "post__by";
  facts.textContent = factsOf(post, SPORTS[lang], units, lang);
  document.title = `${named ?? who} — MuW`;
  showMap(post);
}

async function ask(id, mine, attempt) {
  let outcome;
  try {
    const answer = await fetch(postUrl(api, id), {
      cache: "no-store",
      referrerPolicy: "no-referrer",
    });
    const body = await answer.json().catch(() => undefined);
    outcome = outcomeOf(answer.status, body, answer.headers.get("Retry-After"));
  } catch {
    outcome = { kind: "failed" };
  }
  if (mine !== round) {
    return;
  }
  if (outcome.kind === "shown") {
    showPost(outcome.post);
  } else if (outcome.kind === "gone") {
    putAppBar(null);
    showNothing(text.gone);
  } else if (outcome.kind === "busy") {
    setTimeout(() => mine === round && ask(id, mine, attempt), outcome.waitMs);
  } else if (attempt < RETRY_AFTER_MS.length) {
    // The API did not answer: the page waits and asks again, and says
    // nothing of a drawing it knows nothing of.
    setTimeout(() => mine === round && ask(id, mine, attempt + 1), RETRY_AFTER_MS[attempt]);
  } else {
    // Still no answer: the page says so, not that the drawing is gone, and
    // leaves the asking to who reads.
    showNothing(text.failed, true);
  }
}

/**
 * Safari's own bar over the page, on an iPhone (TASK-482): with MuW on the
 * phone it offers to open it, and gives it this link; without, it leads to
 * the App Store. Safari draws it and asks Apple about the app by itself;
 * the page only names the app (index.html) and its own address. bar.js has
 * already put the link as the page was read; here it follows a change of
 * the `#`, and a link that opens no drawing (`id` null) names the app alone.
 */
function putAppBar(id) {
  const { origin, pathname } = window.location;
  const bar = appBarOf(downloadUrl, id === null ? null : `${origin}${pathname}#${id}`);
  let meta = document.querySelector('meta[name="apple-itunes-app"]');
  if (bar === null) {
    meta?.remove();
    return;
  }
  if (meta === null) {
    // An older copy of the page, kept by the browser, has none.
    meta = document.createElement("meta");
    meta.name = "apple-itunes-app";
    document.head.append(meta);
  }
  if (meta.content !== bar) {
    meta.content = bar;
  }
}

function start() {
  round += 1;
  const id = idFromHash(window.location.hash);
  // The bar says which post, also after a change of the `#`.
  putAppBar(id);
  if (id === null) {
    // Not a link to a drawing: as one that opens none.
    showNothing(text.gone);
    return;
  }
  showNothing("");
  void ask(id, round, 0);
}

putTexts();
again.addEventListener("click", start);
start();
window.addEventListener("hashchange", start);
