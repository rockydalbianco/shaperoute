/**
 * The shop's cards, checked in Node without a browser. The shop is parked:
 * the page does not show it for now (`docs/SITO.md`), its code stays tested.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import {
  TEE_COLOURS,
  escapeHtml,
  formatPrice,
  isOnSale,
  productCardHtml,
  shopNoteText,
} from "../merch.js";
import { fulfilledBy, products } from "../products.js";

const SITE = join(dirname(fileURLToPath(import.meta.url)), "..");

const shirt = {
  id: "test-tee",
  name: "Test Tee",
  description: "A tee for the tests.",
  tee: "black",
  print: "prints/milano-heart.svg",
  priceEur: 25,
  buyUrl: "https://shop.example/test-tee",
};

test("every shirt of the shop is complete", () => {
  assert.ok(products.length > 0);
  const ids = products.map((product) => product.id);
  assert.equal(new Set(ids).size, ids.length, "ids are unique");
  for (const product of products) {
    assert.match(product.id, /^[a-z0-9-]+$/);
    assert.ok(product.name.trim());
    assert.ok(product.description.trim());
    assert.ok(TEE_COLOURS.includes(product.tee), `${product.id}: tee colour`);
    assert.ok(existsSync(join(SITE, product.print)), `${product.id}: print file`);
    assert.ok(
      product.priceEur === null || (Number.isFinite(product.priceEur) && product.priceEur > 0),
      `${product.id}: price`,
    );
    assert.ok(product.buyUrl === null || isOnSale(product), `${product.id}: buyUrl is https`);
  }
});

test("a shirt on sale needs a price", () => {
  for (const product of products.filter(isOnSale)) {
    assert.ok(formatPrice(product.priceEur), `${product.id} is on sale without a price`);
  }
});

test("the service is named once a shirt is on sale", () => {
  if (products.some(isOnSale)) {
    assert.ok(typeof fulfilledBy === "string" && fulfilledBy.trim());
  }
});

test("a shirt on sale has a Buy link that opens the service's page", () => {
  const html = productCardHtml(shirt);
  assert.match(html, /<a class="button button--buy" href="https:\/\/shop\.example\/test-tee"/);
  assert.match(html, /target="_blank" rel="noopener noreferrer"/);
  assert.match(html, /aria-label="Buy Test Tee">Buy<\/a>/);
  assert.match(html, /<span class="product__price">€25<\/span>/);
  assert.doesNotMatch(html, /Coming soon/);
});

test("a shirt without an address says Coming soon and links nowhere", () => {
  const html = productCardHtml({ ...shirt, buyUrl: null, priceEur: null });
  assert.match(html, /<span class="button button--soon">Coming soon<\/span>/);
  assert.doesNotMatch(html, /<a /);
  assert.doesNotMatch(html, /product__price/);
});

test("only an https address puts a shirt on sale", () => {
  assert.equal(isOnSale(shirt), true);
  for (const buyUrl of [null, undefined, "", "soon", "http://shop.example/x", "javascript:alert(1)"]) {
    assert.equal(isOnSale({ ...shirt, buyUrl }), false, String(buyUrl));
  }
});

test("texts are escaped in the card", () => {
  const html = productCardHtml({
    ...shirt,
    name: `<b>"Tee" & 'co'</b>`,
    description: "<script>alert(1)</script>",
  });
  assert.doesNotMatch(html, /<b>|<script>/);
  assert.ok(html.includes("&lt;b&gt;&quot;Tee&quot; &amp; &#39;co&#39;&lt;/b&gt;"));
  assert.equal(escapeHtml(`a<b>&"'`), "a&lt;b&gt;&amp;&quot;&#39;");
});

test("an unknown tee colour falls back to the first one", () => {
  assert.match(productCardHtml({ ...shirt, tee: "purple" }), /class="tee tee--black"/);
});

test("prices read as euro", () => {
  assert.equal(formatPrice(25), "€25");
  assert.equal(formatPrice(24.9), "€24.90");
  for (const none of [null, undefined, 0, -3, Number.NaN, "25"]) {
    assert.equal(formatPrice(none), "", String(none));
  }
});

test("the line under the shop", () => {
  const closed = [{ ...shirt, buyUrl: null }];
  assert.equal(shopNoteText(null, closed), "The shop opens soon.");
  assert.equal(shopNoteText("Printshop", closed), "The shop opens soon.");
  assert.equal(
    shopNoteText("Printshop", [shirt]),
    "Printed on demand. Payment, shipping and returns are handled by Printshop.",
  );
  assert.equal(
    shopNoteText(null, [shirt]),
    "Printed on demand. Payment, shipping and returns are handled.",
  );
});

test("each print is a drawing with a line, and carries no script", () => {
  for (const product of products) {
    const svg = readFileSync(join(SITE, product.print), "utf8");
    assert.match(svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="/);
    assert.match(svg, /<path [^>]*d="M/);
    assert.doesNotMatch(svg, /<script|href=/i);
  }
});
