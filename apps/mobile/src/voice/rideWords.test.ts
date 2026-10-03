/**
 * What the voice says only on a bike (TASK-216): the kilometres every 10,
 * with the average speed, and the way between two letters with the pen up,
 * ridden. English and Italian as in docs/UI.md; German, Spanish and French
 * written by the agent, to be confirmed.
 */
import { LANGUAGES } from "../i18n/languages";
import { wordsOf } from "./words";

const IDS = LANGUAGES.map((option) => option.id);

test("by bike the letter done says to ride to the next", () => {
  expect(wordsOf("en").rideTo("U")).toBe(
    "Letter done. Ride to the U: the drawing is paused.",
  );
  expect(wordsOf("en").rideTo(null)).toBe(
    "Letter done. Ride to the next letter: the drawing is paused.",
  );
  expect(wordsOf("it").rideTo("U")).toBe(
    "Lettera finita. Pedala fino alla U: il disegno è in pausa.",
  );
  expect(wordsOf("it").rideTo(null)).toBe(
    "Lettera finita. Pedala fino alla lettera successiva: il disegno è in pausa.",
  );
  expect(wordsOf("de").rideTo("U")).toBe(
    "Buchstabe fertig. Zum U fahren: die Zeichnung ist pausiert.",
  );
  expect(wordsOf("es").rideTo("U")).toBe(
    "Letra terminada. Pedalea hasta la U: el dibujo está en pausa.",
  );
  expect(wordsOf("fr").rideTo("U")).toBe(
    "Lettre terminée. Roulez jusqu'au U : le dessin est en pause.",
  );
  // On foot, as before.
  expect(wordsOf("en").penUp("U")).toBe(
    "Letter done. Walk to the U: the drawing is paused.",
  );
});

test("by bike the kilometres say the average speed", () => {
  const time = 25 * 60_000;
  expect(wordsOf("en").rideKilometres(10, time, 24)).toBe(
    "10 kilometres. Time: 25 minutes. Average speed: 24 kilometres per hour.",
  );
  expect(wordsOf("it").rideKilometres(10, time, 24)).toBe(
    "10 chilometri. Tempo: 25 minuti. Velocità media: 24 chilometri orari.",
  );
  expect(wordsOf("de").rideKilometres(10, time, 24)).toBe(
    "10 Kilometer. Zeit: 25 Minuten. Durchschnittsgeschwindigkeit: 24 Kilometer pro Stunde.",
  );
  expect(wordsOf("es").rideKilometres(10, time, 24)).toBe(
    "10 kilómetros. Tiempo: 25 minutos. Velocidad media: 24 kilómetros por hora.",
  );
  expect(wordsOf("fr").rideKilometres(10, time, 24)).toBe(
    "10 kilomètres. Temps : 25 minutes. Vitesse moyenne : 24 kilomètres par heure.",
  );
  // Over an hour, the time as a run says it.
  expect(wordsOf("it").rideKilometres(30, 75 * 60_000, 24)).toBe(
    "30 chilometri. Tempo: un'ora e 15 minuti. Velocità media: 24 chilometri orari.",
  );
});

test.each(IDS)(
  "by bike every phrase is said in %s, none in English but English",
  (id) => {
    const words = wordsOf(id);
    const said = [
      words.rideTo("U"),
      words.rideTo(null),
      words.rideKilometres(20, 3_130_000, 23),
    ];
    for (const phrase of said) {
      expect(phrase).not.toMatch(/undefined|null|NaN|\[object/);
      expect(phrase).not.toMatch(/ {2}|^ | $/);
    }
    if (id !== "en") {
      const english = wordsOf("en");
      expect(said).not.toContain(english.rideTo("U"));
      expect(said).not.toContain(english.rideKilometres(20, 3_130_000, 23));
    }
  },
);
