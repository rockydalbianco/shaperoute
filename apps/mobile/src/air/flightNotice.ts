import { useEffect } from "react";
import { Alert } from "react-native";

import { t, tLater } from "../i18n";
import { type KeptList, keptList } from "../storage/keptList";

/**
 * The notice before the first flight recorded on this phone (TASK-305 part
 * R2, ADR-0375; the words are the user's, approved on 2026-11-12): MuW is
 * not a flight instrument. Once read, never again on this phone.
 */

export const FLIGHT_NOTICE_FILE = "flight-notice.json";
export const FLIGHT_NOTICE_TITLE = tLater("Before you fly");
export const FLIGHT_NOTICE = tLater(
  "MuW is not a flight instrument: it records your flight and shares it. Fly with your own instrument, licence and judgement.",
);
/** What the file keeps once the notice is read. */
const READ = "read";

function isRead(value: unknown): value is string {
  return value === READ;
}

const kept: KeptList<string> = keptList(FLIGHT_NOTICE_FILE, isRead);
/** Read in this app run, even when the phone refused to keep it. */
let readNow = false;

type Show = (title: string, message: string, onRead: () => void) => void;

const alertOnce: Show = (title, message, onRead) =>
  Alert.alert(title, message, [{ text: t("Got it"), onPress: onRead }], {
    cancelable: false,
  });

/** Shows the notice unless it was read on this phone; true when shown. */
export function showFlightNotice(
  show: Show = alertOnce,
  list: KeptList<string> = kept,
): boolean {
  if (readNow || list.load().includes(READ)) {
    return false;
  }
  show(t(FLIGHT_NOTICE_TITLE), t(FLIGHT_NOTICE), () => {
    readNow = true;
    list.save([READ]);
  });
  return true;
}

/** For the tests: as at the start of the app. */
export function resetFlightNotice(): void {
  readNow = false;
}

/** The notice as a flight's screen opens. */
export function useFlightNotice(flight: boolean): void {
  useEffect(() => {
    if (flight) {
      showFlightNotice();
    }
  }, [flight]);
}
