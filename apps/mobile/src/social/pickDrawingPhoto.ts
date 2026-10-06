import { MAX_IMAGE_BYTES } from "@shaperoute/shared-types";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";

import { base64Bytes, type ImageSource } from "../route/pickImage";

/** A photo of a run as the phone keeps it (TASK-208): the API's size, so
 * sending it costs what it must and the phone holds it small. */
export const DRAWING_PHOTO_SIDE = 1080;
export const DRAWING_PHOTO_QUALITY = 0.8;

export type PickedDrawingPhoto =
  | { kind: "picked"; base64: string; width: number; height: number }
  | { kind: "cancelled" }
  /** The camera was refused: it can be allowed in the phone's Settings. */
  | { kind: "denied" }
  | { kind: "too_large" }
  | { kind: "pick_failed" };

/**
 * Whole, not cropped: a photo of a run is what it is. The picker hands over
 * the file; the shrinking below makes the JPEG.
 */
export const DRAWING_PHOTO_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ["images"],
  base64: false,
  quality: 1,
  allowsEditing: false,
  exif: false,
};

/** A picture made smaller: a JPEG in base64, and its size. */
export type Shrunk = { base64: string; width: number; height: number };

export type Shrink = (uri: string, width: number, height: number) => Promise<Shrunk>;

/** The side to give the manipulator: the long one, so the other follows;
 * null when the picture is small enough already. */
export function shrunkSide(
  width: number,
  height: number,
): { width: number } | { height: number } | null {
  if (Math.max(width, height) <= DRAWING_PHOTO_SIDE) {
    return null;
  }
  return width >= height
    ? { width: DRAWING_PHOTO_SIDE }
    : { height: DRAWING_PHOTO_SIDE };
}

/**
 * Makes the picture at most DRAWING_PHOTO_SIDE px on its long side, never
 * larger, and a JPEG (a HEIC of the phone too), without EXIF: the API
 * would do the same, and the phone keeps this one.
 */
export async function shrinkPhoto(
  uri: string,
  width: number,
  height: number,
): Promise<Shrunk> {
  const context = ImageManipulator.manipulate(uri);
  const side = shrunkSide(width, height);
  const image = await (side === null ? context : context.resize(side)).renderAsync();
  const saved = await image.saveAsync({
    base64: true,
    compress: DRAWING_PHOTO_QUALITY,
    format: SaveFormat.JPEG,
  });
  if (!saved.base64) {
    throw new Error("The picture could not be made a JPEG.");
  }
  return { base64: saved.base64, width: saved.width, height: saved.height };
}

/**
 * Lets the user choose a picture or take a photo for a run (TASK-208), and
 * shrinks it. The library needs no permission on iOS: the system picker
 * only hands over the one chosen. Never throws.
 */
export async function pickDrawingPhoto(
  source: ImageSource,
  picker: Pick<
    typeof ImagePicker,
    "launchImageLibraryAsync" | "launchCameraAsync" | "requestCameraPermissionsAsync"
  > = ImagePicker,
  shrink: Shrink = shrinkPhoto,
): Promise<PickedDrawingPhoto> {
  let result: ImagePicker.ImagePickerResult;
  try {
    if (source === "camera") {
      const permission = await picker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        return { kind: "denied" };
      }
      result = await picker.launchCameraAsync(DRAWING_PHOTO_OPTIONS);
    } else {
      result = await picker.launchImageLibraryAsync(DRAWING_PHOTO_OPTIONS);
    }
  } catch {
    return { kind: "pick_failed" };
  }
  if (result.canceled) {
    return { kind: "cancelled" };
  }
  const asset = result.assets[0];
  if (!asset) {
    return { kind: "pick_failed" };
  }
  let shrunk: Shrunk;
  try {
    shrunk = await shrink(asset.uri, asset.width, asset.height);
  } catch {
    return { kind: "pick_failed" };
  }
  if (base64Bytes(shrunk.base64) > MAX_IMAGE_BYTES) {
    return { kind: "too_large" };
  }
  return { kind: "picked", ...shrunk };
}
