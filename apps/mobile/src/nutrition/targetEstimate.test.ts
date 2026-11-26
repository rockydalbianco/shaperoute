import type { BodyProfile } from "../body/bodyProfile";
import {
  about,
  bmiOf,
  LOSE_DEFICIT_KCAL,
  purposeOf,
  targetEstimate,
  usualUse,
} from "./targetEstimate";

// MuW's estimate of a daily target (TASK-489 part J). The amounts are the
// ones of the sources in out/TASK-489/FONTI-PARTE-J.md.

const YEAR = 2026;
/** 90 kg and 1.75 m: a body mass index of 29.4. */
const MAN: BodyProfile = { sex: "male", weightKg: 90, heightCm: 175, birthYear: 1986 };
/** 80 kg and 1.65 m: 29.4 too. */
const WOMAN: BodyProfile = {
  sex: "female",
  weightKg: 80,
  heightCm: 165,
  birthYear: 1990,
};
/** 60 kg and 1.75 m: 19.6. */
const LEAN: BodyProfile = { ...MAN, weightKg: 60 };

test("the body mass index is the weight over the height squared", () => {
  expect(bmiOf(MAN)).toBeCloseTo(29.39, 2);
  expect(bmiOf({ ...MAN, weightKg: null })).toBeNull();
  expect(bmiOf({ ...MAN, heightCm: null })).toBeNull();
  expect(bmiOf({ ...MAN, heightCm: 0 })).toBeNull();
});

test("a number is «about»: to the nearest ten", () => {
  expect(about(2304)).toBe(2300);
  expect(about(2306)).toBe(2310);
});

test("keeping track, or no answer, the estimate is what the body uses", () => {
  expect(targetEstimate("track", 2304, MAN, YEAR)).toEqual({
    kind: "number",
    kcal: 2300,
  });
  expect(targetEstimate(null, 2304, MAN, YEAR)).toEqual({ kind: "number", kcal: 2300 });
});

test("to lose weight it is 600 less, as the NHS says", () => {
  expect(LOSE_DEFICIT_KCAL).toBe(600);
  expect(targetEstimate("lose", 2800, MAN, YEAR)).toEqual({
    kind: "number",
    kcal: 2200,
  });
  expect(targetEstimate("lose", 2200, WOMAN, YEAR)).toEqual({
    kind: "number",
    kcal: 1600,
  });
});

test("no number to lose weight below a body mass index of 25", () => {
  expect(targetEstimate("lose", 2800, LEAN, YEAR)).toEqual({
    kind: "none",
    why: "notForThis",
  });
  // Just under, and just at it: 76.5 kg and 76.6 kg at 1.75 m.
  expect(targetEstimate("lose", 2800, { ...MAN, weightKg: 76.5 }, YEAR).kind).toBe(
    "none",
  );
  expect(targetEstimate("lose", 2800, { ...MAN, weightKg: 76.6 }, YEAR).kind).toBe(
    "number",
  );
});

test("no number below 1,400 for a woman and 1,900 for a man", () => {
  // 2000 − 600 is 1400: just at it for a woman.
  expect(targetEstimate("lose", 2000, WOMAN, YEAR)).toEqual({
    kind: "number",
    kcal: 1400,
  });
  expect(targetEstimate("lose", 1980, WOMAN, YEAR).kind).toBe("none");
  expect(targetEstimate("lose", 2500, MAN, YEAR)).toEqual({
    kind: "number",
    kcal: 1900,
  });
  expect(targetEstimate("lose", 2480, MAN, YEAR).kind).toBe("none");
  // The sex not said: the higher of the two.
  expect(targetEstimate("lose", 2400, { ...WOMAN, sex: "unsaid" }, YEAR).kind).toBe(
    "none",
  );
});

test("no number to gain weight, or beside a dietitian's plan", () => {
  expect(targetEstimate("gain", 2800, MAN, YEAR)).toEqual({
    kind: "none",
    why: "notForThis",
  });
  expect(targetEstimate("plan", 2800, MAN, YEAR).kind).toBe("none");
});

test("no number at all under 18, whatever the purpose", () => {
  const young = { ...MAN, birthYear: YEAR - 17 };
  for (const purpose of ["track", "lose", "gain", "plan", null] as const) {
    expect(targetEstimate(purpose, 2800, young, YEAR)).toEqual({
      kind: "none",
      why: "under18",
    });
  }
});

test("the year of birth alone does not say who is 18: no number in that year", () => {
  // Born in December 18 years ago, one is 17 for most of this year.
  const maybe = { ...MAN, birthYear: YEAR - 18 };
  for (const purpose of ["track", "lose", "gain", "plan", null] as const) {
    expect(targetEstimate(purpose, 2800, maybe, YEAR)).toEqual({
      kind: "none",
      why: "notForThis",
    });
  }
  expect(
    targetEstimate("track", 2800, { ...MAN, birthYear: YEAR - 19 }, YEAR).kind,
  ).toBe("number");
});

test("with a body datum missing MuW says so, and proposes nothing", () => {
  for (const missing of [
    { ...MAN, birthYear: null },
    { ...MAN, sex: null },
    { ...MAN, weightKg: null },
    { ...MAN, heightCm: null },
  ]) {
    expect(targetEstimate("track", 2800, missing, YEAR)).toEqual({
      kind: "none",
      why: "data",
    });
  }
  expect(targetEstimate("track", null, MAN, YEAR)).toEqual({
    kind: "none",
    why: "data",
  });
});

test("a usual day is the mean of the days that have a number", () => {
  expect(usualUse([2000, null, 2400])).toBe(2200);
  expect(usualUse([null, null])).toBeNull();
  expect(usualUse([])).toBeNull();
});

test("a purpose that does not read is none", () => {
  expect(purposeOf("lose")).toBe("lose");
  expect(purposeOf("fast")).toBeNull();
  expect(purposeOf(3)).toBeNull();
});
