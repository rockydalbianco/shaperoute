import { Asset } from "expo-asset";
import { File } from "expo-file-system";

import { t } from "../i18n";

/**
 * The animal that runs the route in a run's video (TASK-408, ADR-0339): a
 * low-poly 3D model drawn by three.js in the video's page, at the tip of the
 * line as it draws, turned along it. The models are Quaternius's «Ultimate
 * Animated Animals» (CC0), cut to their gallop and their rest by
 * `out/TASK-408/shrink.mjs`, each a `.glb` stored in a `.zip`: Metro bundles
 * a zip as it is, and a glb not at all.
 */

/** The animals, in the order «Share your run» shows them. */
export const CHARACTERS = [
  "horse",
  "white_horse",
  "stag",
  "deer",
  "fox",
  "wolf",
  "husky",
  "shiba",
  "cow",
  "bull",
  "donkey",
  "alpaca",
] as const;

export type Character = (typeof CHARACTERS)[number];

const FILES: Record<Character, number> = {
  horse: require("../../assets/characters/horse.zip"),
  white_horse: require("../../assets/characters/white_horse.zip"),
  stag: require("../../assets/characters/stag.zip"),
  deer: require("../../assets/characters/deer.zip"),
  fox: require("../../assets/characters/fox.zip"),
  wolf: require("../../assets/characters/wolf.zip"),
  husky: require("../../assets/characters/husky.zip"),
  shiba: require("../../assets/characters/shiba.zip"),
  cow: require("../../assets/characters/cow.zip"),
  bull: require("../../assets/characters/bull.zip"),
  donkey: require("../../assets/characters/donkey.zip"),
  alpaca: require("../../assets/characters/alpaca.zip"),
};

/** The emoji on the animal's tile. */
export function characterEmoji(character: Character): string {
  switch (character) {
    case "horse":
    case "white_horse":
      return "🐎";
    case "stag":
    case "deer":
      return "🦌";
    case "fox":
      return "🦊";
    case "wolf":
      return "🐺";
    case "husky":
      return "🐕";
    case "shiba":
      return "🐕";
    case "cow":
      return "🐄";
    case "bull":
      return "🐂";
    case "donkey":
      return "🫏";
    case "alpaca":
      return "🦙";
  }
}

/** The animal's name, in the app's language (texts of TASK-408, choice 10). */
export function characterName(character: Character): string {
  switch (character) {
    case "horse":
      return t("Horse");
    case "white_horse":
      return t("White horse");
    case "stag":
      return t("Stag");
    case "deer":
      return t("Deer");
    case "fox":
      return t("Fox");
    case "wolf":
      return t("Wolf");
    case "husky":
      return t("Husky");
    case "shiba":
      return t("Shiba Inu");
    case "cow":
      return t("Cow");
    case "bull":
      return t("Bull");
    case "donkey":
      return t("Donkey");
    case "alpaca":
      return t("Alpaca");
  }
}

/** A zip's local file header starts with these bytes ("PK\x03\x04"). */
const ZIP_LOCAL = 0x04034b50;
/** The fixed part of the header, before the file's name. */
const ZIP_HEADER = 30;

/**
 * The first file of a zip whose files are stored, not compressed, as the
 * app's models are (`zip -0`): its bytes, after the header and the name.
 * Throws on anything else, so a broken model leaves the video without the
 * animal rather than with a wrong one.
 */
export function storedFileOf(zip: Uint8Array): Uint8Array {
  if (zip.length < ZIP_HEADER) {
    throw new Error("not a zip");
  }
  const view = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
  if (view.getUint32(0, true) !== ZIP_LOCAL) {
    throw new Error("not a zip");
  }
  const flags = view.getUint16(6, true);
  const method = view.getUint16(8, true);
  if (method !== 0 || (flags & 0x8) !== 0) {
    throw new Error("the model is not stored");
  }
  const size = view.getUint32(18, true);
  const start = ZIP_HEADER + view.getUint16(26, true) + view.getUint16(28, true);
  if (start + size > zip.length) {
    throw new Error("the zip is cut short");
  }
  return zip.subarray(start, start + size);
}

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

/** Bytes as base64, for the page: Hermes has no btoa for bytes. */
export function base64OfBytes(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i];
    const b = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const c = i + 2 < bytes.length ? bytes[i + 2] : 0;
    const n = (a << 16) | (b << 8) | c;
    out += ALPHABET[(n >> 18) & 63] + ALPHABET[(n >> 12) & 63];
    out += i + 1 < bytes.length ? ALPHABET[(n >> 6) & 63] : "=";
    out += i + 2 < bytes.length ? ALPHABET[n & 63] : "=";
  }
  return out;
}

/** The animal's model, its `.glb` bytes, from the app's own file of it. */
export async function characterModel(character: Character): Promise<Uint8Array> {
  const asset = Asset.fromModule(FILES[character]);
  await asset.downloadAsync();
  if (asset.localUri === null) {
    throw new Error("the model's file is not on the phone");
  }
  return storedFileOf(await new File(asset.localUri).bytes());
}
