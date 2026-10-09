/**
 * The privacy pages of the site, `getmuw.app/privacy/`, written from the
 * app's own «Privacy» text (`apps/mobile/src/about/content/*.ts`, TASK-184):
 * Apple asks for the policy at a public address, and it must say what the
 * app says. The app's files are read, never written; Node 24 loads them as
 * they are, since they only import types.
 *
 * Run from the repository root, no dependency:
 *
 *     node site/tools/make_privacy.mjs
 *
 * The output is deterministic, and a test checks the pages still match the
 * app's text: after a change there, run this again.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { escapeHtml } from "../render.js";

const SITE = join(dirname(fileURLToPath(import.meta.url)), "..");
const APP = join(SITE, "..", "apps", "mobile", "src");

/** The languages of the app, English first; English lives at `privacy/`. */
export const LANGUAGES = [
  { code: "en", name: "English", module: "en.ts", key: "EN" },
  { code: "it", name: "Italiano", module: "it.ts", key: "IT" },
  { code: "de", name: "Deutsch", module: "de.ts", key: "DE" },
  { code: "fr", name: "Français", module: "fr.ts", key: "FR" },
  { code: "es", name: "Español", module: "es.ts", key: "ES" },
];

const DRAFT = "Draft — not final yet.";
const UPDATED = "Last updated: {date}";

/** Anything between square brackets is still to fill, as in the app. */
const PLACEHOLDER = /(\[[^\]]+\])/;

/** The folder of a language under the site: `privacy/`, `privacy/it/`… */
export function folderOf(code) {
  return code === "en" ? "privacy" : `privacy/${code}`;
}

/** Text with the places still to fill marked, as the app marks them. */
export function markedText(text) {
  return String(text)
    .split(PLACEHOLDER)
    .map((part, index) =>
      index % 2 === 1
        ? `<mark class="placeholder">${escapeHtml(part)}</mark>`
        : escapeHtml(part),
    )
    .join("");
}

function blockHtml(block) {
  if (typeof block === "string") {
    return `<p>${markedText(block)}</p>`;
  }
  return `<ul>${block.bullets.map((item) => `<li>${markedText(item)}</li>`).join("")}</ul>`;
}

/** The whole page of one language. `labels` are the app's own two lines. */
export function privacyPage(language, document, labels) {
  const depth = language.code === "en" ? 1 : 2;
  const up = "../".repeat(depth);
  const switcher = LANGUAGES.map((other) => {
    const href = `${"../".repeat(depth)}${folderOf(other.code)}/`;
    return other.code === language.code
      ? `<span class="lang lang--current" aria-current="page">${other.name}</span>`
      : `<a class="lang" href="${href}" hreflang="${other.code}" lang="${other.code}">${other.name}</a>`;
  }).join("");
  const notice = document.draft
    ? `<div class="legal__draft" role="note"><strong>${escapeHtml(labels.draft)}</strong>` +
      (document.updated !== null
        ? `<span>${escapeHtml(labels.updated.replace("{date}", document.updated))}</span>`
        : "") +
      `</div>`
    : document.updated !== null
      ? `<p class="legal__updated">${escapeHtml(labels.updated.replace("{date}", document.updated))}</p>`
      : "";
  const sections = document.sections
    .map(
      (section) =>
        `<section><h2>${escapeHtml(section.heading)}</h2>${section.blocks.map(blockHtml).join("")}</section>`,
    )
    .join("\n        ");
  return `<!doctype html>
<!-- Written by site/tools/make_privacy.mjs from the app's «Privacy»: do not edit by hand. -->
<html lang="${language.code}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(document.title)} — MuW</title>
    <meta name="theme-color" content="#0A0A0B" />
    <link rel="icon" href="${up}assets/muw-mark.svg" type="image/svg+xml" />
    <link rel="stylesheet" href="${up}styles.css" />
  </head>
  <body>
    <header class="top">
      <a class="top__logo" href="${up}" aria-label="MuW, home">
        <img class="top__mark" src="${up}assets/muw-mark.svg" alt="" width="34" height="34" />
        <img class="top__word" src="${up}assets/muw-logo.svg" alt="MuW" width="84" height="24" />
      </a>
      <nav class="langs" aria-label="Language">${switcher}</nav>
    </header>

    <main id="main">
      <article class="legal">
        <h1>${escapeHtml(document.title)}</h1>
        ${notice}
        ${sections}
      </article>
    </main>

    <footer class="foot">
      <img src="${up}assets/muw-mark.svg" alt="" width="24" height="24" />
      <p>© 2026 MuW</p>
    </footer>
  </body>
</html>
`;
}

async function load(path, key) {
  return (await import(path))[key];
}

/** Every page, as { "privacy/it/index.html": html }, from the app's files. */
export async function privacyPages() {
  const pages = {};
  for (const language of LANGUAGES) {
    const content = await load(join(APP, "about", "content", language.module), language.key);
    let labels = { draft: DRAFT, updated: UPDATED };
    if (language.code !== "en") {
      const table = await load(join(APP, "i18n", language.module), language.key);
      labels = { draft: table[DRAFT], updated: table[UPDATED] };
    }
    if (!labels.draft || !labels.updated) {
      throw new Error(`${language.code}: the app has no translation of the draft notice`);
    }
    pages[`${folderOf(language.code)}/index.html`] = privacyPage(language, content.privacy, labels);
  }
  return pages;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  for (const [path, html] of Object.entries(await privacyPages())) {
    mkdirSync(join(SITE, dirname(path)), { recursive: true });
    writeFileSync(join(SITE, path), html, "utf8");
  }
}
