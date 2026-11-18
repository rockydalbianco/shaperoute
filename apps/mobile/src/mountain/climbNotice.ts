import { useEffect } from "react";
import { Alert } from "react-native";

import { t, tLater } from "../i18n";
import { type KeptList, keptList } from "../storage/keptList";

/**
 * The notice before the first day of mountaineering recorded on this phone
 * (TASK-463 part B, ADR-0373; the words are the user's, approved on
 * 2026-11-12): MuW does not guide you. Once read, never again on this phone,
 * as the notice before a flight (air/flightNotice.ts).
 */

export const CLIMB_NOTICE_FILE = "climb-notice.json";
export const CLIMB_NOTICE_TITLE = tLater("Before you climb");
export const CLIMB_NOTICE = tLater(
  "MuW records your climb and shares it: it does not guide you. Go with your own gear, skills and judgement, and check the conditions before you set off.",
);
/** What the file keeps once the notice is read. */
const READ = "read";

function isRead(value: unknown): value is string {
  return value === READ;
}

const kept: KeptList<string> = keptList(CLIMB_NOTICE_FILE, isRead);
/** Read in this app run, even when the phone refused to keep it. */
let readNow = false;

type Show = (title: string, message: string, onRead: () => void) => void;

const alertOnce: Show = (title, message, onRead) =>
  Alert.alert(title, message, [{ text: t("Got it"), onPress: onRead }], {
    cancelable: false,
  });

/** Shows the notice unless it was read on this phone; true when shown. */
export function showClimbNotice(
  show: Show = alertOnce,
  list: KeptList<string> = kept,
): boolean {
  if (readNow || list.load().includes(READ)) {
    return false;
  }
  show(t(CLIMB_NOTICE_TITLE), t(CLIMB_NOTICE), () => {
    readNow = true;
    list.save([READ]);
  });
  return true;
}

/** For the tests: as at the start of the app. */
export function resetClimbNotice(): void {
  readNow = false;
}

/** The notice as the screen of a day of mountaineering opens. */
export function useClimbNotice(climb: boolean): void {
  useEffect(() => {
    if (climb) {
      showClimbNotice();
    }
  }, [climb]);
}
