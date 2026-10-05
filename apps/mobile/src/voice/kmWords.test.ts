/**
 * What the voice adds after the kilometres (TASK-217): the kilometre
 * against the one before. English and Italian as the user chose them
 * (docs/UI.md, «La voce della corsa»); German, Spanish and French written
 * by the agent, to be confirmed.
 */
import { LANGUAGES } from "../i18n/languages";
import { wordsOf } from "./words";

const IDS = LANGUAGES.map((option) => option.id);

test("a faster kilometre says by how many seconds", () => {
  expect(wordsOf("en").kmFaster(12)).toBe("12 seconds faster than the last kilometre.");
  expect(wordsOf("it").kmFaster(12)).toBe(
    "Questo chilometro: 12 secondi meglio del precedente.",
  );
  expect(wordsOf("de").kmFaster(12)).toBe(
    "12 Sekunden schneller als der letzte Kilometer.",
  );
  expect(wordsOf("es").kmFaster(12)).toBe(
    "Este kilómetro: 12 segundos más rápido que el anterior.",
  );
  expect(wordsOf("fr").kmFaster(12)).toBe(
    "Ce kilomètre : 12 secondes plus rapide que le précédent.",
  );
});

test("a slower kilometre says by how many seconds", () => {
  expect(wordsOf("en").kmSlower(8)).toBe("8 seconds slower than the last kilometre.");
  expect(wordsOf("it").kmSlower(8)).toBe(
    "Questo chilometro: 8 secondi peggio del precedente.",
  );
  expect(wordsOf("de").kmSlower(8)).toBe(
    "8 Sekunden langsamer als der letzte Kilometer.",
  );
  expect(wordsOf("es").kmSlower(8)).toBe(
    "Este kilómetro: 8 segundos más lento que el anterior.",
  );
  expect(wordsOf("fr").kmSlower(8)).toBe(
    "Ce kilomètre : 8 secondes plus lent que le précédent.",
  );
});

test("the same pace has no number", () => {
  expect(wordsOf("en").kmSamePace).toBe("Same pace as the last kilometre.");
  expect(wordsOf("it").kmSamePace).toBe("Stesso passo del chilometro precedente.");
  expect(wordsOf("de").kmSamePace).toBe("Gleiches Tempo wie der letzte Kilometer.");
  expect(wordsOf("es").kmSamePace).toBe("Mismo ritmo que el kilómetro anterior.");
  expect(wordsOf("fr").kmSamePace).toBe("Même allure que le kilomètre précédent.");
});

test("one second, and a minute or more, are said as the times of the run", () => {
  expect(wordsOf("en").kmSlower(1)).toBe("1 second slower than the last kilometre.");
  expect(wordsOf("it").kmSlower(1)).toBe(
    "Questo chilometro: un secondo peggio del precedente.",
  );
  expect(wordsOf("de").kmFaster(1)).toBe(
    "Eine Sekunde schneller als der letzte Kilometer.",
  );
  expect(wordsOf("en").kmFaster(75)).toBe(
    "1 minute 15 seconds faster than the last kilometre.",
  );
  expect(wordsOf("it").kmFaster(75)).toBe(
    "Questo chilometro: un minuto e 15 secondi meglio del precedente.",
  );
  expect(wordsOf("fr").kmSlower(60)).toBe(
    "Ce kilomètre : une minute plus lent que le précédent.",
  );
});

test("by bike the last 10 km against the 10 before, with no numbers", () => {
  expect(wordsOf("en").rideFaster(10)).toBe(
    "The last 10 kilometres were faster than the 10 before.",
  );
  expect(wordsOf("en").rideSlower(10)).toBe(
    "The last 10 kilometres were slower than the 10 before.",
  );
  expect(wordsOf("en").rideSameSpeed(10)).toBe(
    "The last 10 kilometres were at the same speed as the 10 before.",
  );
  expect(wordsOf("it").rideFaster(10)).toBe(
    "Ultimi 10 chilometri più veloci dei 10 precedenti.",
  );
  expect(wordsOf("it").rideSlower(10)).toBe(
    "Ultimi 10 chilometri più lenti dei 10 precedenti.",
  );
  expect(wordsOf("it").rideSameSpeed(10)).toBe(
    "Ultimi 10 chilometri alla stessa velocità dei 10 precedenti.",
  );
  expect(wordsOf("de").rideFaster(10)).toBe(
    "Die letzten 10 Kilometer waren schneller als die 10 davor.",
  );
  expect(wordsOf("de").rideSlower(10)).toBe(
    "Die letzten 10 Kilometer waren langsamer als die 10 davor.",
  );
  expect(wordsOf("de").rideSameSpeed(10)).toBe(
    "Die letzten 10 Kilometer waren so schnell wie die 10 davor.",
  );
  expect(wordsOf("es").rideFaster(10)).toBe(
    "Los últimos 10 kilómetros, más rápidos que los 10 anteriores.",
  );
  expect(wordsOf("es").rideSlower(10)).toBe(
    "Los últimos 10 kilómetros, más lentos que los 10 anteriores.",
  );
  expect(wordsOf("es").rideSameSpeed(10)).toBe(
    "Los últimos 10 kilómetros, a la misma velocidad que los 10 anteriores.",
  );
  expect(wordsOf("fr").rideFaster(10)).toBe(
    "Les 10 derniers kilomètres ont été plus rapides que les 10 précédents.",
  );
  expect(wordsOf("fr").rideSlower(10)).toBe(
    "Les 10 derniers kilomètres ont été plus lents que les 10 précédents.",
  );
  expect(wordsOf("fr").rideSameSpeed(10)).toBe(
    "Les 10 derniers kilomètres ont été à la même vitesse que les 10 précédents.",
  );
});

test("every language has each phrase, each one a sentence of its own", () => {
  for (const id of IDS) {
    const words = wordsOf(id);
    const phrases = [
      words.kmFaster(12),
      words.kmSlower(8),
      words.kmSamePace,
      words.rideFaster(10),
      words.rideSlower(10),
      words.rideSameSpeed(10),
    ];
    expect(new Set(phrases).size).toBe(phrases.length);
    for (const phrase of phrases) {
      expect(phrase).toMatch(/^\p{Lu}|^\d/u);
      expect(phrase.endsWith(".")).toBe(true);
    }
  }
});
