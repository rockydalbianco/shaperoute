import * as Sharing from "expo-sharing";
import type { RefObject } from "react";
import type { View } from "react-native";
import { captureRef } from "react-native-view-shot";

import { t } from "../i18n";

/** What became of a picture to share. */
export type PictureOutcome = "shared" | "no_sharing" | "failed";

/**
 * Makes a PNG of `view`, at the phone's own pixels, in the cache folder the
 * system may empty, and opens the share sheet with it (TASK-231, ADR-0194):
 * Instagram is there (Story, Feed, Messages), and «Save Image» keeps it in
 * Photos. Resolves when the sheet closes, whatever the user chose.
 */
export async function sharePicture(
  view: RefObject<View | null>,
): Promise<PictureOutcome> {
  if (!(await Sharing.isAvailableAsync())) {
    return "no_sharing";
  }
  if (view.current === null) {
    return "failed";
  }
  try {
    const uri = await captureRef(view, { format: "png", result: "tmpfile" });
    await Sharing.shareAsync(uri, {
      mimeType: "image/png",
      UTI: "public.png",
      dialogTitle: t("Share"),
    });
  } catch {
    // The picture not made, or the sheet not opened: nothing was shared.
    return "failed";
  }
  return "shared";
}

/** What the post says when the picture did not go; null when it did. */
export function pictureProblem(outcome: PictureOutcome): string | null {
  switch (outcome) {
    case "shared":
      return null;
    case "no_sharing":
      return t("This phone cannot open the share sheet.");
    case "failed":
      return t("The picture could not be made. Try again.");
  }
}
