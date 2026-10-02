import type { Session } from "@shaperoute/shared-types";
import * as SecureStore from "expo-secure-store";

import { isSession } from "../api/accounts";

/**
 * The session, token and user together, in the phone's keychain
 * (expo-secure-store, ADR-0115): the app opens already signed in, and
 * knows who even before the API answers. Nothing else of the account is
 * kept on the phone.
 */
const SESSION_KEY = "shaperoute.session";

/**
 * The session kept when the app was last open, or null. Read at once, as
 * the run left unscored is (TASK-113): the first screen is already right.
 */
export function loadSession(): Session | null {
  try {
    const kept = SecureStore.getItem(SESSION_KEY);
    if (typeof kept !== "string") {
      return null;
    }
    const session: unknown = JSON.parse(kept);
    return isSession(session) ? session : null;
  } catch {
    return null;
  }
}

/** Keeps the session for the next opening. False if the keychain refused. */
export async function saveSession(session: Session): Promise<boolean> {
  try {
    await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session));
    return true;
  } catch {
    return false;
  }
}

/** Forgets the session: the next opening is signed out. */
export async function forgetSession(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(SESSION_KEY);
  } catch {
    // Nothing kept, or nothing to do about it: the app is signed out anyway.
  }
}
