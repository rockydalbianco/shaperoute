import * as Notifications from "expo-notifications";
import { AppState, type AppStateStatus, Platform } from "react-native";

import { t } from "../i18n";
import { askPushPermission } from "../notifications/pushDevice";
import { nearDistanceLabel } from "../units/format";
import type { Units } from "../units/units";
import { type Cue, type Navigation, remainingM, upcoming } from "./navigator";
import { ARROWS } from "./phrases";
import { share } from "./runStats";

/**
 * The directions with the phone locked (TASK-401 part A, ADR-0335): what
 * the navigator says, also written in a notification while the app is
 * behind. Its title is the sentence the voice says, with the turn's arrow
 * before it, or a warning sign off the route; under it how much of the
 * drawing is done and how far is left (the user's «Frase della voce + %»).
 * One at a time: each one takes the place of the one before. Silent, since
 * the voice speaks; gone when the app comes back or the run ends. iOS only:
 * on Android the run already has its service's notification (TASK-294).
 * All of it is in the 1.0.1 build: no new module.
 */

/** What the notification says it is about: nothing to open. */
export const LOCK_NOTICE_KIND = "run_directions";

/** Always the same: iOS puts each notice in the place of the one before. */
export const LOCK_NOTICE_ID = "muw-run-directions";

/** The warning before the voice's words off the route. */
const OFF_ROUTE_SIGN = "⚠";

export type LockNotice = { title: string; body: string };

/** The notification; the tests put their own. */
export type LockNotifier = {
  ask: () => Promise<unknown>;
  show: (notice: LockNotice) => Promise<void>;
  clear: () => Promise<void>;
};

export const PHONE_LOCK_NOTIFIER: LockNotifier = {
  ask: askPushPermission,
  async show({ title, body }) {
    try {
      await Notifications.scheduleNotificationAsync({
        identifier: LOCK_NOTICE_ID,
        content: {
          title,
          body,
          sound: false,
          data: { kind: LOCK_NOTICE_KIND },
        },
        trigger: null,
      });
    } catch {
      // Not allowed, or the phone would not: the voice still speaks.
    }
  },
  async clear() {
    try {
      await Notifications.dismissNotificationAsync(LOCK_NOTICE_ID);
    } catch {
      // Gone already.
    }
  },
};

/**
 * The notice for what the navigator said after a fix; null when it said
 * nothing. A turn has its arrow, off the route the warning sign.
 */
export function lockNoticeOf(
  cues: Cue[],
  navigation: Navigation,
  units?: Units,
): LockNotice | null {
  const said = cues.map((cue) => cue.say).join(" ");
  if (said === "") {
    return null;
  }
  const next = upcoming(navigation);
  const sign = navigation.arrived
    ? null
    : navigation.offRoute
      ? OFF_ROUTE_SIGN
      : next !== null && next.inM > 0
        ? ARROWS[next.direction.turn]
        : null;
  const total = navigation.along[navigation.along.length - 1] ?? 0;
  const percent = Math.round(share(navigation.alongM, total) * 100);
  const body = [
    t("{percent}% drawn", { percent }),
    t("{distance} left", {
      distance: nearDistanceLabel(remainingM(navigation), units),
    }),
  ].join(" · ");
  return { title: sign === null ? said : `${sign} ${said}`, body };
}

export type LockNoticeRun = {
  /** What the navigator said after a fix. */
  said: (cues: Cue[], navigation: Navigation) => void;
  /** The run is over: the notice goes. */
  end: () => void;
};

/** What the phone is, for the tests. */
export type LockPhone = {
  os: string;
  state: () => AppStateStatus;
  onChange: (listener: (state: AppStateStatus) => void) => { remove: () => void };
};

const PHONE: LockPhone = {
  os: Platform.OS,
  state: () => AppState.currentState,
  onChange: (listener) => AppState.addEventListener("change", listener),
};

/** Asked once while the app is open: at the first run with a route. */
let asked = false;

/** For the tests: as an app just opened. */
export function forgetLockQuestion(): void {
  asked = false;
}

/**
 * The notices of one run. The permission is that of the push notifications,
 * asked at the start if nobody answered it yet; refused, nothing shows.
 */
export function startLockNotice(
  notifier: LockNotifier = PHONE_LOCK_NOTIFIER,
  phone: LockPhone = PHONE,
): LockNoticeRun {
  if (phone.os !== "ios") {
    return { said: () => {}, end: () => {} };
  }
  if (!asked) {
    asked = true;
    void notifier.ask();
  }
  let shown = false;
  const clear = () => {
    if (shown) {
      shown = false;
      void notifier.clear();
    }
  };
  // The app in front again: the screen shows the turn, the notice goes.
  const subscription = phone.onChange((state) => {
    if (state === "active") {
      clear();
    }
  });
  return {
    said(cues, navigation) {
      if (phone.state() === "active") {
        return;
      }
      const notice = lockNoticeOf(cues, navigation);
      if (notice !== null) {
        shown = true;
        void notifier.show(notice);
      }
    },
    end() {
      subscription.remove();
      clear();
    },
  };
}
