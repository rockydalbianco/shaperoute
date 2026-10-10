import type { PushLanguage } from "@shaperoute/shared-types";
import * as SecureStore from "expo-secure-store";

/**
 * The push token this phone gave the API last, for which account and in
 * which language (TASK-262): the app sends it again only when one of the
 * three changes, so a phone sends its token once, not at each opening.
 * Kept in the keychain with the session (`../account/sessionStore`).
 */
export type PushSent = { userId: number; token: string; language: PushLanguage };

const SENT_KEY = "shaperoute.push-token";

function isSent(value: unknown): value is PushSent {
  return (
    typeof value === "object" &&
    value !== null &&
    "userId" in value &&
    typeof value.userId === "number" &&
    "token" in value &&
    typeof value.token === "string" &&
    "language" in value &&
    typeof value.language === "string"
  );
}

/** What was sent last; null when nothing was, or it does not read. */
export function loadPushSent(): PushSent | null {
  try {
    const kept = SecureStore.getItem(SENT_KEY);
    if (typeof kept !== "string") {
      return null;
    }
    const sent: unknown = JSON.parse(kept);
    return isSent(sent) ? sent : null;
  } catch {
    return null;
  }
}

export async function savePushSent(sent: PushSent): Promise<void> {
  try {
    await SecureStore.setItemAsync(SENT_KEY, JSON.stringify(sent));
  } catch {
    // Sent again at the next opening: the API keeps one row all the same.
  }
}

export async function forgetPushSent(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(SENT_KEY);
  } catch {
    // Nothing kept.
  }
}
