import {
  earliestStart,
  firstStart,
  latestStart,
  movedDay,
  movedTime,
  startAllowed,
  withOffset,
} from "./dayTime";

// Saturday 21 November 2026, 18:07 on the phone's clock.
const NOW = new Date(2026, 10, 21, 18, 7, 12);

test("the earliest start is 30 minutes on, up to the next quarter", () => {
  const earliest = earliestStart(NOW);
  expect([earliest.getHours(), earliest.getMinutes(), earliest.getSeconds()]).toEqual([
    18, 45, 0,
  ]);
  expect(startAllowed(earliest, NOW)).toBe(true);
  expect(startAllowed(new Date(NOW.getTime() + 29 * 60_000), NOW)).toBe(false);
});

test("the latest start is 60 days on, and not a minute more", () => {
  const latest = latestStart(NOW);
  expect(startAllowed(latest, NOW)).toBe(true);
  expect(startAllowed(new Date(latest.getTime() + 60_000), NOW)).toBe(false);
});

test("it starts tomorrow at eight", () => {
  const first = firstStart(NOW);
  expect([first.getDate(), first.getHours(), first.getMinutes()]).toEqual([22, 8, 0]);
});

test("a day back that would be too soon stops at the earliest start", () => {
  const first = firstStart(NOW);
  const back = movedDay(first, -1, NOW);
  expect(back.getTime()).toBe(earliestStart(NOW).getTime());
  // From the earliest, no further back.
  expect(movedDay(back, -1, NOW)).toBe(back);
  expect(movedDay(first, 1, NOW).getDate()).toBe(23);
});

test("days stop at the last one the API takes", () => {
  let at = firstStart(NOW);
  for (let i = 0; i < 80; i += 1) {
    at = movedDay(at, 1, NOW);
  }
  expect(startAllowed(at, NOW)).toBe(true);
  expect(movedDay(at, 1, NOW)).toBe(at);
});

test("the time moves by quarters, on the same day, never too soon", () => {
  const first = firstStart(NOW);
  expect(movedTime(first, 1, NOW).getMinutes()).toBe(15);
  expect(movedTime(first, -1, NOW).getHours()).toBe(7);
  const earliest = earliestStart(NOW);
  expect(movedTime(earliest, -1, NOW)).toBe(earliest);
  const late = new Date(2026, 10, 22, 23, 45);
  expect(movedTime(late, 1, NOW)).toBe(late);
});

test("the API gets the phone's time with its offset, the same moment", () => {
  const at = new Date(2026, 10, 22, 8, 0);
  const sent = withOffset(at);
  expect(sent).toMatch(/^2026-11-22T08:00:00[+-]\d{2}:\d{2}$/);
  expect(Date.parse(sent)).toBe(at.getTime());
});
