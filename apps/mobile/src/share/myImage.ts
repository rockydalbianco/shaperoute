import { File, Paths } from "expo-file-system";
import { useSyncExternalStore } from "react";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";

import type { ImageSource } from "../route/pickImage";
import { gifFrames, isGif } from "./gifFrames";
import { base64OfBytes } from "./videoCharacter";
import type { PageImage } from "./videoPage";

/**
 * The runner's own image, which runs the line of the video in place of an
 * animal (TASK-417, ADR-0345): a photo from the library or taken now, cut
 * square by the phone's own editor and made 256 px, or a GIF from the
 * library, cut the same way and kept as it is. It stays in the app's
 * folder on this phone, one at a time, and never goes to the server: it
 * leaves only inside the video the runner shares.
 */

/** «My image» among the characters of «Edit video». */
export const MY_IMAGE = "my_image";

/** A photo is made this many pixels a side: the image is drawn about half
 * as wide on the video. */
export const MY_IMAGE_SIDE = 256;
export const MY_IMAGE_QUALITY = 0.85;

/** The files of the image in the app's folder: one or the other. */
export const MY_IMAGE_PHOTO = "my-image.jpg";
export const MY_IMAGE_GIF = "my-image.gif";

/**
 * Square, cut by the phone's own editor (choice 1 of TASK-417): the person
 * chooses what stays in. On iOS the editor keeps a GIF moving, each frame
 * cut alike. At full quality, so a GIF comes as it was.
 */
export const MY_IMAGE_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ["images"],
  allowsEditing: true,
  aspect: [1, 1],
  quality: 1,
  base64: false,
  exif: false,
};

export type PickedMyImage =
  | { kind: "picked"; uri: string }
  | { kind: "cancelled" }
  /** The camera was refused: it can be allowed in the phone's Settings. */
  | { kind: "denied" }
  /** Not an image the video can show: the video goes out without it. */
  | { kind: "unreadable" };

/** Where the image is kept, and how it is read and made: the phone's own
 * by default, a test's own in tests. */
export type MyImageFiles = {
  /** The file's address in the app's folder, when it is there. */
  uriOf: (name: string) => string | null;
  bytesOf: (uri: string) => Promise<Uint8Array>;
  write: (name: string, bytes: Uint8Array) => void;
  remove: (name: string) => void;
  /** The photo at `uri` as a JPEG `side` px wide at most: its bytes. */
  shrink: (uri: string, side: number) => Promise<Uint8Array>;
};

async function shrinkPhoto(uri: string, side: number): Promise<Uint8Array> {
  const image = await ImageManipulator.manipulate(uri)
    .resize({ width: side })
    .renderAsync();
  const saved = await image.saveAsync({
    compress: MY_IMAGE_QUALITY,
    format: SaveFormat.JPEG,
  });
  return new File(saved.uri).bytes();
}

export const PHONE_FILES: MyImageFiles = {
  uriOf: (name) => {
    const file = new File(Paths.document, name);
    return file.exists ? file.uri : null;
  },
  bytesOf: (uri) => new File(uri).bytes(),
  write: (name, bytes) => {
    const file = new File(Paths.document, name);
    file.create({ overwrite: true });
    file.write(bytes);
  },
  remove: (name) => {
    const file = new File(Paths.document, name);
    if (file.exists) {
      file.delete();
    }
  },
  shrink: shrinkPhoto,
};

/** Told of each new image or removal, while the app is open: the preview
 * plays the new one at once. */
const listeners = new Set<() => void>();
/** How many times the image changed since the app opened. */
let stamp = 0;
/** The image as the page takes it, read once for each image. */
let read: { stamp: number; image: Promise<PageImage | null> } | null = null;

function changed(): void {
  stamp += 1;
  read = null;
  for (const listener of listeners) {
    listener();
  }
}

/** A number that changes with the image. */
export function myImageStamp(): number {
  return stamp;
}

export function subscribeMyImage(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** The stamp of the image, kept up to date: a screen with it shows the new
 * image as soon as it is chosen or taken off. */
export function useMyImageStamp(): number {
  return useSyncExternalStore(subscribeMyImage, myImageStamp);
}

/** The image kept on this phone, for its tile; null with none. */
export function myImageUri(files: MyImageFiles = PHONE_FILES): string | null {
  try {
    return files.uriOf(MY_IMAGE_GIF) ?? files.uriOf(MY_IMAGE_PHOTO);
  } catch {
    return null;
  }
}

/** Takes the image off the phone. */
export function removeMyImage(files: MyImageFiles = PHONE_FILES): void {
  try {
    files.remove(MY_IMAGE_GIF);
    files.remove(MY_IMAGE_PHOTO);
  } catch {
    // Nothing more to do: the tile shows what is left.
  }
  changed();
}

/**
 * Lets the runner choose a photo or a GIF, or take a photo, cut square,
 * and keeps it in place of the one before: a GIF as it is, once it reads;
 * a photo as a JPEG of MY_IMAGE_SIDE px. Never throws.
 */
export async function pickMyImage(
  source: ImageSource,
  picker: Pick<
    typeof ImagePicker,
    "launchImageLibraryAsync" | "launchCameraAsync" | "requestCameraPermissionsAsync"
  > = ImagePicker,
  files: MyImageFiles = PHONE_FILES,
): Promise<PickedMyImage> {
  let result: ImagePicker.ImagePickerResult;
  try {
    if (source === "camera") {
      const permission = await picker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        return { kind: "denied" };
      }
      result = await picker.launchCameraAsync(MY_IMAGE_OPTIONS);
    } else {
      result = await picker.launchImageLibraryAsync(MY_IMAGE_OPTIONS);
    }
  } catch {
    return { kind: "unreadable" };
  }
  if (result.canceled) {
    return { kind: "cancelled" };
  }
  const asset = result.assets[0];
  if (!asset) {
    return { kind: "unreadable" };
  }
  try {
    const bytes = await files.bytesOf(asset.uri);
    if (isGif(bytes)) {
      // Read once now, so a GIF that does not read is said at once.
      gifFrames(bytes);
      files.write(MY_IMAGE_GIF, bytes);
      files.remove(MY_IMAGE_PHOTO);
    } else {
      const side = Math.min(
        MY_IMAGE_SIDE,
        asset.width > 0 ? asset.width : MY_IMAGE_SIDE,
      );
      files.write(MY_IMAGE_PHOTO, await files.shrink(asset.uri, side));
      files.remove(MY_IMAGE_GIF);
    }
  } catch {
    return { kind: "unreadable" };
  }
  changed();
  const uri = myImageUri(files);
  return uri === null ? { kind: "unreadable" } : { kind: "picked", uri };
}

/** The kept image's bytes as the page takes them: a JPEG as it is, a GIF
 * as its frames. Throws when it cannot be read. */
export function pageImageOf(bytes: Uint8Array): PageImage {
  if (bytes.length === 0) {
    throw new Error("the image is empty");
  }
  if (isGif(bytes)) {
    const gif = gifFrames(bytes);
    return {
      frames: gif.frames.map((rgba) => ({
        width: gif.width,
        height: gif.height,
        rgba: base64OfBytes(rgba),
      })),
      frameMs: gif.frameMs,
    };
  }
  return {
    frames: [{ src: `data:image/jpeg;base64,${base64OfBytes(bytes)}` }],
    frameMs: [0],
  };
}

/**
 * The kept image for the video's page, read once for each image: null
 * with none, or when it does not read, and the video goes out without it.
 * Read from the app's folder only: nothing goes to the network.
 */
export function myImageForPage(
  files: MyImageFiles = PHONE_FILES,
): Promise<PageImage | null> {
  if (read !== null && read.stamp === stamp) {
    return read.image;
  }
  const image = (async () => {
    const uri = myImageUri(files);
    if (uri === null) {
      return null;
    }
    return pageImageOf(await files.bytesOf(uri));
  })().catch(() => null);
  read = { stamp, image };
  return image;
}
