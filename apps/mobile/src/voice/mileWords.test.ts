/**
 * What the voice says with miles (TASK-182, part C): each mile with its
 * pace, the mile against the one before, on a bike the miles with the speed
 * in miles per hour, and the short distances in feet. Written by the agent
 * in the five languages, to be confirmed by the user. In kilometres every
 * phrase is the one of before: the other tests of this folder say them.
 */
import type { Direction } from "@shaperoute/shared-types";
import result from "@shaperoute/shared-types/fixtures/route-result.json";

import { LANGUAGES } from "../i18n/languages";
import { CHEER_MI, voiceWords } from "./phrasebook";
import { PHRASEBOOKS, wordsOf } from "./words";

const IDS = LANGUAGES.map((option) => option.id);
const directions = result.directions as Direction[];

/** A left turn onto Via Roma. */
const LEFT: Direction = {
  ...directions[1],
  turn: "left",
  street: "Via Roma",
  road_type: null,
  along: null,
};

test("each mile says the time and the pace for a mile", () => {
  const time = 8 * 60_000 + 3000;
  expect(wordsOf("en").mile(1, time, time)).toBe(
    "1 mile. Time: 8 minutes 3 seconds. Average pace: 8 minutes 3 seconds per mile.",
  );
  expect(wordsOf("it").mile(1, time, time)).toBe(
    "Un miglio. Tempo: 8 minuti e 3 secondi. Passo medio: 8 minuti e 3 secondi al miglio.",
  );
  expect(wordsOf("de").mile(1, time, time)).toBe(
    "Eine Meile. Zeit: 8 Minuten 3 Sekunden. Durchschnittstempo: 8 Minuten 3 Sekunden pro Meile.",
  );
  expect(wordsOf("es").mile(1, time, time)).toBe(
    "Una milla. Tiempo: 8 minutos y 3 segundos. Ritmo medio: 8 minutos y 3 segundos por milla.",
  );
  expect(wordsOf("fr").mile(1, time, time)).toBe(
    "Un mile. Temps : 8 minutes 3 secondes. Allure moyenne : 8 minutes 3 secondes au mile.",
  );
  // From the second, the plural.
  expect(wordsOf("en").mile(2, 16 * 60_000, 8 * 60_000)).toBe(
    "2 miles. Time: 16 minutes. Average pace: 8 minutes per mile.",
  );
  expect(wordsOf("it").mile(2, 16 * 60_000, 8 * 60_000)).toBe(
    "2 miglia. Tempo: 16 minuti. Passo medio: 8 minuti al miglio.",
  );
  expect(wordsOf("de").mile(2, 16 * 60_000, 8 * 60_000)).toBe(
    "2 Meilen. Zeit: 16 Minuten. Durchschnittstempo: 8 Minuten pro Meile.",
  );
  expect(wordsOf("es").mile(2, 16 * 60_000, 8 * 60_000)).toBe(
    "2 millas. Tiempo: 16 minutos. Ritmo medio: 8 minutos por milla.",
  );
  expect(wordsOf("fr").mile(2, 16 * 60_000, 8 * 60_000)).toBe(
    "2 miles. Temps : 16 minutes. Allure moyenne : 8 minutes au mile.",
  );
});

test("the cheer comes after the third mile, the nearest to 5 km", () => {
  expect(CHEER_MI).toBe(3);
  expect(wordsOf("en").mile(3, 24 * 60_000, 8 * 60_000)).toBe(
    "3 miles. Time: 24 minutes. Average pace: 8 minutes per mile. Come on, full speed ahead!",
  );
  expect(wordsOf("it").mile(3, 24 * 60_000, 8 * 60_000)).toBe(
    "3 miglia. Tempo: 24 minuti. Passo medio: 8 minuti al miglio. Daje, avanti tutta!",
  );
  for (const id of IDS) {
    const { cheer } = PHRASEBOOKS[id];
    expect(wordsOf(id).mile(3, 1_440_000, 480_000).endsWith(` ${cheer}`)).toBe(true);
    for (const miles of [1, 2, 4, 5, 6]) {
      expect(wordsOf(id).mile(miles, 1_440_000, 480_000)).not.toContain(cheer);
    }
  }
});

test("a faster mile says by how many seconds", () => {
  expect(wordsOf("en").mileFaster(12)).toBe("12 seconds faster than the last mile.");
  expect(wordsOf("it").mileFaster(12)).toBe(
    "Questo miglio: 12 secondi meglio del precedente.",
  );
  expect(wordsOf("de").mileFaster(12)).toBe(
    "12 Sekunden schneller als die letzte Meile.",
  );
  expect(wordsOf("es").mileFaster(12)).toBe(
    "Esta milla: 12 segundos más rápida que la anterior.",
  );
  expect(wordsOf("fr").mileFaster(12)).toBe(
    "Ce mile : 12 secondes plus rapide que le précédent.",
  );
});

test("a slower mile says by how many seconds", () => {
  expect(wordsOf("en").mileSlower(8)).toBe("8 seconds slower than the last mile.");
  expect(wordsOf("it").mileSlower(8)).toBe(
    "Questo miglio: 8 secondi peggio del precedente.",
  );
  expect(wordsOf("de").mileSlower(8)).toBe(
    "8 Sekunden langsamer als die letzte Meile.",
  );
  expect(wordsOf("es").mileSlower(8)).toBe(
    "Esta milla: 8 segundos más lenta que la anterior.",
  );
  expect(wordsOf("fr").mileSlower(8)).toBe(
    "Ce mile : 8 secondes plus lent que le précédent.",
  );
  // One second, and a minute or more, as the times of the run.
  expect(wordsOf("en").mileSlower(1)).toBe("1 second slower than the last mile.");
  expect(wordsOf("it").mileFaster(75)).toBe(
    "Questo miglio: un minuto e 15 secondi meglio del precedente.",
  );
  expect(wordsOf("de").mileFaster(1)).toBe(
    "Eine Sekunde schneller als die letzte Meile.",
  );
});

test("the same pace has no number", () => {
  expect(wordsOf("en").mileSamePace).toBe("Same pace as the last mile.");
  expect(wordsOf("it").mileSamePace).toBe("Stesso passo del miglio precedente.");
  expect(wordsOf("de").mileSamePace).toBe("Gleiches Tempo wie die letzte Meile.");
  expect(wordsOf("es").mileSamePace).toBe("Mismo ritmo que la milla anterior.");
  expect(wordsOf("fr").mileSamePace).toBe("Même allure que le mile précédent.");
});

test("by bike the miles say the average speed in miles per hour", () => {
  const time = 20 * 60_000;
  expect(wordsOf("en").rideMiles(5, time, 15)).toBe(
    "5 miles. Time: 20 minutes. Average speed: 15 miles per hour.",
  );
  expect(wordsOf("it").rideMiles(5, time, 15)).toBe(
    "5 miglia. Tempo: 20 minuti. Velocità media: 15 miglia orarie.",
  );
  expect(wordsOf("de").rideMiles(5, time, 15)).toBe(
    "5 Meilen. Zeit: 20 Minuten. Durchschnittsgeschwindigkeit: 15 Meilen pro Stunde.",
  );
  expect(wordsOf("es").rideMiles(5, time, 15)).toBe(
    "5 millas. Tiempo: 20 minutos. Velocidad media: 15 millas por hora.",
  );
  expect(wordsOf("fr").rideMiles(5, time, 15)).toBe(
    "5 miles. Temps : 20 minutes. Vitesse moyenne : 15 miles par heure.",
  );
});

test("by bike the last miles against those before, with no numbers but theirs", () => {
  expect(wordsOf("en").rideMilesFaster(5)).toBe(
    "The last 5 miles were faster than the 5 before.",
  );
  expect(wordsOf("en").rideMilesSlower(5)).toBe(
    "The last 5 miles were slower than the 5 before.",
  );
  expect(wordsOf("en").rideMilesSameSpeed(5)).toBe(
    "The last 5 miles were at the same speed as the 5 before.",
  );
  expect(wordsOf("it").rideMilesFaster(5)).toBe(
    "Ultime 5 miglia più veloci delle 5 precedenti.",
  );
  expect(wordsOf("it").rideMilesSlower(5)).toBe(
    "Ultime 5 miglia più lente delle 5 precedenti.",
  );
  expect(wordsOf("it").rideMilesSameSpeed(5)).toBe(
    "Ultime 5 miglia alla stessa velocità delle 5 precedenti.",
  );
  expect(wordsOf("de").rideMilesFaster(5)).toBe(
    "Die letzten 5 Meilen waren schneller als die 5 davor.",
  );
  expect(wordsOf("de").rideMilesSlower(5)).toBe(
    "Die letzten 5 Meilen waren langsamer als die 5 davor.",
  );
  expect(wordsOf("de").rideMilesSameSpeed(5)).toBe(
    "Die letzten 5 Meilen waren so schnell wie die 5 davor.",
  );
  expect(wordsOf("es").rideMilesFaster(5)).toBe(
    "Las últimas 5 millas, más rápidas que las 5 anteriores.",
  );
  expect(wordsOf("es").rideMilesSlower(5)).toBe(
    "Las últimas 5 millas, más lentas que las 5 anteriores.",
  );
  expect(wordsOf("es").rideMilesSameSpeed(5)).toBe(
    "Las últimas 5 millas, a la misma velocidad que las 5 anteriores.",
  );
  expect(wordsOf("fr").rideMilesFaster(5)).toBe(
    "Les 5 derniers miles ont été plus rapides que les 5 précédents.",
  );
  expect(wordsOf("fr").rideMilesSlower(5)).toBe(
    "Les 5 derniers miles ont été plus lents que les 5 précédents.",
  );
  expect(wordsOf("fr").rideMilesSameSpeed(5)).toBe(
    "Les 5 derniers miles ont été à la même vitesse que les 5 précédents.",
  );
});

test("with miles a turn is said in feet, to the nearest fifty", () => {
  // 50 m ahead on foot, 100 m on a bike: the navigator's metres, as before.
  expect(wordsOf("en", "mi").announcement([LEFT], 50)).toBe(
    "In 150 feet, turn left onto Via Roma",
  );
  expect(wordsOf("en", "mi").announcement([LEFT], 100)).toBe(
    "In 350 feet, turn left onto Via Roma",
  );
  expect(wordsOf("it", "mi").announcement([LEFT], 50)).toBe(
    "Tra 150 piedi, svolta a sinistra su Via Roma",
  );
  expect(wordsOf("de", "mi").announcement([LEFT], 50)).toBe(
    "In 150 Fuß links abbiegen auf Via Roma",
  );
  expect(wordsOf("es", "mi").announcement([LEFT], 50)).toBe(
    "En 150 pies, gira a la izquierda hacia Via Roma",
  );
  expect(wordsOf("fr", "mi").announcement([LEFT], 50)).toBe(
    "Dans 150 pieds, tournez à gauche sur Via Roma",
  );
  // Joined directions together, and never "0 feet".
  expect(wordsOf("en", "mi").announcement(directions.slice(3), 4)).toBe(
    "In 50 feet, continue straight onto SP12, then turn sharp right onto Via Verdi",
  );
  // With no distance, the turn as it is: no unit in it.
  for (const id of IDS) {
    expect(wordsOf(id, "mi").announcement([LEFT], null)).toBe(
      wordsOf(id, "km").announcement([LEFT], null),
    );
    expect(wordsOf(id, "mi").direction(LEFT)).toBe(wordsOf(id, "km").direction(LEFT));
  }
});

test("with miles the bike on foot is said in feet", () => {
  expect(wordsOf("en", "mi").walkTheBike(100, 200)).toBe(
    "In 350 feet, get off and walk the bike for 650 feet.",
  );
  expect(wordsOf("en", "mi").walkTheBike(null, 96)).toBe(
    "Get off and walk the bike for 300 feet.",
  );
  expect(wordsOf("it", "mi").walkTheBike(100, 200)).toBe(
    "Tra 350 piedi, scendi e porta la bici a mano per 650 piedi.",
  );
  expect(wordsOf("it", "mi").walkTheBike(null, 96)).toBe(
    "Scendi e porta la bici a mano per 300 piedi.",
  );
  expect(wordsOf("de", "mi").walkTheBike(100, 200)).toBe(
    "In 350 Fuß absteigen und das Rad 650 Fuß schieben.",
  );
  expect(wordsOf("es", "mi").walkTheBike(100, 200)).toBe(
    "En 350 pies, bájate y empuja la bici durante 650 pies.",
  );
  expect(wordsOf("fr", "mi").walkTheBike(100, 200)).toBe(
    "Dans 350 pieds, descendez et poussez le vélo sur 650 pieds.",
  );
});

test("in kilometres the short distances stay in metres, as before", () => {
  for (const id of IDS) {
    // With no unit given: the app's, kilometres in a test, and the same
    // words `voiceWords` has always put together.
    const before = voiceWords(PHRASEBOOKS[id]);
    for (const metres of [4, 47, 50, 100]) {
      expect(wordsOf(id).announcement([LEFT], metres)).toBe(
        before.announcement([LEFT], metres),
      );
      expect(wordsOf(id, "km").announcement([LEFT], metres)).toBe(
        before.announcement([LEFT], metres),
      );
      expect(wordsOf(id, "km").walkTheBike(metres, 203)).toBe(
        before.walkTheBike(metres, 203),
      );
    }
  }
  expect(wordsOf("en").announcement([LEFT], 47)).toBe(
    "In 50 metres, turn left onto Via Roma",
  );
  expect(wordsOf("en", "km").walkTheBike(47, 203)).toBe(
    "In 50 metres, get off and walk the bike for 200 metres.",
  );
  expect(wordsOf("it", "km").announcement([LEFT], 47)).toBe(
    "Tra 50 metri, svolta a sinistra su Via Roma",
  );
});

test.each(IDS)("says every phrase with miles in %s, none left empty", (id) => {
  const words = wordsOf(id, "mi");
  const said = [
    words.mile(1, 483_000, 483_000),
    words.mile(CHEER_MI, 1_449_000, 483_000),
    words.mileFaster(12),
    words.mileSlower(75),
    words.mileSamePace,
    words.rideMiles(5, 1_200_000, 15),
    words.rideMilesFaster(5),
    words.rideMilesSlower(5),
    words.rideMilesSameSpeed(5),
    words.announcement([LEFT], 47),
    words.walkTheBike(47, 203),
    words.walkTheBike(null, 96),
  ];
  for (const phrase of said) {
    expect(phrase.trim()).toBe(phrase);
    expect(phrase.length).toBeGreaterThan(10);
    expect(phrase).not.toMatch(/undefined|null|NaN|\{|\}/);
    // No kilometre and no metre in what is said with miles.
    expect(phrase).not.toMatch(/kilom|chilom|metre|metri|Meter|metros|mètres/i);
  }
  // Each language has its own words: none is left in English.
  if (id !== "en") {
    const english = wordsOf("en", "mi");
    expect(words.mile(1, 483_000, 483_000)).not.toBe(english.mile(1, 483_000, 483_000));
    expect(words.mileSamePace).not.toBe(english.mileSamePace);
    expect(words.rideMilesFaster(5)).not.toBe(english.rideMilesFaster(5));
    expect(words.walkTheBike(null, 96)).not.toBe(english.walkTheBike(null, 96));
  }
});
