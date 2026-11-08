import type { GymSet } from "@shaperoute/shared-types";

import { sportPaceLabel } from "../activities/activityText";
import { t } from "../i18n";
import { findProfile } from "../sports";
import { postMetrics } from "../sports/postMetrics";
import { MIN_PACE_M, paceLabel, runDistanceLabel } from "../units/format";
import { speedIn, speedUnit } from "../units/runFormat";
import { appUnits, type Units } from "../units/units";
import type { ShownPost } from "./feedPosts";
import { gymPostEnergy, postEnergy } from "./postEnergy";

/** One line of a section: what it is, and how much. */
export type PostRow = { label: string; value: string };

/** A card of the page of a post, with its title (TASK-410, ADR-0340). */
export type PostSection = { kind: "summary"; title: string; rows: PostRow[] };

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

/**
 * The rows of the summary of `post`, in order: distance, time, average
 * pace (a speed on wheels and on the snow), energy. Each sport has its own
 * (`postMetrics`), and a row without a value is left out: never a «—».
 * The splits, the climb, the cadence and the heart come with `stats`
 * (parts C and D).
 */
export function summaryRows(
  post: ShownPost,
  units: Units = appUnits(),
  sets?: readonly GymSet[] | null,
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
  const energy = metrics.distance ? postEnergy(post) : gymPostEnergy(post, sets);
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
    energy === null ? null : { label: t("Calories"), value: energy },
  ];
  return rows.filter((row): row is PostRow => row !== null);
}

/**
 * The cards of the page of `post`, in order. A card with nothing to show is
 * not in the list: an old post, without `stats`, has its summary only.
 */
export function postSections(
  post: ShownPost,
  units: Units = appUnits(),
  sets?: readonly GymSet[] | null,
): PostSection[] {
  const sections: PostSection[] = [
    { kind: "summary", title: t("Summary"), rows: summaryRows(post, units, sets) },
  ];
  return sections.filter((section) => section.rows.length > 0);
}
