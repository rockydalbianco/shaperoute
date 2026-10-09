import {
  Contact,
  ContactField,
  getPermissionsAsync,
  requestPermissionsAsync,
} from "expo-contacts";

/**
 * The phone's contacts, as «From your contacts» reads them (TASK-262 C,
 * ADR-0226): only their phone numbers, never a name, an email or a
 * picture. The permission is asked here only, when the person taps.
 */

/** What the phone said: yes, no, or no for good (only its settings change it). */
export type ContactsAccess = "granted" | "denied" | "blocked";

/**
 * Asks the phone for the contacts: the system question the first time,
 * then the answer given. iOS 18's «limited» counts as yes: the contacts
 * chosen are read.
 */
export async function askForContacts(): Promise<ContactsAccess> {
  const now = await getPermissionsAsync();
  if (now.granted) {
    return "granted";
  }
  if (!now.canAskAgain) {
    return "blocked";
  }
  const asked = await requestPermissionsAsync();
  if (asked.granted) {
    return "granted";
  }
  return asked.canAskAgain ? "denied" : "blocked";
}

/** Every phone number of the contacts the app may read, as written there. */
export async function contactNumbers(): Promise<string[]> {
  const contacts = await Contact.getAllDetails([ContactField.PHONES]);
  const numbers: string[] = [];
  for (const contact of contacts) {
    for (const phone of contact.phones ?? []) {
      if (typeof phone.number === "string" && phone.number !== "") {
        numbers.push(phone.number);
      }
    }
  }
  return numbers;
}
