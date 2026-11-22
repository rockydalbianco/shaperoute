/**
 * A gym plan as a post (TASK-485, ADR-0394, docs/API.md «Plan posts»).
 * Mirrors services/api/shaperoute_api/plan_posts.py and
 * gym_plans.GymPlanPostedBody.
 *
 * Shared from the Feed's «+» («Workout plan»): a drawing without a run that
 * carries a copy of the plan as it was when it was posted. Sent again, the
 * post keeps that copy and only its line and who sees it change; changing
 * or deleting the plan leaves the post as it was. Only an app that says
 * `plans` in X-MuW-Reads receives one (reads.json), in GET /feed, GET
 * /users/{id}/drawings and GET /drawings/{id}: `source` is `plan`, the copy
 * is in `plan`, and it has no activity, no line and no photos. «Use this
 * plan» copies it into one's own plans with PUT /me/gym-plans/{key}: no
 * route of its own.
 */

import type { GymPlanItem, GymPlanTarget, GymProgram } from "./gym.ts";

/** `source` of a gym plan posted, and the value said in X-MuW-Reads. */
export const PLAN_SOURCE = "plan" as const;
/** The value an app says in X-MuW-Reads to receive the plans posted. */
export const PLANS_READ = "plans" as const;
/** Never «Only me». */
export const PLAN_POST_VISIBILITIES = ["everyone", "followers"] as const;
export type PlanPostVisibility = (typeof PLAN_POST_VISIBILITIES)[number];

/** The target of a plan posted: never its date, which is its owner's;
 * whoever copies it starts when ready. Sent, 422. */
export type GymPlanPostedTarget = Omit<GymPlanTarget, "on">;

/** The weeks of a plan posted: never its first day (`starts_on`) nor its
 * owner's paces (`runner`). Sent, 422. */
export interface GymPlanPostedProgram
  extends Omit<GymProgram, "starts_on" | "runner" | "target"> {
  target?: GymPlanPostedTarget;
}

/** A plan as a post shows it, and as «Use this plan» copies it: its name,
 * days, exercises with their kg and its weeks. */
export interface GymPlanPosted {
  /** 1–40 characters. */
  name: string;
  /** The days of the week it is for, 1 Monday to 7 Sunday. */
  days: number[];
  /** At most 30, in order. */
  items: GymPlanItem[];
  /** Its weeks, when made with the guide. */
  program?: GymPlanPostedProgram;
}

/** PUT /me/plan-posts/{key}: the post as it should be now, the key made by
 * the phone as a run's; made and published the first time.
 * fixtures/plan-post-request.json. */
export interface PlanPostRequest {
  /** Kept the first time only: sent again, the post keeps the plan it was
   * made with. */
  plan: GymPlanPosted;
  /** Its owner's line, at most 500 characters; null or empty: none. */
  description?: string | null;
  visibility: PlanPostVisibility;
}

/** A plan posted as its owner has it: GET and PUT /me/plan-posts/{key};
 * 404 without one. fixtures/my-plan-post.json. */
export interface MyPlanPost {
  key: string;
  /** What the others open it with: GET /drawings/{id}. */
  id: string;
  description: string | null;
  visibility: PlanPostVisibility;
  published_at: string;
  /** As it was posted. */
  plan: GymPlanPosted;
}
