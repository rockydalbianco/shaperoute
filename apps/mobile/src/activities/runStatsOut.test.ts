import request from "@shaperoute/shared-types/fixtures/activity-request.json";

import type { ActivityFix, ActivityRequest } from "../api/activities";
import { MAX_ELEVATION_POINTS } from "../api/runStats";
import { NO_BODY } from "../body/bodyProfile";
import { activeKcal } from "../body/energy";
import type { AccountOutcome } from "../api/accounts";
import type { RunStats, RunStatsRequest } from "../api/runStats";
import {
  elevationProfile,
  MAX_SKI_PARTS,
  runStatsRequest,
  sendRunStats,
  skiPartsOf,
} from "./runStatsOut";

// What the phone sends at the end of an activity for its post (TASK-410
// part C): the profile from the heights of the fixes, and the calories.

const START = 46.0671;
const LON = 11.1214;
const EARTH_RADIUS_M = 6_371_000;
const BASE: ActivityRequest = request as ActivityRequest;

/** A fix `metres` north of START, where the metres come back exactly. */
function north(metres: number, seconds: number, height?: number): ActivityFix {
  const fix: ActivityFix = {
    point: [START + ((metres / EARTH_RADIUS_M) * 180) / Math.PI, LON],
    time_ms: 1_790_000_000_000 + seconds * 1000,
  };
  return height === undefined ? fix : { ...fix, altitude_m: height };
}

const run = (track: ActivityFix[], pauses: ActivityRequest["pauses"] = []) => ({
  ...BASE,
  track,
  pauses,
});
const COUNTED = { activity: "running" as const, metres: 4000, seconds: 1200 };

test("the profile is the heights at the metres run to them", () => {
  const profile = elevationProfile(
    run([north(0, 0, 194), north(500, 150), north(1000, 300, 201.46)]),
  );
  // The fix without a height counts for the metres only.
  expect(profile).toEqual([
    { distance_m: 0, altitude_m: 194 },
    { distance_m: 1000, altitude_m: 201.5 },
  ]);
});

test("a long run's profile is reduced to the points the page draws", () => {
  // 500 fixes 10 m apart, climbing a metre every 10 m.
  const track = Array.from({ length: 500 }, (_, i) => north(i * 10, i * 3, 100 + i));
  const profile = elevationProfile(run(track));
  expect(profile).toHaveLength(MAX_ELEVATION_POINTS);
  expect(profile?.[0]).toEqual({ distance_m: 0, altitude_m: 100 });
  expect(profile?.[MAX_ELEVATION_POINTS - 1]).toEqual({
    distance_m: 4990,
    altitude_m: 599,
  });
  // Even steps, the heights along the line between the fixes.
  expect(profile?.[60].distance_m).toBe(Math.round((4990 * 60) / 119));
  expect(profile?.[60].altitude_m).toBeCloseTo(100 + (4990 * 60) / 119 / 10, 0);
});

test("a step across a pause asked for is no metre of the profile", () => {
  const track = [north(0, 0, 200), north(400, 120, 205), north(600, 400, 210)];
  const asked = [{ from_ms: 1_790_000_150_000, to_ms: 1_790_000_350_000, auto: false }];
  expect(elevationProfile(run(track, asked))?.map((p) => p.distance_m)).toEqual([
    0, 400, 400,
  ]);
  // Only one point with a height, or a run that went nowhere: no profile.
  expect(elevationProfile(run([north(0, 0, 200), north(400, 120)]))).toBeNull();
  expect(elevationProfile(run([north(0, 0, 200), north(0, 60, 201)]))).toBeNull();
});

test("the calories are the post's, counted with the phone's body", () => {
  const sent = runStatsRequest(BASE, COUNTED, NO_BODY, 2026);
  // The example run has no heights: the calories alone.
  expect(sent).toEqual({
    elevation: null,
    cadence_spm: null,
    kcal: activeKcal({ ...COUNTED, climbM: null }, NO_BODY, 2026),
  });
  expect(sent?.kcal).toBeGreaterThan(0);
  const heavier = runStatsRequest(BASE, COUNTED, { ...NO_BODY, weightKg: 90 }, 2026);
  expect(heavier?.kcal).toBeGreaterThan(sent?.kcal ?? 0);
});

test("nothing to send: no figures", () => {
  // At the gym there are no calories of this kind (its sets count them),
  // and an activity of no metres has none.
  expect(
    runStatsRequest(BASE, { ...COUNTED, activity: "gym" }, NO_BODY, 2026),
  ).toBeNull();
  expect(runStatsRequest(BASE, { ...COUNTED, metres: 0 }, NO_BODY, 2026)).toBeNull();
  // A run with heights still sends its profile.
  const track = [north(0, 0, 200), north(400, 120, 205)];
  expect(
    runStatsRequest(run(track), { ...COUNTED, activity: "gym" }, NO_BODY, 2026)
      ?.elevation,
  ).toHaveLength(2);
});

test("a day of skiing counts its descents alone (TASK-424 part C2)", () => {
  // Down 300 m in 2 km and 5 minutes, a fix every 30 s.
  const down = (fromM: number, fromS: number) =>
    Array.from({ length: 11 }, (_, i) =>
      north(fromM + i * 200, fromS + i * 30, 2000 - i * 30),
    );
  // Up a chairlift first: 300 m in 10 minutes, steady, 1.5 km north.
  const lift = Array.from({ length: 21 }, (_, i) =>
    north(i * 75, i * 30, 1700 + i * 15),
  );
  const counted = { activity: "skiing" as const, metres: 3500, seconds: 900 };
  const descentOnly = runStatsRequest(run(down(1500, 600)), counted, NO_BODY, 2026);
  const withLift = runStatsRequest(
    run([...lift, ...down(1500, 600).slice(1)]),
    counted,
    NO_BODY,
    2026,
  );
  expect(descentOnly?.kcal).toBeGreaterThan(0);
  expect(withLift?.kcal).toBe(descentOnly?.kcal);
  // A day of cross-country skiing, ski touring or a swim in open water: its
  // own formula, on the metres and the time of the post.
  for (const activity of ["xc_skiing", "ski_touring", "swimming"] as const) {
    expect(
      runStatsRequest(BASE, { ...COUNTED, activity }, NO_BODY, 2026)?.kcal,
    ).toBeGreaterThan(0);
  }
});

// TASK-429 part B2: a day of skiing sends its lifts and descents
// (`ski_parts`), and the figures go again without them when the API
// refuses them.

/** Down 300 m, up a chairlift, down 300 m: a fix every 30 s. */
function skiDay(): ActivityFix[] {
  const down = (fromM: number, fromS: number) =>
    Array.from({ length: 11 }, (_, i) =>
      north(fromM + i * 200, fromS + i * 30, 2000 - i * 30),
    );
  const lift = Array.from({ length: 21 }, (_, i) =>
    north(3500 - i * 75, 300 + i * 30, 1700 + i * 15),
  );
  return [...down(1500, 0), ...lift.slice(1), ...down(2000, 900).slice(1)];
}

const SKIING = { activity: "skiing" as const, metres: 5500, seconds: 1500 };

test("a day of skiing sends its lifts and descents, in the order of the day", () => {
  const parts = runStatsRequest(run(skiDay()), SKIING, NO_BODY, 2026)?.ski_parts;
  expect(parts?.map((part) => `${part.kind} ${part.n}`)).toEqual([
    "descent 1",
    "lift 1",
    "descent 2",
  ]);
  const [first, lift] = parts ?? [];
  expect(first.start_ms).toBe(1_790_000_000_000);
  expect(first.end_ms).toBe(1_790_000_000_000 + 300_000);
  expect(first.moving_s).toBe(300);
  expect(first.height_m).toBe(300);
  expect(first.top_mps).not.toBeNull();
  expect(lift.top_mps).toBeNull();
  expect(lift.height_m).toBe(300);
  for (const part of parts ?? []) {
    expect(part.moving_s).toBeLessThanOrEqual((part.end_ms - part.start_ms) / 1000);
  }
});

test("no parts for another sport, nor for a day without heights", () => {
  const track = skiDay();
  expect(
    runStatsRequest(run(track), { ...SKIING, activity: "running" }, NO_BODY, 2026),
  ).not.toHaveProperty("ski_parts");
  const flat = track.map(({ point, time_ms }) => ({ point, time_ms }));
  expect(skiPartsOf(run(flat), 5500)).toEqual([]);
  expect(runStatsRequest(run(flat), SKIING, NO_BODY, 2026)).not.toHaveProperty(
    "ski_parts",
  );
  expect(MAX_SKI_PARTS).toBe(500);
});

const STATS = { ski_parts: null } as unknown as RunStats;
const refused: AccountOutcome<RunStats> = {
  kind: "api_error",
  code: "invalid_request",
  message: "Unknown field",
  suggested_distance_m: null,
  retryAfterS: null,
};

test("the figures go once when the API takes them", async () => {
  const save = jest.fn(
    async (
      ..._args: Parameters<typeof sendRunStats>
    ): Promise<AccountOutcome<RunStats>> => ({
      kind: "ok",
      value: STATS,
    }),
  );
  const request = runStatsRequest(
    run(skiDay()),
    SKIING,
    NO_BODY,
    2026,
  ) as RunStatsRequest;
  const outcome = await sendRunStats("http://api", "tok", "k1", request, {}, save);
  expect(outcome.kind).toBe("ok");
  expect(save).toHaveBeenCalledTimes(1);
  expect(save.mock.calls[0][3]).toHaveProperty("ski_parts");
});

test("refused with the parts, the figures go again without them", async () => {
  const save = jest
    .fn()
    .mockResolvedValueOnce(refused)
    .mockResolvedValueOnce({ kind: "ok", value: STATS });
  const request = runStatsRequest(
    run(skiDay()),
    SKIING,
    NO_BODY,
    2026,
  ) as RunStatsRequest;
  const outcome = await sendRunStats("http://api", "tok", "k1", request, {}, save);
  expect(outcome.kind).toBe("ok");
  expect(save).toHaveBeenCalledTimes(2);
  const again = save.mock.calls[1][3] as RunStatsRequest;
  expect(again).not.toHaveProperty("ski_parts");
  expect(again.kcal).toBe(request.kcal);
  expect(again.elevation).toEqual(request.elevation);
});

test("refused without parts, nothing goes again", async () => {
  const save = jest.fn(async () => refused);
  const request = runStatsRequest(
    run(skiDay()),
    { ...SKIING, activity: "running" },
    NO_BODY,
    2026,
  ) as RunStatsRequest;
  const outcome = await sendRunStats("http://api", "tok", "k1", request, {}, save);
  expect(outcome).toEqual(refused);
  expect(save).toHaveBeenCalledTimes(1);
});
