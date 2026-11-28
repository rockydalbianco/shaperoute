import type { Language } from "../i18n/languages";
import { DE } from "./content/de";
import { EN } from "./content/en";
import { ES } from "./content/es";
import { FR } from "./content/fr";
import { IT } from "./content/it";
import {
  ABOUT_IDS,
  type AboutBlock,
  type AboutContent,
  type AboutDocument,
  aboutDocument,
  isAboutId,
  PLACEHOLDER,
  PLACEHOLDER_PATTERN,
} from "./documents";

/** The five languages (TASK-210 F). */
const CONTENTS: [Language, AboutContent][] = [
  ["en", EN],
  ["de", DE],
  ["it", IT],
  ["es", ES],
  ["fr", FR],
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

/** Who controls the data and where to write, given by the user (TASK-237 D). */
const CONTROLLER = "Luca Pallaoro";
const CONTACT = "muw2610@gmail.com";

/** A paragraph, or how many points: what two languages must share. */
function shape(block: AboutBlock): string {
  return typeof block === "string" ? "paragraph" : `${block.bullets.length} points`;
}

describe.each(ABOUT_IDS)("«%s»", (id) => {
  test.each(CONTENTS)(
    "in «%s» has the sections of English, block by block",
    (_, content) => {
      const english = EN[id].sections.map((section) => section.blocks.map(shape));
      const other = content[id].sections.map((section) => section.blocks.map(shape));
      expect(other).toEqual(english);
      expect(content[id].draft).toBe(EN[id].draft);
      expect(content[id].updated === null).toBe(EN[id].updated === null);
    },
  );

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
    // The only address is where to write about one's data.
    const text = all(content[id]).replaceAll(CONTACT, "");
    // An email address, a web address, a phone number: none is decided yet.
    expect(text).not.toMatch(/[^\s@[]+@[^\s@]+\.[a-z]{2,}/i);
    expect(text).not.toMatch(/https?:|www\./i);
    expect(text).not.toMatch(/\+\d{6,}/);
  });
});

test.each(CONTENTS)(
  "«Help» in «%s» has around ten short sections and is not a draft",
  (_, content) => {
    expect(content.help.draft).toBe(false);
    expect(content.help.updated).toBeNull();
    expect(content.help.sections.length).toBeGreaterThanOrEqual(8);
    expect(content.help.sections.length).toBeLessThanOrEqual(12);
    // Where to write is still to fill.
    expect(all(content.help)).toContain(PLACEHOLDER.contact);
  },
);

test("«Help» in Italian names the buttons as the app shows them now", () => {
  // «Draw» and the run are in Italian since TASK-210 B and D.
  const text = all(IT.help);
  expect(text).not.toMatch(/«(Draw route|Export GPX|Start|Pause|Resume|Discard)»/);
  expect(text).toContain("«Disegna il percorso»");
  expect(text).toContain("«Pausa» ferma il tempo e «Riprendi»");
});

describe("«Terms» is a draft", () => {
  test.each(CONTENTS)("in «%s», with its day", (_, content) => {
    expect(content.terms.draft).toBe(true);
    expect(content.terms.updated).toMatch(
      /^27 (November|novembre) 2026$|^27\. November 2026$|^27 de noviembre de 2026$/,
    );
  });

  test.each(CONTENTS)(
    "in «%s» who runs MuW and where to write are to fill",
    (_, content) => {
      const text = all(content.terms);
      expect(text).toContain(PLACEHOLDER.name);
      expect(text).toContain(PLACEHOLDER.contact);
    },
  );
});

describe("«Privacy» is final, approved by the user (TASK-237 D)", () => {
  test.each(CONTENTS)("in «%s», with the day of the approval", (_, content) => {
    expect(content.privacy.draft).toBe(false);
    // Redated for the estimate of a daily target in «Nutrition» (TASK-489 part J).
    // Redated for the paragliding landings nearby and the wind aloft (TASK-479 parts D6, H).
    expect(content.privacy.updated).toMatch(
      /^27 November 2026$|^27 novembre 2026$|^27\. November 2026$|^27 de noviembre de 2026$/,
    );
  });

  test.each(CONTENTS)(
    "in «%s» nothing is left to fill: the controller, where to write, the legal bases",
    (_, content) => {
      const text = all(content.privacy);
      expect(text).not.toMatch(PLACEHOLDER_PATTERN);
      expect(text).toContain(CONTROLLER);
      expect(text).toContain(CONTACT);
      const bases =
        content.privacy.sections[
          EN.privacy.sections.findIndex(
            (section) => section.heading === "Why we may use your data",
          )
        ];
      expect(bases.blocks).toHaveLength(1);
      expect(shape(bases.blocks[0])).toBe("4 points");
    },
  );
});

test("who provides MuW is still to fill; who controls the data is the user (TASK-237 D)", () => {
  expect(all(EN.terms)).toMatch(/provided by \[name\]/);
  expect(all(IT.terms)).toMatch(/offerta da \[name\]/);
  expect(all(EN.privacy)).toMatch(/controller of your personal data is Luca Pallaoro/);
  expect(all(IT.privacy)).toMatch(
    /titolare del trattamento dei tuoi dati personali è Luca Pallaoro/,
  );
  expect(all(DE.terms)).toMatch(/von \[name\] angeboten/);
  expect(all(ES.terms)).toMatch(/la ofrece \[name\]/);
  expect(all(FR.terms)).toMatch(/fournie par \[name\]/);
  expect(all(DE.privacy)).toMatch(/personenbezogenen Daten ist Luca Pallaoro/);
  expect(all(ES.privacy)).toMatch(/tus datos personales es Luca Pallaoro/);
  expect(all(FR.privacy)).toMatch(/tes données personnelles est Luca Pallaoro/);
  // «write to» is followed by the place to fill, by «us», or by the address.
  for (const [, content] of CONTENTS) {
    for (const id of ABOUT_IDS) {
      const after = [
        ...all(content[id]).matchAll(
          // A whole word: not the «escribe a» of "describe a shape".
          /(?<!\p{L})(?:write to|scrivi a|schreib an|escribe a|écris à) (\S+)/giu,
        ),
      ];
      for (const match of after) {
        expect(["[contact", "us", CONTACT]).toContain(match[1].replace(/[.,]$/, ""));
      }
    }
  }
});

test.each(CONTENTS)("the law of the terms is an open point in «%s»", (_, content) => {
  expect(all(content.terms)).toContain(PLACEHOLDER.law);
});

test("the places to fill are found by the page's pattern", () => {
  for (const mark of Object.values(PLACEHOLDER)) {
    expect(`a ${mark} b`.split(PLACEHOLDER_PATTERN)).toEqual(["a ", mark, " b"]);
  }
});

test("«Privacy» says what the phone number is for (ADR-0150, TASK-262 C)", () => {
  const english = all(EN.privacy);
  expect(english).toMatch(/It is optional/);
  expect(english).toMatch(/only you see it/);
  expect(english).toMatch(
    /friends who have your number in their phone's contacts can find/,
  );
  expect(english).not.toMatch(/does not exist yet/);
  expect(english).toMatch(/remove it at any time from «Settings»/);
  const italian = all(IT.privacy);
  expect(italian).toMatch(/È facoltativo/);
  expect(italian).toMatch(/lo vedi solo tu/);
  expect(italian).toMatch(/gli amici che hanno il tuo numero nella rubrica/);
  expect(italian).not.toMatch(/ancora non esiste/);
  expect(italian).toMatch(/toglierlo in ogni momento da «Impostazioni»/);
});

describe("«Privacy» says honestly what the search from the contacts sends (TASK-262 C)", () => {
  const sections: Record<string, string> = {
    en: "Friends from your contacts",
    it: "Amici dalla rubrica",
    de: "Freunde aus deinen Kontakten",
    fr: "Des amis dans tes contacts",
    es: "Amigos de tus contactos",
  };
  // The hash can be undone by trying every number: the protection is the server keeping none.
  const honest: Record<string, RegExp[]> = {
    en: [/trying every possible number/, /keeps none of them/, /only when you tap it/],
    it: [
      /provando tutti i numeri possibili/,
      /non ne tiene nessuno/,
      /solo quando lo tocchi/,
    ],
    de: [
      /alle möglichen Nummern ausprobiert/,
      /keinen davon behält/,
      /wenn du darauf tippst/,
    ],
    fr: [
      /tous les numéros possibles/,
      /n'en garde aucun/,
      /seulement quand tu le touches/,
    ],
    es: [/todos los números posibles/, /no conserva ninguno/, /solo cuando lo tocas/],
  };
  test.each(CONTENTS)("in «%s»", (language, content) => {
    const section = content.privacy.sections.find(
      (one) => one.heading === sections[language],
    );
    expect(section).toBeDefined();
    const text = all({ ...content.privacy, sections: section ? [section] : [] });
    expect(text).toMatch(/SHA-256/);
    for (const words of honest[language]) {
      expect(text).toMatch(words);
    }
  });
});

test("«Help» and «Privacy» say what push and the emails send (ADR-0206, ADR-0226, ADR-0244)", () => {
  for (const text of [all(EN.help), all(EN.privacy)]) {
    expect(text).toMatch(/off until you turn them on/);
    // «Email when I'm away» is on until turned off (TASK-284).
    expect(text).toMatch(/on until you turn it off/);
    expect(text).not.toMatch(/no emails yet/);
  }
  for (const text of [all(IT.help), all(IT.privacy)]) {
    expect(text).toMatch(/spent[ie] finché non l[ie] accendi/);
    expect(text).toMatch(/acces[oa] finché non l[oa] spegni/);
    expect(text).not.toMatch(/non manda ancora email/);
  }
  // The emails: one a day at most for the news, one per absence, Resend.
  expect(all(EN.privacy)).toMatch(/one email a day at most/);
  expect(all(EN.privacy)).toMatch(/One per absence/);
  expect(all(EN.privacy)).toMatch(/Resend, in the United States, sends MuW's emails/);
  // The emails the account needs (TASK-300), with no switch.
  expect(all(EN.privacy)).toMatch(
    /Emails your account needs, which no switch turns off/,
  );
  expect(all(IT.privacy)).toMatch(/Le email che servono al tuo account/);
  expect(all(IT.privacy)).toMatch(/al massimo una email al giorno/);
  expect(all(EN.help)).toMatch(
    /follow requests, accepted requests, reactions, comments and tags/,
  );
  expect(all(IT.help)).toMatch(
    /richieste di follow, richieste accettate, reazioni, commenti e tag/,
  );
  // Who gets the token, and when it goes.
  expect(all(EN.privacy)).toMatch(
    /Expo's push service, which hands them to Apple or Google/,
  );
  expect(all(EN.privacy)).toMatch(/turn push off, log out or delete your account/);
  expect(all(IT.privacy)).toMatch(
    /servizio push di Expo, che le passa ad Apple o a Google/,
  );
});

test("«Privacy» says how the account is deleted and what goes with it", () => {
  const english = all(EN.privacy);
  expect(english).toMatch(
    /delete your account, everything that is yours is deleted at once/,
  );
  expect(english).toMatch(/«Settings», «Delete account»/);
  expect(english).toMatch(/out of every backup within 14 days/);
  expect(english).toMatch(/the whole track, start and end included/);
  expect(english).toMatch(/at least 16/);
  const italian = all(IT.privacy);
  expect(italian).toMatch(
    /elimini l'account, tutto quello che è tuo si cancella subito/,
  );
  expect(italian).toMatch(/«Impostazioni», «Elimina account»/);
  expect(italian).toMatch(/fuori da ogni copia entro 14 giorni/);
  expect(italian).toMatch(/la traccia intera, partenza e arrivo compresi/);
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

test("each language reads its own texts (TASK-210 F)", () => {
  for (const [language, content] of CONTENTS) {
    for (const id of ABOUT_IDS) {
      expect(aboutDocument(id, language)).toBe(content[id]);
    }
  }
});

test("the three texts are told from the other pages of «Profile»", () => {
  expect(ABOUT_IDS.every(isAboutId)).toBe(true);
  expect(isAboutId("settings")).toBe(false);
});

test("«Help» and «Privacy» say «Everyone» is for an activity added from a file, or a gym workout written by hand, with the Feed's «+», not one recorded from it (TASK-481 A, TASK-484 B)", () => {
  const fromFile: Record<Language, RegExp> = {
    en: /from a file/,
    it: /da un file/,
    de: /aus einer Datei/,
    fr: /depuis un fichier/,
    es: /desde un archivo/,
  };
  const byHand: Record<Language, RegExp> = {
    en: /gym workout (?:you write|written) by hand/,
    it: /allenamento in palestra scritto a mano/,
    de: /(?:Training im Fitnessstudio, das du von Hand einträgst|von Hand eingetragenes Training im Fitnessstudio)/,
    fr: /séance en salle écrite à la main/,
    es: /entrenamiento de gimnasio (?:que escribes|escrito) a mano/,
  };
  for (const [language, content] of CONTENTS) {
    for (const text of [all(content.help), all(content.privacy)]) {
      const plus = text
        .split(/(?<=\.)\s/)
        .filter((sentence) => sentence.includes("«+»"));
      expect(plus.length).toBeGreaterThan(0);
      for (const sentence of plus) {
        expect(sentence).toMatch(fromFile[language]);
        expect(sentence).toMatch(byHand[language]);
      }
    }
  }
});

test("«Privacy» says what a gym workout written by hand keeps, and that the gym milestones count only what MuW records (TASK-484 B)", () => {
  const kept: Record<Language, RegExp> = {
    en: /gym workout written by hand, we keep its day, time, duration, exercises, sets and weights/,
    it: /allenamento in palestra scritto a mano, ne teniamo giorno, ora, durata, esercizi, serie e pesi/,
    de: /von Hand einträgst, speichern wir Tag, Uhrzeit, Dauer, Übungen, Sätze und Gewichte/,
    fr: /écrite à la main, nous gardons son jour, son heure, sa durée, ses exercices, ses séries et ses poids/,
    es: /escrito a mano, guardamos su día, hora, duración, ejercicios, series y pesos/,
  };
  const milestones: Record<Language, RegExp> = {
    en: /counted from the workouts you record with MuW/,
    it: /contati dagli allenamenti che registri con MuW/,
    de: /gezählt aus den Trainings, die du mit MuW aufzeichnest/,
    fr: /comptés sur les séances que tu enregistres avec MuW/,
    es: /contados de los entrenamientos que registras con MuW/,
  };
  for (const [language, content] of CONTENTS) {
    expect(all(content.privacy)).toMatch(kept[language]);
    expect(all(content.privacy)).toMatch(milestones[language]);
  }
});

test("«Privacy» says a gym plan shared in the Feed is a copy that others can copy, in all five languages (TASK-485 B)", () => {
  const shared: Record<Language, RegExp[]> = {
    en: [
      /unless you share one in the Feed/,
      /copy the plan into their own plans/,
      /copies already made stay with whoever made them/,
    ],
    it: [
      /a meno che tu non ne condivida una nel Feed/,
      /può copiare la scheda tra le sue/,
      /le copie già fatte restano a chi le ha fatte/,
    ],
    de: [
      /außer du teilst einen im Feed/,
      /den Plan in seine eigenen Pläne kopieren/,
      /schon gemachte Kopien bleiben/,
    ],
    fr: [
      /sauf si tu en partages un dans le Feed/,
      /copier le programme dans ses propres programmes/,
      /les copies déjà faites restent/,
    ],
    es: [
      /salvo que compartas una en el Feed/,
      /copiar la rutina entre sus propias rutinas/,
      /las copias ya hechas se quedan/,
    ],
  };
  for (const [language, content] of CONTENTS) {
    const privacy = all(content.privacy);
    for (const sentence of shared[language]) {
      expect(privacy).toMatch(sentence);
    }
    // The help does not promise it: only «Privacy» tells what a shared plan carries.
    expect(all(content.help)).not.toMatch(shared[language][0]);
  }
});

test("«Privacy» says the heart rate is read at the end of a gym workout too, by itself after the first tap (TASK-385 G3)", () => {
  const gym: Record<Language, RegExp[]> = {
    en: [
      /or a workout at the gym you tap «Add heart rate from Apple Health»/,
      /at the end of each swim and workout/,
    ],
    it: [
      /o a fine allenamento in palestra tocchi «Aggiungi il battito da Salute»/,
      /alla fine di ogni nuotata e di ogni allenamento/,
    ],
    de: [
      /oder eines Trainings im Fitnessstudio auf «Herzfrequenz aus Apple Health hinzufügen»/,
      /am Ende jedes Schwimmens und jedes Trainings/,
    ],
    es: [
      /o de un entrenamiento en el gimnasio tocas «Añadir la frecuencia cardiaca desde Salud»/,
      /al final de cada sesión de natación y de cada entrenamiento/,
    ],
    fr: [
      /ou d'une séance en salle de sport, tu touches «Ajouter la fréquence cardiaque depuis Santé»/,
      /à la fin de chaque nage et de chaque séance/,
    ],
  };
  for (const [language, content] of CONTENTS) {
    const privacy = all(content.privacy);
    for (const sentence of gym[language]) {
      expect(privacy).toMatch(sentence);
    }
  }
});

test("«Privacy» says what is kept of the gear and who sees it, in all five languages (TASK-486)", () => {
  const gear: Record<Language, RegExp[]> = {
    en: [/You can add your gear/, /«Hide from profile»/, /an item of gear/],
    it: [
      /Puoi aggiungere la tua attrezzatura/,
      /«Nascondi dal profilo»/,
      /un attrezzo, un commento/,
    ],
    de: [
      /Du kannst deine Ausrüstung hinzufügen/,
      /«Im Profil ausblenden»/,
      /ein Teil deiner Ausrüstung/,
    ],
    fr: [
      /Tu peux ajouter ton matériel/,
      /«Masquer du profil»/,
      /un article de matériel/,
    ],
    es: [/Puedes añadir tu equipo/, /«Ocultar del perfil»/, /un artículo de equipo/],
  };
  for (const [language, content] of CONTENTS) {
    const privacy = all(content.privacy);
    for (const sentence of gear[language]) {
      expect(privacy).toMatch(sentence);
    }
    // The gear is off in the app (GEAR_ON): the help does not tell it yet.
    expect(all(content.help)).not.toMatch(gear[language][0]);
  }
});

test("«Privacy» says a saved flight counts, without a name, in the history of its takeoff, shown from three pilots (TASK-493 B)", () => {
  const fromThree: Record<Language, RegExp> = {
    en: /at least three different pilots/,
    it: /almeno tre/,
    de: /mindestens drei verschiedene Piloten/,
    fr: /au moins trois pilotes différents/,
    es: /al menos tres pilotos distintos/,
  };
  for (const [language, content] of CONTENTS) {
    const text = all(content.privacy);
    expect(text).toMatch(fromThree[language]);
    expect(text).toMatch(/OpenStreetMap\./);
  }
});

test("«Privacy» says what is kept of a stretching session, on its own or inside a workout at the gym (TASK-466 C)", () => {
  const stretching: Record<Language, RegExp> = {
    en: /A stretching session is saved with its routine, its length and how many exercises you did/,
    it: /Una sessione di stretching si salva con la sua routine/,
    de: /Eine Stretching-Einheit wird mit ihrer Routine/,
    fr: /Une séance d'étirements est enregistrée avec sa routine/,
    es: /Una sesión de estiramientos se guarda con su rutina/,
  };
  for (const [language, content] of CONTENTS) {
    expect(all(content.privacy)).toMatch(stretching[language]);
  }
});

test("«Privacy» says the group runs and the groups nearby are found with the position rounded to about 1 km (TASK-309 B2, TASK-495 D)", () => {
  const nearby: Record<Language, RegExp> = {
    en: /rounded to about 1 km to find [^.]*towns, drawings, group runs and groups nearby/,
    it: /arrotondata a circa 1 km per trovare [^.]*i paesi, i disegni, le corse di gruppo e i gruppi vicini/,
    de: /Auf etwa 1 km gerundet [^.]*Orte, Zeichnungen, Gruppenläufe und Gruppen in der Nähe/,
    fr: /arrondie à environ 1 km pour trouver [^.]*les villes, les dessins, les courses en groupe et les groupes proches/,
    es: /redondeada a cerca de 1 km para encontrar [^.]*los pueblos, los dibujos, las carreras en grupo y los grupos cercanos/,
  };
  for (const [language, content] of CONTENTS) {
    expect(all(content.privacy)).toMatch(nearby[language]);
  }
});
