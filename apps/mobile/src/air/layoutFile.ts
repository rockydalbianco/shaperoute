import { requireOptionalNativeModule } from "expo";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";

import { isProfile, type Profile } from "./flightLayout";

/**
 * A flight screen's layout as a file (TASK-479 part B2, ADR-0388): one
 * profile, to keep or to give to another pilot, and read back. JSON with a
 * kind and a version, so a file of a later app is refused, not misread.
 * Nothing goes to the server.
 */

export const LAYOUT_KIND = "muw-flight-layout";
/** 2 since part A1: a file with the map or the height above the ground is
 * refused by an app of B2 as «from a newer MuW», not misread. */
export const LAYOUT_VERSION = 2;
export const LAYOUT_EXTENSION = ".muwlayout";

export type LayoutFile = {
  kind: typeof LAYOUT_KIND;
  version: number;
  profile: Profile;
};

export function layoutText(profile: Profile): string {
  const file: LayoutFile = { kind: LAYOUT_KIND, version: LAYOUT_VERSION, profile };
  return JSON.stringify(file, null, 2);
}

export type ReadLayout = { profile: Profile } | { error: "not-a-layout" | "newer" };

/** The profile of a layout file's text, or why not. */
export function readLayout(text: string): ReadLayout {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { error: "not-a-layout" };
  }
  if (typeof data !== "object" || data === null) {
    return { error: "not-a-layout" };
  }
  const file = data as Record<string, unknown>;
  if (file.kind !== LAYOUT_KIND || typeof file.version !== "number") {
    return { error: "not-a-layout" };
  }
  if (file.version > LAYOUT_VERSION) {
    return { error: "newer" };
  }
  return isProfile(file.profile)
    ? { profile: file.profile }
    : { error: "not-a-layout" };
}

/** The layout written to the app's cache, ready for the share sheet. */
export function layoutFileOf(profile: Profile, name: string): File {
  const safe = name.replace(/[^\p{L}\p{N} _-]/gu, "").trim() || "layout";
  const file = new File(Paths.cache, `${safe}${LAYOUT_EXTENSION}`);
  file.create({ overwrite: true });
  file.write(layoutText(profile));
  return file;
}

/** The share sheet with the layout of `profile`; false when the phone has
 * none or it fails. */
export async function shareLayout(profile: Profile, name: string): Promise<boolean> {
  try {
    if (!(await Sharing.isAvailableAsync())) {
      return false;
    }
    const file = layoutFileOf(profile, name);
    await Sharing.shareAsync(file.uri, {
      mimeType: "application/json",
      UTI: "public.json",
    });
    return true;
  } catch {
    return false;
  }
}

type ExpoDocumentPicker = typeof import("expo-document-picker");

/** Whether this app was built with expo-document-picker (as
 * `imports/pickActivityFile.ts` asks). */
export function layoutPickerAvailable(): boolean {
  return requireOptionalNativeModule("ExpoDocumentPicker") !== null;
}

export type PickedLayout = ReadLayout | { canceled: true } | { error: "unreadable" };

/** «Files» for one layout file, read and checked; the picker's copy in the
 * cache deleted once read. */
export async function pickLayout(): Promise<PickedLayout> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const picker = require("expo-document-picker") as ExpoDocumentPicker;
    const result = await picker.getDocumentAsync({
      type: "*/*",
      multiple: false,
      copyToCacheDirectory: true,
    });
    const asset = result.canceled ? undefined : result.assets[0];
    if (asset === undefined) {
      return { canceled: true };
    }
    const file = new File(asset.uri);
    try {
      return readLayout(file.textSync());
    } finally {
      try {
        file.delete();
      } catch {
        // The cache is the system's to empty too.
      }
    }
  } catch {
    return { error: "unreadable" };
  }
}
