/**
 * The ground under the pilot (TASK-479 part A1): used only near and while
 * fresh; the page asked again after 40 m, never more often than every 2 s.
 */
import {
  aboveGroundOf,
  ASK_EVERY_MS,
  askAgain,
  GROUND_FRESH_MS,
  groundNow,
  resetGround,
  setGround,
} from "./groundStore";

const HERE: [number, number] = [46, 11];
const NEAR: [number, number] = [46.0005, 11]; // ~55 m north
const FAR: [number, number] = [46.003, 11]; // ~330 m north

beforeEach(() => resetGround());

it("is the GPS altitude less the ground, near and fresh", () => {
  const known = { point: HERE, altM: 1200, atMs: 0 };
  expect(aboveGroundOf(NEAR, 1650, 10_000, known)).toBe(450);
  expect(aboveGroundOf(FAR, 1650, 10_000, known)).toBeNull();
  expect(aboveGroundOf(HERE, 1650, GROUND_FRESH_MS + 1, known)).toBeNull();
  expect(aboveGroundOf(HERE, null, 0, known)).toBeNull();
  expect(aboveGroundOf(null, 1650, 0, known)).toBeNull();
  expect(aboveGroundOf(HERE, 1650, 0, null)).toBeNull();
});

it("reads the ground kept", () => {
  expect(groundNow()).toBeNull();
  setGround({ point: HERE, altM: 900, atMs: 5 });
  expect(aboveGroundOf(HERE, 1000, 10)).toBe(100);
});

it("asks again after 40 m, not more often than every 2 s, and when old", () => {
  expect(askAgain(HERE, 0, null)).toBe(true);
  const asked = { point: HERE, atMs: 0 };
  expect(askAgain(NEAR, ASK_EVERY_MS - 1, asked)).toBe(false);
  expect(askAgain(NEAR, ASK_EVERY_MS, asked)).toBe(true);
  expect(askAgain(HERE, ASK_EVERY_MS, asked)).toBe(false);
  expect(askAgain(HERE, GROUND_FRESH_MS / 2, asked)).toBe(true);
});
