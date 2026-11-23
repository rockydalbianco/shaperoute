import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { isTrackless } from "../activities/snow";
import type { Activity } from "../api/activities";
import { gymStyles } from "../gym/gymStyles";
import { t } from "../i18n";
import { clockLabel } from "../navigation/freeRun";
import { isPoolSwimRun } from "../pool/PoolTile";
import { findProfile } from "../sports";
import { color, font, fontWeight, MIN_TAP_SIZE, space } from "../theme/tokens";
import { Hairline } from "../ui/Hairline";
import { Tap } from "../ui/Tap";
import { runDistanceLabel } from "../units/format";
import type { DayEnergy, EnergyActivity } from "./activityEnergy";
import { NutritionSheet } from "./AddFoodSheet";
import { EnergyEditForm } from "./EnergyEditForm";
import { ACTIVITY_KCAL, REST_KCAL_PER_DAY } from "./energyEdits";
import { kcalLabel } from "./MealCard";
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

/** «07:10»: when it began, on the phone's clock. */
export function startTime(activity: Activity): string {
  const when = new Date(activity.started_at);
  const two = (value: number) => String(value).padStart(2, "0");
  return Number.isNaN(when.getTime())
    ? ""
    : `${two(when.getHours())}:${two(when.getMinutes())}`;
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
type Step = { kind: "list" } | { kind: "rest" } | { kind: "activity"; id: string };

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

  const { used, rest } = energy;
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
        {energy.hub === "ready" && energy.activities.length === 0 && (
          <Text style={styles.note}>{t("No activities on this day.")}</Text>
        )}
        {energy.activities.map((one) => (
          <ActivityLine
            key={one.activity.id}
            one={one}
            onPress={() => setStep({ kind: "activity", id: one.activity.id })}
          />
        ))}
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

function ActivityLine({ one, onPress }: { one: EnergyActivity; onPress: () => void }) {
  const name = activityName(one.activity);
  const time = startTime(one.activity);
  const kcal = kcalLabel(one.counted.kcal);
  const edited = one.counted.edited ? t("edited") : null;
  return (
    <Tap
      style={styles.row}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={[name, time, kcal, edited]
        .filter((part) => part !== null && part !== "")
        .join(", ")}
      testID={`energy-activity-${one.activity.id}`}
    >
      <View style={styles.words}>
        <Text style={styles.name} numberOfLines={1}>
          {name}
        </Text>
        <Text style={styles.muted}>{time}</Text>
      </View>
      <View style={styles.amount}>
        <Text style={styles.kcal}>{kcal}</Text>
        {edited !== null && <Text style={styles.muted}>{edited}</Text>}
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
  close: {
    flex: 0,
  },
});
