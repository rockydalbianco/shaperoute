/**
 * The shirts of the shop, in one place (`docs/SITO.md`).
 *
 * The site sells nothing by itself: a print-on-demand service prints, takes
 * the payment and ships. A shirt is on sale when it has a `buyUrl`, the
 * address of its page on that service; until then the page shows
 * «Coming soon». Prices are in euro, and `null` shows no price.
 */

/** The service that prints and ships, named under the shop. `null` until chosen. */
export const fulfilledBy = null;

export const products = [
  {
    id: "milano-heart",
    name: "Milano Heart Tee",
    description: "A heart on the streets of Milano, 10.1 km.",
    tee: "black",
    print: "prints/milano-heart.svg",
    priceEur: null,
    buyUrl: null,
  },
  {
    id: "torino-snail",
    name: "Torino Snail Tee",
    description: "A snail across Torino, 21.8 km: a half marathon, slowly.",
    tee: "white",
    print: "prints/torino-snail.svg",
    priceEur: null,
    buyUrl: null,
  },
  {
    id: "trento-star",
    name: "Trento Star Tee",
    description: "A star through Trento, 5.1 km.",
    tee: "black",
    print: "prints/trento-star.svg",
    priceEur: null,
    buyUrl: null,
  },
  {
    id: "logo",
    name: "Sgrava Logo Tee",
    description: "The Sgrava logo, black on yellow.",
    tee: "yellow",
    print: "prints/logo-black.svg",
    priceEur: null,
    buyUrl: null,
  },
];
