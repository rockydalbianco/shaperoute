import {
  POOL_LENGTHS_MAX,
  POOL_MAX_SPEED_M_S,
  SLEEP_SHOWN_DEFAULT,
} from "@shaperoute/shared-types";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { SIGN_IN_TO_KEEP_RUNS, useActivitiesDoor } from "../activities/activitiesDoor";
import { keepSleepFor } from "../activities/sleepOut";
import { isSeen } from "../api/drawings";
import { useBody } from "../body/useBody";
import { gymStyles } from "../gym/gymStyles";
import { heartReader } from "../health/heartModules";
import type { HeartReader } from "../health/heartSamples";
import { healthPhone } from "../health/healthModules";
import type { HealthPhone } from "../health/healthPhone";
import { HealthRunEnd } from "../health/HealthRunEnd";
import { sleepReader } from "../health/sleepModules";
import { SleepRunEnd } from "../health/SleepRunEnd";
import type { SleepReader } from "../health/sleepSamples";
import { useLastNight } from "../health/useLastNight";
import { useHealth } from "../health/useHealth";
import { t } from "../i18n";
import { clockLabel } from "../navigation/freeRun";
import type { PickPhoto } from "../social/PublicParts";
import { color, fontSize, fontWeight, MIN_TAP_SIZE, space } from "../theme/tokens";
import { averagePace } from "./poolChoice";
import { PoolHeartLines } from "./PoolHeartLines";
import type { PoolHeart as PoolHeartRead } from "./poolHeart";
import { metresLabel } from "./PoolDraw";
import { savePoolToHealth } from "./poolHealth";
import { poolKcal, poolKcalLabel } from "./poolKcal";
import { newPoolPost, type PoolPost, PoolPostForm } from "./PoolPostForm";
import {
  activeMs,
  estimateLengths,
  isTooFast,
  pacePer100S,
  parseLengths,
  poolMetres,
  type PoolSwim,
} from "./poolSwim";
import type { PoolSaved } from "./usePoolOutbox";
import { usePoolHeart } from "./usePoolHeart";
import { endPoolSwim } from "./usePoolSwim";

/** The most lengths of `poolLengthM` in `activeS` the API takes: no faster
 * than 2.5 m/s, at most 1000. */
export function maxLengths(activeS: number, poolLengthM: number): number {
  const fastest = Math.floor((activeS * POOL_MAX_SPEED_M_S) / poolLengthM + 1e-9);
  return Math.min(POOL_LENGTHS_MAX, fastest);
}

/**
 * The swim in a pool ended (TASK-400 part B, ADR-0334, point 3): «How many
 * lengths?» with the estimate from its time, to correct with − and + or by
 * writing it; then lengths, metres, time, pace /100 m and calories (with
 * the body of «Body», TASK-409 part A). Lengths faster
 * than 2.5 m/s, which the API refuses, stay not valid and «Save» waits.
 * «Save» keeps it on the phone and sends it, and writes it to Apple Health
 * or Health Connect after the user's yes; «Discard» asks first. Under the
 * figures the form of its post (TASK-400 part C), as at the end of a
 * workout. Signed out, it says to sign in, as the end of a workout does:
 * `onSignIn` is the way there of what shows it over the app (TASK-453).
 * Over «Save», «Sleep last night» as at the end of a run (TASK-467 part
 * B2b): nothing in any build until part C, where the phone has no reader.
 */
export function PoolSwimEnd({
  swim,
  onSave,
  onSignIn,
  health: phone = healthPhone(),
  heart: reader = heartReader(),
  sleep: sleepPhone = sleepReader(),
  pick,
  fetchFn,
  apiKey,
}: {
  swim: PoolSwim;
  onSave: (
    swim: PoolSwim,
    lengths: number,
    post?: PoolPost,
    heart?: PoolHeartRead | null,
  ) => PoolSaved;
  /** «Sign up or log in», signed out; without it, the account's own door. */
  onSignIn?: () => void;
  /** The phone's health data; for the tests, a fake. */
  health?: HealthPhone | null;
  /** Where the heart rate is read (TASK-409 part B); for the tests, a fake. */
  heart?: HeartReader | null;
  /** The phone's reader of the sleep (TASK-467): none until part C. */
  sleep?: SleepReader | null;
  /** The fakes of the tests: the photo picker, the fetch of the tag search. */
  pick?: PickPhoto;
  fetchFn?: typeof fetch;
  apiKey?: string | null;
}) {
  const insets = useSafeAreaInsets();
  const { signedIn, signIn, owner } = useActivitiesDoor();
  const [post, setPost] = useState<PoolPost>(() => newPoolPost(owner));
  const healthState = useHealth(phone);
  const body = useBody();
  const { state: heartState, add: addHeart } = usePoolHeart(reader, swim);
  const heart = heartState.kind === "heart" ? heartState.heart : null;
  const activeS = activeMs(swim, swim.endedMs ?? swim.startedMs) / 1000;
  const most = maxLengths(activeS, swim.poolLengthM);
  const [text, setText] = useState(() =>
    String(
      Math.min(
        Math.max(1, most),
        estimateLengths(activeS, swim.poolLengthM, averagePace()),
      ),
    ),
  );
  const [discarding, setDiscarding] = useState(false);
  const [problem, setProblem] = useState(false);
  // «Sleep last night» (TASK-467 part B2b), as at the end of a run: the
  // night before the swim began, on until turned off, shown and sent only
  // with a post others see.
  const lastNight = useLastNight(sleepPhone, swim.startedMs);
  const [sleepShown, setSleepShown] = useState(SLEEP_SHOWN_DEFAULT);
  const night = signedIn && isSeen(post.choice.visibility) ? lastNight : null;

  const written = parseLengths(text);
  const metres = written === null ? null : poolMetres(written, swim.poolLengthM);
  const lengths =
    written !== null && metres !== null && !isTooFast(activeS, metres) ? written : null;
  const pace = metres === null ? null : pacePer100S(activeS, metres);
  const kcal =
    lengths === null || metres === null
      ? null
      : poolKcalLabel(
          poolKcal(metres, activeS, body, new Date(swim.startedMs).getFullYear()),
        );

  function step(by: number) {
    const from = written ?? 0;
    setText(String(Math.min(Math.max(1, most), Math.max(1, from + by))));
  }

  function save() {
    if (lengths === null) {
      return;
    }
    const saved = onSave(swim, lengths, post, heart);
    if (saved === "kept") {
      // The night goes only when the post shows it; otherwise nothing of
      // it leaves the phone.
      if (owner !== null && night !== null && sleepShown) {
        keepSleepFor(owner, swim.key, { ...night, shown: true });
      }
      // Written there, on the phone, with no network; never fails «Save».
      void savePoolToHealth(phone, swim, lengths);
      endPoolSwim();
    } else {
      setProblem(true);
    }
  }

  return (
    <View style={gymStyles.screen} testID="pool-end">
      <ScrollView
        contentContainerStyle={[
          gymStyles.content,
          {
            paddingTop: insets.top + space.lg,
            paddingBottom: insets.bottom + space.xl,
          },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.head}>
          <Text style={gymStyles.muted}>
            {`🏊 ${t("Pool swim")} · ${metresLabel(swim.poolLengthM)}`}
          </Text>
          <Text style={gymStyles.title} accessibilityRole="header">
            {t("How many lengths?")}
          </Text>
        </View>
        <View style={styles.lengths}>
          <Pressable
            style={[styles.step, (written ?? 0) <= 1 && gymStyles.disabled]}
            disabled={(written ?? 0) <= 1}
            onPress={() => step(-1)}
            accessibilityRole="button"
            accessibilityLabel="−"
            testID="pool-fewer"
          >
            <Text style={styles.stepText}>−</Text>
          </Pressable>
          <TextInput
            style={[styles.count, lengths === null && styles.invalid]}
            value={text}
            onChangeText={setText}
            keyboardType="number-pad"
            maxLength={4}
            accessibilityLabel={t("How many lengths?")}
            testID="pool-lengths"
          />
          <Pressable
            style={[styles.step, (written ?? 0) >= most && gymStyles.disabled]}
            disabled={(written ?? 0) >= most}
            onPress={() => step(1)}
            accessibilityRole="button"
            accessibilityLabel="+"
            testID="pool-more"
          >
            <Text style={styles.stepText}>+</Text>
          </Pressable>
        </View>
        <View style={styles.figures}>
          <Figure
            label={t("Lengths")}
            value={lengths === null ? "–" : String(lengths)}
          />
          <Figure
            label={t("Distance")}
            value={lengths === null || metres === null ? "–" : `${metres} m`}
            testID="pool-metres"
          />
          <Figure
            label={t("Time")}
            value={clockLabel(activeS * 1000)}
            testID="pool-time"
          />
          <Figure
            label={t("Pace /100 m")}
            value={lengths === null || pace === null ? "–" : clockLabel(pace * 1000)}
            testID="pool-pace"
          />
          <Figure label={t("Calories")} value={kcal ?? "–"} testID="pool-kcal" energy />
        </View>
        <PoolHeartLines state={heartState} onAdd={addHeart} />
        {signedIn && (
          <PoolPostForm
            post={post}
            onPost={setPost}
            heart={heart !== null}
            pick={pick}
            fetchFn={fetchFn}
            apiKey={apiKey}
          />
        )}
        {phone !== null && signedIn && (
          <HealthRunEnd store={phone.store} health={healthState} />
        )}
        <SleepRunEnd night={night} shown={sleepShown} onShown={setSleepShown} />
        {problem && (
          <Text style={[gymStyles.muted, gymStyles.danger]}>
            {t("This run could not be kept on the phone. Try again.")}
          </Text>
        )}
        {!signedIn && (
          <Pressable onPress={onSignIn ?? signIn} accessibilityRole="button">
            <Text style={[gymStyles.text, styles.link]}>{t(SIGN_IN_TO_KEEP_RUNS)}</Text>
          </Pressable>
        )}
        {discarding ? (
          <View style={gymStyles.row}>
            <Pressable
              style={gymStyles.button}
              onPress={() => setDiscarding(false)}
              accessibilityRole="button"
            >
              <Text style={gymStyles.buttonText}>{t("Keep it")}</Text>
            </Pressable>
            <Pressable
              style={gymStyles.button}
              onPress={endPoolSwim}
              accessibilityRole="button"
              testID="pool-discard-sure"
            >
              <Text style={[gymStyles.buttonText, gymStyles.danger]}>
                {t("Discard")}
              </Text>
            </Pressable>
          </View>
        ) : (
          <View style={gymStyles.row}>
            <Pressable
              style={gymStyles.button}
              onPress={() => setDiscarding(true)}
              accessibilityRole="button"
              testID="pool-discard"
            >
              <Text style={[gymStyles.buttonText, gymStyles.danger]}>
                {t("Discard")}
              </Text>
            </Pressable>
            {signedIn && (
              <Pressable
                style={[
                  gymStyles.button,
                  gymStyles.primary,
                  lengths === null && gymStyles.disabled,
                ]}
                disabled={lengths === null}
                onPress={save}
                accessibilityRole="button"
                accessibilityLabel={t("Save to My activities")}
                testID="pool-save"
              >
                <Text style={[gymStyles.buttonText, gymStyles.primaryText]}>
                  {t("Save")}
                </Text>
              </Pressable>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function Figure({
  label,
  value,
  testID,
  energy = false,
}: {
  label: string;
  value: string;
  testID?: string;
  /** The calories: in red (TASK-424 part C3). */
  energy?: boolean;
}) {
  return (
    <View style={styles.figure} accessible accessibilityLabel={`${label}: ${value}`}>
      <Text style={[styles.value, energy && styles.energy]} testID={testID}>
        {value}
      </Text>
      <Text style={gymStyles.muted}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  head: {
    alignItems: "center",
    gap: space.xs,
  },
  lengths: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: space.md,
  },
  step: {
    width: MIN_TAP_SIZE + space.md,
    height: MIN_TAP_SIZE + space.md,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: (MIN_TAP_SIZE + space.md) / 2,
    borderWidth: 1,
    borderColor: color.borderStrong,
    backgroundColor: color.surfaceRaised,
  },
  stepText: {
    color: color.text,
    fontSize: fontSize.display,
    fontWeight: fontWeight.bold,
  },
  count: {
    minWidth: 120,
    minHeight: MIN_TAP_SIZE + space.md,
    textAlign: "center",
    borderRadius: space.md,
    borderWidth: 1,
    borderColor: color.borderStrong,
    backgroundColor: color.surfaceRaised,
    color: color.text,
    fontSize: fontSize.display,
    fontWeight: fontWeight.bold,
    fontVariant: ["tabular-nums"],
  },
  invalid: {
    borderColor: color.error,
  },
  figures: {
    flexDirection: "row",
    flexWrap: "wrap",
    rowGap: space.md,
  },
  figure: {
    width: "50%",
    alignItems: "center",
    gap: space.xs,
  },
  value: {
    color: color.text,
    fontSize: fontSize.heading,
    fontWeight: fontWeight.bold,
    fontVariant: ["tabular-nums"],
  },
  // The calories, in red wherever they are (TASK-424 part C3).
  energy: {
    color: color.energy,
  },
  link: {
    textDecorationLine: "underline",
  },
});
