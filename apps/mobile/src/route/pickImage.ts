import { MAX_IMAGE_BYTES } from "@shaperoute/shared-types";
import * as ImagePicker from "expo-image-picker";

/** Where the picture comes from: the photo library, or the camera. */
export type ImageSource = "library" | "camera";

/** The picture as the screen shows it, and as the API gets it. */
export type Picture = { uri: string; width: number; height: number };

export type Picked =
  | { kind: "picked"; picture: Picture; base64: string }
  | { kind: "cancelled" }
  /** The camera was refused: it can be allowed in Settings. */
  | { kind: "denied" }
  | { kind: "too_large"; bytes: number }
  | { kind: "pick_failed" };

/**
 * JPEG in base64: expo-image-picker re-encodes any picture (HEIC too) as
 * JPEG for it, the format the engine reads (ADR-0068). The whole picture,
 * not a square crop: the subject needs background all around it.
 */
export const PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ["images"],
  base64: true,
  quality: 0.8,
  allowsEditing: false,
  exif: false,
};

/** The size of what base64 encodes, without decoding it. */
export function base64Bytes(base64: string): number {
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  return Math.floor((base64.length * 3) / 4) - padding;
}

/**
 * Lets the user choose a picture or take a photo (TASK-073). The library
 * needs no permission on iOS: the system picker only hands over the one
 * chosen. Never throws.
 */
export async function pickImage(
  source: ImageSource,
  picker: Pick<
    typeof ImagePicker,
    "launchImageLibraryAsync" | "launchCameraAsync" | "requestCameraPermissionsAsync"
  > = ImagePicker,
): Promise<Picked> {
  let result: ImagePicker.ImagePickerResult;
  try {
    if (source === "camera") {
      const permission = await picker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        return { kind: "denied" };
      }
      result = await picker.launchCameraAsync(PICKER_OPTIONS);
    } else {
      result = await picker.launchImageLibraryAsync(PICKER_OPTIONS);
    }
  } catch {
    return { kind: "pick_failed" };
  }
  if (result.canceled) {
    return { kind: "cancelled" };
  }
  const asset = result.assets[0];
  if (!asset?.base64) {
    return { kind: "pick_failed" };
  }
  const bytes = base64Bytes(asset.base64);
  if (bytes > MAX_IMAGE_BYTES) {
    return { kind: "too_large", bytes };
  }
  return {
    kind: "picked",
    picture: { uri: asset.uri, width: asset.width, height: asset.height },
    base64: asset.base64,
  };
}
