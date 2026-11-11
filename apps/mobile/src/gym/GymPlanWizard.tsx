import {
  type GymPlan,
  type GymPlanGoal,
  type GymPlanMode,
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
import { MAX_NAME } from "./ExercisePicker";
import { WEEK_DAYS } from "./planLimits";
import {
  CYCLE_WEEKS,
  isoDate,
  programDays,
  programItemCount,
  programOfPlan,
  sessionsOfWeek,
} from "./program";
import {
  emptyProgram,
  gymIndex,
  isRunDay,
  proposedRunDays,
  RUN_NAMES,
  GOALS,
  goalOf,
  type Naming,
  proposeProgram,
  proposedDays,
  sessionLetter,
  withCycle,
  withDays,
} from "./proposal";
import { runTitle } from "./runDay";
import { RunDayEditor } from "./RunDayEditor";
import { SessionEditor } from "./SessionEditor";

/** What the guide saves: a plan with its weeks. */
export type WizardDraft = {
  name: string;
  days: number[];
  items: [];
  program: GymProgram;
};

/** The guide's steps (the user's flow of 2026-11-10). */
export type WizardStep = "goal" | "days" | "plan" | "weeks" | "ready";
const STEPS: readonly WizardStep[] = ["goal", "days", "plan", "weeks", "ready"];

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

/** «2,5», «5»: kg without a needless «,0». */
export function kgText(kg: number): string {
  return Number.isInteger(kg) ? String(kg) : decimal(kg);
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
  const [step, setStep] = useState<WizardStep>(startAt);
  const [goal, setGoal] = useState<GymPlanGoal>(kept?.goal ?? "muscle");
  const [days, setDays] = useState<number[]>(
    kept === null
      ? proposedDays(3)
      : kept.sessions.filter((one) => !isRunDay(one)).map((one) => one.day),
  );
  // The run days (TASK-433 C): «And running?», none at first.
  const [runDays, setRunDays] = useState<number[]>(
    kept === null ? [] : kept.sessions.filter(isRunDay).map((one) => one.day),
  );
  const [program, setProgram] = useState<GymProgram | null>(kept);
  // From nothing: the plan's workouts without exercises.
  const [scratch, setScratch] = useState(false);
  // What the program was proposed for: asked again when it changes.
  const [proposedFor, setProposedFor] = useState<string | null>(
    kept === null ? null : `${kept.goal ?? "muscle"}`,
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
  const index = STEPS.indexOf(step);

  function proposed(): GymProgram {
    const forNow = `${goal}`;
    if (program !== null && proposedFor === forNow) {
      return withDays(program, days, naming, runDays);
    }
    const fresh = proposeProgram({
      goal,
      days,
      runDays,
      mode: program?.mode ?? "load",
      weeks: weeksChoice,
      startsOn,
      naming,
    });
    setProposedFor(forNow);
    return scratch ? emptyProgram(fresh, naming) : fresh;
  }

  function next() {
    switch (step) {
      case "goal":
        setStep("days");
        return;
      case "days":
        setProgram(proposed());
        setTab(0);
        setStep("plan");
        return;
      case "plan":
        setStep("weeks");
        return;
      case "weeks":
        if (name.trim() === "") {
          const count = days.length + runDays.length;
          setName(
            (count === 1
              ? t("{goal} · 1 day", { goal: t(goalValues.title) })
              : t("{goal} · {n} days", { goal: t(goalValues.title), n: String(count) })
            ).slice(0, MAX_NAME),
          );
        }
        setStep("ready");
        return;
      case "ready":
        if (program !== null) {
          const named = name.trim().slice(0, MAX_NAME);
          onSave({
            name: named,
            days: programDays(program),
            items: [],
            program: {
              ...program,
              starts_on: startsOn,
              // A workout always has a name (gym_plans.py).
              sessions: program.sessions.map((session) =>
                session.name.trim() === ""
                  ? {
                      ...session,
                      name: t("Workout {letter}", {
                        letter: sessionLetter(
                          Math.max(0, gymIndex(program.sessions, session.day)),
                        ),
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
    if (index === 0) {
      onClose();
      return;
    }
    setStep(STEPS[index - 1]);
  }

  const canGoOn =
    step === "days"
      ? days.length + runDays.length > 0
      : step === "plan"
        ? program !== null &&
          program.sessions.length > 0 &&
          program.sessions.every((one) => isRunDay(one) || one.items.length > 0) &&
          programItemCount(program) <= MAX_PROGRAM_ITEMS
        : step === "ready"
          ? name.trim() !== "" &&
            program !== null &&
            programItemCount(program) <= MAX_PROGRAM_ITEMS
          : true;
  const primaryLabel =
    step === "plan"
      ? t("Looks good")
      : step === "ready"
        ? t("Save plan")
        : week !== null
          ? t("Done")
          : t("Continue");

  let body: ReactNode = null;
  if (week !== null && program !== null) {
    body = weekPage(program, week);
  } else if (step === "goal") {
    body = goalPage();
  } else if (step === "days") {
    body = daysPage();
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
          {t("Step {n} of {total}", {
            n: String(index + 1),
            total: String(STEPS.length),
          }).toUpperCase()}
        </Text>
        <View style={styles.round} />
      </View>
      <View style={styles.progress} accessibilityElementsHidden>
        {STEPS.map((one, i) => (
          <View key={one} style={[styles.segment, i <= index && styles.segmentOn]} />
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
    return (
      <>
        {heading(
          t("What do you want to achieve?"),
          t("Sets, reps and rest come from here. You can change them later."),
        )}
        {GOALS.map((one) => {
          const on = one.goal === goal;
          const values = `${one.main.sets} × ${one.main.reps} · ${restLabel(one.restS)}`;
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
      </>
    );
  }

  /** A day touched in «Your week»: the gym, then a run, then rest. */
  function touchDay(number: number) {
    if (days.includes(number)) {
      setDays(days.filter((one) => one !== number));
      setRunDays([...runDays, number]);
    } else if (runDays.includes(number)) {
      setRunDays(runDays.filter((one) => one !== number));
    } else {
      setDays([...days, number]);
    }
  }

  function daysPage() {
    const shown = [...days].sort((a, b) => a - b);
    const runs = [...runDays].sort((a, b) => a - b);
    const split = proposeProgram({
      goal,
      days: shown,
      runDays: runs,
      mode: "same",
      weeks: 1,
      startsOn,
      naming,
    }).sessions;
    const sessions =
      program !== null && proposedFor === goal && !scratch
        ? withDays(program, shown, naming, runs).sessions
        : split;
    return (
      <>
        {heading(t("How many days a week?"))}
        <View style={styles.counts}>
          {[2, 3, 4, 5].map((count) => {
            const on = days.length === count;
            return (
              <Pressable
                key={count}
                style={({ pressed }) => [
                  styles.count,
                  on && styles.optionOn,
                  pressed && styles.pressed,
                ]}
                onPress={() => {
                  const gym = proposedDays(count);
                  setDays(gym);
                  setRunDays(proposedRunDays(runDays.length, gym));
                }}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
                testID={`wizard-count-${count}`}
              >
                <Text style={styles.countText}>{count}</Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={styles.label}>{t("And running?").toUpperCase()}</Text>
        <View style={styles.counts}>
          {[0, 1, 2, 3].map((count) => {
            const on = runDays.length === count;
            return (
              <Pressable
                key={count}
                style={({ pressed }) => [
                  styles.count,
                  styles.countSmall,
                  // «No» is no run: chosen, it looks chosen, not blue.
                  on && (count === 0 ? styles.noRunsOn : styles.runOn),
                  pressed && styles.pressed,
                ]}
                onPress={() => setRunDays(proposedRunDays(count, days))}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
                testID={`wizard-runs-${count}`}
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
        <Text style={styles.label}>{t("Your week").toUpperCase()}</Text>
        <View style={styles.weekDays}>
          {WEEK_DAYS.map((day, i) => {
            const number = i + 1;
            const gym = days.includes(number);
            const run = runDays.includes(number);
            const session = sessions.find((one) => one.day === number);
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
                accessibilityLabel={`${t(day)}: ${gym ? t("Gym") : run ? t("Run") : t("Rest")}`}
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
                    ? sessionLetter(Math.max(0, gymIndex(sessions, number)))
                    : run
                      ? "RUN"
                      : t(day).slice(0, 2)}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={styles.small}>
          {t("Touch a day to change it: gym, run or rest.")}
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
    return session.run !== undefined ? (
      <Text style={[styles.letter, styles.letterRun]}>RUN</Text>
    ) : (
      <Text style={styles.letter}>
        {sessionLetter(Math.max(0, gymIndex(sessions, session.day)))}
      </Text>
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
                : sessionLetter(Math.max(0, gymIndex(sessions, session.day)))
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
            : t("Ready to use. Touch an exercise to change it."),
        )}
        {tabs(current.sessions, shown, setTab)}
        {session.run !== undefined ? (
          <RunDayEditor
            run={session.run}
            mode={current.mode}
            weeks={current.weeks}
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
              {t("Write the kg at the first workout")}
            </Text>
          </View>
        )}
      </>
    );
  }

  function weeksPage(current: GymProgram) {
    const length = current.weeks;
    const counted = current.mode === "load" || current.mode === "reps";
    const lead =
      current.mode === "same"
        ? t("The same week, again and again.")
        : current.mode === "alternate"
          ? t("Two weeks in turn, again and again.")
          : t("A cycle of {n} weeks, then again with the new weights.", {
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
                      current.mode === "load" &&
                        length >= 3 &&
                        number === length &&
                        styles.barLight,
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
            {t("Touch a week to change it.")}
          </Text>
        </View>
        {MODES.map((one) => {
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
                  {t(one.line, { kg: kgText(current.step_kg || 2.5) })}
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
                    : `${sessionLetter(Math.max(0, gymIndex(current.sessions, session.day)))} · ${session.name}`}
                </Text>
              </View>
            ))}
            <View style={styles.summaryRow}>
              <Text style={styles.summaryKey}>{t("Weeks")}</Text>
              <Text style={styles.summaryValue}>{modeLine}</Text>
            </View>
          </View>
        </View>
      </>
    );
  }
}

const styles = StyleSheet.create({
  wizard: {
    flex: 1,
    gap: space.md,
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
