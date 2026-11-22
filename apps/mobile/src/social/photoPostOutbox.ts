import { File, Paths } from "expo-file-system";

import type { AccountOutcome } from "../api/accounts";
import { worthAgain } from "../api/drawings";
import {
  type PhotoPostChoice,
  isPhotoPostVisibility,
  removePhotoPost,
  removePhotoPostPhoto,
  savePhotoPost,
  savePhotoPostOrder,
  savePhotoPostPhoto,
} from "../api/photoPosts";
import { keptList } from "../storage/keptList";

/**
 * The posts of photos only not on the API yet (TASK-312 part C2), in a file
 * of their own: a post made, changed or deleted without a network goes when
 * the app next has one. Each belongs to the account signed in when it was
 * posted. Its photos wait each in a file of their own, already shrunk, as
 * the photos of a run (drawingPhotos.ts), and leave the phone once the API
 * has them: unlike a run's, a post of photos only is always seen by others,
 * so its photos are kept on the server, not here (ADR-0170).
 *
 * The order of a send is the API's: the post, then its photos (the first
 * publishes it), then the places emptied, then the order. A post the API
 * refuses (422) stays here, marked, and is not sent again.
 */

export const PHOTO_POST_OUTBOX_FILE = "photo-post-outbox.json";
/** The files of the photos start with this: one per photo. */
export const PHOTO_POST_PHOTO_PREFIX = "photo-post-photo-";
/** The posts of one account the phone holds. */
export const MAX_PHOTO_POSTS_WAITING = 20;

export type PhotoPostWaiting = {
  /** The account it belongs to (User.id). */
  owner: number;
  /** The key the phone made for it (gymKey). */
  key: string;
  /** The post as it should be: every field, every time. */
  choice: PhotoPostChoice;
  /** The places whose photo is in a file here, not on the API yet. */
  photos: number[];
  /** The places to empty on the API. */
  removed: number[];
  /** The order to send, `photo:2`…; null: none chosen since last sent. */
  order: string[] | null;
  /** Deleted on this phone: the API is to delete it too. */
  deleted?: boolean;
  /** The API will not take it: it is not sent again. */
  refused?: { code: string; message: string };
};

function isNumbers(value: unknown): value is number[] {
  return Array.isArray(value) && value.every((n) => typeof n === "number");
}

function isChoice(value: unknown): value is PhotoPostChoice {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const item = value as Record<string, unknown>;
  return (
    (item.title === null || typeof item.title === "string") &&
    (item.description === null || typeof item.description === "string") &&
    isPhotoPostVisibility(item.visibility) &&
    Array.isArray(item.tags) &&
    item.tags.every((tag) => typeof tag === "string")
  );
}

function isPhotoPostWaiting(value: unknown): value is PhotoPostWaiting {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const item = value as Record<string, unknown>;
  return (
    typeof item.owner === "number" &&
    typeof item.key === "string" &&
    isChoice(item.choice) &&
    isNumbers(item.photos) &&
    isNumbers(item.removed) &&
    (item.order === null ||
      (Array.isArray(item.order) && item.order.every((o) => typeof o === "string")))
  );
}

// Written so that a write cut short loses no post that was there (TASK-252).
const kept = keptList(PHOTO_POST_OUTBOX_FILE, isPhotoPostWaiting);

function photoFile(owner: number, key: string, n: number): File {
  return new File(Paths.document, `${PHOTO_POST_PHOTO_PREFIX}${owner}-${key}-${n}.b64`);
}

function writeFile(file: File, base64: string): boolean {
  try {
    file.create({ overwrite: true });
    file.write(base64);
    return true;
  } catch {
    return false;
  }
}

function readFile(file: File): string | null {
  try {
    return file.exists ? file.textSync() : null;
  } catch {
    return null;
  }
}

function deleteFile(file: File): void {
  try {
    if (file.exists) {
      file.delete();
    }
  } catch {
    // A file that will not go leaves a photo behind, nothing worse.
  }
}

function same(item: PhotoPostWaiting, owner: number, key: string): boolean {
  return item.owner === owner && item.key === key;
}

export function loadPhotoPostOutbox(): PhotoPostWaiting[] {
  return kept.load();
}

/** The post of `owner` with `key` still on this phone, if any. */
export function waitingPost(owner: number, key: string): PhotoPostWaiting | null {
  return kept.load().find((item) => same(item, owner, key)) ?? null;
}

/** What a change of a post did: kept, too many waiting, or the phone
 * refused a file. */
export type PhotoPostKept = "kept" | "full" | "not_written";

/** A change of a post: the post whole, the photos added (place and JPEG in
 * base64), the places emptied, and the order when it changed. */
export type PhotoPostChange = {
  owner: number;
  key: string;
  choice: PhotoPostChoice;
  added: { n: number; base64: string }[];
  removed: number[];
  order: string[] | null;
};

/**
 * Keeps a change of a post until the API has it: on top of any change of
 * the same post still waiting, whose photos and emptied places it adds to.
 * A post marked refused is tried again with the change.
 */
export function keepPhotoPost(change: PhotoPostChange): PhotoPostKept {
  const list = kept.load();
  const before = list.find((item) => same(item, change.owner, change.key));
  if (
    before === undefined &&
    list.filter((item) => item.owner === change.owner).length >= MAX_PHOTO_POSTS_WAITING
  ) {
    return "full";
  }
  for (const photo of change.added) {
    if (!writeFile(photoFile(change.owner, change.key, photo.n), photo.base64)) {
      return "not_written";
    }
  }
  const addedPlaces = change.added.map((photo) => photo.n);
  const removed = change.removed.filter((n) => !addedPlaces.includes(n));
  for (const n of removed) {
    deleteFile(photoFile(change.owner, change.key, n));
  }
  const photos = [
    ...(before?.photos ?? []).filter(
      (n) => !removed.includes(n) && !addedPlaces.includes(n),
    ),
    ...addedPlaces,
  ];
  const next: PhotoPostWaiting = {
    owner: change.owner,
    key: change.key,
    choice: change.choice,
    photos,
    removed: [
      ...(before?.removed ?? []).filter((n) => !addedPlaces.includes(n)),
      ...removed.filter((n) => !(before?.removed ?? []).includes(n)),
    ],
    order: change.order ?? before?.order ?? null,
  };
  return kept.save([...list.filter((item) => item !== before), next])
    ? "kept"
    : "not_written";
}

/** Marks the post `key` of `owner` as deleted here: the API is told, and
 * its photos still waiting leave the phone now. */
export function keepPhotoPostDeleted(owner: number, key: string): boolean {
  const list = kept.load();
  const before = list.find((item) => same(item, owner, key));
  for (const n of before?.photos ?? []) {
    deleteFile(photoFile(owner, key, n));
  }
  const gone: PhotoPostWaiting = {
    owner,
    key,
    choice: before?.choice ?? {
      title: null,
      description: null,
      visibility: "everyone",
      tags: [],
    },
    photos: [],
    removed: [],
    order: null,
    deleted: true,
  };
  return kept.save([...list.filter((item) => item !== before), gone]);
}

/** The JPEG in base64 of a photo still waiting, to show it. */
export function waitingPhoto(owner: number, key: string, n: number): string | null {
  return readFile(photoFile(owner, key, n));
}

function stop(owner: number, key: string): void {
  const list = kept.load();
  const next = list.filter((item) => !same(item, owner, key));
  if (next.length !== list.length) {
    kept.save(next);
  }
}

function update(
  owner: number,
  key: string,
  change: (item: PhotoPostWaiting) => PhotoPostWaiting,
): void {
  const list = kept.load();
  kept.save(list.map((item) => (same(item, owner, key) ? change(item) : item)));
}

/** Forgets every post waiting of `owner` and their photos: its account was
 * deleted, or signed out for good. */
export function forgetPhotoPostsOf(owner: number): void {
  const list = kept.load();
  for (const item of list.filter((other) => other.owner === owner)) {
    for (const n of item.photos) {
      deleteFile(photoFile(owner, item.key, n));
    }
  }
  kept.save(list.filter((item) => item.owner !== owner));
}

type Options = { fetchFn?: typeof fetch };

/** What a round of sending did: something reached the API, and whether it
 * stopped for want of a network. */
export type PhotoPostsSent = { sent: boolean; stopped: boolean };

function refusal(
  outcome: AccountOutcome<unknown>,
): { code: string; message: string } | null {
  return outcome.kind === "api_error" && outcome.code === "invalid_request"
    ? { code: outcome.code, message: outcome.message }
    : null;
}

/**
 * Sends the posts of `owner` still waiting, the oldest first: deleted ones
 * are deleted; the others go whole, then their photos one by one, the
 * places emptied, the order. A post stops at the first call that may work
 * later (no network, the API busy): the rest waits for the next round.
 */
export async function sendWaitingPhotoPosts(
  url: string,
  token: string,
  owner: number,
  options: Options = {},
): Promise<PhotoPostsSent> {
  let sent = false;
  const waiting = kept
    .load()
    .filter((item) => item.owner === owner && item.refused === undefined);
  for (const item of waiting) {
    if (item.deleted === true) {
      const gone = await removePhotoPost(url, token, item.key, options);
      if (gone.kind !== "ok" && worthAgain(gone)) {
        return { sent, stopped: true };
      }
      stop(owner, item.key);
      sent = true;
      continue;
    }
    const post = await savePhotoPost(url, token, item.key, item.choice, options);
    const refused = refusal(post);
    if (refused !== null) {
      update(owner, item.key, (other) => ({ ...other, refused }));
      continue;
    }
    if (post.kind !== "ok") {
      if (worthAgain(post)) {
        return { sent, stopped: true };
      }
      continue;
    }
    for (const n of item.photos) {
      const base64 = readFile(photoFile(owner, item.key, n));
      if (base64 !== null) {
        const photo = await savePhotoPostPhoto(
          url,
          token,
          item.key,
          n,
          base64,
          options,
        );
        if (photo.kind !== "ok" && worthAgain(photo)) {
          return { sent, stopped: true };
        }
      }
      // Sent, refused (not a picture) or lost: it waits no more.
      deleteFile(photoFile(owner, item.key, n));
      update(owner, item.key, (other) => ({
        ...other,
        photos: other.photos.filter((place) => place !== n),
      }));
    }
    for (const n of item.removed) {
      const emptied = await removePhotoPostPhoto(url, token, item.key, n, options);
      if (emptied.kind !== "ok" && worthAgain(emptied)) {
        return { sent, stopped: true };
      }
      update(owner, item.key, (other) => ({
        ...other,
        removed: other.removed.filter((place) => place !== n),
      }));
    }
    if (item.order !== null) {
      const ordered = await savePhotoPostOrder(
        url,
        token,
        item.key,
        item.order,
        options,
      );
      if (ordered.kind !== "ok" && worthAgain(ordered)) {
        return { sent, stopped: true };
      }
    }
    // A change made while this one went stays for the next round, whole:
    // sending it again changes nothing the API has already.
    const now = waitingPost(owner, item.key);
    if (
      now !== null &&
      now.photos.length === 0 &&
      now.removed.length === 0 &&
      JSON.stringify([now.choice, now.order]) ===
        JSON.stringify([item.choice, item.order])
    ) {
      stop(owner, item.key);
    }
    sent = true;
  }
  return { sent, stopped: false };
}
