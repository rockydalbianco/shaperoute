import type { GymPlanItem } from "@shaperoute/shared-types";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { useActivitiesDoor } from "../activities/activitiesDoor";
import { WEEKDAYS } from "../activities/calendarText";
import { dayLabel } from "../activities/activityText";
import { ImportedMark } from "../imports/ImportedMark";
import { t } from "../i18n";
import type { PickPhoto } from "../social/PublicParts";
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
  byHandRequest,
  clockMinutes,
  clockText,
  durationSeconds,
  durationText,
  endsByNow,
  firstTime,
  nearDay,
  planWorkouts,
  type PlanWorkout,
  shiftDay,
  startEndMs,
} from "./byHand";
import { gymKey } from "./gymKey";
import { type GymPost, GymPostForm, newGymPost } from "./GymPostForm";
import { gymStyles } from "./gymStyles";
import { useKeptPlans } from "./plans";
import { SessionEditor } from "./SessionEditor";
import { useGymOutbox } from "./useGymOutbox";

type Props = {
  /** The workout kept on the phone: the sheet closes. */
  onDone: () => void;
  /** The fakes of the tests: the clock, the photos, the network. */
  now?: () => Date;
  pick?: PickPhoto;
  fetchFn?: typeof fetch;
  apiKey?: string | null;
};

/**
 * «Gym workout» of the Feed's «+» (TASK-484 part B, ADR-0395): a workout
 * at the gym written by hand afterwards. Its day («‹ ›» from today back to
 * 2020), the time it began and how long it lasted, its exercises in the
 * editor of the plans (a row each, sets × reps at one weight) or copied
 * «From a plan», then «Imported» with what it does not count for, the form
 * of its post started on «Everyone», and «Save». «Save» stays off without
 * exercises; a workout that would end after now says «Pick a time before
 * now.». Kept and sent as a recorded workout is (gym-outbox.json): without
 * a network it waits on the phone.
 */
export function GymByHand({
  onDone,
  now = () => new Date(),
  pick,
  fetchFn,
  apiKey,
}: Props) {
  const { owner } = useActivitiesDoor();
  const plans = useKeptPlans();
  const { saveRequest } = useGymOutbox(fetchFn);
  const [first] = useState(() => firstTime(now()));
  const [day, setDay] = useState(first.day);
  const [startText, setStartText] = useState(clockText(first.startMin));
  const [lengthText, setLengthText] = useState(durationText(first.durationS));
  const [items, setItems] = useState<GymPlanItem[]>([]);
  // From the Feed's «+», «Everyone» (as «From a file», ADR-0387).
  const [post, setPost] = useState<GymPost>(() => {
    const fresh = newGymPost(owner ?? null);
    return { ...fresh, choice: { ...fresh.choice, visibility: "everyone" } };
  });
  // «From a plan» open, and the plan whose days it shows.
  const [choosing, setChoosing] = useState<"plans" | string | null>(null);
  const [problem, setProblem] = useState(false);

  const today = now();
  const workouts = useMemo(() => planWorkouts(plans, day), [plans, day]);
  const startMin = clockMinutes(startText);
  const durationS = durationSeconds(lengthText);
  const time =
    startMin === null || durationS === null ? null : { day, startMin, durationS };
  const late = time !== null && !endsByNow(time, today.getTime());
  const request =
    time === null ? null : byHandRequest(time, items, post.show, today.getTime());

  function save() {
    if (time === null || request === null) {
      return;
    }
    const kept = saveRequest(gymKey(startEndMs(time).startMs), request, post);
    if (kept === "kept") {
      onDone();
    } else {
      setProblem(true);
    }
  }

  function take(workout: PlanWorkout) {
    setItems(workout.items);
    setChoosing(null);
  }

  if (choosing !== null) {
    return (
      <PlanChoice
        workouts={workouts}
        plan={choosing === "plans" ? null : choosing}
        onPlan={(key) => {
          const days = workouts.filter((one) => one.key === key);
          if (days.length === 1) {
            take(days[0]);
          } else {
            setChoosing(key);
          }
        }}
        onTake={take}
        onBack={() => setChoosing(choosing === "plans" ? null : "plans")}
      />
    );
  }

  const near = nearDay(day, today);
  const before = shiftDay(day, -1, today);
  const after = shiftDay(day, 1, today);
  return (
    <View style={styles.flow} testID="gym-by-hand">
      <Text style={gymStyles.title} accessibilityRole="header">
        {t("Gym workout")}
      </Text>
      <View style={styles.field}>
        <Text style={styles.label}>{t("Day")}</Text>
        <View style={styles.day}>
          <Pressable
            style={[styles.arrow, before === null && gymStyles.disabled]}
            disabled={before === null}
            onPress={() => before !== null && setDay(before)}
            accessibilityRole="button"
            accessibilityLabel={t("Previous day")}
            testID="by-hand-day-before"
          >
            <Text style={styles.arrowText}>‹</Text>
          </Pressable>
          <Text style={styles.dayText} testID="by-hand-day">
            {near === "today"
              ? t("Today")
              : near === "yesterday"
                ? t("Yesterday")
                : dayLabel(day.toISOString())}
          </Text>
          <Pressable
            style={[styles.arrow, after === null && gymStyles.disabled]}
            disabled={after === null}
            onPress={() => after !== null && setDay(after)}
            accessibilityRole="button"
            accessibilityLabel={t("Next day")}
            testID="by-hand-day-after"
          >
            <Text style={styles.arrowText}>›</Text>
          </Pressable>
        </View>
      </View>
      <View style={gymStyles.row}>
        <View style={[styles.field, styles.half]}>
          <Text style={styles.label}>{t("Started")}</Text>
          <TextInput
            style={[gymStyles.input, startMin === null && styles.wrong]}
            value={startText}
            onChangeText={setStartText}
            placeholder="18:30"
            placeholderTextColor={color.textFaint}
            keyboardType="numbers-and-punctuation"
            accessibilityLabel={t("Started")}
            testID="by-hand-start"
          />
        </View>
        <View style={[styles.field, styles.half]}>
          <Text style={styles.label}>{t("Duration")}</Text>
          <TextInput
            style={[gymStyles.input, durationS === null && styles.wrong]}
            value={lengthText}
            onChangeText={setLengthText}
            placeholder="1:05"
            placeholderTextColor={color.textFaint}
            keyboardType="numbers-and-punctuation"
            accessibilityLabel={t("Duration")}
            testID="by-hand-duration"
          />
        </View>
      </View>
      {late && (
        <Text style={[gymStyles.muted, gymStyles.danger]} accessibilityRole="alert">
          {t("Pick a time before now.")}
        </Text>
      )}
      {workouts.length > 0 && (
        <Pressable
          style={gymStyles.button}
          onPress={() => setChoosing("plans")}
          accessibilityRole="button"
          testID="by-hand-from-plan"
        >
          <Text style={gymStyles.buttonText}>{t("From a plan")}</Text>
        </Pressable>
      )}
      <SessionEditor items={items} onChange={setItems} />
      <View style={styles.imported}>
        <ImportedMark />
        <Text style={gymStyles.muted}>
          {t(
            "Workouts written by hand don't count for Play, contests, levels or the leaderboard.",
          )}
        </Text>
      </View>
      <GymPostForm
        post={post}
        onPost={setPost}
        pick={pick}
        fetchFn={fetchFn}
        apiKey={apiKey}
      />
      {problem && (
        <Text style={[gymStyles.muted, gymStyles.danger]}>
          {t("This run could not be kept on the phone. Try again.")}
        </Text>
      )}
      <Pressable
        style={[
          gymStyles.button,
          gymStyles.primary,
          request === null && gymStyles.disabled,
        ]}
        disabled={request === null}
        onPress={save}
        accessibilityRole="button"
        accessibilityState={{ disabled: request === null }}
        accessibilityLabel={t("Save to My activities")}
        testID="by-hand-save"
      >
        <Text style={[gymStyles.buttonText, gymStyles.primaryText]}>{t("Save")}</Text>
      </Pressable>
    </View>
  );
}

/** «From a plan»: the plans with a workout, then the days of the one
 * touched when it has more than one. */
function PlanChoice({
  workouts,
  plan,
  onPlan,
  onTake,
  onBack,
}: {
  workouts: PlanWorkout[];
  plan: string | null;
  onPlan: (key: string) => void;
  onTake: (workout: PlanWorkout) => void;
  onBack: () => void;
}) {
  const rows =
    plan === null
      ? workouts.filter(
          (one, index) =>
            workouts.findIndex((other) => other.key === one.key) === index,
        )
      : workouts.filter((one) => one.key === plan);
  return (
    <View style={styles.flow} testID="by-hand-plans">
      <View style={styles.choiceHead}>
        <Pressable
          style={styles.arrow}
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel={t("Back")}
          testID="by-hand-plans-back"
        >
          <Text style={styles.arrowText}>‹</Text>
        </Pressable>
        <Text style={gymStyles.title} accessibilityRole="header">
          {plan === null ? t("From a plan") : rows[0]?.plan}
        </Text>
      </View>
      <View style={styles.card}>
        {rows.map((one, index) => (
          <View key={`${one.key}-${one.day ?? 0}`}>
            {index > 0 && <View style={styles.rule} />}
            <Pressable
              style={({ pressed }) => [styles.choice, pressed && styles.pressed]}
              onPress={() => (plan === null ? onPlan(one.key) : onTake(one))}
              accessibilityRole="button"
              testID={
                plan === null
                  ? `by-hand-plan-${one.key}`
                  : `by-hand-plan-day-${one.day ?? 0}`
              }
            >
              <Text style={gymStyles.text}>
                {plan === null
                  ? one.plan
                  : one.day === null
                    ? one.name
                    : `${t(WEEKDAYS[one.day - 1])} · ${one.name}`}
              </Text>
            </Pressable>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flow: {
    gap: space.lg,
  },
  field: {
    gap: space.xs,
  },
  half: {
    flex: 1,
  },
  label: {
    ...font.small,
    color: color.textMuted,
  },
  day: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
  },
  dayText: {
    flex: 1,
    textAlign: "center",
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
  arrow: {
    width: MIN_TAP_SIZE,
    height: MIN_TAP_SIZE,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: MIN_TAP_SIZE / 2,
    borderWidth: 1,
    borderColor: color.borderStrong,
  },
  arrowText: {
    color: color.text,
    fontSize: fontSize.heading,
  },
  wrong: {
    borderColor: color.error,
  },
  imported: {
    gap: space.xs,
  },
  choiceHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
  },
  card: {
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
    overflow: "hidden",
  },
  rule: {
    height: 1,
    backgroundColor: color.surfaceRaised,
  },
  choice: {
    minHeight: MIN_TAP_SIZE + space.sm,
    justifyContent: "center",
    paddingHorizontal: space.md,
  },
  pressed: {
    opacity: 0.7,
  },
});
