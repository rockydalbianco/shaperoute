import { exerciseName } from "../gym/catalog";
import { muscleNames } from "../gym/muscles";
import { WEEK_DAYS } from "../gym/planLimits";
import { decimal, t, tLater, tPlural } from "../i18n";
import type { Language } from "../i18n/languages";
import type { RuleId, Tip } from "./rules";

/**
 * What a Coach tip says (TASK-491 part B, ADR-0399): a title, a line on
 * what was seen, the study behind it, and the button. The texts are the
 * ones the user approved on 2026-11-23 (`docs/tasks/TASK-491.md`).
 */

export type TipText = {
  title: string;
  body: string;
  /** «Why: Weekly volume · Schoenfeld 2017». */
  why: string;
  /** «Apply to plan» or «Add to Mon» when the tip changes the plan;
   * null when the button is «OK». */
  apply: string | null;
};

type Words = { title: string; body: string; why: string };

const WHY: Readonly<Record<RuleId, string>> = {
  P1: tLater("Double progression · ACSM 2009"),
  P1bw: tLater("Double progression · ACSM 2009"),
  P2: tLater("Load that fits the reps · ACSM 2009"),
  P3: tLater("Change the stimulus · ACSM 2009"),
  P4: tLater("Weekly volume · Schoenfeld 2017"),
  P4hi: tLater("Weekly volume · Schoenfeld 2017"),
  P5: tLater("Frequency · Schoenfeld 2016"),
  P6: tLater("48 hours to recover · ACSM 2009"),
  C1: tLater("Safe increase · Nielsen 2014"),
  C2: tLater("80/20 · Seiler 2010"),
  C3: tLater("Workload ratio · Gabbett 2016"),
  T1: tLater("Deload · Bosquet 2007"),
  T3: tLater("Sleep and performance · Fullagar 2015"),
  T4: tLater("Coming back · Mujika 2000"),
  T5: tLater("WHO guidelines 2020"),
};

/** «Mon» for 1, «Sun» for 7, in the app's language. */
function dayName(day: number | undefined): string {
  const name = day === undefined ? undefined : WEEK_DAYS[day - 1];
  return name === undefined ? "" : t(name);
}

function kg(value: number | undefined): string {
  if (value === undefined) {
    return "";
  }
  return Number.isInteger(value) ? String(value) : decimal(value);
}

function words(tip: Tip, language: Language): Words {
  const v = tip.values;
  const exercise =
    tip.exercise === undefined
      ? ""
      : exerciseName({ exercise: tip.exercise }, language);
  const muscles = tip.muscle === undefined ? [] : [tip.muscle];
  // At the start of a sentence with a capital, after other words as
  // `muscleNames` writes them (German keeps its capital).
  const Muscle = muscleNames(muscles, language);
  const muscle = muscleNames(muscles, language, { capital: false });
  const why = t(WHY[tip.rule]);
  switch (tip.rule) {
    case "P1":
      return {
        title: t("{exercise}: {kg} kg", { exercise, kg: kg(v.kg) }),
        body: t(
          "You did all your reps at {old} kg twice in a row. Add weight and start again from {min} reps.",
          { old: kg(v.old), min: v.min ?? "" },
        ),
        why,
      };
    case "P1bw":
      return {
        title: t("{exercise}: one more rep", { exercise }),
        body: t("You did all your reps twice in a row. Add one rep to each set."),
        why,
      };
    case "P2":
      return {
        title: t("{exercise}: {kg} kg", { exercise, kg: kg(v.kg) }),
        body: t(
          "You stopped below {min} reps twice in a row. A little less weight helps you finish your sets.",
          { min: v.min ?? "" },
        ),
        why,
      };
    case "P3":
      return {
        title: t("{exercise} has stalled", { exercise }),
        body: t(
          "Your estimated max hasn't moved in 3 workouts. Try {min2}–{max2} reps for the next weeks.",
          { min2: v.min2 ?? "", max2: v.max2 ?? "" },
        ),
        why,
      };
    case "P4":
      return {
        title: t("Add {n} sets for {muscle}", { n: v.n ?? "", muscle }),
        body: t(
          "{muscle} got {sets} sets this week. Around 10 a week builds muscle better.",
          { muscle: Muscle, sets: v.sets ?? "" },
        ),
        why,
      };
    case "P4hi":
      return {
        title: t("A lot for {muscle}", { muscle }),
        body: t(
          "{muscle} got {sets} sets this week. Above 20 adds tiredness more than muscle.",
          { muscle: Muscle, sets: v.sets ?? "" },
        ),
        why,
      };
    case "P5":
      return {
        title: t("Train {muscle} twice a week", { muscle }),
        body: t(
          "All your {muscle} sets are on {day}. Split them over two days for more growth.",
          { muscle, day: dayName(v.day) },
        ),
        why,
      };
    case "P6":
      return {
        title: t("{muscle} is still recovering", { muscle: Muscle }),
        body: t(
          "You trained it hard {hours} hours ago. Today pick another muscle, or keep it light.",
          { hours: v.hours ?? "" },
        ),
        why,
      };
    case "C1":
      return {
        title: t("Keep {km} km this week", { km: v.km ?? "" }),
        body: t(
          "Last week you ran {pct}% more than your usual. Hold the distance before adding more.",
          { pct: v.pct ?? "" },
        ),
        why,
      };
    case "C2":
      return {
        title: t("Next run: slow and long"),
        body: t(
          "Only {pct}% of your running was easy. Most of it should feel easy, around 80%.",
          { pct: v.pct ?? "" },
        ),
        why,
      };
    case "C3":
      return {
        title: t("Maybe a lighter week"),
        body: t("This week's load is high compared with the last month."),
        why,
      };
    case "T1":
      return {
        title: t("Time for an easy week"),
        body: t(
          "{weeks} weeks of steady work. Do about half the sets this week, same weights.",
          { weeks: v.weeks ?? "" },
        ),
        why,
      };
    case "T3":
      return {
        title: t("Short night: go lighter"),
        body: t(
          "Your sleep score was {score}. Same workout today, one set less per exercise.",
          { score: v.score ?? "" },
        ),
        why,
      };
    case "T4":
      return {
        title: t("Welcome back"),
        body: t(
          "You've been away {days} days. Start this week at about 85% of your weights.",
          { days: v.days ?? "" },
        ),
        why,
      };
    case "T5":
      return {
        title: t("One more strength day"),
        body: tPlural(
          v.n ?? 0,
          "{count} strength day this week. Two a week keep muscles and bones strong.",
          "{count} strength days this week. Two a week keep muscles and bones strong.",
        ),
        why,
      };
  }
}

/** Everything the card of `tip` says, in `language`. */
export function tipText(tip: Tip, language: Language): TipText {
  const { title, body, why } = words(tip, language);
  let apply: string | null = null;
  if (tip.change !== undefined) {
    apply =
      tip.rule === "P4" && tip.values.day !== undefined
        ? t("Add to {day}", { day: dayName(tip.values.day) })
        : t("Apply to plan");
  }
  return { title, body, why: t("Why: {reason}", { reason: why }), apply };
}
