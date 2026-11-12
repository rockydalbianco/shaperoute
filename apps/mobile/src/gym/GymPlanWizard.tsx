import {
  type GymPlan,
  type GymPlanGoal,
  type GymPlanMode,
  type GymPlanRunner,
  type GymPlanSession,
  type GymProgram,
  MAX_GYM_PROGRAM_ITEMS as MAX_PROGRAM_ITEMS,
} from "@shaperoute/shared-types";
import { type ReactNode, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { decimal, t, tLater } from "../i18n";
import { appLanguage } from "../i18n/language";
import {
  color,
  font,
  fontSize,
  fontWeight,
  MIN_TAP_SIZE,
  radius,
  space,
} from "../theme/tokens";
import {
  BODYWEIGHT_GOALS,
  EQUIPMENT_OPTIONS,
  type Equipment,
  equipmentOf,
  isBodyweightDay,
} from "./bodyweight";
import { exerciseName } from "./catalog";
import { MAX_NAME } from "./ExercisePicker";
import { WEEK_DAYS } from "./planLimits";
import {
  CYCLE_WEEKS,
  itemInWeek,
  isoDate,
  programDays,
  programItemCount,
  programOfPlan,
  sessionsOfWeek,
} from "./program";
import {
  dayLetter,
  emptyProgram,
  isGymDay,
  isRunDay,
  RUN_NAMES,
  GOALS,
  goalOf,
  type Naming,
  proposeProgram,
  sessionLetter,
  withCycle,
  withDays,
} from "./proposal";
import {
  countsFor,
  DOOR_CHOSEN,
  DOOR_COUNTS,
  MIN_PLAN_SPORTS,
  PLAN_SPORTS,
  type PlanSport,
  proposalKey,
  type SportCounts,
  SportsDoor,
  SPORT_BADGES,
  sportOfSession,
  sportsOf,
  spreadDays,
} from "./SportsDoor";
import { outingTitle } from "./outingDay";
import { OutingDayEditor } from "./OutingDayEditor";
import { planReminderOn, setPlanReminder } from "./planReminder";
import {
  MAX_TARGET_DAYS,
  sportDays,
  targetPlan,
  type TargetPlan,
  type TargetPlanAnswers,
  type UnnamedDay,
} from "./targetPlan";
import {
  type Aim,
  aimText,
  firstAim,
  isEndurance,
  TargetGoalPage,
  TargetLadder,
  TargetLevelPage,
  targetSportOf,
  TargetWhenPage,
  useLastMonthBest,
  type When,
} from "./TargetSteps";
import { roundClimb, roundDistance } from "./targetWeeks";
import { runTitle } from "./runDay";
import { clock, DEFAULT_RUNNER, LEVELS, withRunner } from "./runPace";
import { RunnerPaces, RunnerQuestions } from "./RunnerStep";
import { RunDayEditor } from "./RunDayEditor";
import { SessionEditor } from "./SessionEditor";

/** What the guide saves: a plan with its weeks. */
export type WizardDraft = {
  name: string;
  days: number[];
  items: [];
  program: GymProgram;
};

/** The sports of the door whose days are days out (TASK-461 B and C). */
type OutingDoor = "walk" | "bike" | "swim" | "mountain";

/** What a plan with a target keeps of the program made for its other days. */
type TargetBase = TargetPlanAnswers["base"];

/** YYYY-MM-DD as a day on the phone's calendar. */
function dayOf(iso: string): Date {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day);
}

/** The guide's steps (the user's flow of 2026-11-10). */
export type WizardStep =
  | "door"
  | "target"
  | "level"
  | "goal"
  | "days"
  | "runner"
  | "when"
  | "plan"
  | "weeks"
  | "ready";
const STEPS: readonly WizardStep[] = ["goal", "days", "plan", "weeks", "ready"];
/** With run days, «How do you run today?» comes after the days (TASK-452). */
const STEPS_WITH_RUNS: readonly WizardStep[] = [
  "goal",
  "days",
  "runner",
  "plan",
  "weeks",
  "ready",
];

/** The modes of the weeks, in the guide's order. */
const MODES: readonly { mode: GymPlanMode; title: string; line: string }[] = [
  {
    mode: "load",
    title: tLater("More load each week"),
    line: tLater("+{kg} kg, the last week lighter to recover"),
  },
  {
    mode: "reps",
    title: tLater("More reps each week"),
    line: tLater("10, 11, 12, then more kg and back to 10"),
  },
  {
    mode: "alternate",
    title: tLater("Weeks A / B in turn"),
    line: tLater("Other exercises every other week"),
  },
  {
    mode: "same",
    title: tLater("Always the same"),
    line: tLater("As before: one week that repeats"),
  },
];

/** The modes of a plan without the gym (TASK-461 A2): no kg to add, so
 * the reps and seconds grow («Di più ogni settimana»). */
const BODY_MODES: readonly { mode: GymPlanMode; title: string; line: string }[] = [
  {
    mode: "reps",
    title: tLater("More each week"),
    line: tLater("+1 rep, +5 s held; week {n} lighter"),
  },
  ...MODES.filter((one) => one.mode === "alternate" || one.mode === "same"),
];

/** Whether a program has days of the gym: without, its weeks grow by reps
 * and seconds. */
function hasGym(program: GymProgram): boolean {
  return program.sessions.some(isGymDay);
}

/** The example of a plan without the gym's weeks: its first exercise of
 * reps and its first held one («Piegamenti e plank, per esempio»). */
function exampleItems(program: GymProgram) {
  const items = program.sessions.flatMap((one) => one.items);
  return {
    reps: items.find((item) => item.reps !== undefined && item.load_kg === undefined),
    held: items.find((item) => item.kind === "timed" && item.duration_s !== undefined),
  };
}

/** «2,5», «5»: kg without a needless «,0». */
export function kgText(kg: number): string {
  return Number.isInteger(kg) ? String(kg) : decimal(kg);
}

/** «Get back in shape»: the beginner's pace and long run at first. */
const FIT_RUNNER: GymPlanRunner = {
  pace_10k_s: LEVELS[0].pace10kS,
  long_m: LEVELS[0].longM,
};

/** A plan whose run days were all taken away keeps no runner. */
function withoutRunnerIfNoRuns(program: GymProgram): GymProgram {
  if (program.sessions.some((one) => one.run !== undefined)) {
    return program;
  }
  const { runner: _runner, ...rest } = program;
  return rest;
}

/** About how long a workout lasts: a set and its rest, two minutes or
 * the goal's rest. */
function minutesOf(session: GymPlanSession, restS: number): number {
  const sets = session.items.reduce((count, item) => count + item.sets, 0);
  return Math.max(5, Math.round((sets * (40 + restS)) / 60 / 5) * 5);
}

/** «rest 90 s», «rest 3 min». */
function restLabel(seconds: number): string {
  return seconds >= 120 && seconds % 60 === 0
    ? t("rest {n} min", { n: String(seconds / 60) })
    : t("rest {n} s", { n: String(seconds) });
}

/** The day after `date` that is a Monday; `date` itself when it is one. */
function nextMonday(date: Date): Date {
  const days = (8 - date.getDay()) % 7;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

/** What a week of the cycle is, under its bar: «+2.5 kg», «Lighter»,
 * «11 reps», «A», «B». */
function weekCaption(program: GymProgram, week: number): string {
  if (program.custom.some((one) => one.week === week) && program.mode !== "alternate") {
    return t("By hand");
  }
  switch (program.mode) {
    case "load":
      if (program.weeks >= 3 && week === program.weeks) {
        return t("Lighter");
      }
      return week === 1
        ? t("Base@@week")
        : `+${kgText(program.step_kg * (week - 1))} kg`;
    case "reps": {
      if (!hasGym(program)) {
        if (program.weeks >= 3 && week === program.weeks) {
          return t("Lighter");
        }
        const { reps, held } = exampleItems(program);
        const values = [
          reps === undefined
            ? null
            : String(itemInWeek(reps, "reps", program.weeks, 0, week, 0).reps),
          held === undefined
            ? null
            : `${itemInWeek(held, "reps", program.weeks, 0, week, 0).duration_s} s`,
        ].filter((one): one is string => one !== null);
        return values.length > 0 ? values.join(" · ") : t("Base@@week");
      }
      const step = week - 1;
      if (step % 3 === 0) {
        const kg = Math.floor(step / 3) * program.step_kg;
        return kg > 0 ? `+${kgText(kg)} kg` : t("Base@@week");
      }
      return step % 3 === 1 ? t("+1 rep") : t("+{n} reps", { n: String(step % 3) });
    }
    case "alternate":
      return sessionLetter(week - 1);
    case "same":
      return t("Every week");
  }
}

/** How high a week's bar is, from 0 to 1. */
function weekHeight(program: GymProgram, week: number): number {
  switch (program.mode) {
    case "load":
      if (program.weeks >= 3 && week === program.weeks) {
        return 0.35;
      }
      return 0.5 + (0.5 * (week - 1)) / Math.max(1, program.weeks - 2);
    case "reps":
      if (!hasGym(program)) {
        if (program.weeks >= 3 && week === program.weeks) {
          return 0.35;
        }
        return 0.5 + (0.5 * (week - 1)) / Math.max(1, program.weeks - 2);
      }
      return 0.5 + 0.17 * ((week - 1) % 3) + 0.05 * Math.floor((week - 1) / 3);
    default:
      return 0.75;
  }
}

/**
 * «New plan», step by step (the user's choices of 2026-11-10, the mockup
 * «Schede palestra guidate»): the goal, the days of the week, the plan
 * ready with a workout a day to retouch, how the weeks change, the name and
 * the first day. Each step asks one thing and has its answer chosen
 * already: «Continue» all the way makes a good plan. A plan already made
 * opens on its workouts («Edit») or its weeks («Weeks»).
 */
export function GymPlanWizard({
  plan,
  startAt = "goal",
  onSave,
  onDelete,
  onClose,
}: {
  /** The plan changed; null for a new one. */
  plan: GymPlan | null;
  startAt?: WizardStep;
  onSave: (draft: WizardDraft) => void;
  onDelete?: () => void;
  onClose: () => void;
}) {
  const language = appLanguage();
  const naming: Naming = { t, language };
  const today = new Date();
  const kept = plan === null ? null : programOfPlan(plan, today);
  // A new plan opens on «What do you want to train?» (TASK-461 A2).
  const withDoor = plan === null && startAt === "goal";
  const [step, setStep] = useState<WizardStep>(withDoor ? "door" : startAt);
  const [goal, setGoal] = useState<GymPlanGoal>(kept?.goal ?? "muscle");
  // The sports of the plan: chosen at the door, at least two (the user's
  // «Almeno due, sempre»), in the order chosen: the first with a distance
  // leads to the target, the others keep fit (2026-11-12, «Più d'uno»); a
  // plan kept has those of its days.
  const keptSports: PlanSport[] = kept === null ? [] : sportsOf(kept.sessions);
  const [sports, setSports] = useState<PlanSport[]>(
    kept === null ? [...DOOR_CHOSEN] : keptSports,
  );
  const firstDays = kept === null ? spreadDays(DOOR_CHOSEN, DOOR_COUNTS) : null;
  const keptDaysOf = (sport: PlanSport): number[] =>
    kept?.sessions
      .filter((one) => sportOfSession(one) === sport)
      .map((one) => one.day) ?? [];
  const [days, setDays] = useState<number[]>(firstDays?.gym ?? keptDaysOf("gym"));
  // The bodyweight days (TASK-461 A2) and what one has for them.
  const [bodyDays, setBodyDays] = useState<number[]>(
    firstDays?.body ?? keptDaysOf("body"),
  );
  const [equipment, setEquipment] = useState<Equipment>(
    kept === null ? "none" : equipmentOf(kept),
  );
  // The run days (TASK-433 C).
  const [runDays, setRunDays] = useState<number[]>(firstDays?.run ?? keptDaysOf("run"));
  // The days of the other sports with a distance (TASK-461 B and C).
  const [moreDays, setMoreDays] = useState<Record<OutingDoor, number[]>>({
    walk: firstDays?.walk ?? keptDaysOf("walk"),
    bike: firstDays?.bike ?? keptDaysOf("bike"),
    swim: firstDays?.swim ?? keptDaysOf("swim"),
    mountain: firstDays?.mountain ?? keptDaysOf("mountain"),
  });
  // The target (TASK-461 B and C): of the first sport chosen with a
  // distance; a run keeps fit at first, as before, the others lead to the
  // second distance offered (10 km, 15 km, 60 km, 2 km; 1000 m of climb).
  const targetDoor = withDoor ? (sports.find(isEndurance) ?? null) : null;
  const [paddle, setPaddle] = useState(false);
  const [pool, setPool] = useState(true);
  const [aims, setAims] = useState<Partial<Record<PlanSport, Aim>>>({
    run: { kind: "keepFit" },
  });
  const aim: Aim | null =
    targetDoor === null ? null : (aims[targetDoor] ?? firstAim(targetDoor, paddle));
  const targetSport = targetDoor === null ? null : targetSportOf(targetDoor, paddle);
  const keepFitRun = targetDoor === "run" && aim?.kind === "keepFit";
  const hasTarget = aim !== null && aim.kind !== "keepFit";
  const asksLevel = targetDoor !== null && !keepFitRun;
  const [level, setLevel] = useState<number | null>(null);
  const [levelTouched, setLevelTouched] = useState(false);
  const best = useLastMonthBest(
    targetSport ?? "run",
    aim?.kind === "climb",
    step === "level" || step === "target",
  );
  // Where one is today: written from the last month until changed by hand.
  const shownLevel =
    !levelTouched && best !== null
      ? aim?.kind === "climb"
        ? roundClimb(best.metres)
        : roundDistance(best.metres, targetSport ?? "run")
      : level;
  const [when, setWhen] = useState<When>({ ready: true });
  // The other days of a plan with a target: made at the days' step.
  const [others, setOthers] = useState<GymPlanSession[]>([]);
  const [baseShape, setBaseShape] = useState<TargetBase | null>(null);
  // «Ricordamelo alle 8» (TASK-461 B): one for all the plans.
  const [remind, setRemind] = useState(planReminderOn());
  // The run days of the plan that are not the target's.
  const keptRunDays = targetDoor === "run" && !keepFitRun ? [] : runDays;
  const [program, setProgram] = useState<GymProgram | null>(kept);
  // From nothing: the plan's workouts without exercises.
  const [scratch, setScratch] = useState(false);
  // What the program was proposed for: asked again when it changes.
  const [proposedFor, setProposedFor] = useState<string | null>(
    kept === null
      ? null
      : proposalKey(kept.goal ?? "muscle", equipmentOf(kept), keptSports),
  );
  const [tab, setTab] = useState(0);
  // The week written by hand, being changed; its workout shown.
  const [week, setWeek] = useState<number | null>(null);
  const [weekTab, setWeekTab] = useState(0);
  const [weeksChoice, setWeeksChoice] = useState<number>(
    kept !== null && kept.weeks > 2 ? kept.weeks : 4,
  );
  const goalValues = goalOf(goal);
  const [name, setName] = useState(plan?.name ?? "");
  const monday = nextMonday(today);
  const todayIso = isoDate(today);
  const [startsOn, setStartsOn] = useState(
    kept?.starts_on ?? (today.getDay() === 1 ? todayIso : isoDate(monday)),
  );
  // How the owner runs (TASK-452): asked only for a plan with run days.
  const [runner, setRunner] = useState<GymPlanRunner>(
    kept?.runner ?? (goal === "fit" ? FIT_RUNNER : DEFAULT_RUNNER),
  );
  // «Your paces», after «How do you run today?».
  const [paces, setPaces] = useState(false);
  const strength = sports.includes("gym") || sports.includes("body");
  const guided: readonly WizardStep[] = withDoor
    ? [
        ...(targetDoor !== null ? (["target"] as const) : []),
        ...(asksLevel ? (["level"] as const) : []),
        ...(strength ? (["goal"] as const) : []),
        "days",
        ...(keptRunDays.length > 0 ? (["runner"] as const) : []),
        ...(hasTarget ? (["when"] as const) : []),
        "plan",
        ...(hasTarget ? [] : (["weeks"] as const)),
        "ready",
      ]
    : runDays.length > 0
      ? STEPS_WITH_RUNS
      : STEPS;
  const steps: readonly WizardStep[] = withDoor ? ["door", ...guided] : guided;
  const index = Math.max(0, steps.indexOf(step));
  // The door is before the steps: «Step 1 of 5» is the first after it.
  const counted = withDoor ? steps.slice(1) : steps;
  const stepNumber = counted.indexOf(step) + 1;

  /** The days of a sport of the plan. */
  function daysOf(sport: PlanSport): number[] {
    switch (sport) {
      case "gym":
        return days;
      case "body":
        return bodyDays;
      case "run":
        return runDays;
      default:
        return moreDays[sport];
    }
  }

  /** The days of each sport again, for the counts chosen. */
  function respread(chosen: readonly PlanSport[], counts: SportCounts) {
    const spread = spreadDays(chosen, counts);
    setDays(spread.gym);
    setBodyDays(spread.body);
    setRunDays(spread.run);
    setMoreDays({
      walk: spread.walk,
      bike: spread.bike,
      swim: spread.swim,
      mountain: spread.mountain,
    });
  }

  /** The days of every sport with `number` given to `sport` (or to none). */
  function moveDay(number: number, sport: PlanSport | undefined) {
    const without = (list: number[]) => list.filter((one) => one !== number);
    const withIt = (one: PlanSport, list: number[]) =>
      one === sport ? [...without(list), number] : without(list);
    setDays(withIt("gym", days));
    setBodyDays(withIt("body", bodyDays));
    setRunDays(withIt("run", runDays));
    setMoreDays({
      walk: withIt("walk", moreDays.walk),
      bike: withIt("bike", moreDays.bike),
      swim: withIt("swim", moreDays.swim),
      mountain: withIt("mountain", moreDays.mountain),
    });
  }

  function toggleSport(sport: PlanSport) {
    // In the order chosen: the first with a distance has the target.
    const chosen = sports.includes(sport)
      ? sports.filter((one) => one !== sport)
      : [...sports, sport];
    setSports(chosen);
    respread(chosen, countsFor(chosen));
  }

  function proposed(): GymProgram {
    const forNow = proposalKey(goal, equipment, sports);
    if (program !== null && proposedFor === forNow) {
      return withDays(program, days, naming, keptRunDays, bodyDays);
    }
    const fresh = proposeProgram({
      goal,
      days,
      runDays: keptRunDays,
      bodyDays,
      equipment,
      mode: program?.mode ?? (days.length > 0 ? "load" : "reps"),
      weeks: weeksChoice,
      startsOn,
      naming,
    });
    setProposedFor(forNow);
    return scratch ? emptyProgram(fresh, naming) : fresh;
  }

  /** The name of a day the guide makes: what it is and how much. */
  function nameOfDay(day: UnnamedDay): string {
    if (day.outing !== undefined) {
      return outingTitle(day.outing).slice(0, MAX_NAME);
    }
    return day.run !== undefined ? t(RUN_NAMES[day.run.kind]) : "";
  }

  /** The days of the sports with a distance that keep fit. */
  function keepFitDays(): GymPlanSession[] {
    return sports
      .filter((one) => isEndurance(one) && one !== "run" && one !== targetDoor)
      .flatMap((one) => {
        const sport = targetSportOf(one, false);
        return sportDays({
          aim: { sport, keepFit: true },
          level: null,
          pool,
          days: daysOf(one),
          nameOf: nameOfDay,
        });
      });
  }

  /** The plan with its target from the other days: or why not. */
  function targetResult(
    withOthers: GymPlanSession[],
    shape: TargetBase,
  ): TargetPlan | null {
    if (
      targetDoor === null ||
      targetSport === null ||
      aim === null ||
      aim.kind === "keepFit"
    ) {
      return null;
    }
    const on = when.ready ? {} : { on: when.on };
    try {
      return targetPlan({
        aim:
          aim.kind === "climb"
            ? { sport: "hike", climb_m: aim.metres, ...on }
            : { sport: targetSport, distance_m: aim.metres, ...on },
        level: shownLevel,
        pool,
        days: daysOf(targetDoor),
        others: withOthers,
        base: shape,
        startsOn: dayOf(startsOn),
        nameOf: nameOfDay,
      });
    } catch {
      return null;
    }
  }

  /** The Sunday of the `weeks`-th week from the start. */
  function dateIn(weeks: number): string {
    const start = dayOf(startsOn);
    const mondayOf = new Date(
      start.getFullYear(),
      start.getMonth(),
      start.getDate() - ((start.getDay() + 6) % 7),
    );
    return isoDate(
      new Date(
        mondayOf.getFullYear(),
        mondayOf.getMonth(),
        mondayOf.getDate() + (weeks - 1) * 7 + 6,
      ),
    );
  }

  function goOn() {
    setStep(steps[Math.min(steps.length - 1, index + 1)]);
  }

  function next() {
    switch (step) {
      case "door":
      case "goal":
      case "target":
        goOn();
        return;
      case "level":
        goOn();
        return;
      case "days": {
        const base = proposed();
        const withOthers = [...base.sessions, ...keepFitDays()].sort(
          (a, b) => a.day - b.day,
        );
        const shape: TargetBase = {
          mode: base.mode,
          step_kg: base.step_kg,
          ...(base.goal === undefined ? {} : { goal: base.goal }),
          ...(base.rest_s === undefined ? {} : { rest_s: base.rest_s }),
        };
        setOthers(withOthers);
        setBaseShape(shape);
        if (
          targetDoor !== null &&
          aim?.kind === "keepFit" &&
          !keepFitRun &&
          targetSport !== null
        ) {
          // To keep fit in a sport with a distance: its days as they are.
          const own = sportDays({
            aim: { sport: targetSport, keepFit: true },
            level: shownLevel,
            pool,
            days: daysOf(targetDoor),
            nameOf: nameOfDay,
          });
          setProgram({
            ...base,
            sessions: [...withOthers, ...own].sort((a, b) => a.day - b.day),
          });
        } else if (hasTarget) {
          const result = targetResult(withOthers, shape);
          setProgram(result?.kind === "plan" ? result.program : null);
        } else {
          setProgram({ ...base, sessions: withOthers });
        }
        setTab(0);
        setPaces(false);
        goOn();
        return;
      }
      case "runner":
        if (!paces) {
          setPaces(true);
          return;
        }
        if (program !== null) {
          setProgram(withRunner(program, runner));
        }
        setPaces(false);
        goOn();
        return;
      case "when": {
        if (baseShape !== null) {
          const result = targetResult(others, baseShape);
          if (result?.kind === "plan") {
            setProgram(
              keptRunDays.length > 0
                ? withRunner(result.program, runner)
                : result.program,
            );
          }
        }
        setTab(0);
        goOn();
        return;
      }
      case "plan":
        if (hasTarget && name.trim() === "" && aim !== null) {
          setName(t("Toward {target}", { target: aimText(aim) }).slice(0, MAX_NAME));
        }
        goOn();
        return;
      case "weeks":
        if (name.trim() === "") {
          const count = program === null ? 0 : programDays(program).length;
          setName(
            (count === 1
              ? t("{goal} · 1 day", { goal: t(goalValues.title) })
              : t("{goal} · {n} days", { goal: t(goalValues.title), n: String(count) })
            ).slice(0, MAX_NAME),
          );
        }
        goOn();
        return;
      case "ready":
        if (program !== null) {
          const named = name.trim().slice(0, MAX_NAME);
          setPlanReminder(remind);
          onSave({
            name: named,
            days: programDays(program),
            items: [],
            program: {
              ...withoutRunnerIfNoRuns(program),
              starts_on: startsOn,
              // A workout always has a name (gym_plans.py).
              sessions: program.sessions.map((session) =>
                session.name.trim() === ""
                  ? {
                      ...session,
                      name: t("Workout {letter}", {
                        letter: dayLetter(program.sessions, session.day),
                      }),
                    }
                  : { ...session, name: session.name.trim() },
              ),
            },
          });
        }
        return;
    }
  }

  function back() {
    if (week !== null) {
      setWeek(null);
      return;
    }
    if (step === "runner" && paces) {
      setPaces(false);
      return;
    }
    if (index === 0) {
      onClose();
      return;
    }
    setStep(steps[index - 1]);
  }

  const whenResult =
    step === "when" && baseShape !== null ? targetResult(others, baseShape) : null;
  const canGoOn =
    step === "door"
      ? sports.length >= MIN_PLAN_SPORTS
      : step === "days"
        ? withDoor
          ? sports.every((sport) => daysOf(sport).length > 0) &&
            (targetDoor === null || daysOf(targetDoor).length <= MAX_TARGET_DAYS)
          : days.length + bodyDays.length + runDays.length > 0
        : step === "when"
          ? whenResult?.kind === "plan"
          : step === "plan"
            ? program !== null &&
              program.sessions.length > 0 &&
              program.sessions.every(
                (one) =>
                  isRunDay(one) || one.outing !== undefined || one.items.length > 0,
              ) &&
              programItemCount(program) <= MAX_PROGRAM_ITEMS
            : step === "ready"
              ? name.trim() !== "" &&
                program !== null &&
                programItemCount(program) <= MAX_PROGRAM_ITEMS
              : true;
  const primaryLabel =
    step === "door"
      ? sports.length === 1
        ? t("Next · 1 chosen")
        : t("Next · {n} chosen", { n: String(sports.length) })
      : step === "runner"
        ? paces
          ? t("Looks good")
          : t("Make my paces")
        : step === "plan"
          ? t("Looks good")
          : step === "ready"
            ? t("Save plan")
            : week !== null
              ? t("Done")
              : t("Continue");

  let body: ReactNode = null;
  if (week !== null && program !== null) {
    body = weekPage(program, week);
  } else if (step === "door") {
    body = <SportsDoor chosen={sports} onToggle={toggleSport} />;
  } else if (step === "target" && targetDoor !== null && aim !== null) {
    body = (
      <TargetGoalPage
        door={targetDoor}
        aim={aim}
        onAim={(one) => setAims({ ...aims, [targetDoor]: one })}
        paddle={paddle}
        onPaddle={setPaddle}
        pool={pool}
        onPool={setPool}
      />
    );
  } else if (step === "level" && targetSport !== null) {
    body = (
      <TargetLevelPage
        sport={targetSport}
        climb={aim?.kind === "climb"}
        level={shownLevel}
        onLevel={(one) => {
          setLevelTouched(true);
          setLevel(one);
        }}
        best={best}
      />
    );
  } else if (step === "when" && aim !== null) {
    body = (
      <TargetWhenPage
        aim={aim}
        when={when}
        onWhen={setWhen}
        result={whenResult}
        dateIn={dateIn}
        onReach={(metres) =>
          targetDoor !== null &&
          setAims({
            ...aims,
            [targetDoor]:
              aim.kind === "climb"
                ? { kind: "climb", metres }
                : { kind: "distance", metres },
          })
        }
      />
    );
  } else if (step === "goal") {
    body = goalPage();
  } else if (step === "days") {
    body = daysPage();
  } else if (step === "runner" && program !== null) {
    body = runnerPage(program);
  } else if (step === "plan" && program !== null) {
    body = planPage(program);
  } else if (step === "weeks" && program !== null) {
    body = weeksPage(program);
  } else if (step === "ready" && program !== null) {
    body = readyPage(program);
  }

  return (
    <View style={styles.wizard} testID="plan-wizard">
      <View style={styles.top}>
        <Pressable
          style={({ pressed }) => [styles.round, pressed && styles.pressed]}
          onPress={back}
          accessibilityRole="button"
          accessibilityLabel={index === 0 && week === null ? t("Close") : t("Back")}
          testID="wizard-back"
        >
          <Text style={styles.roundText}>
            {index === 0 && week === null ? "✕" : "‹"}
          </Text>
        </Pressable>
        <Text style={styles.stepLabel}>
          {(step === "door"
            ? t("New plan")
            : t("Step {n} of {total}", {
                n: String(stepNumber),
                total: String(counted.length),
              })
          ).toUpperCase()}
        </Text>
        <View style={styles.round} />
      </View>
      <View
        style={[styles.progress, step === "door" && styles.hidden]}
        accessibilityElementsHidden
      >
        {counted.map((one, i) => (
          <View
            key={one}
            style={[styles.segment, i < stepNumber && styles.segmentOn]}
          />
        ))}
      </View>
      <ScrollView
        contentContainerStyle={styles.body}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets
      >
        {body}
      </ScrollView>
      <Pressable
        style={({ pressed }) => [
          styles.primary,
          !canGoOn && styles.disabled,
          pressed && styles.pressed,
        ]}
        disabled={!canGoOn}
        onPress={week !== null ? () => setWeek(null) : next}
        accessibilityRole="button"
        testID="wizard-next"
      >
        <Text style={styles.primaryText}>{primaryLabel}</Text>
      </Pressable>
      {step === "goal" && week === null && (
        <Pressable
          style={({ pressed }) => [styles.link, pressed && styles.pressed]}
          onPress={() => {
            setScratch(true);
            setProposedFor(null);
            setStep("days");
          }}
          accessibilityRole="button"
          testID="wizard-scratch"
        >
          <Text style={styles.linkText}>{t("I'll write the plan myself")}</Text>
        </Pressable>
      )}
      {step === "ready" && onDelete !== undefined && plan !== null && (
        <Pressable
          style={({ pressed }) => [styles.link, pressed && styles.pressed]}
          onPress={() =>
            Alert.alert(t("Delete “{name}”?", { name: plan.name }), undefined, [
              { text: t("Cancel"), style: "cancel" },
              { text: t("Delete"), style: "destructive", onPress: onDelete },
            ])
          }
          accessibilityRole="button"
          testID="plan-delete"
        >
          <Text style={[styles.linkText, styles.danger]}>{t("Delete plan")}</Text>
        </Pressable>
      )}
    </View>
  );

  function heading(title: string, line?: string) {
    return (
      <View style={styles.heading}>
        <Text style={styles.title} accessibilityRole="header">
          {title}
        </Text>
        {line !== undefined && <Text style={styles.lead}>{line}</Text>}
      </View>
    );
  }

  function goalPage() {
    // Without the gym the goals are a bodyweight workout's (TASK-461 A2).
    const body = !sports.includes("gym") && sports.includes("body");
    return (
      <>
        {heading(
          t("What do you want to achieve?"),
          body
            ? t("Without weights you grow with reps and seconds.")
            : t("Sets, reps and rest come from here. You can change them later."),
        )}
        {GOALS.map((one) => {
          const on = one.goal === goal;
          const bodyValues = BODYWEIGHT_GOALS[one.goal];
          const values = body
            ? one.goal === "strength"
              ? `${bodyValues.sets} × ${bodyValues.reps} ${t("with the hardest exercises")} · ${restLabel(bodyValues.restS)}`
              : `${bodyValues.sets} × ${bodyValues.reps} · ${restLabel(bodyValues.restS)}`
            : `${one.main.sets} × ${one.main.reps} · ${restLabel(one.restS)}`;
          return (
            <Pressable
              key={one.goal}
              style={({ pressed }) => [
                styles.option,
                on && styles.optionOn,
                pressed && styles.pressed,
              ]}
              onPress={() => setGoal(one.goal)}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              testID={`wizard-goal-${one.goal}`}
            >
              <View style={styles.optionText}>
                <Text style={styles.optionTitle}>{t(one.title)}</Text>
                <Text style={styles.optionLine}>
                  {one.goal === "fit" ? `${values} · ${t("to start with")}` : values}
                </Text>
              </View>
              <View style={[styles.tick, on && styles.tickOn]}>
                {on && <Text style={styles.tickText}>✓</Text>}
              </View>
            </Pressable>
          );
        })}
        {sports.includes("body") && (
          <>
            <Text style={styles.label}>{t("What do you have?").toUpperCase()}</Text>
            <View style={styles.counts}>
              {EQUIPMENT_OPTIONS.map((one) => {
                const on = one.equipment === equipment;
                return (
                  <Pressable
                    key={one.equipment}
                    style={({ pressed }) => [
                      styles.count,
                      styles.startChoice,
                      on && styles.optionOn,
                      pressed && styles.pressed,
                    ]}
                    onPress={() => setEquipment(one.equipment)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: on }}
                    testID={`wizard-equipment-${one.equipment}`}
                  >
                    <Text style={[styles.optionTitle, styles.centered]}>
                      {t(one.title)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={styles.small}>
              {t("With the bar we add pull-ups, with the dip bars the dips.")}
            </Text>
          </>
        )}
      </>
    );
  }

  /** The sports a day of «Your week» goes round when touched: those of
   * the plan, a run always for a plan kept (as before TASK-461). */
  function roundOfDays(): PlanSport[] {
    return withDoor
      ? PLAN_SPORTS.filter((one) => sports.includes(one))
      : PLAN_SPORTS.filter((one) => one === "run" || sports.includes(one));
  }

  /** A day touched in «Your week»: to the next sport of the plan, then
   * rest. */
  function touchDay(number: number) {
    const round = roundOfDays();
    const now = round.findIndex((sport) => daysOf(sport).includes(number));
    moveDay(number, round[now + 1]);
  }

  /** «Gym», «Bodyweight», «Running» over a row of counts. */
  function sportLabel(sport: PlanSport): string {
    switch (sport) {
      case "gym":
        return t("Gym");
      case "body":
        return t("Bodyweight");
      case "run":
        return t("Running");
      case "walk":
        return t("Walking and hiking");
      case "bike":
        return t("Cycling");
      case "swim":
        return t("Swimming and paddling");
      case "mountain":
        return t("Mountains");
    }
  }

  function countRow(sport: PlanSport) {
    const run = isEndurance(sport);
    // A plan kept may have no run: «No» stays, as before TASK-461.
    const choices = run
      ? withDoor
        ? [1, 2, 3, 4]
        : [0, 1, 2, 3]
      : withDoor
        ? [1, 2, 3, 4]
        : [1, 2, 3, 4, 5];
    const current = daysOf(sport).length;
    return (
      <View key={sport}>
        <Text style={styles.label}>
          {(withDoor || !run ? sportLabel(sport) : t("And running?")).toUpperCase()}
        </Text>
        <View style={styles.counts}>
          {choices.map((count) => {
            const on = current === count;
            return (
              <Pressable
                key={count}
                style={({ pressed }) => [
                  styles.count,
                  styles.countSmall,
                  on &&
                    (run
                      ? count === 0
                        ? styles.noRunsOn
                        : styles.runOn
                      : styles.optionOn),
                  pressed && styles.pressed,
                ]}
                onPress={() => {
                  const counts: SportCounts = {
                    gym: days.length,
                    body: bodyDays.length,
                    run: runDays.length,
                    walk: moreDays.walk.length,
                    bike: moreDays.bike.length,
                    swim: moreDays.swim.length,
                    mountain: moreDays.mountain.length,
                    [sport]: count,
                  };
                  respread(roundOfDays(), counts);
                }}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
                testID={
                  sport === "run"
                    ? `wizard-runs-${count}`
                    : `wizard-count-${sport}-${count}`
                }
              >
                <Text
                  style={[styles.countTextSmall, count === 0 && !on && styles.muted]}
                >
                  {count === 0 ? t("No") : String(count)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    );
  }

  function daysPage() {
    const shown = [...days].sort((a, b) => a - b);
    const body = [...bodyDays].sort((a, b) => a - b);
    const runs = [...runDays].sort((a, b) => a - b);
    const split = proposeProgram({
      goal,
      days: shown,
      bodyDays: body,
      runDays: runs,
      equipment,
      mode: "same",
      weeks: 1,
      startsOn,
      naming,
    }).sessions;
    const sessions =
      program !== null &&
      proposedFor === proposalKey(goal, equipment, sports) &&
      !scratch
        ? withDays(program, shown, naming, runs, body).sessions
        : split;
    const strength = PLAN_SPORTS.filter(
      (one) =>
        (one === "gym" || one === "body") &&
        (sports.includes(one) || (one === "gym" && !withDoor && days.length > 0)),
    );
    return (
      <>
        {heading(
          withDoor ? t("How many days for each sport?") : t("How many days a week?"),
        )}
        {(strength.length > 0 || !withDoor ? strength : []).map(countRow)}
        {!withDoor && strength.length === 0 && countRow("gym")}
        {withDoor
          ? sports.filter(isEndurance).map(countRow)
          : roundOfDays().includes("run") && countRow("run")}
        <Text style={styles.label}>{t("Your week").toUpperCase()}</Text>
        <View style={styles.weekDays}>
          {WEEK_DAYS.map((day, i) => {
            const number = i + 1;
            const gym = days.includes(number) || bodyDays.includes(number);
            // A day of a sport with a distance (TASK-461 B, C) in the run's blue.
            const outdoor = sports.find(
              (one) => isEndurance(one) && daysOf(one).includes(number),
            );
            const run = runDays.includes(number) || outdoor !== undefined;
            const session = sessions.find((one) => one.day === number);
            const what = days.includes(number)
              ? t("Gym")
              : bodyDays.includes(number)
                ? t("Bodyweight")
                : outdoor !== undefined
                  ? sportLabel(outdoor)
                  : run
                    ? t("Run")
                    : t("Rest");
            return (
              <Pressable
                key={day}
                style={[
                  styles.weekDay,
                  gym && styles.weekDayOn,
                  run && styles.weekDayRun,
                ]}
                onPress={() => touchDay(number)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: gym ? true : run ? "mixed" : false }}
                accessibilityLabel={`${t(day)}: ${what}`}
                testID={`wizard-day-${number}`}
              >
                <Text
                  style={[
                    styles.weekDayText,
                    gym && styles.weekDayTextOn,
                    run && styles.weekDayTextRun,
                  ]}
                >
                  {gym && session !== undefined && !scratch
                    ? dayLetter(sessions, number)
                    : run
                      ? SPORT_BADGES[outdoor ?? "run"]
                      : t(day).slice(0, 2)}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={styles.small}>
          {withDoor
            ? t("Already spread out, with rest in between. Touch a day to change it.")
            : t("Touch a day to change it: gym, run or rest.")}
        </Text>
        {sessions.length > 0 && !scratch && (
          <View style={styles.card}>
            <Text style={[styles.label, styles.cardLabel]}>
              {t("How the work is split").toUpperCase()}
            </Text>
            {sessions.map((session) => (
              <View key={session.day} style={styles.splitRow}>
                {mark(sessions, session)}
                <View style={styles.optionText}>
                  <Text style={styles.optionTitle}>
                    {session.run !== undefined ? runTitle(session.run) : session.name}
                  </Text>
                  <Text style={styles.optionLine}>{t(WEEK_DAYS[session.day - 1])}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </>
    );
  }

  /** The yellow letter of a day of the gym, «RUN» in its blue on a run
   * day. */
  function mark(sessions: GymPlanSession[], session: GymPlanSession) {
    return session.run !== undefined || session.outing !== undefined ? (
      <Text style={[styles.letter, styles.letterRun]}>
        {SPORT_BADGES[sportOfSession(session)]}
      </Text>
    ) : (
      <Text style={styles.letter}>{dayLetter(sessions, session.day)}</Text>
    );
  }

  function runnerPage(current: GymProgram) {
    if (paces) {
      const long =
        runner.long_m !== undefined
          ? `${runner.long_m / 1000} km`
          : `${Math.round((runner.long_s ?? 0) / 60)} min`;
      return (
        <>
          {heading(
            t("Your paces"),
            t("From your {pace}/km over 10 km and your long run of {long}.", {
              pace: clock(runner.pace_10k_s),
              long,
            }),
          )}
          <RunnerPaces runner={runner} sessions={current.sessions} />
        </>
      );
    }
    return (
      <>
        {heading(
          t("How do you run today?"),
          t("Two answers and the plan's paces are yours."),
        )}
        <RunnerQuestions runner={runner} onChange={setRunner} />
      </>
    );
  }

  function tabs(sessions: GymPlanSession[], shown: number, pick: (i: number) => void) {
    // More than four days: the tabs scroll sideways, each wide enough.
    const many = sessions.length > 4;
    const row = sessions.map((session, i) => {
      const on = i === shown;
      return (
        <Pressable
          key={session.day}
          style={[styles.tab, many && styles.tabWide, on && styles.tabOn]}
          onPress={() => pick(i)}
          accessibilityRole="tab"
          accessibilityState={{ selected: on }}
          testID={`wizard-tab-${i}`}
        >
          <Text style={[styles.tabText, on && styles.tabTextOn]}>
            {`${
              session.run !== undefined
                ? t("Run")
                : session.outing !== undefined
                  ? SPORT_BADGES[sportOfSession(session)]
                  : dayLetter(sessions, session.day)
            } · ${t(WEEK_DAYS[session.day - 1])}`}
          </Text>
        </Pressable>
      );
    });
    return many ? (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsScroll}
        contentContainerStyle={styles.tabs}
        accessibilityRole="tablist"
      >
        {row}
      </ScrollView>
    ) : (
      <View style={styles.tabs} accessibilityRole="tablist">
        {row}
      </View>
    );
  }

  function planPage(current: GymProgram) {
    const shown = Math.min(tab, current.sessions.length - 1);
    const session = current.sessions[shown];
    return (
      <>
        {heading(
          scratch ? t("Your plan") : t("Here is your plan"),
          scratch
            ? t("Add the exercises of each day.")
            : !hasGym(current) && bodyDays.length > 0
              ? t("The whole body, {n} times a week. Touch an exercise to change it.", {
                  n: String(bodyDays.length),
                })
              : t("Ready to use. Touch an exercise to change it."),
        )}
        {aim !== null && hasTarget && <TargetLadder program={current} aim={aim} />}
        {tabs(current.sessions, shown, setTab)}
        {session.outing !== undefined ? (
          <OutingDayEditor
            day={session.day}
            outing={session.outing}
            program={current}
            onChange={(outing) =>
              setProgram({
                ...current,
                sessions: current.sessions.map((one, i) =>
                  i === shown
                    ? { ...one, outing, name: nameOfDay({ ...one, outing }) }
                    : one,
                ),
              })
            }
          />
        ) : session.run !== undefined ? (
          <RunDayEditor
            run={session.run}
            mode={current.mode}
            weeks={current.weeks}
            runner={current.runner}
            onChange={(run) =>
              setProgram({
                ...current,
                sessions: current.sessions.map((one, i) =>
                  i === shown ? { ...one, run, name: t(RUN_NAMES[run.kind]) } : one,
                ),
              })
            }
          />
        ) : (
          gymDay(current, shown, session)
        )}
      </>
    );
  }

  function gymDay(current: GymProgram, shown: number, session: GymPlanSession) {
    return (
      <>
        <TextInput
          style={styles.sessionName}
          value={session.name}
          onChangeText={(text) =>
            setProgram({
              ...current,
              sessions: current.sessions.map((one, i) =>
                i === shown ? { ...one, name: text.slice(0, MAX_NAME) } : one,
              ),
            })
          }
          accessibilityLabel={t("Workout name")}
          testID="wizard-session-name"
        />
        <SessionEditor
          key={`${shown}-${session.day}`}
          items={session.items}
          onChange={(items) =>
            setProgram({
              ...current,
              sessions: current.sessions.map((one, i) =>
                i === shown ? { ...one, items } : one,
              ),
            })
          }
        />
        {session.items.length > 0 && (
          <View style={styles.note}>
            <Text style={styles.noteText}>
              {`${t("About {n} minutes", {
                n: String(minutesOf(session, current.rest_s ?? goalValues.restS)),
              })} · ${restLabel(current.rest_s ?? goalValues.restS)}`}
            </Text>
            <Text style={styles.noteStrong}>
              {isBodyweightDay(session)
                ? equipment === "none"
                  ? t("No equipment")
                  : t(
                      EQUIPMENT_OPTIONS.find((one) => one.equipment === equipment)
                        ?.title ?? "",
                    )
                : t("Write the kg at the first workout")}
            </Text>
          </View>
        )}
      </>
    );
  }

  function weeksPage(current: GymProgram) {
    const length = current.weeks;
    const counted = current.mode === "load" || current.mode === "reps";
    // Without the gym: no kg, the reps and seconds grow (TASK-461 A2).
    const gym = hasGym(current);
    const lighterLast =
      (current.mode === "load" || (!gym && current.mode === "reps")) && length >= 3;
    const example = exampleItems(current);
    const lead =
      current.mode === "same"
        ? t("The same week, again and again.")
        : current.mode === "alternate"
          ? t("Two weeks in turn, again and again.")
          : gym
            ? t("A cycle of {n} weeks, then again with the new weights.", {
                n: String(length),
              })
            : t("A cycle of {n} weeks, then it starts again from where you got to.", {
                n: String(length),
              });
    return (
      <>
        {heading(t("How do the weeks change?"), lead)}
        <View style={styles.card}>
          <View style={styles.bars}>
            {Array.from({ length }, (_, i) => i + 1).map((number) => (
              <Pressable
                key={number}
                style={({ pressed }) => [styles.barColumn, pressed && styles.pressed]}
                onPress={() => {
                  setWeek(number);
                  setWeekTab(0);
                }}
                accessibilityRole="button"
                accessibilityLabel={`${t("Week {n}", { n: String(number) })}, ${weekCaption(current, number)}`}
                testID={`wizard-week-${number}`}
              >
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.bar,
                      { height: `${Math.round(weekHeight(current, number) * 100)}%` },
                      lighterLast && number === length && styles.barLight,
                    ]}
                  />
                </View>
                <Text style={styles.barTitle}>
                  {t("Wk {n}", { n: String(number) })}
                </Text>
                <Text style={styles.barCaption} numberOfLines={1}>
                  {weekCaption(current, number)}
                </Text>
              </Pressable>
            ))}
          </View>
          <Text style={[styles.small, styles.center]}>
            {!gym &&
            current.mode === "reps" &&
            example.reps !== undefined &&
            example.held !== undefined
              ? `${t("{a} and {b}, for example.", {
                  a: exerciseName(example.reps, language),
                  b: exerciseName(example.held, language),
                })} ${t("Touch a week to change it.")}`
              : t("Touch a week to change it.")}
          </Text>
        </View>
        {(gym ? MODES : BODY_MODES).map((one) => {
          const on = one.mode === current.mode;
          return (
            <Pressable
              key={one.mode}
              style={({ pressed }) => [
                styles.option,
                on && styles.optionOn,
                pressed && styles.pressed,
              ]}
              onPress={() =>
                setProgram(withCycle(current, one.mode, weeksChoice, naming))
              }
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              testID={`wizard-mode-${one.mode}`}
            >
              <View style={styles.optionText}>
                <Text style={styles.optionTitle}>{t(one.title)}</Text>
                <Text style={styles.optionLine}>
                  {t(one.line, {
                    kg: kgText(current.step_kg || 2.5),
                    n: String(length),
                  })}
                </Text>
              </View>
            </Pressable>
          );
        })}
        {counted && (
          <View style={styles.cycle}>
            <Text style={styles.label}>{t("Weeks").toUpperCase()}</Text>
            <View style={styles.counts}>
              {CYCLE_WEEKS.map((count) => {
                const on = count === length;
                return (
                  <Pressable
                    key={count}
                    style={[styles.count, styles.countSmall, on && styles.optionOn]}
                    onPress={() => {
                      setWeeksChoice(count);
                      setProgram(withCycle(current, current.mode, count, naming));
                    }}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: on }}
                    testID={`wizard-weeks-${count}`}
                  >
                    <Text style={styles.countTextSmall}>{count}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}
      </>
    );
  }

  function weekPage(current: GymProgram, number: number) {
    const written = current.custom.find((one) => one.week === number);
    const sessions = written?.sessions ?? sessionsOfWeek(current, number);
    const shown = Math.min(weekTab, Math.max(0, sessions.length - 1));
    const session = sessions[shown];
    function write(patch: Partial<GymPlanSession>) {
      const next = sessions.map((one, i) => (i === shown ? { ...one, ...patch } : one));
      if (number === 1) {
        // The first week is the plan itself: the others are worked out
        // from it.
        setProgram({ ...current, sessions: next });
        return;
      }
      setProgram({
        ...current,
        custom: [
          ...current.custom.filter((one) => one.week !== number),
          { week: number, sessions: next },
        ].sort((a, b) => a.week - b.week),
      });
    }
    return (
      <>
        {heading(
          t("Week {n}", { n: String(number) }),
          written !== undefined ? t("Written by hand.") : weekCaption(current, number),
        )}
        {sessions.length > 0 && tabs(sessions, shown, setWeekTab)}
        {session !== undefined &&
          (session.run !== undefined ? (
            <RunDayEditor
              run={session.run}
              mode="same"
              weeks={1}
              runner={current.runner}
              onChange={(run) => write({ run, name: t(RUN_NAMES[run.kind]) })}
            />
          ) : (
            <SessionEditor
              key={`${number}-${shown}`}
              items={session.items}
              onChange={(items) => write({ items })}
            />
          ))}
        {written !== undefined && !(current.mode === "alternate" && number === 2) && (
          <Pressable
            style={({ pressed }) => [styles.link, pressed && styles.pressed]}
            onPress={() =>
              setProgram({
                ...current,
                custom: current.custom.filter((one) => one.week !== number),
              })
            }
            accessibilityRole="button"
            testID="wizard-week-reset"
          >
            <Text style={styles.linkText}>{t("Back to the automatic week")}</Text>
          </Pressable>
        )}
      </>
    );
  }

  function readyPage(current: GymProgram) {
    const mondayLabel = t("Monday {day}", { day: String(monday.getDate()) });
    const startToday = today.getDay() === 1;
    const choices = startToday
      ? [{ iso: todayIso, label: t("Today") }]
      : [
          {
            iso: todayIso,
            label: t("Today, {day}", { day: t(WEEK_DAYS[(today.getDay() + 6) % 7]) }),
          },
          { iso: isoDate(monday), label: mondayLabel },
        ];
    if (!choices.some((one) => one.iso === startsOn)) {
      choices.unshift({ iso: startsOn, label: startsOn });
    }
    const modeLine =
      current.mode === "load"
        ? t("+{kg} kg a week · the last one lighter", { kg: kgText(current.step_kg) })
        : current.mode === "reps"
          ? t("A rep more each week")
          : current.mode === "alternate"
            ? t("Weeks A / B in turn")
            : t("Always the same");
    return (
      <>
        {heading(t("All set"))}
        <Text style={styles.label}>{t("Name").toUpperCase()}</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          maxLength={MAX_NAME}
          placeholder={t("Plan name")}
          placeholderTextColor={color.textFaint}
          accessibilityLabel={t("Plan name")}
          testID="plan-name"
        />
        <Text style={styles.label}>{t("It starts").toUpperCase()}</Text>
        <View style={styles.counts}>
          {choices.map((one) => {
            const on = one.iso === startsOn;
            return (
              <Pressable
                key={one.iso}
                style={[styles.count, styles.startChoice, on && styles.optionOn]}
                onPress={() => setStartsOn(one.iso)}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
                testID={`wizard-start-${one.iso}`}
              >
                <Text style={styles.optionTitle}>{one.label}</Text>
              </Pressable>
            );
          })}
        </View>
        <View style={styles.card}>
          <View style={styles.numbers}>
            {[
              { n: current.sessions.length, label: t("days a week") },
              { n: current.weeks, label: current.weeks === 1 ? t("week") : t("weeks") },
              { n: programItemCount(current), label: t("exercises") },
            ].map((one, i) => (
              <View
                key={one.label}
                style={[styles.number, i === 1 && styles.numberMiddle]}
              >
                <Text style={styles.numberValue}>{one.n}</Text>
                <Text style={styles.small}>{one.label}</Text>
              </View>
            ))}
          </View>
          <View style={styles.summary}>
            {current.sessions.map((session) => (
              <View key={session.day} style={styles.summaryRow}>
                <Text style={styles.summaryKey}>{t(WEEK_DAYS[session.day - 1])}</Text>
                <Text style={styles.summaryValue} numberOfLines={1}>
                  {session.run !== undefined
                    ? runTitle(session.run)
                    : session.outing !== undefined
                      ? outingTitle(session.outing)
                      : `${dayLetter(current.sessions, session.day)} · ${session.name}`}
                </Text>
              </View>
            ))}
            <View style={styles.summaryRow}>
              <Text style={styles.summaryKey}>{t("Weeks")}</Text>
              <Text style={styles.summaryValue}>
                {current.target !== undefined && aim !== null
                  ? t("Toward {target}", { target: aimText(aim) })
                  : modeLine}
              </Text>
            </View>
          </View>
        </View>
        {/* «Ricordamelo alle 8» (TASK-461 B): only on the plan's days. */}
        <Pressable
          style={({ pressed }) => [
            styles.option,
            remind && styles.optionOn,
            pressed && styles.pressed,
          ]}
          onPress={() => setRemind(!remind)}
          accessibilityRole="switch"
          accessibilityState={{ checked: remind }}
          testID="wizard-remind"
        >
          <View style={styles.optionText}>
            <Text style={styles.optionTitle}>{t("Remind me at 8")}</Text>
            <Text style={styles.optionLine}>{t("Only on the plan's days")}</Text>
          </View>
          <View style={[styles.tick, remind && styles.tickOn]}>
            {remind && <Text style={styles.tickText}>✓</Text>}
          </View>
        </Pressable>
      </>
    );
  }
}

const styles = StyleSheet.create({
  wizard: {
    flex: 1,
    gap: space.md,
  },
  centered: {
    textAlign: "center",
  },
  // The door comes before the steps: no bar of the steps over it.
  hidden: {
    opacity: 0,
  },
  top: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  round: {
    width: MIN_TAP_SIZE,
    height: MIN_TAP_SIZE,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: MIN_TAP_SIZE / 2,
  },
  roundText: {
    color: color.text,
    fontSize: fontSize.heading,
  },
  stepLabel: {
    ...font.label,
    color: color.textMuted,
  },
  progress: {
    flexDirection: "row",
    gap: 6,
  },
  segment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: color.surfaceRaised,
  },
  segmentOn: {
    backgroundColor: color.accent,
  },
  body: {
    gap: space.md,
    paddingTop: space.sm,
    paddingBottom: space.xl,
  },
  heading: {
    gap: space.xs,
    marginBottom: space.xs,
  },
  title: {
    color: color.text,
    fontSize: 28,
    lineHeight: 33,
    fontWeight: fontWeight.bold,
    letterSpacing: -0.5,
  },
  lead: {
    ...font.body,
    color: color.textMuted,
  },
  option: {
    minHeight: MIN_TAP_SIZE + space.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
  optionOn: {
    borderWidth: 2,
    borderColor: color.accent,
    backgroundColor: color.surfaceRaised,
  },
  optionText: {
    flex: 1,
    gap: 2,
  },
  optionTitle: {
    color: color.text,
    fontSize: 17,
    fontWeight: fontWeight.semibold,
  },
  optionLine: {
    ...font.small,
    color: color.textMuted,
  },
  tick: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: color.border,
    alignItems: "center",
    justifyContent: "center",
  },
  tickOn: {
    borderColor: color.accent,
    backgroundColor: color.accent,
  },
  tickText: {
    color: color.onAccent,
    fontSize: fontSize.small,
    fontWeight: fontWeight.bold,
  },
  counts: {
    flexDirection: "row",
    gap: space.sm,
  },
  count: {
    flex: 1,
    height: 64,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
  countSmall: {
    height: MIN_TAP_SIZE + space.xs,
  },
  startChoice: {
    height: MIN_TAP_SIZE + space.sm,
  },
  countText: {
    color: color.text,
    fontSize: 24,
    fontWeight: fontWeight.semibold,
  },
  countTextSmall: {
    color: color.text,
    fontSize: 17,
    fontWeight: fontWeight.semibold,
  },
  label: {
    ...font.label,
    color: color.textMuted,
    marginTop: space.xs,
  },
  weekDays: {
    flexDirection: "row",
    gap: 6,
  },
  weekDay: {
    flex: 1,
    height: MIN_TAP_SIZE,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: MIN_TAP_SIZE / 2,
    borderWidth: 1,
    borderColor: color.border,
  },
  weekDayOn: {
    borderColor: color.accent,
    backgroundColor: color.accent,
  },
  weekDayText: {
    color: color.textMuted,
    fontSize: fontSize.small,
  },
  weekDayRun: {
    borderWidth: 2,
    borderColor: color.runDay,
  },
  weekDayTextRun: {
    color: color.runDay,
    fontSize: fontSize.label,
    fontWeight: fontWeight.bold,
  },
  runOn: {
    borderWidth: 2,
    borderColor: color.runDay,
    backgroundColor: color.surfaceRaised,
  },
  noRunsOn: {
    borderWidth: 2,
    borderColor: color.borderStrong,
    backgroundColor: color.surfaceRaised,
  },
  muted: {
    color: color.textMuted,
  },
  letterRun: {
    color: color.runDay,
    fontSize: fontSize.label,
  },
  weekDayTextOn: {
    color: color.onAccent,
    fontWeight: fontWeight.bold,
  },
  small: {
    ...font.small,
    color: color.textMuted,
  },
  center: {
    textAlign: "center",
  },
  card: {
    gap: space.sm,
    padding: space.lg,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
  cardLabel: {
    marginTop: 0,
  },
  splitRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    paddingTop: space.sm,
  },
  letter: {
    width: 36,
    height: 36,
    lineHeight: 36,
    textAlign: "center",
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: color.surfaceRaised,
    color: color.accent,
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold,
  },
  tabs: {
    flexDirection: "row",
    gap: space.xs,
    padding: space.xs,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
  tab: {
    flex: 1,
    minHeight: MIN_TAP_SIZE,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.sm,
  },
  tabWide: {
    flex: 0,
    minWidth: 96,
    paddingHorizontal: space.md,
  },
  tabsScroll: {
    flexGrow: 0,
  },
  tabOn: {
    backgroundColor: color.surfaceRaised,
  },
  tabText: {
    color: color.textMuted,
    fontSize: fontSize.small,
  },
  tabTextOn: {
    color: color.text,
    fontWeight: fontWeight.semibold,
  },
  sessionName: {
    ...font.cardTitle,
    color: color.text,
    minHeight: MIN_TAP_SIZE,
    paddingHorizontal: space.xs,
  },
  note: {
    gap: space.xs,
    padding: space.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
  noteText: {
    ...font.small,
    color: color.textMuted,
  },
  noteStrong: {
    ...font.small,
    color: color.text,
    fontWeight: fontWeight.semibold,
  },
  bars: {
    flexDirection: "row",
    gap: space.sm,
  },
  barColumn: {
    flex: 1,
    alignItems: "center",
    gap: space.xs,
  },
  barTrack: {
    alignSelf: "stretch",
    height: 96,
    justifyContent: "flex-end",
  },
  bar: {
    borderRadius: radius.sm,
    backgroundColor: color.accent,
  },
  barLight: {
    backgroundColor: color.borderStrong,
  },
  barTitle: {
    color: color.text,
    fontSize: fontSize.small,
    fontWeight: fontWeight.semibold,
  },
  barCaption: {
    ...font.detail,
    color: color.textMuted,
  },
  cycle: {
    gap: space.sm,
  },
  input: {
    minHeight: 52,
    paddingHorizontal: space.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.borderStrong,
    backgroundColor: color.surface,
    color: color.text,
    fontSize: 17,
  },
  numbers: {
    flexDirection: "row",
  },
  number: {
    flex: 1,
    alignItems: "center",
    gap: space.xs,
  },
  numberMiddle: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: color.surfaceRaised,
  },
  numberValue: {
    color: color.text,
    fontSize: 26,
    fontWeight: fontWeight.bold,
  },
  summary: {
    gap: space.sm,
    paddingTop: space.md,
    borderTopWidth: 1,
    borderColor: color.surfaceRaised,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: space.md,
  },
  summaryKey: {
    ...font.small,
    color: color.textMuted,
  },
  summaryValue: {
    ...font.small,
    flexShrink: 1,
    color: color.text,
    textAlign: "right",
  },
  primary: {
    minHeight: 56,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
    backgroundColor: color.accent,
  },
  primaryText: {
    color: color.onAccent,
    fontSize: 17,
    fontWeight: fontWeight.bold,
  },
  disabled: {
    opacity: 0.4,
  },
  pressed: {
    opacity: 0.7,
  },
  link: {
    minHeight: MIN_TAP_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  linkText: {
    color: color.textMuted,
    fontSize: fontSize.body,
  },
  danger: {
    color: color.error,
  },
});
