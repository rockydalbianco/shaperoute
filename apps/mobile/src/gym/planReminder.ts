import type { GymPlan } from "@shaperoute/shared-types";
import { File, Paths } from "expo-file-system";
import * as Notifications from "expo-notifications";
import { useEffect } from "react";

import { t } from "../i18n";
import { askPushPermission } from "../notifications/pushDevice";
import { todayPlans, useKeptPlans } from "./plans";
import { outingTitle } from "./outingDay";
import { runTitle } from "./runDay";

/**
 * «Ricordamelo alle 8» (TASK-461 B, ADR-0371, the user's «Sì, alle 8» of
 * 2026-11-11): a notification of the phone at 8 in the morning on the days
 * of the plans only, «Oggi: Lungo · 12 km». The server knows nothing of
 * it. The permission is that of the push notifications, asked when the
 * reminder is turned on.
 *
 * Its notifications are its own: every identifier starts with
 * `PLAN_REMINDER_PREFIX` and carries `PLAN_NOTICE_KIND`, so another local
 * notification of the app (the rest's, the morning stretch's) is never
 * taken back by this one, nor this one by them. The next 14 days are
 * scheduled again whenever the plans are read in «Draw».
 */

export const PLAN_REMINDER_PREFIX = "muw-plan-day-";
export const PLAN_NOTICE_KIND = "plan_day";
export const REMINDER_HOUR = 8;
export const REMINDER_DAYS = 14;
export const REMINDER_FILE = "plan-reminder.json";

let onCache: boolean | null = null;

/** Whether «Ricordamelo alle 8» is on: off until turned on. */
export function planReminderOn(): boolean {
  if (onCache === null) {
    try {
      const file = new File(Paths.document, REMINDER_FILE);
      onCache = file.exists && JSON.parse(file.textSync())?.on === true;
    } catch {
      onCache = false;
    }
  }
  return onCache;
}

/** Turns the reminder on or off; on, the permission is asked. */
export function setPlanReminder(
  on: boolean,
  ask: () => Promise<unknown> = askPushPermission,
): void {
  onCache = on;
  try {
    const file = new File(Paths.document, REMINDER_FILE);
    file.create({ overwrite: true });
    file.write(JSON.stringify({ on }));
  } catch {
    // Kept while the app is open.
  }
  if (on) {
    void ask();
  }
}

/** For the tests: as an app just opened. */
export function forgetPlanReminder(): void {
  onCache = null;
}

export type PlanNotice = { id: string; at: Date; title: string; body: string };

function isoOf(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/** The notices of the next `REMINDER_DAYS` days at 8 with a workout of a
 * plan, from today's when 8 has not struck yet; one a day. */
export function noticesFor(plans: GymPlan[], now: Date): PlanNotice[] {
  const notices: PlanNotice[] = [];
  for (let ahead = 0; ahead < REMINDER_DAYS; ahead += 1) {
    const at = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + ahead,
      REMINDER_HOUR,
    );
    if (at.getTime() <= now.getTime()) {
      continue;
    }
    const [first] = todayPlans(plans, at);
    if (first === undefined) {
      continue;
    }
    const day =
      first.outing !== undefined
        ? outingTitle(first.outing)
        : first.run !== undefined
          ? runTitle(first.run)
          : first.name;
    notices.push({
      id: `${PLAN_REMINDER_PREFIX}${isoOf(at)}`,
      at,
      title: t("Today: {day}", { day }),
      body: first.plan,
    });
  }
  return notices;
}

/** The phone's notifications; the tests put their own. */
export type ReminderNotifier = {
  ids: () => Promise<string[]>;
  schedule: (notice: PlanNotice) => Promise<void>;
  cancel: (id: string) => Promise<void>;
};

export const PHONE_REMINDERS: ReminderNotifier = {
  async ids() {
    try {
      const all = await Notifications.getAllScheduledNotificationsAsync();
      return all.map((one) => one.identifier);
    } catch {
      return [];
    }
  },
  async schedule(notice) {
    try {
      await Notifications.scheduleNotificationAsync({
        identifier: notice.id,
        content: {
          title: notice.title,
          body: notice.body,
          sound: true,
          data: { kind: PLAN_NOTICE_KIND },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: notice.at,
        },
      });
    } catch {
      // Not allowed: no reminder.
    }
  },
  async cancel(id) {
    try {
      await Notifications.cancelScheduledNotificationAsync(id);
    } catch {
      // Gone already.
    }
  },
};

/** Takes back this reminder's notifications and, when it is on, schedules
 * those of the next days again. Never touches another one's. */
export async function refreshPlanReminders(
  plans: GymPlan[],
  now: Date = new Date(),
  notifier: ReminderNotifier = PHONE_REMINDERS,
): Promise<void> {
  const ours = (await notifier.ids()).filter((id) =>
    id.startsWith(PLAN_REMINDER_PREFIX),
  );
  for (const id of ours) {
    await notifier.cancel(id);
  }
  if (!planReminderOn()) {
    return;
  }
  for (const notice of noticesFor(plans, now)) {
    await notifier.schedule(notice);
  }
}

/** The reminders kept in step with the plans while «Draw» is shown:
 * scheduled again when the plans kept change, not at every render. */
export function usePlanReminders(): void {
  const plans = useKeptPlans();
  useEffect(() => {
    void refreshPlanReminders(plans);
  }, [plans]);
}
