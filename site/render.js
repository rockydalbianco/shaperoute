/**
 * The markup of the page's moving parts, as pure functions: text in, text
 * out. The tests run them in Node without a browser; `main.js` puts their
 * output in the page.
 */

const ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

/** Text made safe for markup and for an attribute. */
export function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (character) => ESCAPES[character]);
}

/** Only an https address is ever turned into a link. */
export function isHttps(url) {
  if (typeof url !== "string") {
    return false;
  }
  try {
    return new URL(url).protocol === "https:";
  } catch {
    return false;
  }
}

/** One choice of a group: a button that says whether it is the chosen one. */
export function chipHtml(group, id, label, chosen) {
  return (
    `<button type="button" class="chip" data-${group}="${escapeHtml(id)}" ` +
    `aria-pressed="${chosen ? "true" : "false"}">${escapeHtml(label)}</button>`
  );
}

/** The choices of a group, the chosen one pressed. */
export function chipsHtml(group, choices, chosenId) {
  return choices
    .map((choice) => chipHtml(group, choice.id, choice.label, choice.id === chosenId))
    .join("");
}

/** The sport with this id, or the first one. */
export function sportOf(sports, id) {
  return sports.find((sport) => sport.id === id) ?? sports[0];
}

/** The short facts of a sport: distance, where, how it guides. */
export function factsHtml(sport) {
  return sport.facts.map((fact) => `<li class="fact">${escapeHtml(fact)}</li>`).join("");
}

/** The numbered steps of a sport. */
export function stepsHtml(sport) {
  return sport.steps
    .map(
      (step, index) =>
        `<li class="step">` +
        `<span class="step__number" aria-hidden="true">${String(index + 1).padStart(2, "0")}</span>` +
        `<h3>${escapeHtml(step.title)}</h3>` +
        `<p>${escapeHtml(step.text)}</p>` +
        `</li>`,
    )
    .join("");
}

/** The app's pages, one card each. */
export function pagesHtml(pages) {
  return pages
    .map(
      (page) =>
        `<li class="page">` +
        `<h3>${escapeHtml(page.name)}</h3>` +
        `<p>${escapeHtml(page.text)}</p>` +
        `</li>`,
    )
    .join("");
}

/** «10.1 km», or «2 km» when the decimal is zero. */
export function kmText(km) {
  return `${Number.isInteger(km) ? km : km.toFixed(1)} km`;
}

/** The key of a «Try it» route: its shape and its distance in km. */
export function tryKey(shapeId, km) {
  return `${shapeId}-${km * 1000}`;
}

/** The route chosen in «Try it», or nothing when the pair does not exist. */
export function tryRoute(tryIt, shapeId, km) {
  return tryIt.routes[tryKey(shapeId, km)];
}

/** «MILANO · HEART · 10.1 KM», the line over the «Try it» drawing. */
export function tryReadout(tryIt, shapeId, km) {
  const route = tryRoute(tryIt, shapeId, km);
  const shape = tryIt.shapes.find((item) => item.id === shapeId);
  if (!route || !shape) {
    return "";
  }
  return `${tryIt.city} · ${shape.label} · ${kmText(route.km)}`;
}

/** The start dot of a small drawing, in the units of its square. */
const START_RADIUS = 30;

/** A route as a drawing: the line and the dot where it starts. */
export function drawingHtml(drawing, box, label) {
  return (
    `<svg class="drawing" viewBox="0 0 ${box} ${box}" role="img" aria-label="${escapeHtml(label)}">` +
    `<path class="drawing__line" d="${escapeHtml(drawing.d)}"/>` +
    `<circle class="drawing__start" cx="${drawing.start[0]}" cy="${drawing.start[1]}" r="${START_RADIUS}"/>` +
    `</svg>`
  );
}

const SPORT_LABELS = { run: "Run", bike: "Bike", paddle: "Paddle" };

/** One of the «Best drawings»: the drawing, its title, where and how long. */
export function postCardHtml(post, box) {
  const sport = SPORT_LABELS[post.sport] ?? SPORT_LABELS.run;
  const facts = `${post.place} · ${kmText(post.km)}`;
  return (
    `<li class="post post--${sport.toLowerCase()}">` +
    `<div class="post__screen">` +
    drawingHtml(post, box, `${post.title}: ${facts}`) +
    `<span class="post__sport">${sport}</span>` +
    `</div>` +
    `<h3 class="post__title">${escapeHtml(post.title)}</h3>` +
    `<p class="post__facts">${escapeHtml(facts)}</p>` +
    `</li>`
  );
}

/** The drawings a filter lets through: «all», or one sport. */
export function visiblePosts(posts, filterId) {
  return filterId === "all" ? posts : posts.filter((post) => post.sport === filterId);
}

/** The way to the app: a link once it has an address, a notice until then. */
export function downloadHtml(url) {
  return isHttps(url)
    ? `<a class="button button--primary" href="${escapeHtml(url)}" rel="noopener noreferrer">Download the app</a>`
    : `<span class="button button--soon">Download — coming soon</span>`;
}
