import {
  AFTER_ALARM_MIN,
  appMorning,
  clock,
  MORNING_ID_PREFIX,
  type MorningNotice,
  type MorningNotifier,
  morningNotices,
  morningOf,
  morningTap,
  NO_MORNING,
  onMorningTapped,
  saveMorning,
  subscribeMorning,
  syncMorningNotices,
} from "./morning";

jest.mock("expo-notifications");

// The phone's documents folder, in memory, as in units.test.ts.
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
    delete(): void {
      files.delete(this.uri);
    }
  }
  return { File, Paths: { document: { uri: "file:///documents/" } }, files };
});

type Phone = typeof import("../../__mocks__/expo-notifications");
const phone = jest.requireMock<Phone>("expo-notifications");

/** A phone with these notifications scheduled already. */
function phoneWith(ids: string[]) {
  const scheduled = new Map<string, MorningNotice | null>(ids.map((id) => [id, null]));
  const said: { title: string; body: string; minutes: number }[] = [];
  const notifier: MorningNotifier = {
    scheduled: async () => [...scheduled.keys()],
    schedule: async (notice, title, body, minutes) => {
      scheduled.set(notice.id, notice);
      said.push({ title, body, minutes });
    },
    cancel: async (id) => {
      scheduled.delete(id);
    },
  };
  return { scheduled, said, notifier };
}

beforeEach(() => {
  phone.resetPhone();
  saveMorning(NO_MORNING);
});

describe("the setting", () => {
  it("is off at first: 7:00, Monday to Friday, 5 minutes", () => {
    expect(NO_MORNING).toEqual({
      on: false,
      hour: 7,
      minute: 0,
      days: [1, 2, 3, 4, 5],
      minutes: 5,
    });
    expect(morningOf(null)).toEqual(NO_MORNING);
    expect(morningOf("7:00")).toEqual(NO_MORNING);
  });

  it("keeps what reads and puts the rest as at first", () => {
    expect(
      morningOf({ on: true, hour: 6, minute: 40, days: [7, 1, 9, "2"], minutes: 10 }),
    ).toEqual({ on: true, hour: 6, minute: 40, days: [1, 7], minutes: 10 });
    expect(morningOf({ on: true, hour: 24, minute: -1, minutes: 7 })).toEqual({
      ...NO_MORNING,
      on: true,
    });
    // On with no day would remind of nothing: it is off.
    expect(morningOf({ on: true, days: [] }).on).toBe(false);
  });

  it("is kept on the phone and told to who listens", () => {
    const told = jest.fn();
    const stop = subscribeMorning(told);
    saveMorning({ ...NO_MORNING, on: true, hour: 6, minute: 30 });
    expect(appMorning()).toMatchObject({ on: true, hour: 6, minute: 30 });
    expect(told).toHaveBeenCalledTimes(1);
    stop();
    saveMorning(NO_MORNING);
    expect(told).toHaveBeenCalledTimes(1);
  });

  it("shows a time as a clock does", () => {
    expect(clock(7, 0)).toBe("7:00");
    expect(clock(23, 5)).toBe("23:05");
  });
});

describe("the notifications of a setting", () => {
  it("are none while it is off", () => {
    expect(morningNotices(NO_MORNING)).toEqual([]);
  });

  it("come five minutes after the alarm, one for each day", () => {
    expect(AFTER_ALARM_MIN).toBe(5);
    expect(morningNotices({ ...NO_MORNING, on: true, hour: 6, minute: 58 })).toEqual(
      [1, 2, 3, 4, 5].map((day) => ({
        id: `${MORNING_ID_PREFIX}${day}`,
        day,
        hour: 7,
        minute: 3,
      })),
    );
  });

  it("fall on the day after for an alarm just before midnight", () => {
    const notices = morningNotices({
      ...NO_MORNING,
      on: true,
      hour: 23,
      minute: 57,
      days: [5, 7],
    });
    expect(notices).toEqual([
      { id: `${MORNING_ID_PREFIX}5`, day: 6, hour: 0, minute: 2 },
      { id: `${MORNING_ID_PREFIX}7`, day: 1, hour: 0, minute: 2 },
    ]);
  });
});

describe("setting the phone's notifications", () => {
  it("takes back its own and no other: a plan's day and a rest stay", async () => {
    const { scheduled, notifier } = phoneWith([
      "muw-plan-day-2026-11-13",
      `${MORNING_ID_PREFIX}1`,
      `${MORNING_ID_PREFIX}6`,
      "8f1c0d2e-rest",
    ]);
    await syncMorningNotices({ ...NO_MORNING, on: true, days: [2, 3] }, notifier);
    expect([...scheduled.keys()].sort()).toEqual(
      [
        "8f1c0d2e-rest",
        `${MORNING_ID_PREFIX}2`,
        `${MORNING_ID_PREFIX}3`,
        "muw-plan-day-2026-11-13",
      ].sort(),
    );
  });

  it("leaves none of its own when turned off, and the others as they were", async () => {
    const { scheduled, notifier } = phoneWith([
      "muw-plan-day-2026-11-13",
      `${MORNING_ID_PREFIX}1`,
    ]);
    await syncMorningNotices(NO_MORNING, notifier);
    expect([...scheduled.keys()]).toEqual(["muw-plan-day-2026-11-13"]);
  });

  it("says the length in the notification and carries it", async () => {
    const { said, notifier } = phoneWith([]);
    await syncMorningNotices(
      { ...NO_MORNING, on: true, days: [1], minutes: 10 },
      notifier,
    );
    expect(said).toEqual([
      {
        title: "Morning stretch",
        body: "10 minutes to wake up your body. Tap to start.",
        minutes: 10,
      },
    ]);
  });

  it("goes on when the phone refuses", async () => {
    const notifier: MorningNotifier = {
      scheduled: async () => {
        throw new Error("no notifications here");
      },
      schedule: jest.fn(),
      cancel: jest.fn(),
    };
    await expect(
      syncMorningNotices({ ...NO_MORNING, on: true }, notifier),
    ).resolves.toBeUndefined();
    expect(notifier.schedule).not.toHaveBeenCalled();
  });
});

describe("a touched notification", () => {
  it("is ours by its kind, with the minutes it carries", () => {
    expect(morningTap({ kind: "morning_stretch", minutes: 10 })).toBe(10);
    expect(morningTap({ kind: "morning_stretch", minutes: 7 })).toBe(5);
    expect(morningTap({ kind: "gym_rest" })).toBeNull();
    expect(morningTap({ kind: "comment", drawing_id: "x" })).toBeNull();
    expect(morningTap(null)).toBeNull();
  });

  it("opens the routine, and a push notification does not", () => {
    const opened = jest.fn();
    const stop = onMorningTapped(opened);
    phone.tap({ kind: "comment" });
    expect(opened).not.toHaveBeenCalled();
    phone.tap({ kind: "morning_stretch", minutes: 3 });
    expect(opened).toHaveBeenCalledWith(3);
    stop();
    phone.tap({ kind: "morning_stretch", minutes: 3 });
    expect(opened).toHaveBeenCalledTimes(1);
  });

  it("is told from last week's, which had the same name", () => {
    const opened = jest.fn();
    onMorningTapped(opened);
    const touch = (date: number) => {
      const response = phone.response({ kind: "morning_stretch", minutes: 5 });
      const again = {
        ...response,
        notification: {
          date,
          request: {
            ...response.notification.request,
            identifier: "morning-stretch-1",
          },
        },
      };
      for (const [listener] of jest.mocked(
        phone.addNotificationResponseReceivedListener,
      ).mock.calls) {
        listener(again);
      }
    };
    touch(1_000);
    touch(1_000);
    expect(opened).toHaveBeenCalledTimes(1);
    touch(1_000 + 7 * 24 * 3600 * 1000);
    expect(opened).toHaveBeenCalledTimes(2);
  });

  it("that opened the app is read and left for the push listener to clear", () => {
    phone.phone.last = phone.response({ kind: "morning_stretch", minutes: 10 });
    const opened = jest.fn();
    onMorningTapped(opened);
    expect(opened).toHaveBeenCalledWith(10);
    expect(phone.clearLastNotificationResponse).not.toHaveBeenCalled();
    expect(phone.phone.last).not.toBeNull();
  });
});
