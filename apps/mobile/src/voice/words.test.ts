import { type Direction, TURNS } from "@shaperoute/shared-types";
import result from "@shaperoute/shared-types/fixtures/route-result.json";

import { LANGUAGES } from "../i18n/languages";
import { instruction } from "../navigation/phrases";
import { CHEER_KM, KINDS, type VoiceWords } from "./phrasebook";
import { PHRASEBOOKS, wordsOf } from "./words";

const directions = result.directions as Direction[];
const en = wordsOf("en");

/** A direction of the shared example, changed by `change`. */
function turn(change: Partial<Direction>): Direction {
  return { ...directions[1], street: null, road_type: null, along: null, ...change };
}

/** Every road a direction can go onto: by name, by each kind, by another
 * kind, beside a street, and none. */
const ROADS: Partial<Direction>[] = [
  { street: "Via Roma" },
  { street: "Via Roma", along: "Via Verdi" },
  ...KINDS.map((kind) => ({ road_type: kind })),
  ...KINDS.map((kind) => ({ road_type: kind, along: "Via Verdi" })),
  { road_type: "footway / steps" },
  { road_type: "tertiary" },
  { road_type: "tertiary", along: "Via Verdi" },
  { along: "Via Verdi" },
  {},
];

/** Every phrase the voice says, as it says them: each turn onto each road,
 * a chain with its distance, the run's own words, letters, times. */
function everything(words: VoiceWords): string[] {
  const said: string[] = [];
  for (const each of TURNS) {
    for (const road of ROADS) {
      said.push(words.direction(turn({ ...road, turn: each })));
    }
  }
  said.push(
    words.announcement(
      [
        turn({ turn: "left", street: "Via Roma" }),
        turn({ turn: "right", road_type: "path" }),
      ],
      47,
    ),
    words.offRoute,
    words.backOnRoute,
    words.arrived,
    words.paused,
    words.resumed,
    words.penUp("A"),
    words.penUp(null),
    words.penDown("A"),
    words.penDown(null),
    words.partUp,
    words.partDown,
    words.rideToPart,
    words.kilometre(1, 342_000, 342_000),
    words.kilometre(2, 3_725_000, 61_000),
    words.kilometre(CHEER_KM, 1_500_000, 300_000),
    words.time(1_000),
    words.time(3_600_000),
    words.walkTheBike(47, 203),
    words.walkTheBike(null, 96),
    words.backOnTheBike,
  );
  return said;
}

describe("the voice in English", () => {
  test("says each direction exactly as the banner writes it, as before TASK-209", () => {
    for (const each of TURNS) {
      for (const road of ROADS) {
        const direction = turn({ ...road, turn: each });
        expect(en.direction(direction)).toBe(instruction(direction));
      }
    }
    expect(directions.map(en.direction)).toEqual([
      "Head out on Via Belenzani",
      "Turn left onto Via Manci",
      "Turn left onto the footpath beside Via Rosmini",
      "Continue straight onto SP12",
      "Turn sharp right onto Via Verdi",
    ]);
  });

  test("says a turn 50 metres ahead, joined directions together", () => {
    expect(en.announcement([directions[2]], 52)).toBe(
      "In 50 metres, turn left onto the footpath beside Via Rosmini",
    );
    expect(en.announcement(directions.slice(3), 47)).toBe(
      "In 50 metres, continue straight onto SP12, then turn sharp right onto Via Verdi",
    );
    expect(en.announcement(directions.slice(1, 2), null)).toBe(
      "Turn left onto Via Manci",
    );
  });

  test("says the run's words as before", () => {
    expect(en.offRoute).toBe("You are off the route. Head back to it.");
    expect(en.backOnRoute).toBe("Back on the route.");
    expect(en.arrived).toBe("You have arrived.");
    expect(en.paused).toBe("Paused.");
    expect(en.resumed).toBe("Resumed.");
    expect(en.penUp("A")).toBe("Letter done. Walk to the A: the drawing is paused.");
    expect(en.penDown(null)).toBe("Pen down: draw the next letter.");
    expect(en.kilometre(1, 342_000, 342_000)).toBe(
      "1 kilometre. Time: 5 minutes 42 seconds. " +
        "Average pace: 5 minutes 42 seconds per kilometre.",
    );
  });

  test("says a time in hours, minutes and seconds, with singulars", () => {
    expect(en.time(42_000)).toBe("42 seconds");
    expect(en.time(61_000)).toBe("1 minute 1 second");
    expect(en.time(300_000)).toBe("5 minutes");
    expect(en.time(342_400)).toBe("5 minutes 42 seconds");
    expect(en.time(3_600_000)).toBe("1 hour");
    // Past an hour the seconds do not matter.
    expect(en.time(3_725_000)).toBe("1 hour 2 minutes");
  });
});

describe("every language", () => {
  test("is one of the app's, and each of the app's has its words", () => {
    expect(Object.keys(PHRASEBOOKS).sort()).toEqual(
      LANGUAGES.map((option) => option.id).sort(),
    );
    const keys = Object.keys(PHRASEBOOKS.en).sort();
    for (const book of Object.values(PHRASEBOOKS)) {
      expect(Object.keys(book).sort()).toEqual(keys);
      expect(Object.keys(book.turns).sort()).toEqual([...TURNS].sort());
      expect(Object.keys(book.kinds).sort()).toEqual([...KINDS].sort());
    }
  });

  test.each(LANGUAGES.map((option) => option.id))(
    "says every phrase in %s, with names untouched",
    (language) => {
      const said = everything(wordsOf(language));
      for (const words of said) {
        expect(words.trim()).not.toBe("");
        expect(words).not.toMatch(/undefined|null|NaN|\[object/);
        expect(words).not.toMatch(/ {2}|^ | $/);
      }
      // A street's name is said as OpenStreetMap writes it (ADR-0057).
      expect(said.filter((words) => words.includes("Via Roma")).length).toBeGreaterThan(
        TURNS.length,
      );
      expect(
        wordsOf(language).direction(turn({ turn: "left", street: "SP12" })),
      ).toContain("SP12");
    },
  );

  test.each(
    LANGUAGES.filter((option) => option.id !== "en").map((option) => option.id),
  )("says nothing in English in %s", (language) => {
    const said = everything(wordsOf(language));
    const english = everything(en);
    said.forEach((words, at) => expect(words).not.toBe(english[at]));
  });
});

describe("the voice in Italian", () => {
  const it_ = wordsOf("it");

  test("says the turns and the roads", () => {
    expect(directions.map(it_.direction)).toEqual([
      "Parti lungo Via Belenzani",
      "Svolta a sinistra su Via Manci",
      "Svolta a sinistra sul percorso pedonale accanto a Via Rosmini",
      "Prosegui dritto su SP12",
      "Svolta decisamente a destra su Via Verdi",
    ]);
    expect(it_.announcement(directions.slice(3), 47)).toBe(
      "Tra 50 metri, prosegui dritto su SP12, poi svolta decisamente a destra su Via Verdi",
    );
  });

  test("says one as a word that agrees with its unit", () => {
    expect(it_.kilometre(1, 342_000, 342_000)).toBe(
      "Un chilometro. Tempo: 5 minuti e 42 secondi. " +
        "Passo medio: 5 minuti e 42 secondi al chilometro.",
    );
    expect(it_.time(3_660_000)).toBe("un'ora e un minuto");
    expect(it_.kilometre(2, 720_000, 360_000)).toBe(
      "2 chilometri. Tempo: 12 minuti. Passo medio: 6 minuti al chilometro.",
    );
  });

  test("says the letters with the pen up", () => {
    expect(it_.penUp("A")).toBe(
      "Lettera finita. Cammina fino alla A: il disegno è in pausa.",
    );
    expect(it_.penDown(null)).toBe("Giù la penna: disegna la lettera successiva.");
  });
});

test("after the first 5 km the voice cheers, once, in every language (the user's)", () => {
  expect(CHEER_KM).toBe(5);
  expect(wordsOf("it").kilometre(5, 1_500_000, 300_000)).toBe(
    "5 chilometri. Tempo: 25 minuti. Passo medio: 5 minuti al chilometro. " +
      "Daje, avanti tutta!",
  );
  for (const option of LANGUAGES) {
    const words = wordsOf(option.id);
    const cheer = PHRASEBOOKS[option.id].cheer;
    expect(words.kilometre(5, 1_500_000, 300_000).endsWith(` ${cheer}`)).toBe(true);
    expect(words.kilometre(4, 1_200_000, 300_000)).not.toContain(cheer);
    expect(words.kilometre(6, 1_800_000, 300_000)).not.toContain(cheer);
  }
});

test("German says the turn ahead verb last, with no comma", () => {
  expect(wordsOf("de").announcement(directions.slice(2, 3), 52)).toBe(
    "In 50 Metern links abbiegen auf den Fußweg neben Via Rosmini",
  );
  expect(wordsOf("de").direction({ ...directions[2], turn: "depart" })).toBe(
    "Loslaufen auf dem Fußweg neben Via Rosmini",
  );
});

test("French drops the vowel of «de» before a name that starts with one", () => {
  const beside = (along: string) =>
    wordsOf("fr").direction(turn({ turn: "left", road_type: "path", along }));
  expect(beside("Avenue Foch")).toBe(
    "Tournez à gauche sur le sentier à côté d'Avenue Foch",
  );
  expect(beside("Rue de Rivoli")).toBe(
    "Tournez à gauche sur le sentier à côté de Rue de Rivoli",
  );
});

test("by bike, the stretch on foot ahead and its end, as the user chose them (TASK-206)", () => {
  expect(wordsOf("en").walkTheBike(47, 203)).toBe(
    "In 50 metres, get off and walk the bike for 200 metres.",
  );
  expect(wordsOf("en").walkTheBike(null, 96)).toBe(
    "Get off and walk the bike for 100 metres.",
  );
  expect(wordsOf("en").backOnTheBike).toBe("Back on the bike.");
  expect(wordsOf("it").walkTheBike(47, 203)).toBe(
    "Tra 50 metri, scendi e porta la bici a mano per 200 metri.",
  );
  expect(wordsOf("it").walkTheBike(null, 96)).toBe(
    "Scendi e porta la bici a mano per 100 metri.",
  );
  expect(wordsOf("it").backOnTheBike).toBe("Risali in bici.");
  // German says the verb last, as for a turn.
  expect(wordsOf("de").walkTheBike(47, 203)).toBe(
    "In 50 Metern absteigen und das Rad 200 Meter schieben.",
  );
});
