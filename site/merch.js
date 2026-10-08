/**
 * The «Merch» section: one card per shirt of `products.js`.
 *
 * The functions that build the markup are pure, text in and text out, so the
 * tests run them in Node without a browser; only the last lines touch the page.
 */
import { fulfilledBy, products } from "./products.js";
import { escapeHtml } from "./render.js";

export { escapeHtml };

/** The shirt colours the shop knows; each has its class in `styles.css`. */
export const TEE_COLOURS = ["black", "white", "yellow"];

const TEE_OUTLINE =
  "M138 34C160 62 240 62 262 34L338 62Q352 67 359 80L394 148L334 184L312 150" +
  "L312 362Q312 376 298 376L102 376Q88 376 88 362L88 150L66 184L6 148L41 80" +
  "Q48 67 62 62Z";
const TEE_COLLAR = "M138 34C160 62 240 62 262 34C246 82 154 82 138 34Z";

/** «€25» or «€24.90»; nothing when the price is not set. */
export function formatPrice(priceEur) {
  if (typeof priceEur !== "number" || !Number.isFinite(priceEur) || priceEur <= 0) {
    return "";
  }
  return `€${Number.isInteger(priceEur) ? priceEur : priceEur.toFixed(2)}`;
}

/** A shirt is on sale when its `buyUrl` is an https address. */
export function isOnSale(product) {
  if (typeof product.buyUrl !== "string") {
    return false;
  }
  try {
    return new URL(product.buyUrl).protocol === "https:";
  } catch {
    return false;
  }
}

/** The shirt with its print: a drawn tee, the print over the chest. */
export function teeHtml(product) {
  const colour = TEE_COLOURS.includes(product.tee) ? product.tee : TEE_COLOURS[0];
  return (
    `<div class="tee tee--${colour}">` +
    `<svg class="tee__shape" viewBox="0 0 400 400" aria-hidden="true">` +
    `<path class="tee__body" d="${TEE_OUTLINE}"/>` +
    `<path class="tee__collar" d="${TEE_COLLAR}"/>` +
    `</svg>` +
    `<img class="tee__print" src="${escapeHtml(product.print)}" alt="" loading="lazy">` +
    `</div>`
  );
}

/** One card of the shop: the shirt, its name, its price and «Buy». */
export function productCardHtml(product) {
  const name = escapeHtml(product.name);
  const price = formatPrice(product.priceEur);
  const action = isOnSale(product)
    ? `<a class="button button--buy" href="${escapeHtml(product.buyUrl)}" ` +
      `target="_blank" rel="noopener noreferrer" aria-label="Buy ${name}">Buy</a>`
    : `<span class="button button--soon">Coming soon</span>`;
  return (
    `<li class="product" id="product-${escapeHtml(product.id)}">` +
    teeHtml(product) +
    `<div class="product__text">` +
    `<h3 class="product__name">${name}</h3>` +
    `<p class="product__description">${escapeHtml(product.description)}</p>` +
    `</div>` +
    `<div class="product__buy">` +
    (price ? `<span class="product__price">${price}</span>` : "") +
    action +
    `</div>` +
    `</li>`
  );
}

/** The line under the shop: who prints and ships, or that the shop is not open yet. */
export function shopNoteText(service, list) {
  if (!list.some(isOnSale)) {
    return "The shop opens soon.";
  }
  const who = service ? ` by ${service}` : "";
  return `Printed on demand. Payment, shipping and returns are handled${who}.`;
}

if (typeof document !== "undefined") {
  const grid = document.querySelector("[data-products]");
  if (grid) {
    grid.innerHTML = products.map(productCardHtml).join("");
  }
  const note = document.querySelector("[data-shop-note]");
  if (note) {
    note.textContent = shopNoteText(fulfilledBy, products);
  }
}
