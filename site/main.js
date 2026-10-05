/**
 * Wires the page: the sport, the «Try it» panel, the filter of the drawings
 * and the download link. What is shown comes from `content.js`, `config.js`
 * and `data/drawings.js`; how it is written comes from `render.js`.
 */
import { downloadUrl } from "./config.js";
import { pages, postFilters, sports } from "./content.js";
import { box, posts, tryIt } from "./data/drawings.js";
import {
  chipsHtml,
  downloadHtml,
  factsHtml,
  pagesHtml,
  postCardHtml,
  sportOf,
  stepsHtml,
  tryReadout,
  tryRoute,
  visiblePosts,
} from "./render.js";

const state = { sport: sports[0].id, shape: "heart", km: 10, filter: "all" };

const find = (selector) => document.querySelector(selector);

function fill(selector, html) {
  const element = find(selector);
  if (element) {
    element.innerHTML = html;
  }
}

function showSport() {
  const sport = sportOf(sports, state.sport);
  fill("[data-sports]", chipsHtml("sport", sports, sport.id));
  fill("[data-facts]", factsHtml(sport));
  fill("[data-steps]", stepsHtml(sport));
}

function showTryControls() {
  fill("[data-try-shapes]", chipsHtml("shape", tryIt.shapes, state.shape));
  fill(
    "[data-try-distances]",
    chipsHtml(
      "km",
      tryIt.distances.map((km) => ({ id: String(km), label: `${km} km` })),
      String(state.km),
    ),
  );
}

/** Put the chosen route in the panel and draw it again from its start. */
function showTryRoute() {
  const route = tryRoute(tryIt, state.shape, state.km);
  const line = find("[data-try-drawing] .hero__line");
  const start = find("[data-try-drawing] .hero__start");
  if (!route || !line || !start) {
    return;
  }
  const fresh = line.cloneNode(false);
  fresh.setAttribute("d", route.d);
  line.replaceWith(fresh);
  start.setAttribute("cx", route.start[0]);
  start.setAttribute("cy", route.start[1]);
  const text = tryReadout(tryIt, state.shape, state.km);
  find("[data-try-drawing]")?.setAttribute("aria-label", `A route drawn on the map: ${text}`);
  const readout = find("[data-try-readout]");
  if (readout) {
    readout.textContent = text;
  }
}

function showPosts() {
  fill("[data-post-filters]", chipsHtml("filter", postFilters, state.filter));
  fill(
    "[data-posts]",
    visiblePosts(posts, state.filter)
      .map((post) => postCardHtml(post, box))
      .join(""),
  );
}

document.addEventListener("click", (event) => {
  const chip = event.target instanceof Element ? event.target.closest(".chip") : null;
  if (!chip) {
    return;
  }
  const { sport, shape, km, filter } = chip.dataset;
  if (sport) {
    state.sport = sport;
    showSport();
    find(`[data-sport="${sport}"]`)?.focus();
  } else if (shape || km) {
    state.shape = shape ?? state.shape;
    state.km = km ? Number(km) : state.km;
    showTryControls();
    showTryRoute();
    find(shape ? `[data-shape="${shape}"]` : `[data-km="${km}"]`)?.focus();
  } else if (filter) {
    state.filter = filter;
    showPosts();
    find(`[data-filter="${filter}"]`)?.focus();
  }
});

showSport();
fill("[data-pages]", pagesHtml(pages));
showTryControls();
showPosts();
for (const slot of document.querySelectorAll("[data-download]")) {
  slot.innerHTML = downloadHtml(downloadUrl);
}
