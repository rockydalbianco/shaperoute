/**
 * What the voice says only on the water (TASK-251): each kilometre, or
 * with miles each mile, with the average pace of 500 metres. Written by the
 * agent in every language, to be confirmed.
 */
import { LANGUAGES } from "../i18n/languages";
import { wordsOf } from "./words";

const IDS = LANGUAGES.map((option) => option.id);
const TIME = 12 * 60_000;
const PACE = 6 * 60_000;

test("on the water the kilometres say the pace of 500 metres", () => {
  expect(wordsOf("en").paddleKilometre(2, TIME, PACE)).toBe(
    "2 kilometres. Time: 12 minutes. Average pace: 6 minutes per 500 metres.",
  );
  expect(wordsOf("it").paddleKilometre(2, TIME, PACE)).toBe(
    "2 chilometri. Tempo: 12 minuti. Passo medio: 6 minuti ogni 500 metri.",
  );
  expect(wordsOf("de").paddleKilometre(2, TIME, PACE)).toBe(
    "2 Kilometer. Zeit: 12 Minuten. Durchschnittstempo: 6 Minuten pro 500 Meter.",
  );
  expect(wordsOf("es").paddleKilometre(2, TIME, PACE)).toBe(
    "2 kilómetros. Tiempo: 12 minutos. Ritmo medio: 6 minutos cada 500 metros.",
  );
  expect(wordsOf("fr").paddleKilometre(2, TIME, PACE)).toBe(
    "2 kilomètres. Temps : 12 minutes. Allure moyenne : 6 minutes aux 500 mètres.",
  );
});

test("with miles the miles say the pace of 500 metres all the same", () => {
  expect(wordsOf("en", "mi").paddleMile(2, TIME, PACE)).toBe(
    "2 miles. Time: 12 minutes. Average pace: 6 minutes per 500 metres.",
  );
  expect(wordsOf("it", "mi").paddleMile(2, TIME, PACE)).toBe(
    "2 miglia. Tempo: 12 minuti. Passo medio: 6 minuti ogni 500 metri.",
  );
});

test("every language says them, and never a kilometre's pace", () => {
  for (const id of IDS) {
    const km = wordsOf(id).paddleKilometre(1, TIME, PACE);
    const mile = wordsOf(id, "mi").paddleMile(1, TIME, PACE);
    expect(km).toContain("500");
    expect(mile).toContain("500");
    expect(km).not.toBe(wordsOf(id).kilometre(1, TIME, PACE));
    expect(mile).not.toBe(wordsOf(id, "mi").mile(1, TIME, PACE));
  }
});
