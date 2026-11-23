import type { Visibility } from "@shaperoute/shared-types";
import { VISIBILITIES } from "@shaperoute/shared-types";
import { File, Paths } from "expo-file-system";

/**
 * «Who can see it» at the end of a run (TASK-352, ADR-0304): «Only me» until
 * the account has saved a run with another choice, then the last one it
 * saved. On the phone, one for each account: another account signing in here
 * does not start from someone else's «Everyone».
 */

export const VISIBILITY_CHOICE_FILE = "drawing-visibility.json";

function loadAll(): Record<string, unknown> {
  try {
    const file = new File(Paths.document, VISIBILITY_CHOICE_FILE);
    if (!file.exists) {
      return {};
    }
    const data: unknown = JSON.parse(file.textSync());
    return typeof data === "object" && data !== null
      ? (data as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function saveAll(choices: Record<string, unknown>): void {
  try {
    const file = new File(Paths.document, VISIBILITY_CHOICE_FILE);
    file.create({ overwrite: true });
    file.write(JSON.stringify(choices));
  } catch {
    // The next run starts from what the file still says, or «Only me».
  }
}

/** Where the next run of `owner` starts; «Only me» when it never chose, or
 * when the file cannot say. */
export function loadVisibility(owner: number | null): Visibility {
  if (owner === null) {
    return "only_me";
  }
  const kept = loadAll()[String(owner)];
  return VISIBILITIES.find((visibility) => visibility === kept) ?? "only_me";
}

/** Keeps what `owner` saved a run with, for the next run. */
export function saveVisibility(owner: number, visibility: Visibility): void {
  saveAll({ ...loadAll(), [String(owner)]: visibility });
}

/** The account is deleted: nobody will start from its choice. */
export function forgetVisibilityOf(owner: number): void {
  const choices = loadAll();
  if (String(owner) in choices) {
    delete choices[String(owner)];
    saveAll(choices);
  }
}
