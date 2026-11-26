import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { isTrackless } from "../activities/snow";
import type { Activity } from "../api/activities";
import { gymStyles } from "../gym/gymStyles";
import type { HealthWorkout } from "../health/energyReader";
import { t } from "../i18n";
import { clockLabel } from "../navigation/freeRun";
import { isPoolSwimRun } from "../pool/PoolTile";
import { findProfile, SPORT_PROFILES } from "../sports";
import { color, font, fontWeight, MIN_TAP_SIZE, space } from "../theme/tokens";
import { Hairline } from "../ui/Hairline";
import { Tap } from "../ui/Tap";
import { runDistanceLabel } from "../units/format";
import { type DayEnergy, healthKey } from "./activityEnergy";
import { NutritionSheet } from "./AddFoodSheet";
import { EnergyEditForm } from "./EnergyEditForm";
import { ACTIVITY_KCAL, REST_KCAL_PER_DAY } from "./energyEdits";
import { kcalLabel } from "./MealCard";
import { stopAppleHealth, turnOnAppleHealth } from "./useHealthEnergy";
import { writeActivityKcal, writeRest } from "./useNutrition";

/** «Run · 4.01 km», «Gym · 50:00», «Pool swim · 0.80 km»: the sport and
 * how much of it, in the app's units. */
export function activityName(activity: Activity): string {
  const sport = activity.activity;
  const profile = findProfile(sport ?? "running");
  const name = isPoolSwimRun(activity)
    ? t("Pool swim")
    : profile === undefined
      ? t("Run")
      : t(profile.name);
  const much = isTrackless(sport)
    ? clockLabel(activity.duration_s * 1000)
    : runDistanceLabel(activity.distance_m);
  return `${name} · ${much}`;
}

function clockOf(when: Date): string {
  const two = (value: number) => String(value).padStart(2, "0");
  return Number.isNaN(when.getTime())
    ? ""
    : `${two(when.getHours())}:${two(when.getMinutes())}`;
}

/** «07:10»: when it began, on the phone's clock. */
export function startTime(activity: Activity): string {
  return clockOf(new Date(activity.started_at));
}

/** «Ride · 21.40 km», «Workout · 45:00»: a workout another app recorded,
 * named as MuW names that sport when it knows it. */
export function workoutName(workout: HealthWorkout): string {
  const profile = SPORT_PROFILES.find(
    (sport) => sport.appleWorkout === workout.activityType,
  );
  const name = profile === undefined ? t("Workout") : t(profile.name);
  const much =
    workout.metres !== null && workout.metres > 0
      ? runDistanceLabel(workout.metres)
      : clockLabel(workout.endMs - workout.startMs);
  return `${name} · ${much}`;
}

type Props = {
  visible: boolean;
  /** The energy of the day the diary shows. */
  energy: DayEnergy;
  onClose: () => void;
};

/**
 * «Energy you use» (TASK-489 part C1, ADR-0397): what «Used (est.)» is
 * made of. The rest of the day, then each activity of the private list
 * that began that day with its calories. A tap on the rest or on an
 * activity opens the field where the user writes their own number over
 * MuW's estimate (the user's request of 2026-11-23); a number written by
 * hand says so, «(set by you)» for the rest and «edited» for an activity.
 *
 * With Apple Health (part C2): «Use Apple Health» is the user's yes to
 * reading it, asked here and nowhere else. On a day Health has the active
 * energy of, that number counts alone and the activities are listed under
 * it without being added again; on a day it has not, the workouts other
 * apps recorded count beside MuW's, «from Apple Health». «Stop using Apple
 * Health» forgets the yes.
 *
 * Kept on this phone: nothing here changes an activity, its post or what
 * Apple Health has of it.
 */
export function EnergySheet({ visible, energy, onClose }: Props) {
  return (
    <NutritionSheet visible={visible} onClose={onClose} testID="energy-sheet">
      <Body energy={energy} onClose={onClose} />
    </NutritionSheet>
  );
}

/** What the sheet shows: the list, the rest's field, or an activity's. */
type Step =
  | { kind: "list" }
  | { kind: "rest" }
  | { kind: "activity"; id: string }
  /** A workout another app recorded, by Health's id. */
  | { kind: "other"; id: string };

function Body({ energy, onClose }: Omit<Props, "visible">) {
  const [step, setStep] = useState<Step>({ kind: "list" });
  const list = () => setStep({ kind: "list" });

  if (step.kind === "rest") {
    return (
      <EnergyEditForm
        title={t("Energy at rest")}
        unit={t("kcal a day")}
        hint={t(
          "Your own number, for example the one your dietitian measured. It takes the place of MuW's estimate.",
        )}
        estimate={energy.restEstimate}
        written={energy.rest.edited ? energy.rest.kcal : null}
        range={REST_KCAL_PER_DAY}
        onWritten={(kcal) => {
          writeRest(kcal);
          list();
        }}
        onCancel={list}
      />
    );
  }

  const touched =
    step.kind === "activity"
      ? energy.activities.find((one) => one.activity.id === step.id)
      : undefined;
  if (touched !== undefined) {
    return (
      <EnergyEditForm
        title={t("Calories of this activity")}
        about={`${activityName(touched.activity)} · ${startTime(touched.activity)}`}
        unit="kcal"
        hint={t(
          "Your number stays on this phone. Your post and Apple Health keep theirs.",
        )}
        estimate={touched.estimate}
        written={touched.counted.edited ? touched.counted.kcal : null}
        range={ACTIVITY_KCAL}
        onWritten={(kcal) => {
          writeActivityKcal(touched.activity.id, kcal);
          list();
        }}
        onCancel={list}
      />
    );
  }

  const other =
    step.kind === "other"
      ? energy.others.find((one) => one.workout.id === step.id)
      : undefined;
  if (other !== undefined) {
    return (
      <EnergyEditForm
        title={t("Calories of this activity")}
        about={`${workoutName(other.workout)} · ${clockOf(new Date(other.workout.startMs))}`}
        unit="kcal"
        hint={t(
          "Your number stays on this phone. Your post and Apple Health keep theirs.",
        )}
        estimate={other.estimate}
        written={other.counted.edited ? other.counted.kcal : null}
        range={ACTIVITY_KCAL}
        onWritten={(kcal) => {
          writeActivityKcal(healthKey(other.workout), kcal);
          list();
        }}
        onCancel={list}
      />
    );
  }

  const { used, rest } = energy;
  // The day is counted from Apple Health's active energy: the activities
  // are inside it already.
  const inside = energy.healthActive !== null;
  const restLabel = used === null ? "—" : kcalLabel(used.rest);
  const mine = rest.edited ? ` ${t("(set by you)")}` : "";
  return (
    <View style={styles.step}>
      <Text style={styles.title} accessibilityRole="header">
        {t("Energy you use")}
      </Text>
      <ScrollView style={styles.rows} keyboardShouldPersistTaps="handled">
        <Tap
          style={styles.row}
          onPress={() => setStep({ kind: "rest" })}
          accessibilityRole="button"
          accessibilityLabel={`${t("At rest")}${mine}, ${restLabel}`}
          testID="energy-rest"
        >
          <Text style={styles.name}>
            {t("At rest")}
            <Text style={styles.muted}>{mine}</Text>
          </Text>
          <Text style={styles.kcal}>{restLabel}</Text>
        </Tap>
        {inside && used !== null && (
          <View
            style={styles.row}
            accessible
            accessibilityLabel={`${t("Active energy")}, ${t("from Apple Health")}, ${kcalLabel(used.active)}`}
            testID="energy-health-active"
          >
            <View style={styles.words}>
              <Text style={styles.name}>{t("Active energy")}</Text>
              <Text style={styles.muted}>{t("from Apple Health")}</Text>
            </View>
            <Text style={styles.kcal}>{kcalLabel(used.active)}</Text>
          </View>
        )}
        <Text style={styles.heading} accessibilityRole="header">
          {t("Activities")}
        </Text>
        {energy.hub === "off" && (
          <Text style={styles.note}>{t("Log in to count your activities.")}</Text>
        )}
        {energy.hub === "failed" && (
          <Text style={styles.note}>
            {t(
              "Your activities could not be loaded. Only the energy at rest is counted.",
            )}
          </Text>
        )}
        {energy.hub === "loading" && <Text style={styles.note}>{t("Loading…")}</Text>}
        {energy.hub === "ready" &&
          energy.activities.length === 0 &&
          energy.others.length === 0 && (
            <Text style={styles.note}>{t("No activities on this day.")}</Text>
          )}
        {energy.activities.map((one) => (
          <ActivityLine
            key={one.activity.id}
            name={activityName(one.activity)}
            time={startTime(one.activity)}
            kcal={one.counted.kcal}
            edited={one.counted.edited}
            quiet={inside}
            onPress={() => setStep({ kind: "activity", id: one.activity.id })}
            testID={`energy-activity-${one.activity.id}`}
          />
        ))}
        {energy.others.map((one) => (
          <ActivityLine
            key={one.workout.id}
            name={workoutName(one.workout)}
            time={clockOf(new Date(one.workout.startMs))}
            kcal={one.counted.kcal}
            edited={one.counted.edited}
            fromHealth
            quiet={inside}
            onPress={() => setStep({ kind: "other", id: one.workout.id })}
            testID={`energy-other-${one.workout.id}`}
          />
        ))}
        {inside && (
          <Text style={styles.muted}>
            {t(
              "Your activities are already inside Apple Health's active energy: they are not added again.",
            )}
          </Text>
        )}
        {energy.health === "on" && used !== null && !inside && (
          <Text style={styles.muted}>
            {t("Apple Health has nothing for this day: your activities are counted.")}
          </Text>
        )}
        <Hairline />
        <View style={styles.row}>
          <Text style={styles.total}>{t("Used (est.)")}</Text>
          <Text style={styles.total} testID="energy-used">
            {used === null ? "—" : kcalLabel(used.used)}
          </Text>
        </View>
        {energy.soFar && (
          <Text style={styles.muted}>
            {t("Today the energy at rest is counted up to now.")}
          </Text>
        )}
        {energy.health === "off" && (
          <View style={styles.health}>
            <Tap
              style={[gymStyles.button, styles.close]}
              onPress={() => void turnOnAppleHealth()}
              accessibilityRole="button"
              testID="energy-health-use"
            >
              <Text style={gymStyles.buttonText}>{t("Use Apple Health")}</Text>
            </Tap>
            <Text style={styles.muted}>
              {t(
                "MuW reads your active energy and the workouts other apps recorded, to count the energy you use. They are read on your phone and stay there.",
              )}
            </Text>
          </View>
        )}
        {energy.health === "on" && (
          <Tap
            style={styles.link}
            onPress={stopAppleHealth}
            accessibilityRole="button"
            testID="energy-health-stop"
          >
            <Text style={styles.linkText}>{t("Stop using Apple Health")}</Text>
          </Tap>
        )}
      </ScrollView>
      <Tap
        style={[gymStyles.button, styles.close]}
        onPress={onClose}
        accessibilityRole="button"
        testID="energy-close"
      >
        <Text style={gymStyles.buttonText}>{t("Close")}</Text>
      </Tap>
    </View>
  );
}

function ActivityLine({
  name,
  time,
  kcal,
  edited,
  fromHealth = false,
  quiet = false,
  onPress,
  testID,
}: {
  name: string;
  time: string;
  kcal: number;
  edited: boolean;
  /** A workout another app recorded, read from Apple Health. */
  fromHealth?: boolean;
  /** Listed, not added: the day is counted from Health's active energy. */
  quiet?: boolean;
  onPress: () => void;
  testID: string;
}) {
  const energy = kcalLabel(kcal);
  const mark = edited ? t("edited") : null;
  const source = fromHealth ? t("from Apple Health") : null;
  return (
    <Tap
      style={styles.row}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={[name, time, source, energy, mark]
        .filter((part) => part !== null && part !== "")
        .join(", ")}
      testID={testID}
    >
      <View style={styles.words}>
        <Text style={[styles.name, quiet && styles.quiet]} numberOfLines={1}>
          {name}
        </Text>
        <Text style={styles.muted}>
          {source === null ? time : `${time} · ${source}`}
        </Text>
      </View>
      <View style={styles.amount}>
        <Text style={[styles.kcal, quiet && styles.quiet]}>{energy}</Text>
        {mark !== null && <Text style={styles.muted}>{mark}</Text>}
      </View>
    </Tap>
  );
}

const styles = StyleSheet.create({
  step: {
    flexShrink: 1,
    gap: space.sm,
  },
  title: {
    ...font.heading,
    color: color.text,
  },
  rows: {
    flexShrink: 1,
  },
  row: {
    minHeight: MIN_TAP_SIZE,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space.md,
    paddingVertical: space.xs,
  },
  words: {
    flexShrink: 1,
  },
  amount: {
    alignItems: "flex-end",
  },
  name: {
    ...font.body,
    flexShrink: 1,
    color: color.text,
  },
  kcal: {
    ...font.body,
    color: color.text,
  },
  heading: {
    ...font.small,
    color: color.textMuted,
    marginTop: space.sm,
  },
  note: {
    ...font.body,
    color: color.textMuted,
    paddingVertical: space.sm,
  },
  muted: {
    ...font.small,
    color: color.textMuted,
  },
  total: {
    ...font.body,
    fontWeight: fontWeight.semibold,
    color: color.text,
  },
  quiet: {
    color: color.textMuted,
  },
  health: {
    gap: space.sm,
    marginTop: space.md,
  },
  link: {
    minHeight: MIN_TAP_SIZE,
    justifyContent: "center",
    alignSelf: "flex-start",
  },
  linkText: {
    ...font.body,
    color: color.text,
    textDecorationLine: "underline",
  },
  close: {
    flex: 0,
  },
});
