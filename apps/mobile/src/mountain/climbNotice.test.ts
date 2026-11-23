/**
 * The notice before the first day of mountaineering on this phone (TASK-463
 * part B):
 * the user's words, once, and never again once read.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { KeptList } from "../storage/keptList";
import {
  CLIMB_NOTICE,
  CLIMB_NOTICE_TITLE,
  resetClimbNotice,
  showClimbNotice,
} from "./climbNotice";

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

afterEach(() => resetClimbNotice());

test("the words are the ones the user approved", () => {
  const task = readFileSync(
    join(__dirname, "..", "..", "..", "..", "docs", "tasks", "TASK-463.md"),
    "utf8",
  );
  expect(CLIMB_NOTICE_TITLE).toBe("Before you climb");
  expect(task).toContain(`| ${CLIMB_NOTICE_TITLE} |`);
  expect(task).toContain(`| ${CLIMB_NOTICE} |`);
});

test("shown once; once read, never again on this phone", () => {
  const kept = memory();
  const show = jest.fn();
  expect(showClimbNotice(show, kept)).toBe(true);
  expect(show).toHaveBeenCalledWith(
    CLIMB_NOTICE_TITLE,
    CLIMB_NOTICE,
    expect.any(Function),
  );
  // Not read yet: the next day shows it again.
  expect(showClimbNotice(show, kept)).toBe(true);
  show.mock.calls[1][2]();
  expect(kept.list).toEqual(["read"]);
  expect(showClimbNotice(show, kept)).toBe(false);
  // After a restart, the phone remembers.
  resetClimbNotice();
  expect(showClimbNotice(show, kept)).toBe(false);
  expect(show).toHaveBeenCalledTimes(2);
});

test("read in this app run, it stays read even when the phone refuses to keep it", () => {
  const refusing: KeptList<string> = { load: () => [], save: () => false };
  const show = jest.fn((_title: string, _message: string, onRead: () => void) =>
    onRead(),
  );
  expect(showClimbNotice(show, refusing)).toBe(true);
  expect(showClimbNotice(show, refusing)).toBe(false);
});
