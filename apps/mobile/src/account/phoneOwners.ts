import type { User } from "@shaperoute/shared-types";

import { forgetOutboxOf } from "../activities/outbox";
import { forgetAllSleepOf } from "../activities/sleepOut";
import { BODY_FILE } from "../body/bodyProfile";
import { HEART_FILE } from "../body/heartZones";
import { WEIGH_INS_FILE } from "../body/weighIns";
import { forgetGymOf } from "../gym/gymOutbox";
import { forgetHistoriesOf } from "../gym/gymHistoryCache";
import { forgetPlansOf } from "../gym/plans";
import { forgetWorkoutOf } from "../gym/workoutStore";
import { forgetRunsOf } from "../navigation/trackStore";
import { forgetPoolOf } from "../pool/poolOutbox";
import { forgetPoolSwimOf } from "../pool/poolStore";
import { forgetDrawingsOf } from "../social/drawingOutbox";
import { forgetAllPhotosOf } from "../social/drawingPhotos";
import { forgetPhotoPostsOf } from "../social/photoPostOutbox";
import { forgetVisibilityOf } from "../social/visibilityChoice";
import { keptList } from "../storage/keptList";
import { forgetStravaOf } from "../strava/stravaOutbox";
import { forgetStretchOf } from "../stretchSport/stretchOutbox";
import { forgetWatchRunsOf } from "../watch/watchRuns";
import { forgetOwnedFile } from "./currentOwner";

/**
 * Whose the data waiting on this phone is (TASK-507, ADR-0406). The files
 * of the phone keep their owner as the account's number (User.id), and a
 * number says who someone is only on one server and one database: a
 * database started again gives the same numbers to other people. So the
 * phone also remembers, for each number it has seen, the account's
 * public_id (a UUID the API never gives twice) and the server. When a
 * number comes back as somebody else, or from another server, what waited
 * under it is not of the one signing in: it is let go before anything is
 * sent. On one server a number is never given twice, so there this never
 * happens.
 */

export const PHONE_OWNERS_FILE = "phone-owners.json";

/** The accounts this phone has seen: one line a number. */
export type KnownOwner = { id: number; publicId: string; server: string };

function isKnownOwner(value: unknown): value is KnownOwner {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const item = value as Record<string, unknown>;
  return (
    typeof item.id === "number" &&
    typeof item.publicId === "string" &&
    typeof item.server === "string"
  );
}

const kept = keptList(PHONE_OWNERS_FILE, isKnownOwner);

/** The server as one string: the same address written two ways is one. */
export function serverOf(baseUrl: string): string {
  return baseUrl.trim().replace(/\/+$/, "").toLowerCase();
}

/**
 * Lets go of everything waiting on the phone for the account `owner`: its
 * runs, nights, workouts, swims and stretching sessions not sent, what was
 * to follow them (Strava, drawings, photos, order, outfits, «Public»), its
 * gym plans and the gym history kept, its body, its heart and its
 * weigh-ins, and what it
 * left under way (a run, a workout, a swim, the watch's). For an
 * account deleted, and for a number that now is somebody else's.
 */
export function forgetPhoneDataOf(owner: number): void {
  forgetOutboxOf(owner);
  forgetAllSleepOf(owner);
  forgetStravaOf(owner);
  forgetDrawingsOf(owner);
  forgetVisibilityOf(owner);
  forgetPhotoPostsOf(owner);
  forgetAllPhotosOf(owner);
  forgetGymOf(owner);
  forgetHistoriesOf(owner);
  forgetPlansOf(owner);
  forgetPoolOf(owner);
  forgetStretchOf(owner);
  // Its body and its heart (part D), and its weigh-ins (TASK-489 K1): each
  // account has its own.
  forgetOwnedFile(BODY_FILE, owner);
  forgetOwnedFile(HEART_FILE, owner);
  forgetOwnedFile(WEIGH_INS_FILE, owner);
  // What it left under way (part B): its runs, its workout, its swim and
  // the workouts of its watch, set aside or not.
  forgetRunsOf(owner);
  forgetWorkoutOf(owner);
  forgetPoolSwimOf(owner);
  forgetWatchRunsOf(owner);
}

/**
 * Called as an account is signed in on this phone, before any of its
 * outboxes sends: true when the phone had seen its number as another
 * person, or on another server, and what waited under it was let go. An
 * account seen for the first time takes what waits under its number, as
 * before TASK-507. Without a public_id (an API older than TASK-116) or a
 * server, nothing can be told apart and nothing changes.
 */
export function claimPhoneData(
  user: Pick<User, "id" | "public_id">,
  baseUrl: string | null,
  forget: (owner: number) => void = forgetPhoneDataOf,
): boolean {
  const publicId = user.public_id;
  if (publicId === undefined || publicId === "" || baseUrl === null) {
    return false;
  }
  const server = serverOf(baseUrl);
  const list = kept.load();
  const seen = list.find((item) => item.id === user.id);
  if (seen !== undefined && seen.publicId === publicId && seen.server === server) {
    return false;
  }
  const other = seen !== undefined;
  if (other) {
    forget(user.id);
  }
  kept.save([
    ...list.filter((item) => item.id !== user.id),
    { id: user.id, publicId, server },
  ]);
  return other;
}
