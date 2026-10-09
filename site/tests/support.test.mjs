/**
 * The support pages: how to reach us and a few questions, in each of the
 * app's languages. `cd site && npm test`.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import { LANGUAGES, folderOf, supportPages } from "../tools/make_support.mjs";
import { CONTACT, SUPPORT } from "../tools/support_text.mjs";

const SITE = join(dirname(fileURLToPath(import.meta.url)), "..");
const APP_EN = join(SITE, "..", "apps", "mobile", "src", "about", "content", "en.ts");
const pages = supportPages();

test("the pages match their texts: run make_support.mjs after a change", () => {
  assert.deepEqual(Object.keys(pages).sort(), [
    "support/de/index.html",
    "support/es/index.html",
    "support/fr/index.html",
    "support/index.html",
    "support/it/index.html",
  ]);
  for (const [path, html] of Object.entries(pages)) {
    assert.equal(readFileSync(join(SITE, path), "utf8"), html, `${path} is out of date`);
  }
});

test("every language has the same parts", () => {
  const english = SUPPORT.en;
  for (const language of LANGUAGES) {
    const text = SUPPORT[language.code];
    for (const key of ["title", "intro", "tip", "faqHeading", "privacy", "privacyLine"]) {
      assert.ok(typeof text[key] === "string" && text[key].trim(), `${language.code}: ${key}`);
    }
    assert.equal(text.faq.length, english.faq.length, `${language.code}: questions`);
    for (const item of text.faq) {
      assert.ok(item.q.trim() && item.a.trim(), language.code);
    }
  }
});

test("where to write is the address of the privacy policy, and a mail link", () => {
  assert.ok(readFileSync(APP_EN, "utf8").includes(CONTACT), "the app's privacy text names it");
  for (const html of Object.values(pages)) {
    assert.ok(html.includes(`href="mailto:${CONTACT}">${CONTACT}</a>`));
  }
});

test("each page is in its language, links to the others and to its privacy page", () => {
  for (const language of LANGUAGES) {
    const html = pages[`${folderOf("support", language.code)}/index.html`];
    assert.match(html, new RegExp(`<html lang="${language.code}">`));
    assert.ok(html.includes(`<title>${SUPPORT[language.code].title} — MuW</title>`));
    assert.match(html, new RegExp(`aria-current="page">${language.name}</span>`));
    for (const other of LANGUAGES.filter((item) => item !== language)) {
      assert.ok(html.includes(`hreflang="${other.code}"`), `${language.code} → ${other.code}`);
    }
    const privacy = `${folderOf("privacy", language.code)}/`;
    assert.ok(html.includes(`${privacy}">${SUPPORT[language.code].privacy}</a>`), language.code);
  }
});

test("every page points at files that exist; the only address elsewhere is the mail", () => {
  for (const [path, html] of Object.entries(pages)) {
    const folder = dirname(join(SITE, path));
    for (const [, target] of html.matchAll(/\s(?:src|href)="([^"]+)"/g)) {
      if (target.startsWith("mailto:")) {
        assert.equal(target, `mailto:${CONTACT}`);
        continue;
      }
      assert.doesNotMatch(target, /^[a-z]+:/i, `${path}: ${target}`);
      assert.ok(existsSync(join(folder, target)), `${path}: ${target} is missing`);
    }
  }
});

test("the answers name the app's buttons as the app shows them", () => {
  assert.ok(SUPPORT.en.faq[1].a.includes("«Try 12 km»"));
  assert.ok(SUPPORT.it.faq[1].a.includes("«Prova 12 km»"));
  assert.ok(SUPPORT.de.faq[1].a.includes("«12 km versuchen»"));
  assert.ok(SUPPORT.fr.faq[1].a.includes("«Essayer 12 km»"));
  assert.ok(SUPPORT.es.faq[1].a.includes("«Probar 12 km»"));
  assert.ok(SUPPORT.en.faq[2].a.includes("«Settings», tap «Delete account»"));
  assert.ok(SUPPORT.it.faq[2].a.includes("«Impostazioni», tocca «Elimina account»"));
  assert.ok(SUPPORT.de.faq[2].a.includes("«Einstellungen» auf «Konto löschen»"));
  assert.ok(SUPPORT.fr.faq[2].a.includes("«Réglages», touche «Supprimer le compte»"));
  assert.ok(SUPPORT.es.faq[2].a.includes("«Ajustes», toca «Eliminar cuenta»"));
});

test("the home page links to support, and the server's copy takes it", () => {
  const html = readFileSync(join(SITE, "index.html"), "utf8");
  assert.ok(html.includes('<a class="foot__link" href="support/">Support</a>'));
  const deploy = readFileSync(join(SITE, "..", "docs", "DEPLOY.md"), "utf8");
  const line = deploy.match(/git archive origin\/main ((?:site\/\S+ ?)+)\|/);
  assert.ok(line && line[1].split(/\s+/).includes("site/support"), "DEPLOY.md F.14 copies site/support");
});
