import { activityKey } from "./activityKey";

const FIRST = { point: [46.0671, 11.1214] as [number, number], timeMs: 1790000000000 };

test("a key is 16 hex digits, as the API takes it", () => {
  expect(activityKey(FIRST)).toMatch(/^[0-9a-f]{16}$/);
});

test("the same beginning is the same key, every time", () => {
  expect(activityKey(FIRST)).toBe(activityKey({ ...FIRST }));
  // What the phone adds beyond a metre and a millisecond does not count.
  expect(
    activityKey({ point: [46.067100001, 11.121400001], timeMs: 1790000000000.2 }),
  ).toBe(activityKey(FIRST));
});

test("another moment or another place is another run", () => {
  const keys = new Set([
    activityKey(FIRST),
    activityKey({ ...FIRST, timeMs: FIRST.timeMs + 1 }),
    activityKey({ ...FIRST, timeMs: FIRST.timeMs + 0x100000000 }),
    activityKey({ ...FIRST, point: [46.0672, 11.1214] }),
    activityKey({ ...FIRST, point: [46.0671, 11.1215] }),
    activityKey({ ...FIRST, point: [-46.0671, 11.1214] }),
  ]);
  expect(keys.size).toBe(6);
});
