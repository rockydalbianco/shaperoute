import {
  computeSeconds,
  estimateProgress,
  isSlow,
  MAP_S,
  mapProgress,
  phaseSeconds,
  READING_S,
  readingProgress,
  WORD_LETTER_S,
  wordSeconds,
} from "./progress";

test("each phase starts where the one before ends", () => {
  expect(estimateProgress("queued", 0, 5000)).toBe(0);
  expect(estimateProgress("downloading_map", 0, 5000)).toBeCloseTo(0.08);
  expect(estimateProgress("computing", 0, 5000)).toBeCloseTo(0.45);
});

test("a phase never passes its end, however long it takes", () => {
  expect(estimateProgress("queued", 3600, 5000)).toBeLessThanOrEqual(0.08);
  expect(estimateProgress("downloading_map", 3600, 5000)).toBeLessThanOrEqual(0.45);
  expect(estimateProgress("computing", 3600, 5000)).toBeLessThanOrEqual(0.95);
  expect(estimateProgress("computing", 3600, 5000)).toBeGreaterThan(0.94);
});

test("it only moves forward within a phase", () => {
  let before = -1;
  for (let seconds = 0; seconds <= 120; seconds += 5) {
    const now = estimateProgress("computing", seconds, 15000);
    expect(now).toBeGreaterThan(before);
    before = now;
  }
});

test("at the usual time a phase is most of the way through", () => {
  // 86% of the computing span after the seconds a 15 km route usually takes.
  expect(estimateProgress("computing", computeSeconds(15000), 15000)).toBeCloseTo(
    0.45 + 0.5 * 0.8647,
    3,
  );
});

test("long routes are given longer to compute", () => {
  expect(computeSeconds(3000)).toBe(10);
  expect(computeSeconds(21000)).toBe(52.5);
  expect(estimateProgress("computing", 20, 21000)).toBeLessThan(
    estimateProgress("computing", 20, 5000),
  );
});

test("the reading and the map fill like a phase, and never fill alone", () => {
  expect(readingProgress(0)).toBe(0);
  expect(mapProgress(0)).toBe(0);
  expect(readingProgress(READING_S)).toBeCloseTo(0.95 * 0.8647, 3);
  expect(mapProgress(MAP_S)).toBeCloseTo(0.95 * 0.8647, 3);
  expect(readingProgress(3600)).toBeLessThanOrEqual(0.95);
  expect(mapProgress(3600)).toBeLessThanOrEqual(0.95);
});

test("a wait is slow past twice its usual time", () => {
  expect(isSlow(7.9, phaseSeconds("sending", 5000))).toBe(false);
  expect(isSlow(8, phaseSeconds("sending", 5000))).toBe(true);
  expect(phaseSeconds("computing", 21000)).toBe(computeSeconds(21000));
  expect(phaseSeconds("downloading_map", 5000)).toBe(90);
});

test("a word is paced by its letters, not only by its distance", () => {
  expect(wordSeconds("UNO", 10000)).toBe(3 * WORD_LETTER_S);
  expect(wordSeconds("CAMMINO", 21000)).toBe(7 * WORD_LETTER_S);
  expect(wordSeconds("CAMMINO", 21000)).toBeGreaterThan(wordSeconds("TRENTO", 21000));
  expect(wordSeconds("CIAO", 15000)).toBeGreaterThan(computeSeconds(15000));
  // Never quicker than a shape of the same distance.
  expect(wordSeconds("UNO", 42000)).toBe(computeSeconds(42000));
});

test("a word computes at its own pace; a shape as before", () => {
  expect(phaseSeconds("computing", 15000, "CIAO")).toBe(wordSeconds("CIAO", 15000));
  expect(phaseSeconds("computing", 15000, null)).toBe(computeSeconds(15000));
  expect(phaseSeconds("downloading_map", 15000, "CIAO")).toBe(90);
  expect(estimateProgress("computing", 40, 15000, "CIAO")).toBeLessThan(
    estimateProgress("computing", 40, 15000),
  );
  expect(estimateProgress("computing", 3600, 15000, "CIAO")).toBeLessThanOrEqual(0.95);
});

test("a word is slow past twice its own estimate", () => {
  const usual = phaseSeconds("computing", 15000, "CIAO");
  expect(isSlow(2 * usual - 1, usual)).toBe(false);
  expect(isSlow(2 * usual, usual)).toBe(true);
});
