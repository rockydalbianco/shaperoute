import fixture from "@shaperoute/shared-types/fixtures/activities.json";

import type { Activity } from "../api/activities";
import { type BodyProfile, NO_BODY } from "../body/bodyProfile";
import { activeKcal } from "../body/energy";
import { gymKcal } from "../gym/gymKcal";
import { poolKcal } from "../pool/poolKcal";
import {
  balanceOf,
  dayEnergy,
  healthDayActivity,
  healthKey,
  hubActivitiesOn,
  hubActivityKcal,
  hubDayActivity,
  listCovers,
  signedKcal,
} from "./activityEnergy";
import { NO_EDITS, withActivityKcal, withRest } from "./energyEdits";

// The activities of the private list in the day's balance (TASK-489 part
// C1): what each one took, and what a day adds up to.

/** The run of the fixture: 4007 m in 19 minutes. */
const STAR = fixture.activities[0] as unknown as Activity;

/** An activity of the list that began at a moment of the phone's clock. */
function at(id: string, when: Date, fields: Partial<Activity> = {}): Activity {
  return { ...STAR, id, started_at: when.toISOString(), ...fields };
}

const DAY = "2026-11-23";
/** 18:00 of that day on the phone: three quarters of it gone. */
const EVENING = new Date(2026, 10, 23, 18, 0);
/** The day after: the 23rd is over. */
const AFTER = new Date(2026, 10, 24, 9, 0);

const MORNING_RUN = at("run", new Date(2026, 10, 23, 7, 10));
const GYM = at("gym", new Date(2026, 10, 23, 18, 5), {
  activity: "gym",
  distance_m: 0,
  duration_s: 3000,
  route_preview: null,
  track_preview: [],
});
const DAY_BEFORE = at("before", new Date(2026, 10, 22, 23, 50));

const BODY: BodyProfile = {
  sex: "male",
  weightKg: 75,
  heightCm: 180,
  birthYear: 1990,
};

/** A day at rest with no body data: one MET for 70 kg. */
const REST = 1764;
/** The run for 70 kg: 304 kcal in all, 23 of them rest. */
const RUN = 280;

describe("what an activity of the list took", () => {
  test("a run is counted as at its end, without its climb", () => {
    expect(hubActivityKcal(STAR, NO_BODY)).toBe(RUN);
    expect(hubActivityKcal(STAR, BODY)).toBe(
      activeKcal(
        { activity: "running", metres: 4007, seconds: 1140, climbM: null },
        BODY,
        2026,
      ),
    );
  });

  test("an activity saved before the sports is a run", () => {
    const { activity: _none, ...old } = STAR;
    expect(hubActivityKcal(old as Activity, NO_BODY)).toBe(RUN);
  });

  test("a workout at the gym is counted from its time alone", () => {
    const kcal = hubActivityKcal(GYM, BODY);
    expect(kcal).toBe(gymKcal([], 3000, BODY, 2026));
    expect(kcal).toBeGreaterThan(0);
  });

  test("a swim in a pool is counted as the pool counts it", () => {
    const swim = at("swim", EVENING, {
      activity: "swimming",
      distance_m: 800,
      duration_s: 1200,
      route_preview: null,
      track_preview: [],
    });
    expect(hubActivityKcal(swim, BODY)).toBe(poolKcal(800, 1200, BODY, 2026));
  });

  test("a stretching session is its one MET over its time, the rest out", () => {
    const session = at("stretch", EVENING, {
      activity: "stretching",
      distance_m: 0,
      duration_s: 1800,
      route_preview: null,
      track_preview: [],
    });
    // 2.3 MET for 30 minutes at 70 kg: 85 kcal, 37 of them rest.
    expect(hubActivityKcal(session, NO_BODY)).toBe(48);
  });

  test("a sport the app does not know counts for nothing", () => {
    const unknown = at("new", EVENING, { activity: "curling" as never });
    expect(hubActivityKcal(unknown, BODY)).toBe(0);
  });

  test("the balance sees it as MuW's, from its start to its end", () => {
    expect(hubDayActivity(MORNING_RUN, NO_BODY)).toEqual({
      key: "run",
      source: "muw",
      writtenByMuw: false,
      startMs: new Date(2026, 10, 23, 7, 10).getTime(),
      endMs: new Date(2026, 10, 23, 7, 29).getTime(),
      kcal: RUN,
    });
    expect(hubDayActivity({ ...STAR, started_at: "never" }, NO_BODY)).toBeNull();
  });
});

describe("the activities of a day", () => {
  test("are the ones that began that day on the phone's clock, the earliest first", () => {
    const list = [GYM, MORNING_RUN, DAY_BEFORE];
    expect(hubActivitiesOn(list, DAY).map((activity) => activity.id)).toEqual([
      "run",
      "gym",
    ]);
    expect(hubActivitiesOn(list, "2026-11-22").map((activity) => activity.id)).toEqual([
      "before",
    ]);
    expect(hubActivitiesOn(list, "2026-11-21")).toEqual([]);
  });

  test("the pages held cover a day once one of them goes before it", () => {
    // No more pages: everything is here.
    expect(listCovers([], false, DAY)).toBe(true);
    expect(listCovers([GYM, MORNING_RUN], false, "2026-01-01")).toBe(true);
    // More pages, and nothing here is older than the day: not yet.
    expect(listCovers([GYM, MORNING_RUN], true, DAY)).toBe(false);
    expect(listCovers([], true, DAY)).toBe(false);
    expect(listCovers([GYM, MORNING_RUN, DAY_BEFORE], true, DAY)).toBe(true);
    expect(listCovers([GYM, MORNING_RUN, DAY_BEFORE], true, "2026-11-22")).toBe(false);
  });
});

describe("the energy of a day", () => {
  const base = {
    day: DAY,
    now: AFTER,
    hub: "ready" as const,
    list: [MORNING_RUN, DAY_BEFORE],
    body: NO_BODY,
    edits: NO_EDITS,
  };

  test("is the rest of the whole day and its activities, once the day is over", () => {
    const energy = dayEnergy(base);
    expect(energy.rest).toEqual({ kcal: REST, edited: false });
    expect(energy.restEstimate).toBe(REST);
    expect(energy.soFar).toBe(false);
    expect(energy.activities).toEqual([
      {
        activity: MORNING_RUN,
        estimate: RUN,
        counted: { kcal: RUN, edited: false },
      },
    ]);
    expect(energy.used).toEqual({
      rest: REST,
      active: RUN,
      used: REST + RUN,
      fromHealth: false,
    });
  });

  test("today the rest is counted up to now", () => {
    const energy = dayEnergy({ ...base, now: EVENING });
    expect(energy.soFar).toBe(true);
    expect(energy.used?.rest).toBe(1323);
    expect(energy.used?.used).toBe(1323 + RUN);
    // A whole day is still what the rest is said to be.
    expect(energy.rest.kcal).toBe(REST);
  });

  test("the rest the user wrote takes the place of the estimate", () => {
    const energy = dayEnergy({ ...base, edits: withRest(NO_EDITS, 2000) });
    expect(energy.rest).toEqual({ kcal: 2000, edited: true });
    expect(energy.restEstimate).toBe(REST);
    expect(energy.used?.used).toBe(2000 + RUN);
  });

  test("the calories the user wrote for an activity take the place of its estimate", () => {
    const energy = dayEnergy({
      ...base,
      edits: withActivityKcal(NO_EDITS, "run", 350),
    });
    expect(energy.activities[0].estimate).toBe(RUN);
    expect(energy.activities[0].counted).toEqual({ kcal: 350, edited: true });
    expect(energy.used?.active).toBe(350);
  });

  test("with nobody signed in, or a list that did not come, only the rest counts", () => {
    for (const hub of ["off", "failed"] as const) {
      const energy = dayEnergy({ ...base, hub });
      expect(energy.activities).toEqual([]);
      expect(energy.used?.used).toBe(REST);
    }
  });

  test("nothing is said of a day whose activities are on their way", () => {
    const energy = dayEnergy({ ...base, hub: "loading" });
    expect(energy.used).toBeNull();
    expect(balanceOf(500, energy)).toBeNull();
  });

  test("the balance is eaten less used; none with nothing eaten written", () => {
    const energy = dayEnergy(base);
    expect(balanceOf(null, energy)).toBeNull();
    expect(balanceOf(1500, energy)).toMatchObject({
      balance: 1500 - REST - RUN,
      kind: "deficit",
    });
    expect(balanceOf(2500, energy)).toMatchObject({ kind: "surplus" });
  });
});

test("the balance is written with its sign", () => {
  expect(signedKcal(120)).toBe("+120");
  expect(signedKcal(-660)).toBe("−660");
  expect(signedKcal(0)).toBe("0");
  expect(signedKcal(-0.4)).toBe("0");
});

describe("the energy of a day with Apple Health (part C2)", () => {
  const base = {
    day: DAY,
    now: AFTER,
    hub: "ready" as const,
    list: [MORNING_RUN],
    body: NO_BODY,
    edits: NO_EDITS,
    health: "on" as const,
  };
  const ride = {
    id: "ride",
    activityType: 13,
    startMs: new Date(2026, 10, 23, 17, 30).getTime(),
    endMs: new Date(2026, 10, 23, 18, 20).getTime(),
    kcal: 530.4,
    metres: 21400,
    sourceName: "Garmin Connect",
    sourceBundleId: "com.garmin",
    syncId: null,
  };

  test("nothing is said of a day while Health is being read", () => {
    const energy = dayEnergy({ ...base, healthDay: null });
    expect(energy.used).toBeNull();
    expect(energy.health).toBe("on");
  });

  test("Health's active energy counts alone, and says it is Health's", () => {
    const energy = dayEnergy({
      ...base,
      healthDay: { activeKcal: 684, workouts: [ride] },
    });
    expect(energy.healthActive).toBe(684);
    expect(energy.used).toEqual({
      rest: REST,
      active: 684,
      used: REST + 684,
      fromHealth: true,
    });
    // Still listed, for the user to see what the day was made of.
    expect(energy.activities).toHaveLength(1);
    expect(energy.others.map((one) => one.workout.id)).toEqual(["ride"]);
  });

  test("without Health's energy the workouts of other apps count beside MuW's", () => {
    const energy = dayEnergy({
      ...base,
      healthDay: { activeKcal: null, workouts: [ride] },
    });
    expect(energy.healthActive).toBeNull();
    expect(energy.others).toEqual([
      { workout: ride, estimate: 530, counted: { kcal: 530, edited: false } },
    ]);
    expect(energy.used?.active).toBe(RUN + 530);
    expect(energy.used?.fromHealth).toBe(false);
  });

  test("a workout from MuW's own bundle, or with the key of an activity, is MuW's", () => {
    const mine = healthDayActivity({ ...ride, syncId: "run" }, [MORNING_RUN], null);
    expect(mine).toMatchObject({ key: "health-ride", writtenByMuw: true });
    const bundled = healthDayActivity(
      { ...ride, sourceBundleId: "app.muw" },
      [],
      "app.muw",
    );
    expect(bundled.writtenByMuw).toBe(true);
    expect(healthDayActivity(ride, [MORNING_RUN], "app.muw").writtenByMuw).toBe(false);
    expect(healthKey(ride)).toBe("health-ride");
  });

  test("unless the user said yes, what Health has is not looked at", () => {
    for (const health of ["none", "off"] as const) {
      const energy = dayEnergy({
        ...base,
        health,
        healthDay: { activeKcal: 684, workouts: [ride] },
      });
      expect(energy.healthActive).toBeNull();
      expect(energy.others).toEqual([]);
      expect(energy.used?.active).toBe(RUN);
    }
  });
});
