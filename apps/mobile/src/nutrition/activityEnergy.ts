import { isTrackless } from "../activities/snow";
import type { Activity } from "../api/activities";
import type { BodyProfile } from "../body/bodyProfile";
import { activeKcal, DEFAULT_WEIGHT_KG, restKcalPerMin } from "../body/energy";
import { gymKcal } from "../gym/gymKcal";
import type { HealthWorkout } from "../health/energyReader";
import { poolKcal } from "../pool/poolKcal";
import { isPoolSwimRun } from "../pool/PoolTile";
import { findProfile } from "../sports";
import {
  type Balance,
  countedActivities,
  type DayActivity,
  dayBalance,
  type Used,
  usedKcal,
} from "./dayBalance";
import {
  activityKcalOf,
  type Counted,
  type EnergyEdits,
  restEstimatePerDay,
  restOf,
} from "./energyEdits";
import { dayFraction, type LocalDay, localDayOf, startOf } from "./localDay";
import type { HealthDay, HealthState } from "./useHealthEnergy";

/**
 * The activities of the private list in the day's balance (TASK-489 part
 * C1, ADR-0397): what each one took, as MuW estimates it from what the list
 * says of it, and the energy of a day made of rest and activities.
 *
 * The list says the sport, the metres and the time of an activity, not its
 * climb nor the sets of a workout. So a workout at the gym is counted from
 * its time alone, as weights for the whole of it, and a hike without its
 * climb: rougher than the numbers at the end of the activity. The user can
 * write their own number over each (energyEdits.ts).
 */

/** Kilocalories in a litre of oxygen, and one MET in ml of oxygen for each
 * kilogram and minute: as body/energy.ts. */
const KCAL_PER_L_O2 = 5;
const MET_ML_KG_MIN = 3.5;

/** The year of the body for an activity: the one it began in. */
function yearOf(activity: Activity): number {
  const year = new Date(activity.started_at).getFullYear();
  return Number.isNaN(year) ? new Date().getFullYear() : year;
}

/** A sport without metres whose energy is one MET (a stretching session):
 * that MET over its time, the rest taken out. */
function stillKcal(
  met: number,
  seconds: number,
  body: BodyProfile,
  year: number,
): number {
  const minutes = Math.max(0, seconds) / 60;
  const weight = body.weightKg ?? DEFAULT_WEIGHT_KG;
  const total = (met * MET_ML_KG_MIN * minutes * KCAL_PER_L_O2 * weight) / 1000;
  return Math.max(0, Math.round(total - restKcalPerMin(body, year) * minutes));
}

/**
 * MuW's estimate of the active energy of an activity of the list for
 * `body`, whole kilocalories. Zero for a sport the app does not know.
 */
export function hubActivityKcal(activity: Activity, body: BodyProfile): number {
  const year = yearOf(activity);
  if (isPoolSwimRun(activity)) {
    return poolKcal(activity.distance_m, activity.duration_s, body, year);
  }
  // An API before TASK-251 says no sport: every run was a run.
  const sport = activity.activity ?? "running";
  const profile = findProfile(sport);
  if (profile === undefined) {
    return 0;
  }
  if (sport === "gym") {
    return gymKcal([], activity.duration_s, body, year);
  }
  if (isTrackless(sport)) {
    return profile.energy?.kind === "met"
      ? stillKcal(profile.energy.bands[0].met, activity.duration_s, body, year)
      : 0;
  }
  return activeKcal(
    {
      activity: sport,
      metres: activity.distance_m,
      seconds: activity.duration_s,
      climbM: null,
    },
    body,
    year,
  );
}

/** An activity of the list as the balance sees it; null when its start is
 * not a moment. */
export function hubDayActivity(
  activity: Activity,
  body: BodyProfile,
): DayActivity | null {
  const startMs = new Date(activity.started_at).getTime();
  if (Number.isNaN(startMs)) {
    return null;
  }
  return {
    key: activity.id,
    source: "muw",
    writtenByMuw: false,
    startMs,
    endMs: startMs + Math.max(0, activity.duration_s) * 1000,
    kcal: hubActivityKcal(activity, body),
  };
}

/** The activities of the list that began on `day`, the earliest first. */
export function hubActivitiesOn(list: readonly Activity[], day: LocalDay): Activity[] {
  return list
    .filter((activity) => {
      const started = new Date(activity.started_at);
      return !Number.isNaN(started.getTime()) && localDayOf(started) === day;
    })
    .sort(
      (a, b) => new Date(a.started_at).getTime() - new Date(b.started_at).getTime(),
    );
}

/**
 * Whether the pages of the list held so far say everything about `day`:
 * the list is the latest first, so it does once there are no more pages or
 * its oldest activity began before the day.
 */
export function listCovers(
  list: readonly Activity[],
  more: boolean,
  day: LocalDay,
): boolean {
  if (!more) {
    return true;
  }
  const start = startOf(day);
  if (start === null) {
    return true;
  }
  return list.some((activity) => {
    const started = new Date(activity.started_at).getTime();
    return !Number.isNaN(started) && started < start.getTime();
  });
}

/** What the list of the activities can say of the day. */
export type HubState =
  /** The day's activities are all here. */
  | "ready"
  /** They are on their way: nothing can be said of the day yet. */
  | "loading"
  /** Nobody is signed in: there is no list. */
  | "off"
  /** The list did not come: only the rest is counted. */
  | "failed";

/** An activity of the day with what it counts for. */
export type EnergyActivity = {
  activity: Activity;
  /** MuW's estimate. */
  estimate: number;
  /** What the balance counts: the user's number, else the estimate. */
  counted: Counted;
};

/** The key of a workout of Apple Health among the activities of a day:
 * never the key of an activity of MuW's. */
export function healthKey(workout: HealthWorkout): string {
  return `health-${workout.id}`;
}

/**
 * A workout of Apple Health as the balance sees it. MuW wrote it itself
 * when it comes from MuW's own bundle, or carries the key of an activity of
 * the list (appleHealth.ts writes it as HKSyncIdentifier): the list has it
 * already.
 */
export function healthDayActivity(
  workout: HealthWorkout,
  mine: readonly Activity[],
  ownBundleId: string | null,
): DayActivity {
  const writtenByMuw =
    (ownBundleId !== null && workout.sourceBundleId === ownBundleId) ||
    (workout.syncId !== null &&
      mine.some((activity) => activity.id === workout.syncId));
  return {
    key: healthKey(workout),
    source: "health",
    writtenByMuw,
    startMs: workout.startMs,
    endMs: workout.endMs,
    kcal: Math.max(0, workout.kcal ?? 0),
  };
}

/** A workout another app recorded, with what it counts for. */
export type EnergyWorkout = {
  workout: HealthWorkout;
  /** What the app that wrote it saved; zero for none. */
  estimate: number;
  /** What the balance counts: the user's number, else the app's. */
  counted: Counted;
};

export type DayEnergy = {
  day: LocalDay;
  hub: HubState;
  /** Whether Apple Health is read for «Nutrition» (part C2). */
  health: HealthState;
  /** The active energy of the day in Apple Health; null when Health has
   * none, is not read, or MuW may not read it. */
  healthActive: number | null;
  /** The workouts of other apps that day which are none of MuW's
   * activities, the earliest first. */
  others: EnergyWorkout[];
  /** A whole day at rest: the user's number, else the estimate. */
  rest: Counted;
  /** MuW's estimate of a whole day at rest. */
  restEstimate: number;
  /** The day is still running: its rest is counted up to now. */
  soFar: boolean;
  activities: EnergyActivity[];
  /** What the body used; null while the activities are on their way. */
  used: Used | null;
};

export type DayEnergyInput = {
  day: LocalDay;
  now: Date;
  hub: HubState;
  /** The pages of the list held so far. */
  list: readonly Activity[];
  body: BodyProfile;
  edits: EnergyEdits;
  /** Whether Apple Health is read; "none" when not said. */
  health?: HealthState;
  /** What Apple Health has for the day; null while it is being read, and
   * not looked at unless `health` is "on". */
  healthDay?: HealthDay | null;
  /** MuW's own bundle among the apps that write to Health; null when not
   * known. */
  ownBundleId?: string | null;
};

/** The energy of `day`: its rest, its activities and what they add up to. */
export function dayEnergy(input: DayEnergyInput): DayEnergy {
  const { day, now, hub, body, edits } = input;
  const year = Number(day.slice(0, 4));
  const fraction = dayFraction(day, now);
  const rest = restOf(edits, body, year);
  const mine = hub === "ready" ? hubActivitiesOn(input.list, day) : [];
  const activities = mine.map((activity): EnergyActivity => {
    const estimate = hubActivityKcal(activity, body);
    return {
      activity,
      estimate,
      counted: activityKcalOf(edits, activity.id, estimate),
    };
  });
  const health = input.health ?? "none";
  const healthDay = health === "on" ? (input.healthDay ?? null) : null;
  const read = healthDay?.workouts ?? [];
  const all = [
    ...mine.flatMap((activity) => hubDayActivity(activity, body) ?? []),
    ...read.map((workout) =>
      healthDayActivity(workout, mine, input.ownBundleId ?? null),
    ),
  ];
  // Each outing once: MuW's own, then the others that are none of them.
  const kept = new Set(
    countedActivities(all)
      .filter((activity) => activity.source === "health")
      .map((activity) => activity.key),
  );
  const others = read
    .filter((workout) => kept.has(healthKey(workout)))
    .map((workout): EnergyWorkout => {
      const estimate = Math.max(0, Math.round(workout.kcal ?? 0));
      return {
        workout,
        estimate,
        counted: activityKcalOf(edits, healthKey(workout), estimate),
      };
    });
  // Nothing is said of a day while its activities, or what Health has for
  // it, are on their way.
  const waiting = hub === "loading" || (health === "on" && healthDay === null);
  const used = waiting
    ? null
    : usedKcal({
        restKcalPerDay: rest.kcal,
        fraction,
        activities: all,
        healthActiveKcal: healthDay?.activeKcal ?? null,
        edits,
      });
  return {
    day,
    hub,
    health,
    healthActive:
      used !== null && used.fromHealth ? (healthDay?.activeKcal ?? null) : null,
    others,
    rest,
    restEstimate: restEstimatePerDay(body, year),
    soFar: fraction > 0 && fraction < 1,
    activities,
    used,
  };
}

/** The balance of the day: null with nothing eaten written, or while the
 * activities are on their way. */
export function balanceOf(eatenKcal: number | null, energy: DayEnergy): Balance | null {
  return energy.used === null ? null : dayBalance(eatenKcal, energy.used);
}

/** «+120», «−660», «0»: the balance with its sign, a true minus. */
export function signedKcal(kcal: number): string {
  const whole = Math.round(kcal);
  return whole > 0 ? `+${whole}` : whole < 0 ? `−${-whole}` : "0";
}
