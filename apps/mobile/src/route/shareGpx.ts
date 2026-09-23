import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";

/** The type iOS apps register for GPX files: it decides which apps appear. */
export const GPX_UTI = "com.topografix.gpx";

/**
 * Saves the GPX in the app's cache folder, which the system may empty, and
 * opens the share sheet: Files, AirDrop, Mail, running apps (ADR-0033).
 * Resolves when the sheet closes, whatever the user chose.
 */
export async function shareGpx(
  text: string,
  fileName: string,
): Promise<"shared" | "no_sharing"> {
  if (!(await Sharing.isAvailableAsync())) {
    return "no_sharing";
  }
  const file = new File(Paths.cache, fileName);
  file.create({ overwrite: true });
  file.write(text);
  await Sharing.shareAsync(file.uri, {
    mimeType: "application/gpx+xml",
    UTI: GPX_UTI,
    dialogTitle: "Export GPX",
  });
  return "shared";
}
