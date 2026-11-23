import {
  OUTFIT_BRAND_MAX_LENGTH,
  OUTFIT_ITEMS,
  OUTFIT_MODEL_MAX_LENGTH,
  OUTFIT_TAGS_IN_POST,
  OUTFIT_TAGS_ON_PHOTO,
  type OutfitItem,
  type OutfitTag,
  type OutfitTagReason,
  type OutfitTagRequest,
} from "@shaperoute/shared-types";

/**
 * The items a member tags on the photos of its own posts (TASK-394 part B,
 * ADR-0333), as the app holds them: what the form checks before the API
 * does, and where a dot stands on a photo drawn at any size. The API has
 * the last word on every link (Web Risk, its list of domains, the word
 * filter): these checks only say at once what it would refuse anyway.
 */

/** An item as the owner tagged it, on the phone and to the API. */
export type OutfitDraft = {
  /** The API's, once it kept it: sent again, the item keeps its counts. */
  id: string | null;
  x: number;
  y: number;
  item: OutfitItem;
  brand: string;
  product_name: string | null;
  url: string | null;
};

export { OUTFIT_TAGS_IN_POST, OUTFIT_TAGS_ON_PHOTO };

/** The longest link the API takes. */
export const OUTFIT_URL_MAX_LENGTH = 1000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFraction(value: unknown): value is number {
  return (
    typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1
  );
}

function isOutfitItem(value: unknown): value is OutfitItem {
  return (OUTFIT_ITEMS as readonly unknown[]).includes(value);
}

function isStringOrNull(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function isCountOrNull(value: unknown): value is number | null {
  return value === null || (typeof value === "number" && value >= 0);
}

/** An item as the API sends it; one of a newer API, with a kind this app
 * does not know, is left out. */
export function isOutfitTag(value: unknown): value is OutfitTag {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    isFraction(value.x) &&
    isFraction(value.y) &&
    isOutfitItem(value.item) &&
    typeof value.brand === "string" &&
    isStringOrNull(value.product_name) &&
    isStringOrNull(value.store) &&
    isStringOrNull(value.url) &&
    typeof value.hidden === "boolean" &&
    isCountOrNull(value.opens) &&
    isCountOrNull(value.shops)
  );
}

/** The items of a photo that this app can show: none from an API before
 * TASK-394. */
export function tagsOfPhoto(photo: { outfit_tags?: unknown }): OutfitTag[] {
  return Array.isArray(photo.outfit_tags) ? photo.outfit_tags.filter(isOutfitTag) : [];
}

export function isOutfitDraft(value: unknown): value is OutfitDraft {
  return (
    isRecord(value) &&
    isStringOrNull(value.id) &&
    isFraction(value.x) &&
    isFraction(value.y) &&
    isOutfitItem(value.item) &&
    typeof value.brand === "string" &&
    isStringOrNull(value.product_name) &&
    isStringOrNull(value.url)
  );
}

/** An item of the API, as its owner changes it: only the owner has its link. */
export function draftOf(tag: OutfitTag): OutfitDraft {
  return {
    id: tag.id,
    x: tag.x,
    y: tag.y,
    item: tag.item,
    brand: tag.brand,
    product_name: tag.product_name,
    url: tag.url,
  };
}

/** What the API takes for an item: the empty fields left out as null. */
export function requestOf(draft: OutfitDraft): OutfitTagRequest {
  const productName = draft.product_name?.trim() ?? "";
  const url = draft.url?.trim() ?? "";
  return {
    ...(draft.id === null ? {} : { id: draft.id }),
    x: draft.x,
    y: draft.y,
    item: draft.item,
    brand: draft.brand.trim(),
    product_name: productName === "" ? null : productName,
    url: url === "" ? null : url,
  };
}

/** The hosts that only send one elsewhere, as the API refuses them
 * (`outfit_links.SHORTENERS`): the commonest, to say so in the form. */
const SHORTENERS: ReadonlySet<string> = new Set([
  "bit.ly",
  "bitly.com",
  "bl.ink",
  "buff.ly",
  "cutt.ly",
  "goo.gl",
  "g.co",
  "is.gd",
  "ow.ly",
  "rb.gy",
  "rebrand.ly",
  "s.id",
  "short.io",
  "shorturl.at",
  "t.co",
  "t.ly",
  "tiny.cc",
  "tinyurl.com",
  "v.gd",
  "lnkd.in",
  "fb.me",
  "amzn.to",
  "amzn.eu",
  "a.co",
  "linktr.ee",
  "l.facebook.com",
  "lm.facebook.com",
  "l.instagram.com",
]);

/** A host on a domain name: no IP address, a dot, letters for its end. */
function isNamedHost(host: string): boolean {
  if (host === "" || host.startsWith("[") || /^[\d.]+$/.test(host)) {
    return false;
  }
  const labels = host.split(".");
  const last = labels[labels.length - 1] ?? "";
  return (
    labels.length > 1 &&
    labels.every((label) => label !== "") &&
    /^[a-z]{2,}$|^xn--/.test(last)
  );
}

/**
 * Why the API would refuse `url` at once, as the form tells it: not an https
 * page on a domain name (with a user, a password, a port or an address), or
 * a shortener; null when it may go, or when there is no link.
 */
export function linkProblem(url: string | null): OutfitTagReason | null {
  const text = url?.trim() ?? "";
  if (text === "") {
    return null;
  }
  const match = /^https:\/\/([^/?#]*)/i.exec(text);
  if (match === null || /\s/.test(text)) {
    return "not_https";
  }
  const authority = match[1] ?? "";
  if (authority.includes("@") || authority.includes(":")) {
    return "not_https";
  }
  const host = authority.toLowerCase().replace(/\.$/, "");
  if (!isNamedHost(host)) {
    return "not_https";
  }
  const parents = host.split(".").map((_, i, labels) => labels.slice(i).join("."));
  return parents.some((parent) => SHORTENERS.has(parent)) ? "shortened" : null;
}

/** An address written in the brand or the model: the link has its box. */
export function hasAddress(text: string | null): boolean {
  if (text === null) {
    return false;
  }
  return /[a-z][a-z0-9+.-]*:\/\/|\bwww\.|\b[\w-]+\.(com|net|org|it|de|fr|es|eu|uk|us|io|co|ly|shop|store|app|link)\b/i.test(
    text,
  );
}

/** Why the form cannot add `draft` as it is; null when it can. A brand is
 * needed (the user's choice 3: the item and the brand, the rest optional). */
export function draftProblem(draft: OutfitDraft): OutfitTagReason | null {
  if (hasAddress(draft.brand) || hasAddress(draft.product_name)) {
    return "link_in_text";
  }
  return linkProblem(draft.url);
}

/** The brand can be added: written, and within its length. */
export function brandReady(brand: string): boolean {
  const text = brand.trim();
  return text !== "" && text.length <= OUTFIT_BRAND_MAX_LENGTH;
}

export { OUTFIT_BRAND_MAX_LENGTH, OUTFIT_MODEL_MAX_LENGTH };

/** Why one more item cannot go on a photo with `onPhoto` of them, in a
 * post with `inPost`; null when it can. */
export function roomProblem(onPhoto: number, inPost: number): OutfitTagReason | null {
  if (onPhoto >= OUTFIT_TAGS_ON_PHOTO) {
    return "too_many_on_photo";
  }
  if (inPost >= OUTFIT_TAGS_IN_POST) {
    return "too_many_in_post";
  }
  return null;
}

/** Where a photo of `width` × `height` lies in a box, in points. */
export type PhotoFrame = { left: number; top: number; width: number; height: number };

/**
 * The photo in the box as it is drawn: `cover` fills the box and cuts what
 * goes past it (the pages of the Feed), `contain` shows it whole (the form).
 */
export function photoFrame(
  box: { width: number; height: number },
  photo: { width: number; height: number },
  fit: "cover" | "contain",
): PhotoFrame {
  const ratioW = box.width / Math.max(photo.width, 1);
  const ratioH = box.height / Math.max(photo.height, 1);
  const scale = fit === "cover" ? Math.max(ratioW, ratioH) : Math.min(ratioW, ratioH);
  const width = photo.width * scale;
  const height = photo.height * scale;
  return {
    left: (box.width - width) / 2,
    top: (box.height - height) / 2,
    width,
    height,
  };
}

/** Where the item at `x`, `y` (0–1 of the photo) stands in the box. */
export function pointIn(
  frame: PhotoFrame,
  x: number,
  y: number,
): { left: number; top: number } {
  return { left: frame.left + x * frame.width, top: frame.top + y * frame.height };
}

function clamp(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/** The place on the photo (0–1) of a point of the box, kept on the photo. */
export function pointOn(
  frame: PhotoFrame,
  left: number,
  top: number,
): { x: number; y: number } {
  return {
    x: clamp((left - frame.left) / Math.max(frame.width, 1)),
    y: clamp((top - frame.top) / Math.max(frame.height, 1)),
  };
}

/** A point of the box that a dot can be seen at: inside the box. */
export function inBox(
  box: { width: number; height: number },
  point: { left: number; top: number },
): boolean {
  return (
    point.left >= 0 &&
    point.top >= 0 &&
    point.left <= box.width &&
    point.top <= box.height
  );
}

/** The totals of the author's items on a post; null for anyone else, who
 * never has them (the user's choice 5). */
export function totalsOf(
  tags: readonly OutfitTag[],
): { opens: number; shops: number } | null {
  const mine = tags.filter((tag) => tag.opens !== null && tag.shops !== null);
  if (mine.length === 0) {
    return null;
  }
  return {
    opens: mine.reduce((sum, tag) => sum + (tag.opens ?? 0), 0),
    shops: mine.reduce((sum, tag) => sum + (tag.shops ?? 0), 0),
  };
}

/** The items of an owner: the API sends the totals only to it. */
export function isOwnersTag(tag: OutfitTag): boolean {
  return tag.opens !== null;
}
