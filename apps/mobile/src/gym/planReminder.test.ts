import type { GymPlan } from "@shaperoute/shared-types";

import {
  forgetPlanReminder,
  noticesFor,
  PLAN_REMINDER_PREFIX,
  type PlanNotice,
  refreshPlanReminders,
  type ReminderNotifier,
  setPlanReminder,
} from "./planReminder";

jest.mock("expo-file-system", () => {
  const files = new Map<string, string>();
  class File {
    uri: string;
    constructor(directory: { uri: string }, name: string) {
      this.uri = `${directory.uri}${name}`;
    }
    get exists(): boolean {
      return files.has(this.uri);
    }
    create(): void {
      files.set(this.uri, "");
    }
    write(text: string): void {
      files.set(this.uri, text);
    }
    textSync(): string {
      return files.get(this.uri) ?? "";
    }
  }
  return { File, files, Paths: { document: { uri: "file:///documents/" } } };
});

// TASK-461 B (ADR-0371): «Ricordamelo alle 8», only on the plan's days,
// with its own notifications that never touch another one's.

const PLAN: GymPlan = {
  key: "pl00000000000042",
  name: "Toward 60 km",
  days: [3, 7],
  items: [],
  position: 0,
  updated_at: "2026-11-12T10:00:00Z",
  program: {
    starts_on: "2026-11-16",
    weeks: 10,
    mode: "reps",
    step_kg: 0,
    custom: [],
    target: { sport: "bike", distance_m: 60_000 },
    sessions: [
      {
        day: 3,
        name: "Bike intervals · 5 × 3:00",
        items: [],
        outing: { sport: "bike", kind: "intervals", reps: 5, rep_s: 180 },
      },
      {
        day: 7,
        name: "Long ride · 30 km",
        items: [],
        outing: { sport: "bike", kind: "long", distance_m: 30_000 },
      },
    ],
  },
} as GymPlan;

test("at 8 on the plan's days of the next two weeks, from the start", () => {
  // Sunday 15 November 2026 at 9: the plan starts on Monday.
  const notices = noticesFor([PLAN], new Date(2026, 10, 15, 9));
  expect(notices.map((one) => one.id)).toEqual([
    `${PLAN_REMINDER_PREFIX}2026-11-18`,
    `${PLAN_REMINDER_PREFIX}2026-11-22`,
    `${PLAN_REMINDER_PREFIX}2026-11-25`,
  ]);
  expect(notices[0].at.getHours()).toBe(8);
  expect(notices[1]).toMatchObject({
    title: "Today: Long ride · 30 km",
    body: "Toward 60 km",
  });
});

test("today's at 8 only before 8", () => {
  const before = noticesFor([PLAN], new Date(2026, 10, 18, 7));
  const after = noticesFor([PLAN], new Date(2026, 10, 18, 9));
  expect(before[0].id).toBe(`${PLAN_REMINDER_PREFIX}2026-11-18`);
  expect(after[0].id).toBe(`${PLAN_REMINDER_PREFIX}2026-11-22`);
});

function phone(
  ids: string[],
): ReminderNotifier & { scheduled: PlanNotice[]; cancelled: string[] } {
  const scheduled: PlanNotice[] = [];
  const cancelled: string[] = [];
  return {
    scheduled,
    cancelled,
    ids: async () => ids,
    schedule: async (notice) => {
      scheduled.push(notice);
    },
    cancel: async (id) => {
      cancelled.push(id);
    },
  };
}

test("off, it takes back its own and schedules nothing; another's stays", async () => {
  forgetPlanReminder();
  const notifier = phone([
    `${PLAN_REMINDER_PREFIX}2026-11-18`,
    "rest-123",
    "stretch-1",
  ]);
  await refreshPlanReminders([PLAN], new Date(2026, 10, 15, 9), notifier);
  expect(notifier.cancelled).toEqual([`${PLAN_REMINDER_PREFIX}2026-11-18`]);
  expect(notifier.scheduled).toEqual([]);
});

test("on, the permission is asked and the days are scheduled again", async () => {
  const ask = jest.fn(async () => "granted");
  setPlanReminder(true, ask);
  expect(ask).toHaveBeenCalled();
  forgetPlanReminder();
  const notifier = phone(["rest-123"]);
  await refreshPlanReminders([PLAN], new Date(2026, 10, 15, 9), notifier);
  expect(notifier.cancelled).toEqual([]);
  expect(notifier.scheduled).toHaveLength(3);
  setPlanReminder(false, ask);
});
