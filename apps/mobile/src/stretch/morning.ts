import { File, Paths } from "expo-file-system";
import * as Notifications from "expo-notifications";

import { t } from "../i18n";
import { MINUTES, type Minutes } from "./routines";

/**
 * «Morning stretch» (TASK-466 part D, ADR-0378; the user's choices of
 * 2026-11-12): the time the alarm rings, typed by the user (no app may read
 * the alarms of an iPhone's Clock), the days, and how long to stretch. With
 * it on, the phone shows a notification `AFTER_ALARM_MIN` minutes after that
 * time on each of those days; touched, it opens the «Morning» routine of
 * that length, without asking how long.
 *
 * The notifications are local, one a week for each day, each with a name of
 * its own (`morning-stretch-<day>`): setting them again takes back these and
 * no other, so the reminders of other parts of the app (a plan's day, a
 * rest in the gym) are left alone. Kept on this phone only.
 */

/** A day of the week: 1 is Monday, 7 is Sunday. */
export type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export const WEEK: readonly Weekday[] = [1, 2, 3, 4, 5, 6, 7];

export type MorningStretch = {
  on: boolean;
  /** When the alarm rings, on the phone's clock. */
  hour: number;
  minute: number;
  /** The days it rings, Monday first. */
  days: readonly Weekday[];
  /** How long the routine is. */
  minutes: Minutes;
};

/** Until the user says otherwise: off, 7:00, Monday to Friday, 5 minutes. */
export const NO_MORNING: MorningStretch = {
  on: false,
  hour: 7,
  minute: 0,
  days: [1, 2, 3, 4, 5],
  minutes: 5,
};

/** How long after the alarm the notification comes, in minutes. */
export const AFTER_ALARM_MIN = 5;

function whole(value: unknown, from: number, to: number): number | null {
  return typeof value === "number" &&
    Number.isInteger(value) &&
    value >= from &&
    value <= to
    ? value
    : null;
}

/** What of `data` is a setting: each field that does not read is as at first. */
export function morningOf(data: unknown): MorningStretch {
  if (typeof data !== "object" || data === null) {
    return NO_MORNING;
  }
  const raw = data as Record<string, unknown>;
  const days = Array.isArray(raw.days)
    ? WEEK.filter((day) => (raw.days as unknown[]).includes(day))
    : NO_MORNING.days;
  const minutes = MINUTES.find((m) => m === raw.minutes) ?? NO_MORNING.minutes;
  return {
    on: raw.on === true && days.length > 0,
    hour: whole(raw.hour, 0, 23) ?? NO_MORNING.hour,
    minute: whole(raw.minute, 0, 59) ?? NO_MORNING.minute,
    days,
    minutes,
  };
}

/** "7:05", "23:40": a time of day as the setting shows it. */
export function clock(hour: number, minute: number): string {
  return `${hour}:${String(minute).padStart(2, "0")}`;
}

export const MORNING_FILE = "morning-stretch.json";

/** The setting kept on this phone; as at first when none was kept. */
export function loadMorning(): MorningStretch {
  try {
    const file = new File(Paths.document, MORNING_FILE);
    if (!file.exists) {
      return NO_MORNING;
    }
    return morningOf(JSON.parse(file.textSync()));
  } catch {
    return NO_MORNING;
  }
}

let current: MorningStretch | null = null;

/** The setting now; read from the phone on first use. */
export function appMorning(): MorningStretch {
  if (current === null) {
    current = loadMorning();
  }
  return current;
}

const listeners = new Set<() => void>();

/** Calls `listener` at each setting saved from now on, until the returned
 * function is called. */
export function subscribeMorning(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Keeps the setting for the next opening and shows it now; a phone that
 * refuses to keep it still has it until the app closes. */
export function saveMorning(setting: MorningStretch): void {
  const kept = morningOf(setting);
  try {
    const file = new File(Paths.document, MORNING_FILE);
    file.create({ overwrite: true });
    file.write(JSON.stringify(kept));
  } catch {
    // The setting still holds while the app is open.
  }
  current = kept;
  for (const listener of listeners) {
    listener();
  }
}

/** One weekly notification: its name, and when the phone shows it. */
export type MorningNotice = {
  id: string;
  /** The day it shows, which is the day after for an alarm just before
   * midnight. */
  day: Weekday;
  hour: number;
  minute: number;
};

/** What every name of these notifications starts with. */
export const MORNING_ID_PREFIX = "morning-stretch-";

/** The notifications of a setting: one for each day, none when it is off. */
export function morningNotices(setting: MorningStretch): MorningNotice[] {
  if (!setting.on) {
    return [];
  }
  const total = setting.hour * 60 + setting.minute + AFTER_ALARM_MIN;
  const nextDay = total >= 24 * 60;
  const at = total % (24 * 60);
  return setting.days.map((day) => ({
    // Named after the alarm's day: a setting never makes two of one name.
    id: `${MORNING_ID_PREFIX}${day}`,
    day: nextDay ? (((day % 7) + 1) as Weekday) : day,
    hour: Math.floor(at / 60),
    minute: at % 60,
  }));
}

/** What the notification says it is about, in its data. */
export const MORNING_NOTICE_KIND = "morning_stretch";

/** The phone's scheduled notifications; the tests put their own. */
export type MorningNotifier = {
  /** The names of all the notifications the app has scheduled. */
  scheduled: () => Promise<string[]>;
  schedule: (
    notice: MorningNotice,
    title: string,
    body: string,
    minutes: Minutes,
  ) => Promise<void>;
  cancel: (id: string) => Promise<void>;
};

export const PHONE_NOTIFIER: MorningNotifier = {
  async scheduled() {
    const all = await Notifications.getAllScheduledNotificationsAsync();
    return all.map((request) => request.identifier);
  },
  async schedule(notice, title, body, minutes) {
    await Notifications.scheduleNotificationAsync({
      identifier: notice.id,
      content: {
        title,
        body,
        sound: true,
        data: { kind: MORNING_NOTICE_KIND, minutes },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        // The phone counts the week from Sunday, 1 to 7.
        weekday: (notice.day % 7) + 1,
        hour: notice.hour,
        minute: notice.minute,
      },
    });
  },
  async cancel(id) {
    await Notifications.cancelScheduledNotificationAsync(id);
  },
};

/** One setting after the other: two taps never leave both their notices. */
let queue: Promise<void> = Promise.resolve();

/**
 * Makes the phone's notifications those of `setting`: takes back every one
 * of ours (by the start of its name, never another's) and schedules the
 * setting's again, in the app's language now. Best effort: a phone that
 * refuses leaves what it had.
 */
export function syncMorningNotices(
  setting: MorningStretch,
  notifier: MorningNotifier = PHONE_NOTIFIER,
): Promise<void> {
  queue = queue.then(async () => {
    try {
      for (const id of await notifier.scheduled()) {
        if (id.startsWith(MORNING_ID_PREFIX)) {
          await notifier.cancel(id);
        }
      }
      const title = t("Morning stretch");
      const body = t("{minutes} minutes to wake up your body. Tap to start.", {
        minutes: setting.minutes,
      });
      for (const notice of morningNotices(setting)) {
        await notifier.schedule(notice, title, body, setting.minutes);
      }
    } catch {
      // Expo Go, a phone that refuses: nothing scheduled, nothing lost.
    }
  });
  return queue;
}

/** The minutes a touched notification asks for; null when it is not ours. */
export function morningTap(data: unknown): Minutes | null {
  if (typeof data !== "object" || data === null) {
    return null;
  }
  const raw = data as Record<string, unknown>;
  if (raw.kind !== MORNING_NOTICE_KIND) {
    return null;
  }
  return MINUTES.find((m) => m === raw.minutes) ?? NO_MORNING.minutes;
}

type Touched = {
  notification: {
    date?: number;
    request: { identifier: string; content: { data?: unknown } };
  };
};

/**
 * Calls `listener` with the minutes of each morning notification touched
 * from now on, and of the one that opened the app, if it was one. The
 * returned function stops it.
 *
 * Beside the listener of the push notifications
 * (`../notifications/pushDevice`), which ignores this kind: the one that
 * opened the app is read here without clearing it, since that listener
 * starts after this one and still has to read it. A weekly notification
 * comes with the same name each week: each is told from the last by its
 * date.
 */
export function onMorningTapped(listener: (minutes: Minutes) => void): () => void {
  const seen = new Set<string>();
  const touched = (response: Touched | null) => {
    if (response === null) {
      return;
    }
    const { date, request } = response.notification;
    const minutes = morningTap(request.content.data);
    const key = `${request.identifier}@${date ?? ""}`;
    if (minutes === null || seen.has(key)) {
      return;
    }
    seen.add(key);
    listener(minutes);
  };
  try {
    const subscription = Notifications.addNotificationResponseReceivedListener(touched);
    touched(Notifications.getLastNotificationResponse());
    return () => subscription.remove();
  } catch {
    // No notifications on this phone.
    return () => {};
  }
}
