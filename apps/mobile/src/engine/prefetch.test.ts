import { files } from "./memoryFiles";
import {
  DAY_MS,
  newPhoneId,
  pausePrefetch,
  phoneId,
  prefetchPausedUntil,
  retryAt,
} from "./prefetch";
import { deleteZones } from "./zones";

jest.mock("expo-file-system", () => jest.requireActual("./memoryFiles"));
jest.mock("expo-file-system/legacy", () => ({ createDownloadResumable: jest.fn() }));

const STATE = "file:///documents/engine/prefetch.json";

beforeEach(() => {
  files.clear();
});

test("a phone id is 32 hex digits", () => {
  expect(newPhoneId(() => 0)).toBe("0".repeat(32));
  expect(newPhoneId(() => 0.999)).toBe("f".repeat(32));
  expect(newPhoneId()).toMatch(/^[0-9a-f]{32}$/);
});

test("the phone's id is made once and kept", () => {
  const first = phoneId(() => 0.5);
  expect(first).toBe("8".repeat(32));
  expect(phoneId(() => 0.1)).toBe(first);
  expect(JSON.parse(files.get(STATE) ?? "")).toEqual({
    phoneId: first,
    pausedUntil: 0,
  });
});

test("a file that does not read gives a new id and no pause", () => {
  files.set(STATE, "{not json");
  expect(prefetchPausedUntil()).toBe(0);
  expect(phoneId(() => 0)).toBe("0".repeat(32));
  files.set(STATE, JSON.stringify({ phoneId: "../x", pausedUntil: 5 }));
  expect(prefetchPausedUntil()).toBe(0);
});

test("a pause is kept with the same id", () => {
  const id = phoneId();
  expect(prefetchPausedUntil()).toBe(0);
  pausePrefetch(1_000);
  expect(prefetchPausedUntil()).toBe(1_000);
  expect(phoneId()).toBe(id);
});

test("«Delete» in «Settings» leaves the id and the pause", () => {
  const id = phoneId();
  pausePrefetch(1_000);
  deleteZones();
  expect(phoneId()).toBe(id);
  expect(prefetchPausedUntil()).toBe(1_000);
});

test("after a 429 the phone waits Retry-After, never more than a day", () => {
  expect(retryAt("21600", 1_000)).toBe(1_000 + 21_600_000);
  expect(retryAt(" 60 ", 0)).toBe(60_000);
  expect(retryAt("999999", 0)).toBe(DAY_MS);
  for (const sent of [null, "", "0", "-5", "soon", "Wed, 21 Oct 2026 07:28:00 GMT"]) {
    expect(retryAt(sent, 1_000)).toBe(1_000 + DAY_MS);
  }
});
