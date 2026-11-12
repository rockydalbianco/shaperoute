import type {
  GymPlan,
  GymPlanItem,
  GymPlanRequest,
  GymPlanRun,
  GymPlanRunner,
} from "@shaperoute/shared-types";
import { useCallback, useEffect, useSyncExternalStore } from "react";

import { useActivitiesDoor } from "../activities/activitiesDoor";
import { dropGymPlan, fetchGymPlans, isGymPlan, saveGymPlan } from "../api/gymPlans";
import { useFollowsDoor } from "../social/followsDoor";
import { keptList } from "../storage/keptList";
import { gymKey } from "./gymKey";
import { sessionOn } from "./program";
import type { WorkoutPlan } from "./workout";

/**
 * The plans of the gym on the phone (TASK-411 C, ADR-0341 point 3): each
 * account's, in a file of the app's documents, so they are there without a
 * network; a change waits there until the API has it, a plan dropped too.
 * The API's list, when it comes, replaces the ones it has a newer change
 * of; a change of this phone not sent yet stays.
 */

export const PLANS_FILE = "gym-plans.json";

export type KeptPlan = GymPlan & {
  owner: number;
  /** «sent»: the API has it as it is here; «waiting»: changed here, not
   * sent yet; «dropped»: dropped here, the API not told yet. */
  state: "sent" | "waiting" | "dropped";
};

function isKeptPlan(value: unknown): value is KeptPlan {
  if (!isGymPlan(value)) {
    return false;
  }
  const { owner, state } = value as unknown as Record<string, unknown>;
  return (
    typeof owner === "number" &&
    (state === "sent" || state === "waiting" || state === "dropped")
  );
}

const kept = keptList(PLANS_FILE, isKeptPlan);
const listeners = new Set<() => void>();
let all: KeptPlan[] | null = null;
// The account whose plans «Start workout» follows: the last one shown.
let shownOwner: number | null = null;

function everything(): KeptPlan[] {
  if (all === null) {
    all = kept.load();
  }
  return all;
}

function put(next: KeptPlan[]): void {
  all = next;
  kept.save(next);
  for (const listener of listeners) {
    listener();
  }
}

function byOrder(a: GymPlan, b: GymPlan): number {
  return a.position - b.position || a.key.localeCompare(b.key);
}

/** The plans of `owner`, in their order, without the dropped ones. */
export function plansOf(owner: number): KeptPlan[] {
  return everything()
    .filter((plan) => plan.owner === owner && plan.state !== "dropped")
    .sort(byOrder);
}

/** A plan made or changed here: kept, waiting for the API. */
export function keepPlan(
  owner: number,
  key: string | null,
  plan: Omit<GymPlanRequest, "updated_at" | "position">,
  nowMs: number = Date.now(),
): KeptPlan {
  const others = everything().filter(
    (one) => !(one.owner === owner && one.key === key),
  );
  const before = everything().find((one) => one.owner === owner && one.key === key);
  const position =
    before?.position ??
    Math.min(
      100,
      plansOf(owner).reduce((last, one) => Math.max(last, one.position + 1), 0),
    );
  const next: KeptPlan = {
    ...plan,
    key: key ?? gymKey(nowMs),
    position,
    updated_at: new Date(nowMs).toISOString(),
    owner,
    state: "waiting",
  };
  put([...others, next]);
  return next;
}

/** A plan dropped here: gone from the list, waiting to tell the API. */
export function dropPlan(owner: number, key: string): void {
  put(
    everything().map((one) =>
      one.owner === owner && one.key === key ? { ...one, state: "dropped" } : one,
    ),
  );
}

/** The API's list for `owner`: a plan this phone has not changed since
 * comes as the API has it; one the API no longer has, and this phone has
 * not changed, is gone. */
export function mergePlans(owner: number, remote: GymPlan[]): void {
  const mine = everything().filter((one) => one.owner === owner);
  const others = everything().filter((one) => one.owner !== owner);
  const local = new Map(mine.map((one) => [one.key, one]));
  const merged: KeptPlan[] = [];
  for (const plan of remote) {
    const here = local.get(plan.key);
    local.delete(plan.key);
    if (
      here !== undefined &&
      here.state !== "sent" &&
      here.updated_at >= plan.updated_at
    ) {
      merged.push(here);
    } else {
      merged.push({ ...plan, owner, state: "sent" });
    }
  }
  // Not on the API: only what waits to go up stays.
  for (const here of local.values()) {
    if (here.state === "waiting") {
      merged.push(here);
    }
  }
  put([...others, ...merged]);
}

function sent(owner: number, plan: GymPlan): void {
  put(
    everything().map((one) =>
      one.owner === owner && one.key === plan.key && one.state === "waiting"
        ? { ...plan, owner, state: "sent" }
        : one,
    ),
  );
}

function forget(owner: number, key: string): void {
  put(everything().filter((one) => !(one.owner === owner && one.key === key)));
}

let syncing = false;

/** The API's plans in, then what waits here out; quiet when the API cannot
 * be reached or has no plans yet (404 before part C). */
export async function syncPlans(
  apiUrl: string,
  token: string,
  owner: number,
  fetchFn?: typeof fetch,
): Promise<void> {
  if (syncing) {
    return;
  }
  syncing = true;
  const options = { fetchFn };
  try {
    const list = await fetchGymPlans(apiUrl, token, options);
    if (list.kind !== "ok") {
      return;
    }
    mergePlans(owner, list.value.plans);
    for (const plan of everything().filter((one) => one.owner === owner)) {
      if (plan.state === "dropped") {
        const outcome = await dropGymPlan(apiUrl, token, plan.key, options);
        if (outcome.kind === "ok") {
          forget(owner, plan.key);
        }
      } else if (plan.state === "waiting") {
        const { key, owner: _owner, state: _state, ...request } = plan;
        const outcome = await saveGymPlan(apiUrl, token, key, request, options);
        if (outcome.kind === "ok") {
          sent(owner, outcome.value);
        }
      }
    }
  } finally {
    syncing = false;
  }
}

/** The ISO day of the week of `date`: 1 Monday to 7 Sunday. */
export function isoDay(date: Date): number {
  return ((date.getDay() + 6) % 7) + 1;
}

/** Today's workout of a plan: for a plan made with the guide, the one of
 * this week of its cycle, its values worked out (program.ts). */
export type TodayWorkout = {
  /** The plan's key, which the workout keeps. */
  key: string;
  /** The plan's name. */
  plan: string;
  /** The workout's: the plan's, or the guide's workout of the day. */
  name: string;
  items: GymPlanItem[];
  /** The week of the cycle and how many, for a plan with weeks. */
  week: number | null;
  weeks: number | null;
  /** The rest of the plan's goal, for a plan made with the guide. */
  restS?: number;
  /** A run day (TASK-433 C): the run of this week, and no exercises. */
  run?: GymPlanRun;
  /** How the plan's owner runs (TASK-452), for the run's pace. */
  runner?: GymPlanRunner;
};

function todayOf(plan: GymPlan, date: Date): TodayWorkout | null {
  if (plan.program != null) {
    const found = sessionOn(plan.program, date);
    if (
      found === null ||
      (found.session.items.length === 0 && found.session.run === undefined)
    ) {
      return null;
    }
    return {
      key: plan.key,
      plan: plan.name,
      name: found.session.name,
      items: found.session.items,
      week: plan.program.weeks > 1 ? found.week : null,
      weeks: plan.program.weeks > 1 ? plan.program.weeks : null,
      ...(plan.program.rest_s === undefined ? {} : { restS: plan.program.rest_s }),
      ...(found.session.run === undefined ? {} : { run: found.session.run }),
      ...(plan.program.runner === undefined ? {} : { runner: plan.program.runner }),
    };
  }
  if (!plan.days.includes(isoDay(date)) || plan.items.length === 0) {
    return null;
  }
  return {
    key: plan.key,
    plan: plan.name,
    name: plan.name,
    items: plan.items,
    week: null,
    weeks: null,
  };
}

/** «Today: Push» (ADR-0341 point 5): the workout of the first plan, in
 * order, with one today; null when none has. */
export function todayPlan(
  plans: GymPlan[],
  date: Date = new Date(),
): TodayWorkout | null {
  for (const plan of plans) {
    const today = todayOf(plan, date);
    if (today !== null) {
      return today;
    }
  }
  return null;
}

/** What a workout copies of today's workout of a plan. */
export function workoutPlan(
  plan: Pick<TodayWorkout, "key" | "name" | "items" | "restS">,
): WorkoutPlan {
  return {
    key: plan.key,
    name: plan.name,
    items: plan.items,
    ...(plan.restS === undefined ? {} : { restS: plan.restS }),
  };
}

/** The plan «Start workout» follows now: today's of the account last
 * shown; null for a free workout. */
export function planForToday(date: Date = new Date()): WorkoutPlan | null {
  if (shownOwner === null) {
    return null;
  }
  const today = todayPlan(plansOf(shownOwner), date);
  // A run day is not a workout of the gym: «Start workout» is a free one.
  return today === null || today.run !== undefined ? null : workoutPlan(today);
}

/** For the tests: the file read again, nobody shown. */
export function forgetPlans(): void {
  all = null;
  shownOwner = null;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * The account's plans, kept up to date with the API while shown; null
 * owner signed out. `keep` and `drop` change them here and send them.
 */
export function useGymPlans(fetchFn?: typeof fetch): {
  owner: number | null;
  plans: KeptPlan[];
  keep: (
    key: string | null,
    plan: Omit<GymPlanRequest, "updated_at" | "position">,
  ) => void;
  drop: (key: string) => void;
} {
  const { apiUrl, account } = useFollowsDoor();
  const owner = useActivitiesDoor().owner ?? null;
  const token =
    account.state.status === "signedIn" ? account.state.session.token : null;
  const list = useSyncExternalStore(subscribe, everything, everything);
  const plans =
    owner === null
      ? []
      : list
          .filter((plan) => plan.owner === owner && plan.state !== "dropped")
          .sort(byOrder);

  const sync = useCallback(() => {
    if (apiUrl !== null && token !== null && owner !== null) {
      void syncPlans(apiUrl, token, owner, fetchFn);
    }
  }, [apiUrl, token, owner, fetchFn]);

  useEffect(() => {
    shownOwner = owner;
    sync();
  }, [owner, sync]);

  return {
    owner,
    plans,
    keep: (key, plan) => {
      if (owner !== null) {
        keepPlan(owner, key, plan);
        sync();
      }
    },
    drop: (key) => {
      if (owner !== null) {
        dropPlan(owner, key);
        sync();
      }
    },
  };
}
