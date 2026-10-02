import { MAX_IMAGE_BYTES } from "@shaperoute/shared-types";
import * as ImagePicker from "expo-image-picker";

import { base64Bytes, type ImageSource } from "../route/pickImage";

export type PickedPhoto =
  | { kind: "picked"; base64: string }
  | { kind: "cancelled" }
  /** The camera was refused: it can be allowed in the phone's Settings. */
  | { kind: "denied" }
  | { kind: "too_large" }
  | { kind: "pick_failed" };

/**
 * A profile picture is a square: the phone's own editor crops it, so the
 * person chooses what stays in. JPEG in base64, as for an outline
 * (src/route/pickImage.ts); the API reduces it to 256 px, so a stronger
 * compression than a photo to trace loses nothing that shows.
 */
export const PHOTO_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ["images"],
  base64: true,
  quality: 0.5,
  allowsEditing: true,
  aspect: [1, 1],
  exif: false,
};

/**
 * Lets the user choose a picture or take a photo for the profile
 * (TASK-178). The library needs no permission on iOS: the system picker
 * only hands over the one chosen. Never throws.
 */
export async function pickPhoto(
  source: ImageSource,
  picker: Pick<
    typeof ImagePicker,
    "launchImageLibraryAsync" | "launchCameraAsync" | "requestCameraPermissionsAsync"
  > = ImagePicker,
): Promise<PickedPhoto> {
  let result: ImagePicker.ImagePickerResult;
  try {
    if (source === "camera") {
      const permission = await picker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        return { kind: "denied" };
      }
      result = await picker.launchCameraAsync(PHOTO_OPTIONS);
    } else {
      result = await picker.launchImageLibraryAsync(PHOTO_OPTIONS);
    }
  } catch {
    return { kind: "pick_failed" };
  }
  if (result.canceled) {
    return { kind: "cancelled" };
  }
  const base64 = result.assets[0]?.base64;
  if (!base64) {
    return { kind: "pick_failed" };
  }
  if (base64Bytes(base64) > MAX_IMAGE_BYTES) {
    return { kind: "too_large" };
  }
  return { kind: "picked", base64 };
}
