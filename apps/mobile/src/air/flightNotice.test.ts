/**
 * The notice before the first flight on this phone (TASK-305 part R2):
 * the user's words, once, and never again once read.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { KeptList } from "../storage/keptList";
import {
  afterFlightNotice,
  FLIGHT_NOTICE,
  FLIGHT_NOTICE_TITLE,
  resetFlightNotice,
  showFlightNotice,
} from "./flightNotice";

function memory(): KeptList<string> & { list: string[] } {
  const kept = {
    list: [] as string[],
    load: () => [...kept.list],
    save: (list: string[]) => {
      kept.list = [...list];
      return true;
    },
  };
  return kept;
}

afterEach(() => resetFlightNotice());

test("the words are the ones the user approved", () => {
  const task = readFileSync(
    join(__dirname, "..", "..", "..", "..", "docs", "tasks", "TASK-305.md"),
    "utf8",
  );
  expect(FLIGHT_NOTICE_TITLE).toBe("Before you fly");
  expect(task).toContain(`| ${FLIGHT_NOTICE_TITLE} |`);
  expect(task).toContain(`| ${FLIGHT_NOTICE} |`);
});

test("shown once; once read, never again on this phone", () => {
  const kept = memory();
  const show = jest.fn();
  expect(showFlightNotice(show, kept)).toBe(true);
  expect(show).toHaveBeenCalledWith(
    FLIGHT_NOTICE_TITLE,
    FLIGHT_NOTICE,
    expect.any(Function),
  );
  // Not read yet: the next flight shows it again.
  expect(showFlightNotice(show, kept)).toBe(true);
  show.mock.calls[1][2]();
  expect(kept.list).toEqual(["read"]);
  expect(showFlightNotice(show, kept)).toBe(false);
  // After a restart, the phone remembers.
  resetFlightNotice();
  expect(showFlightNotice(show, kept)).toBe(false);
  expect(show).toHaveBeenCalledTimes(2);
});

test("read in this app run, it stays read even when the phone refuses to keep it", () => {
  const refusing: KeptList<string> = { load: () => [], save: () => false };
  const show = jest.fn((_title: string, _message: string, onRead: () => void) =>
    onRead(),
  );
  expect(showFlightNotice(show, refusing)).toBe(true);
  expect(showFlightNotice(show, refusing)).toBe(false);
});

test("what waits for the notice runs once it is read; with none up, at once", () => {
  const kept = memory();
  const then = jest.fn();
  afterFlightNotice(then);
  expect(then).toHaveBeenCalledTimes(1);
  const show = jest.fn();
  showFlightNotice(show, kept);
  afterFlightNotice(then);
  afterFlightNotice(then);
  expect(then).toHaveBeenCalledTimes(1);
  show.mock.calls[0][2]();
  expect(then).toHaveBeenCalledTimes(3);
  afterFlightNotice(then);
  expect(then).toHaveBeenCalledTimes(4);
});
