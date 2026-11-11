import type { GymSet } from "@shaperoute/shared-types";

import { sportPaceLabel } from "../activities/activityText";
import type { ElevationPoint, RunSplit, RunStats } from "../api/runStats";
import { t } from "../i18n";
import { CLIMB_STEP_M } from "../navigation/runMetrics";
import { findProfile } from "../sports";
import { postMetrics } from "../sports/postMetrics";
import {
  METRES_PER_FOOT,
  metresPer,
  MIN_PACE_M,
  paceLabel,
  runDistanceLabel,
} from "../units/format";
import { speedIn, speedUnit } from "../units/runFormat";
import { appUnits, type Units } from "../units/units";
import type { ShownPost } from "./feedPosts";
import { gymPostEnergy, postEnergy } from "./postEnergy";

/** One line of a section: what it is, and how much. */
export type PostRow = {
  label: string;
  value: string;
  /** The calories: shown in red (TASK-424 part C3). */
  energy?: true;
};

/** A line of the table of the splits (TASK-410 part D). */
export type SplitRow = {
  /** Which one, as the table writes it on the right: "3"; for the part
   * after the last whole one, its length: "0.43". */
  label: string;
  /** Its pace: "5:12 /km". */
  pace: string;
  /** The length of its bar, 1 for the fastest: the faster, the longer. */
  share: number;
  /** The fastest whole one: in `accent`. */
  fastest: boolean;
  /** The part after the last whole one. */
  partial: boolean;
};

/** A card of the page of a post, with its title (TASK-410, ADR-0340): the
 * summary and the heart rate as rows; the splits as a table; the elevation
 * as a profile of columns. */
export type PostSection =
  | { kind: "summary"; title: string; rows: PostRow[] }
  | {
      kind: "splits";
      title: string;
      /** The heading of the right column: "Km" or "Mile". */
      unit: string;
      rows: SplitRow[];
      /** "Fastest: km 3 · 5:12 /km"; null without a whole one. */
      fastest: string | null;
    }
  | {
      kind: "elevation";
      title: string;
      /** "+86 m" at the top: the climb of the profile. */
      gain: string;
      /** One per point, 0 the lowest and 1 the highest. */
      columns: number[];
      /** What VoiceOver says of the chart. */
      label: string;
    }
  | { kind: "heart"; title: string; rows: PostRow[] };

/** The lowest column still shows: a flat profile is not an empty card. */
export const MIN_COLUMN = 0.06;

/** "28:10", "1:02:03": a time as a watch shows it. */
export function clockLabel(seconds: number): string {
  const whole = Math.max(0, Math.round(seconds));
  const h = Math.floor(whole / 3600);
  const m = Math.floor((whole % 3600) / 60);
  const s = String(whole % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
}

/** "18.4 km/h", "11.4 mph"; none for a way too short to tell. */
export function speedLabel(metres: number, ms: number, units: Units): string | null {
  if (metres < MIN_PACE_M || ms <= 0) {
    return null;
  }
  return `${speedIn(metres, ms, units).toFixed(1)} ${speedUnit(units)}`;
}

/** "5:12 /km": the pace of `seconds` over `metres`, per unit of `units`. */
function splitPace(seconds: number, metres: number, units: Units): string {
  const perUnit = Math.round((seconds / metres) * metresPer(units));
  return `${Math.floor(perUnit / 60)}:${String(perUnit % 60).padStart(2, "0")} /${units}`;
}

/** The seconds a unit of `units` takes in `split`, the part after the last
 * whole one counted at its pace. */
function perUnitS(split: RunSplit, units: Units): number {
  const metres = split.partial_m ?? metresPer(units);
  return metres > 0 ? (split.seconds / metres) * metresPer(units) : Infinity;
}

/** The splits of `stats` in `units`; none when it has none. */
function splitsIn(stats: RunStats | null, units: Units): RunSplit[] {
  const found = units === "mi" ? stats?.splits_mile : stats?.splits_km;
  return found ?? [];
}

/** The fastest whole kilometre (or mile) of `splits`; null without one. */
function fastestOf(splits: RunSplit[]): RunSplit | null {
  const whole = splits.filter((s) => s.partial_m == null && s.seconds > 0);
  return whole.reduce<RunSplit | null>(
    (best, s) => (best === null || s.seconds < best.seconds ? s : best),
    null,
  );
}

/**
 * The metres climbed along the profile, as the run's screen counts them
 * (runMetrics.climbM): the rises of at least CLIMB_STEP_M. From 120 points
 * at most, so a little below the climb of the whole track.
 */
export function profileClimbM(points: readonly ElevationPoint[]): number {
  let from: number | null = null;
  let climbed = 0;
  for (const { altitude_m: height } of points) {
    if (from === null) {
      from = height;
    } else if (height - from >= CLIMB_STEP_M) {
      climbed += height - from;
      from = height;
    } else if (from - height >= CLIMB_STEP_M) {
      from = height;
    }
  }
  return climbed;
}

/** "86 m", "282 ft": a height, in feet for whoever reads miles. */
function heightLabel(metres: number, units: Units): string {
  return units === "mi"
    ? `${Math.round(metres / METRES_PER_FOOT)} ft`
    : `${Math.round(metres)} m`;
}

/** The profile of `stats`, when the sport has one and it is long enough. */
function profileOf(post: ShownPost, stats: RunStats | null): ElevationPoint[] | null {
  const points = stats?.elevation ?? null;
  return postMetrics(post.drawing.activity).elevation &&
    points !== null &&
    points.length >= 2
    ? points
    : null;
}

/**
 * The rows of the summary of `post`, in order: distance, time, average
 * pace (a speed on wheels and on the snow), fastest kilometre, cadence,
 * energy, climb. Each sport has its own (`postMetrics`), and a row without
 * a value is left out: never a «—». With `stats` (part C) the fastest
 * kilometre, the cadence and the climb, and the calories its author's
 * phone counted with its body, in place of the estimate.
 */
export function summaryRows(
  post: ShownPost,
  units: Units = appUnits(),
  sets?: readonly GymSet[] | null,
  stats: RunStats | null = null,
): PostRow[] {
  const metrics = postMetrics(post.drawing.activity);
  const metres = post.drawing.distance_m;
  const seconds = post.drawing.duration_s;
  const ms = seconds * 1000;
  const rate =
    metrics.rate === "speed"
      ? speedLabel(metres, ms, units)
      : metrics.rate === "pace"
        ? // On the water its own pace, per 500 m or 100 m; a kilometre's
          // or a mile's otherwise.
          findProfile(post.drawing.activity)?.pace === undefined
          ? paceLabel(metres, ms, units)
          : sportPaceLabel(post.drawing.activity, metres, ms)
        : null;
  const fastest = metrics.splits ? fastestOf(splitsIn(stats, units)) : null;
  const cadence = metrics.cadence ? (stats?.cadence_spm ?? null) : null;
  const kcal = stats?.kcal ?? null;
  const energy =
    kcal !== null && kcal > 0
      ? `${kcal} kcal`
      : metrics.distance
        ? postEnergy(post)
        : gymPostEnergy(post, sets);
  const profile = profileOf(post, stats);
  const climb = profile === null ? null : profileClimbM(profile);
  const rows: (PostRow | null)[] = [
    metrics.distance && metres > 0
      ? { label: t("Distance"), value: runDistanceLabel(metres, units) }
      : null,
    seconds > 0 ? { label: t("Time"), value: clockLabel(seconds) } : null,
    rate === null
      ? null
      : {
          label: metrics.rate === "speed" ? t("Avg speed") : t("Avg pace"),
          value: rate,
        },
    fastest === null
      ? null
      : {
          label: units === "mi" ? t("Fastest mile") : t("Fastest km"),
          value: splitPace(fastest.seconds, metresPer(units), units),
        },
    cadence === null ? null : { label: t("Avg cadence"), value: `${cadence} spm` },
    energy === null ? null : { label: t("Calories"), value: energy, energy: true },
    climb === null || climb < 1
      ? null
      : { label: t("Elevation gain"), value: heightLabel(climb, units) },
  ];
  return rows.filter((row): row is PostRow => row !== null);
}

/**
 * The table of the splits: one line per kilometre (or mile), its pace and
 * a bar, the fastest whole one marked, the part after the last whole one
 * with its length in place of its number. Null without splits, or for a
 * sport without them (on the water, on the snow, at the gym).
 */
export function splitsSection(
  post: ShownPost,
  stats: RunStats | null,
  units: Units = appUnits(),
): PostSection | null {
  const splits = postMetrics(post.drawing.activity).splits
    ? splitsIn(stats, units)
    : [];
  if (splits.length === 0) {
    return null;
  }
  const fastest = fastestOf(splits);
  const quickest = Math.min(...splits.map((s) => perUnitS(s, units)));
  const rows = splits.map((split): SplitRow => {
    const partial = split.partial_m != null;
    const metres = split.partial_m ?? metresPer(units);
    return {
      label: partial ? (metres / metresPer(units)).toFixed(2) : String(split.n),
      pace: splitPace(split.seconds, metres, units),
      share: quickest / perUnitS(split, units),
      fastest: split === fastest,
      partial,
    };
  });
  const pace =
    fastest === null ? null : splitPace(fastest.seconds, metresPer(units), units);
  return {
    kind: "splits",
    title: t("Splits"),
    unit: units === "mi" ? t("Mile") : t("Km"),
    rows,
    fastest:
      fastest === null || pace === null
        ? null
        : units === "mi"
          ? t("Fastest: mile {n} · {pace}", { n: fastest.n, pace })
          : t("Fastest: km {n} · {pace}", { n: fastest.n, pace }),
  };
}

/** The profile as columns from the lowest point to the highest, the climb
 * at the top. Null without one. */
export function elevationSection(
  post: ShownPost,
  stats: RunStats | null,
  units: Units = appUnits(),
): PostSection | null {
  const profile = profileOf(post, stats);
  if (profile === null) {
    return null;
  }
  const heights = profile.map((p) => p.altitude_m);
  const low = Math.min(...heights);
  const high = Math.max(...heights);
  const span = high - low;
  return {
    kind: "elevation",
    title: t("Elevation"),
    gain: `+${heightLabel(profileClimbM(profile), units)}`,
    columns: heights.map((h) =>
      span > 0 ? MIN_COLUMN + (1 - MIN_COLUMN) * ((h - low) / span) : 0.5,
    ),
    label: t("Elevation along the route, from {min} to {max} m", {
      min: Math.round(low),
      max: Math.round(high),
    }),
  };
}

/** The heart rate: the average and the highest, as the server sends them
 * (runs.heart_*); the zones and the lowest come when a source gives the
 * seconds in each zone (TASK-345 C, TASK-374 D). Null without one, or when
 * its author hides it: the server does not send it then. */
export function heartSection(stats: RunStats | null): PostSection | null {
  const heart = stats?.heart ?? null;
  if (heart === null) {
    return null;
  }
  return {
    kind: "heart",
    title: t("Heart rate"),
    rows: [
      { label: t("Average"), value: `${heart.avg_bpm} bpm` },
      { label: t("Max"), value: `${heart.max_bpm} bpm` },
    ],
  };
}

/**
 * The cards of the page of `post`, in order: summary, splits, elevation,
 * heart rate. A card with nothing to show is not in the list: an old post,
 * without `stats`, has its summary only.
 */
export function postSections(
  post: ShownPost,
  units: Units = appUnits(),
  sets?: readonly GymSet[] | null,
  stats: RunStats | null = null,
): PostSection[] {
  const summary: PostSection = {
    kind: "summary",
    title: t("Summary"),
    rows: summaryRows(post, units, sets, stats),
  };
  const sections = [
    summary.rows.length > 0 ? summary : null,
    splitsSection(post, stats, units),
    elevationSection(post, stats, units),
    heartSection(stats),
  ];
  return sections.filter((section): section is PostSection => section !== null);
}
