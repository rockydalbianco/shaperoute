import { EN } from "./content/en";
import { IT } from "./content/it";
import {
  ABOUT_IDS,
  type AboutBlock,
  type AboutContent,
  type AboutDocument,
  aboutDocument,
  aboutLanguage,
  isAboutId,
  PLACEHOLDER,
  PLACEHOLDER_PATTERN,
} from "./documents";

const CONTENTS: [string, AboutContent][] = [
  ["en", EN],
  ["it", IT],
];

/** Every paragraph and point of a text, with its title and headings. */
function lines(text: AboutDocument): string[] {
  return [
    text.title,
    ...text.sections.flatMap((section) => [
      section.heading,
      ...section.blocks.flatMap((block) =>
        typeof block === "string" ? [block] : block.bullets,
      ),
    ]),
  ];
}

function all(text: AboutDocument): string {
  return lines(text).join("\n");
}

/** A paragraph, or how many points: what two languages must share. */
function shape(block: AboutBlock): string {
  return typeof block === "string" ? "paragraph" : `${block.bullets.length} points`;
}

describe.each(ABOUT_IDS)("«%s»", (id) => {
  test("Italian has the sections of English, block by block", () => {
    const english = EN[id].sections.map((section) => section.blocks.map(shape));
    const italian = IT[id].sections.map((section) => section.blocks.map(shape));
    expect(italian).toEqual(english);
    expect(IT[id].draft).toBe(EN[id].draft);
    expect(IT[id].updated === null).toBe(EN[id].updated === null);
  });

  test.each(CONTENTS)(
    "in «%s» no text is empty, and no heading comes twice",
    (_, content) => {
      const text = content[id];
      expect(lines(text).filter((line) => line.trim() === "")).toEqual([]);
      const headings = text.sections.map((section) => section.heading);
      expect(new Set(headings).size).toBe(headings.length);
      for (const section of text.sections) {
        expect(section.blocks.length).toBeGreaterThan(0);
      }
    },
  );

  test.each(CONTENTS)("in «%s» there is no address and no link", (_, content) => {
    const text = all(content[id]);
    // An email address, a web address, a phone number: none is decided yet.
    expect(text).not.toMatch(/[^\s@[]+@[^\s@]+\.[a-z]{2,}/i);
    expect(text).not.toMatch(/https?:|www\./i);
    expect(text).not.toMatch(/\+\d{6,}/);
  });
});

test("«Help» has around ten short sections and is not a draft", () => {
  for (const [, content] of CONTENTS) {
    expect(content.help.draft).toBe(false);
    expect(content.help.updated).toBeNull();
    expect(content.help.sections.length).toBeGreaterThanOrEqual(8);
    expect(content.help.sections.length).toBeLessThanOrEqual(12);
    // Where to write is still to fill.
    expect(all(content.help)).toContain(PLACEHOLDER.contact);
  }
});

describe.each(["terms", "privacy"] as const)("«%s» is a draft", (id) => {
  test.each(CONTENTS)("in «%s», with its day", (_, content) => {
    expect(content[id].draft).toBe(true);
    expect(content[id].updated).toMatch(/^5 (October|ottobre) 2026$/);
  });

  test.each(CONTENTS)(
    "in «%s» who runs MuW and where to write are to fill",
    (_, content) => {
      const text = all(content[id]);
      expect(text).toContain(PLACEHOLDER.name);
      expect(text).toContain(PLACEHOLDER.contact);
    },
  );
});

test("who provides MuW and who controls the data is never a name", () => {
  expect(all(EN.terms)).toMatch(/provided by \[name\]/);
  expect(all(IT.terms)).toMatch(/offerta da \[name\]/);
  expect(all(EN.privacy)).toMatch(/controller of your personal data is \[name\]/);
  expect(all(IT.privacy)).toMatch(
    /titolare del trattamento dei tuoi dati personali è \[name\]/,
  );
  // «write to» is always followed by the place to fill, or by «us».
  for (const [, content] of CONTENTS) {
    for (const id of ABOUT_IDS) {
      const after = [...all(content[id]).matchAll(/(?:write to|scrivi a) (\S+)/gi)];
      for (const match of after) {
        expect(["[contact", "us"]).toContain(match[1].replace(/[.,]$/, ""));
      }
    }
  }
});

test("the law of the terms is an open point, in both languages", () => {
  expect(all(EN.terms)).toContain(PLACEHOLDER.law);
  expect(all(IT.terms)).toContain(PLACEHOLDER.law);
});

test("the places to fill are found by the page's pattern", () => {
  for (const mark of Object.values(PLACEHOLDER)) {
    expect(`a ${mark} b`.split(PLACEHOLDER_PATTERN)).toEqual(["a ", mark, " b"]);
  }
});

test("«Privacy» says what the phone number is for (ADR-0150)", () => {
  const english = all(EN.privacy);
  expect(english).toMatch(/It is optional/);
  expect(english).toMatch(/only you see it/);
  expect(english).toMatch(/friends who already have your number will be able to find/);
  expect(english).toMatch(/does not exist yet/);
  expect(english).toMatch(/remove it at any time from «Settings»/);
  const italian = all(IT.privacy);
  expect(italian).toMatch(/È facoltativo/);
  expect(italian).toMatch(/lo vedi solo tu/);
  expect(italian).toMatch(/gli amici che hanno già il tuo numero possano trovare/);
  expect(italian).toMatch(/ancora non esiste/);
  expect(italian).toMatch(/toglierlo in ogni momento da «Impostazioni»/);
});

test("«Help» and «Privacy» say the notification choices are kept, and nothing is sent (ADR-0206)", () => {
  for (const text of [all(EN.help), all(EN.privacy)]) {
    expect(text).toMatch(/off until you turn them on/);
    expect(text).toMatch(/MuW sends no notifications yet/);
  }
  for (const text of [all(IT.help), all(IT.privacy)]) {
    expect(text).toMatch(/spent[ie] finché non l[ie] accendi/);
    expect(text).toMatch(/MuW non manda ancora notifiche/);
  }
});

test("«Privacy» says how the account is deleted and what goes with it", () => {
  const english = all(EN.privacy);
  expect(english).toMatch(
    /delete your account, everything that is yours is deleted at once/,
  );
  expect(english).toMatch(/«Settings», «Delete account»/);
  expect(english).toMatch(/out of every backup within 14 days/);
  expect(english).toMatch(/without its first and last 200 m/);
  expect(english).toMatch(/at least 16/);
  const italian = all(IT.privacy);
  expect(italian).toMatch(
    /elimini l'account, tutto quello che è tuo si cancella subito/,
  );
  expect(italian).toMatch(/«Impostazioni», «Elimina account»/);
  expect(italian).toMatch(/fuori da ogni copia entro 14 giorni/);
  expect(italian).toMatch(/senza i primi e gli ultimi 200 m/);
  expect(italian).toMatch(/almeno 16 anni/);
});

test("«Terms» says the route is a suggestion and who answers for the way", () => {
  expect(all(EN.terms)).toMatch(/A route is a suggestion computed from map data/);
  expect(all(EN.terms)).toMatch(/You are responsible for where you go/);
  expect(all(EN.terms)).toMatch(/at least 16 years old/);
  expect(all(IT.terms)).toMatch(
    /Un percorso è un suggerimento calcolato dai dati della mappa/,
  );
  expect(all(IT.terms)).toMatch(/Sei tu responsabile di dove vai/);
});

test("Italian reads Italian; the languages to come read English", () => {
  expect(aboutDocument("privacy", "it")).toBe(IT.privacy);
  expect(aboutDocument("privacy", "en")).toBe(EN.privacy);
  for (const language of ["de", "es", "fr"] as const) {
    expect(aboutLanguage(language)).toBe("en");
    for (const id of ABOUT_IDS) {
      expect(aboutDocument(id, language)).toBe(EN[id]);
    }
  }
  expect(aboutLanguage("it")).toBe("it");
  expect(aboutLanguage("en")).toBe("en");
});

test("the three texts are told from the other pages of «Profile»", () => {
  expect(ABOUT_IDS.every(isAboutId)).toBe(true);
  expect(isAboutId("settings")).toBe(false);
});
