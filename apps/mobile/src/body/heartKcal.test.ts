import { type BodyProfile, NO_BODY } from "./bodyProfile";
import { heartKcal } from "./heartKcal";

// TASK-385 part G (ADR-0327 point 7): the active energy from the heart
// rate, Keytel 2005, the rest of the same time taken out.

const MAN: BodyProfile = { ...NO_BODY, sex: "male", weightKg: 80, birthYear: 1986 };
const WOMAN: BodyProfile = { ...NO_BODY, sex: "female", weightKg: 60, birthYear: 1996 };

test("a man of 80 kg and 40, an hour at 140: Keytel's gross less one MET of rest", () => {
  // (-55.0969 + 0.6309·140 + 0.1988·80 + 0.2017·40) / 4.184 = 13.67 kcal a
  // minute, 820 in the hour; at rest 1.4 a minute (no height), 84.
  expect(heartKcal(140, 3600, MAN, 2026)).toBe(736);
  // With the height, the rest is Mifflin-St Jeor's: 1730 a day.
  expect(heartKcal(140, 3600, { ...MAN, heightCm: 180 }, 2026)).toBe(748);
});

test("a woman of 60 kg and 30, half an hour at 130: the women's equation", () => {
  // (-20.4022 + 0.4472·130 − 0.1263·60 + 0.074·30) / 4.184 · 30 = 232,
  // less 31.5 at rest.
  expect(heartKcal(130, 1800, WOMAN, 2026)).toBe(201);
});

test("without a sex said, a weight or a year of birth: none", () => {
  expect(heartKcal(140, 3600, { ...MAN, sex: "unsaid" }, 2026)).toBeNull();
  expect(heartKcal(140, 3600, { ...MAN, sex: null }, 2026)).toBeNull();
  expect(heartKcal(140, 3600, { ...MAN, weightKg: null }, 2026)).toBeNull();
  expect(heartKcal(140, 3600, { ...MAN, birthYear: null }, 2026)).toBeNull();
  expect(heartKcal(140, 3600, NO_BODY, 2026)).toBeNull();
});

test("never below zero, nor for no time", () => {
  // At 50 the equation is below rest; Keytel holds from about 90 up.
  expect(heartKcal(50, 3600, MAN, 2026)).toBe(0);
  expect(heartKcal(140, 0, MAN, 2026)).toBe(0);
  expect(heartKcal(140, -10, MAN, 2026)).toBe(0);
});
