/**
 * What the page of a post's link shows (TASK-455, ADR-0382), without the
 * DOM, so the tests of the site try it: the id after the `#`, the request,
 * what an answer of GET /post is, the words under the title, the line for
 * the map. The map itself, its colours and the API's address are the live
 * page's (../live/view.js).
 */

/** A drawing's id: a UUID, as the API gives it. Anything else is no link. */
export const ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** How long to wait before asking again after a request that did not get
 * through; after the last, the page stays as it is. */
export const RETRY_AFTER_MS = [2_000, 5_000, 10_000];

const METRES_PER_MILE = 1609.344;

/**
 * The id after the `#`, or null when there is none worth asking for. After
 * the `#` and not in the path or the query: the site's server is never sent
 * which drawing was opened.
 * @param {string} hash location.hash
 * @returns {string | null}
 */
export function idFromHash(hash) {
  const id = String(hash ?? "").replace(/^#/, "");
  return ID_PATTERN.test(id) ? id.toLowerCase() : null;
}

/**
 * GET /post: what the link shows.
 * @param {string} api
 * @param {string} id
 * @returns {string}
 */
export function postUrl(api, id) {
  return `${api}/post?id=${encodeURIComponent(id)}`;
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
 * Whether the body is what GET /post answers for a drawing with a link: a
 * line of two points at least, and who drew it.
 * @param {unknown} body
 * @returns {boolean}
 */
export function isPost(body) {
  return (
    typeof body === "object" &&
    body !== null &&
    typeof body.username === "string" &&
    body.username !== "" &&
    Number.isFinite(body.distance_m) &&
    Array.isArray(body.track) &&
    body.track.length >= 2 &&
    body.track.every(isPoint)
  );
}

/**
 * What became of a request.
 * - `shown`: the drawing, to draw;
 * - `gone`: no drawing with a link under this id (404), or an answer that is
 *   not one: the page says it is no longer available;
 * - `busy`: too many requests (429): ask again after `waitMs`;
 * - `failed`: the API did not answer as it should: ask again later.
 * @param {number} status the HTTP status
 * @param {unknown} body the JSON, or undefined when it was none
 * @param {string | null} retryAfter the Retry-After header
 */
export function outcomeOf(status, body, retryAfter) {
  if (status === 200) {
    return isPost(body) ? { kind: "shown", post: body } : { kind: "gone" };
  }
  if (status === 404) {
    return { kind: "gone" };
  }
  if (status === 429) {
    const seconds = Number(retryAfter);
    return {
      kind: "busy",
      waitMs: Number.isFinite(seconds) && seconds > 0 ? Math.min(seconds, 120) * 1000 : 30_000,
    };
  }
  return { kind: "failed" };
}

/**
 * The title its owner gave the drawing; null without one: the page is then
 * called by who drew it.
 * @param {{title?: string | null}} post
 * @returns {string | null}
 */
export function titleOf(post) {
  const title = typeof post.title === "string" ? post.title.trim() : "";
  return title === "" ? null : title;
}

/**
 * «4.3 km», «2.7 mi»: one decimal, as the browser's language writes it.
 * @param {number} metres
 * @param {"km" | "mi"} units
 * @param {string} lang
 */
export function distanceOf(metres, units, lang) {
  const value = Math.max(0, metres) / (units === "mi" ? METRES_PER_MILE : 1000);
  const written = new Intl.NumberFormat(lang, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value);
  return `${written} ${units}`;
}

/**
 * The line under who drew it: the sport, as the app calls it, and how long
 * it is; a sport the page has no word for is left out.
 * @param {{activity?: string, distance_m: number}} post
 * @param {Record<string, string>} sports the names of the sports
 * @param {"km" | "mi"} units
 * @param {string} lang
 */
export function factsOf(post, sports, units, lang) {
  const sport = sports[post.activity];
  const distance = distanceOf(post.distance_m, units, lang);
  return sport ? `${sport} · ${distance}` : distance;
}

/**
 * The line as GeoJSON, [lon, lat] as MapLibre wants it.
 * @param {[number, number][]} track [lat, lon] points
 */
export function lineOf(track) {
  return {
    type: "Feature",
    properties: {},
    geometry: { type: "LineString", coordinates: track.map((p) => [p[1], p[0]]) },
  };
}
