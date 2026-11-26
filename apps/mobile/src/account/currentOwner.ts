import { File, Paths } from "expo-file-system";
import { useSyncExternalStore } from "react";

/**
 * The account signed in on this phone now (TASK-507, ADR-0406), for the
 * files that belong to an account and not to the phone: the body and the
 * heart (part D, the user's choice «Di ogni account»). Set by useAccount as
 * soon as it knows, before the app shows anything of the account; null with
 * nobody signed in. Its number is enough here: account/phoneOwners.ts lets
 * go of what a number held when it comes back as somebody else.
 */

let owner: number | null = null;
const listeners = new Set<() => void>();

/** The number of the account signed in; null with nobody. */
export function currentOwner(): number | null {
  return owner;
}

/** Called by useAccount: the account signed in now, or null. */
export function setCurrentOwner(next: number | null): void {
  if (next === owner) {
    return;
  }
  owner = next;
  for (const listener of listeners) {
    listener();
  }
}

/** Calls `listener` each time another account (or none) is signed in, until
 * the returned function is called. */
export function onOwnerChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** The account signed in, for a screen: it renders again when another
 * account (or none) signs in (TASK-507 part B2). */
export function useCurrentOwner(): number | null {
  return useSyncExternalStore(onOwnerChange, currentOwner, currentOwner);
}

/**
 * The name of the file `name` for `who`: «body.json» is «body.12.json» for
 * the account 12, and stays «body.json» with nobody signed in. So each
 * account has its own, and nobody else's shows.
 */
export function ownerFile(name: string, who: number | null = owner): string {
  if (who === null) {
    return name;
  }
  const dot = name.lastIndexOf(".");
  return dot < 0 ? `${name}.${who}` : `${name.slice(0, dot)}.${who}${name.slice(dot)}`;
}

/**
 * The file of `name` for the account signed in. One written before
 * TASK-507, or with nobody signed in, goes to the first account that reads
 * it: it is moved under that account's name, if that account has none yet.
 */
export function ownedFile(name: string): File {
  const mine = new File(Paths.document, ownerFile(name));
  if (owner === null) {
    return mine;
  }
  try {
    const plain = new File(Paths.document, name);
    if (!mine.exists && plain.exists) {
      mine.create({ overwrite: true });
      mine.write(plain.textSync());
      plain.delete();
    }
  } catch {
    // Read as none: the plain file waits for the next try.
  }
  return mine;
}

/** Deletes the file of `name` of the account `who`: deleted, or its number
 * now somebody else's (account/phoneOwners.ts). */
export function forgetOwnedFile(name: string, who: number): void {
  try {
    const file = new File(Paths.document, ownerFile(name, who));
    if (file.exists) {
      file.delete();
    }
  } catch {
    // Nothing to forget, or the phone refuses.
  }
}
