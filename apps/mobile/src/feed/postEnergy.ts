import type { GymSet } from "@shaperoute/shared-types";

import { loadSession } from "../account/sessionStore";
import { appBody, type BodyProfile, NO_BODY } from "../body/bodyProfile";
import { activeKcal } from "../body/energy";
import { isOnSnow, isTrackless } from "../activities/snow";
import { gymKcal, gymKcalLabel } from "../gym/gymKcal";
import type { SamplePost } from "./sampleFeed";

/**
 * "355 kcal": about how much energy the activity of a post took (TASK-345,
 * ADR-0298), with each sport's own formula (TASK-374, ADR-0318). The body
 * stays on the phone: one's own posts are counted with it, everyone else's
 * as a body with no data (70 kg). An activity with no metres has none, and
 * neither has a ride or a paddle with no time.
 */
export function postEnergy(
  post: SamplePost,
  body: BodyProfile = bodyFor(post),
  year: number = new Date().getFullYear(),
): string | null {
  // A day on the snow has no estimate yet (TASK-375 part C); a workout at
  // the gym has its own (gymPostEnergy).
  const activity =
    isOnSnow(post.activity) || isTrackless(post.activity)
      ? null
      : (post.activity ?? "running");
  if (activity === null) {
    return null;
  }
  const energy = activeKcal(
    {
      activity,
      metres: post.route_m,
      seconds: post.minutes > 0 ? post.minutes * 60 : null,
      climbM: null,
    },
    body,
    year,
  );
  return energy > 0 ? `${energy} kcal` : null;
}

/**
 * "184 kcal" for a workout at the gym (TASK-385 part C, ADR-0327), from
 * its sets; none without them: whoever hides them from others shows no
 * energy either (the user's «Niente kcal», 2026-11-06), since a number
 * without the cardio would not be the one its owner sees.
 */
export function gymPostEnergy(
  post: SamplePost,
  sets: readonly GymSet[] | null | undefined,
  body: BodyProfile = bodyFor(post),
  year: number = new Date().getFullYear(),
): string | null {
  if (sets === null || sets === undefined || !(post.minutes > 0)) {
    return null;
  }
  return gymKcalLabel(gymKcal(sets, post.minutes * 60, body, year));
}

/** The phone's body for a post of whoever is signed in; none for another's. */
function bodyFor(post: SamplePost): BodyProfile {
  return loadSession()?.user.username === post.user ? appBody() : NO_BODY;
}
