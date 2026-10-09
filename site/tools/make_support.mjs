/**
 * The support pages of the site, `getmuw.app/support/` and `it/`, `de/`,
 * `fr/`, `es/` (TASK-237 E): how to reach us and a few questions, from
 * `support_text.mjs`. Static pages, no script.
 *
 * Run from the repository root, no dependency:
 *
 *     node site/tools/make_support.mjs
 *
 * The output is deterministic; a test checks the pages match the texts.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { escapeHtml } from "../render.js";
import { CONTACT, SUPPORT } from "./support_text.mjs";

const SITE = join(dirname(fileURLToPath(import.meta.url)), "..");

/** The app's languages, English first; English lives at `support/`. */
export const LANGUAGES = [
  { code: "en", name: "English" },
  { code: "it", name: "Italiano" },
  { code: "de", name: "Deutsch" },
  { code: "fr", name: "Français" },
  { code: "es", name: "Español" },
];

/** The folder of a page under the site: `support/`, `privacy/it/`… */
export function folderOf(page, code) {
  return code === "en" ? page : `${page}/${code}`;
}

/** Text for the page: «12 km» never breaks between the number and its unit. */
function prose(text) {
  return escapeHtml(text.replace(/(\d) (km)\b/g, "$1\u00a0$2"));
}

/** The whole support page of one language. */
export function supportPage(language, text) {
  const depth = language.code === "en" ? 1 : 2;
  const up = "../".repeat(depth);
  const switcher = LANGUAGES.map((other) =>
    other.code === language.code
      ? `<span class="lang lang--current" aria-current="page">${other.name}</span>`
      : `<a class="lang" href="${up}${folderOf("support", other.code)}/" hreflang="${other.code}" lang="${other.code}">${other.name}</a>`,
  ).join("");
  const faq = text.faq
    .map((item) => `<section><h3>${escapeHtml(item.q)}</h3><p>${prose(item.a)}</p></section>`)
    .join("\n        ");
  const privacy = `${up}${folderOf("privacy", language.code)}/`;
  return `<!doctype html>
<!-- Written by site/tools/make_support.mjs from support_text.mjs: do not edit by hand. -->
<html lang="${language.code}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(text.title)} — MuW</title>
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
        <h1>${escapeHtml(text.title)}</h1>
        <p>${escapeHtml(text.intro)}</p>
        <p><a class="button button--primary support__mail" href="mailto:${CONTACT}">${CONTACT}</a></p>
        <p>${escapeHtml(text.tip)}</p>
        <h2>${escapeHtml(text.faqHeading)}</h2>
        ${faq}
        <p class="support__privacy">${escapeHtml(text.privacyLine)} <a href="${privacy}">${escapeHtml(text.privacy)}</a></p>
      </article>
    </main>

    <footer class="foot">
      <img src="${up}assets/muw-mark.svg" alt="" width="24" height="24" />
      <p>© 2026 MuW</p>
      <p><a class="foot__link" href="${privacy}">${escapeHtml(text.privacy)}</a></p>
    </footer>
  </body>
</html>
`;
}

/** Every page, as { "support/it/index.html": html }. */
export function supportPages() {
  const pages = {};
  for (const language of LANGUAGES) {
    pages[`${folderOf("support", language.code)}/index.html`] = supportPage(
      language,
      SUPPORT[language.code],
    );
  }
  return pages;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  for (const [path, html] of Object.entries(supportPages())) {
    mkdirSync(join(SITE, dirname(path)), { recursive: true });
    writeFileSync(join(SITE, path), html, "utf8");
  }
}
