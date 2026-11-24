import {
  GROUP_NEVER_PUBLIC_SPORT,
  type Group,
  type GroupAccess,
  type GroupRole,
  type LatLon,
} from "@shaperoute/shared-types";
import * as Location from "expo-location";

import { accountProblem } from "../account/messages";
import type { AccountOutcome } from "../api/accounts";
import { sportEmoji, sportName } from "../activities/calendarText";
import { t, tLater } from "../i18n";
import { negativeComment } from "../social/commentText";

/**
 * The words and small helpers of the groups (TASK-495 part B,
 * docs/GRUPPI.md): what the API said, the sports, the way in, the roles.
 */

/** Above «Create», always (EVENTI.md §10, said of groups: the user's
 * choice of 2026-11-24). */
export const GROUP_SAFETY = tLater(
  "Meet in a public place, never at your home. MuW doesn't organise or check groups or their outings. Everyone on MuW is 16 or older.",
);

/** Above «Create» when the group has alpinism (GRUPPI.md §9, approved by
 * the user 2026-11-23). */
export const ALPINISM_SAFETY = tLater(
  "Mountaineering is dangerous. MuW doesn't organise, guide or check groups, outings, routes or difficulty, and isn't a mountain guide. Everyone is responsible for their own experience, gear and safety.",
);

/** The three ways in, as the form and the page say them. */
export const ACCESS_TEXTS: Readonly<Record<GroupAccess, string>> = {
  public: tLater("Public@@group"),
  request: tLater("Request to join"),
  invite: tLater("Invite only"),
};

/** The roles, as the list of members says them; a member says nothing. */
export function roleLabel(role: GroupRole): string | null {
  if (role === "admin") {
    return t("Admin");
  }
  return role === "coadmin" ? t("Co-admin") : null;
}

/** Whether a group with `sports` may be public: never with alpinism. */
export function mayBePublic(sports: readonly string[]): boolean {
  return !sports.includes(GROUP_NEVER_PUBLIC_SPORT);
}

/** «🥾 Hiking · 🚶 Walking»: the sports of a group in the app's language. */
export function sportsLabel(sports: readonly string[]): string {
  return sports.map((sport) => `${sportEmoji(sport)} ${sportName(sport)}`).join(" · ");
}

/** The icon of a group without a photo: its first sport's. */
export function groupIcon(group: Pick<Group, "sports">): string {
  return sportEmoji(group.sports[0] ?? "");
}

/** What an `Image` shows of a group's photo; null without one. */
export function groupPhotoUri(photo: string | null): string | null {
  return photo === null ? null : `data:image/jpeg;base64,${photo}`;
}

/** The API's 404 for a group nobody may see, an id that is not there. */
const NO_GROUP = "No group with this id.";

/**
 * What the API said, as the group's form and page show it. `loading`: the
 * page asked for the group, and a 404 means it is not there to see.
 */
export function groupProblem(
  outcome: AccountOutcome<unknown>,
  loading = false,
): string | null {
  if (outcome.kind === "ok") {
    return null;
  }
  if (outcome.kind === "api_error") {
    // The API's own words: a name too long, five groups, pass the role first.
    if (outcome.code === "invalid_request") {
      return outcome.message;
    }
    if (outcome.code === "comment_rejected") {
      return negativeComment();
    }
    if (outcome.code === "http_error") {
      if (loading || outcome.message === NO_GROUP) {
        return t("This group isn't available.");
      }
      // «Only the group's admin can do this.» and its like.
      return outcome.message.startsWith("Only the group's")
        ? outcome.message
        : t("Something went wrong.");
    }
  }
  return accountProblem(outcome);
}

/**
 * Where the phone was last, without asking for a permission: only when
 * «Draw» has it already. Null otherwise; the form then asks for the city
 * from a list.
 */
export async function knownPoint(): Promise<LatLon | null> {
  try {
    const permission = await Location.getForegroundPermissionsAsync();
    if (!permission.granted) {
      return null;
    }
    const last = await Location.getLastKnownPositionAsync();
    return last === null ? null : [last.coords.latitude, last.coords.longitude];
  } catch {
    return null;
  }
}
