import type { GymSet } from "@shaperoute/shared-types";

import { loadSession } from "../account/sessionStore";
import { appBody, type BodyProfile, NO_BODY } from "../body/bodyProfile";
import { activeKcal } from "../body/energy";
import { isTrackless } from "../activities/snow";
import { findProfile } from "../sports";
import { gymKcal, gymKcalLabel } from "../gym/gymKcal";
import { poolKcal, poolKcalLabel } from "../pool/poolKcal";
import { isShown } from "./feedPosts";
import type { SamplePost } from "./sampleFeed";

/**
 * "355 kcal": about how much energy the activity of a post took (TASK-345,
 * ADR-0298), with each sport's own formula (TASK-374, ADR-0318). The body
 * stays on the phone: one's own posts are counted with it, everyone else's
 * as a body with no data (70 kg). An activity with no metres has none, and
 * neither has a ride or a paddle with no time. A swim in a pool, a swim
 * without a line, has its own (poolKcal.ts, TASK-409 part A); one in open
 * water, a day of cross-country skiing or of ski touring theirs since
 * TASK-424 part C2. A day of alpine skiing counts its descents alone, as
 * the end of the day does: their metres and seconds come with the post
 * (`ski_descents`, TASK-424 part C2b); a day without them, saved before or
 * by a phone that sent no parts, has none.
 */
export function postEnergy(
  post: SamplePost,
  body: BodyProfile = bodyFor(post),
  year: number = new Date().getFullYear(),
): string | null {
  // A workout at the gym has its own (gymPostEnergy).
  const activity = isTrackless(post.activity) ? null : (post.activity ?? "running");
  // A sport newer than the app has no formula here.
  const profile = findProfile(activity ?? undefined);
  if (activity === null || profile === undefined) {
    return null;
  }
  if (profile.skied === true) {
    const descents = post.ski_descents;
    if (descents === undefined) {
      return null;
    }
    const skied = activeKcal(
      { activity, metres: descents.metres, seconds: descents.moving_s, climbM: null },
      body,
      year,
    );
    return skied > 0 ? `${skied} kcal` : null;
  }
  // A swim without a line is in a pool (isPoolLine, pool/PoolTile.tsx).
  if (activity === "swimming" && post.line.length === 0) {
    const seconds = isShown(post) ? post.drawing.duration_s : post.minutes * 60;
    return poolKcalLabel(poolKcal(post.route_m, seconds, body, year));
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
