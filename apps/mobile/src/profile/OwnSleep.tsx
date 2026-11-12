import type { SleepSummary } from "@shaperoute/shared-types";
import { useEffect, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";

import { accountProblem, sessionEnded } from "../account/messages";
import {
  fetchProfileSleep,
  shareSleepNight,
  stopSharingSleep,
} from "../api/sleepProfile";
import { keepSleepOn, loadSleepOn } from "../health/sleepChoice";
import { sleepPostsOn, sleepReader } from "../health/sleepModules";
import {
  keepSleepShareConfirmed,
  loadSleepShareConfirmed,
  type OwnNight,
  readOwnNight,
} from "../health/sleepProfile";
import type { SleepReader } from "../health/sleepSamples";
import { t } from "../i18n";
import { useFollowsDoor } from "../social/followsDoor";
import {
  color,
  fontSize,
  fontWeight,
  MIN_TAP_SIZE,
  radius,
  space,
} from "../theme/tokens";
import { Tap } from "../ui/Tap";
import { ProfileSleep, SleepBox } from "./ProfileSleep";
import { measuredDay } from "./Vo2MaxRow";

/** The card on one's own profile, in every state: what a test takes away
 * to tell that nothing else moved. */
export const OWN_SLEEP_TEST_ID = "own-sleep";

type Props = {
  /** The phone's reader of the sleep: none in every build until part C. */
  reader?: SleepReader | null;
  /** For the tests: the moment the profile opens. */
  nowMs?: number;
  /** The fake fetch of the tests. */
  fetchFn?: typeof fetch;
  apiKey?: string | null;
};

/** The night as others read it: without what only its owner is told. */
function summaryOf(night: SleepSummary): SleepSummary {
  const { score, asleep_min, awake_min, stages } = night;
  return {
    night: night.night,
    score,
    asleep_min,
    awake_min,
    ...(stages === undefined ? {} : { stages }),
  };
}

/**
 * The «Sleep» card of one's own «Profile» (TASK-467 part B3), under the
 * VO₂ max, in the texts the user approved. First «Show my sleep from Apple
 * Health»: the tap is the yes to reading the sleep, kept on the phone
 * (`sleepChoice.ts`), and opens the phone's sheet. Then last night: the
 * score, its word, the hours slept and the stages, with «Only you see
 * this» and «Share». «Share» asks «Share your sleep?» the first time, then
 * sends the night to the API with `shared` on; from then it says «On your
 * profile» and «Stop sharing» takes the sleep off the profile (the user's
 * choice of 2026-11-12). A night shared earlier and still on the profile
 * is said under today's, with its day.
 *
 * Nothing, and nothing read or asked, while the sleep is off
 * (`sleepPostsOn`) or the phone has no reader: every build until part C.
 * Nothing leaves the phone before «Share»: the API is asked only which
 * night the profile shows, once the yes to reading is kept.
 */
export function OwnSleep({ reader = sleepReader(), nowMs, fetchFn, apiKey }: Props) {
  const on = sleepPostsOn() && reader !== null;
  const { apiUrl, account } = useFollowsDoor();
  const { state, sessionEnded: onSessionEnded } = account;
  const token = state.status === "signedIn" ? state.session.token : null;
  const publicId =
    state.status === "signedIn" ? (state.session.user.public_id ?? null) : null;
  // The yes to reading the sleep: off, nothing is read from the phone.
  const [allowed, setAllowed] = useState(() => on && loadSleepOn());
  // Last night as the phone has it; null until read.
  const [own, setOwn] = useState<OwnNight | null>(null);
  // The night the profile shows now, of one token; null for none.
  const [shown, setShown] = useState<{
    asked: string;
    night: SleepSummary | null;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const asked = token ?? "";

  // The profile opens with the yes already kept: last night, without asking.
  useEffect(() => {
    if (!on || reader === null || !loadSleepOn()) {
      return;
    }
    let live = true;
    void readOwnNight(reader, nowMs ?? Date.now(), false).then((found) => {
      if (live) {
        setOwn(found);
      }
    });
    return () => {
      live = false;
    };
  }, [nowMs, on, reader]);

  // Which night the profile shows: asked only once the card is in use.
  useEffect(() => {
    if (!on || !allowed || token === null || apiUrl === null || publicId === null) {
      return;
    }
    let live = true;
    void fetchProfileSleep(apiUrl, token, publicId, { fetchFn, key: apiKey }).then(
      (outcome) => {
        if (!live) {
          return;
        }
        if (outcome.kind === "ok") {
          setShown({ asked, night: outcome.value });
        } else if (sessionEnded(outcome)) {
          onSessionEnded(token);
        } else if (outcome.kind === "api_error" && outcome.code === "http_error") {
          // 404: no night shared.
          setShown({ asked, night: null });
        }
      },
    );
    return () => {
      live = false;
    };
  }, [allowed, apiKey, apiUrl, asked, fetchFn, on, onSessionEnded, publicId, token]);

  if (!on || reader === null || token === null) {
    return null;
  }
  const phone = reader;
  const session = token;

  async function allow() {
    if (busy) {
      return;
    }
    setBusy(true);
    const found = await readOwnNight(phone, nowMs ?? Date.now(), true);
    setBusy(false);
    if (found.kind !== "refused") {
      keepSleepOn();
      setAllowed(true);
    }
    setOwn(found);
  }

  async function send(night: SleepSummary) {
    if (apiUrl === null || busy) {
      return;
    }
    setBusy(true);
    setProblem(null);
    const outcome = await shareSleepNight(apiUrl, session, night, {
      fetchFn,
      key: apiKey,
    });
    setBusy(false);
    if (outcome.kind === "ok") {
      setShown({ asked, night: summaryOf(outcome.value) });
    } else if (sessionEnded(outcome)) {
      onSessionEnded(session);
    } else {
      setProblem(accountProblem(outcome));
    }
  }

  function share(night: SleepSummary) {
    if (loadSleepShareConfirmed()) {
      void send(night);
      return;
    }
    Alert.alert(
      t("Share your sleep?"),
      t(
        "Your score, hours slept and sleep stages show on your profile, to everyone who can see it.",
      ),
      [
        { text: t("Cancel"), style: "cancel" },
        {
          text: t("Share"),
          onPress: () => {
            keepSleepShareConfirmed();
            void send(night);
          },
        },
      ],
    );
  }

  async function stop() {
    if (apiUrl === null || busy) {
      return;
    }
    setBusy(true);
    setProblem(null);
    const outcome = await stopSharingSleep(apiUrl, session, {
      fetchFn,
      key: apiKey,
    });
    setBusy(false);
    if (outcome.kind === "ok") {
      setShown({ asked, night: null });
    } else if (sessionEnded(outcome)) {
      onSessionEnded(session);
    } else {
      setProblem(accountProblem(outcome));
    }
  }

  const cannotRead = (
    <Text style={styles.message}>
      {t(
        "MuW can't read your sleep. Allow it in the Health app: your profile › Apps › MuW.",
      )}
    </Text>
  );

  if (!allowed) {
    return (
      <SleepBox titled={false} testID={OWN_SLEEP_TEST_ID}>
        <Tap
          style={[styles.button, styles.primary]}
          onPress={() => void allow()}
          disabled={busy}
          accessibilityRole="button"
          accessibilityState={{ busy, disabled: busy }}
        >
          <Text style={styles.primaryText}>{t("Show my sleep from Apple Health")}</Text>
        </Tap>
        <Text style={styles.line}>
          {t("MuW works out a sleep score from your Apple Health sleep data.")}
        </Text>
        {own?.kind === "refused" && cannotRead}
      </SleepBox>
    );
  }
  if (own === null) {
    // Being read: no box that would change under the eyes.
    return null;
  }

  const onProfile = shown !== null && shown.asked === asked ? shown.night : null;
  const tonight = own.kind === "night" ? own.night : null;
  const sharedNow =
    tonight !== null && onProfile !== null && onProfile.night === tonight.night;
  // A night shared before, still what the others see.
  const earlier = onProfile !== null && !sharedNow ? onProfile : null;

  const stopButton = (
    <Tap
      style={styles.button}
      onPress={() => void stop()}
      disabled={busy}
      accessibilityRole="button"
      accessibilityState={{ busy, disabled: busy }}
    >
      <Text style={styles.buttonText}>{t("Stop sharing@@sleep")}</Text>
    </Tap>
  );
  const under = (
    <>
      {earlier !== null && (
        <View style={styles.row} testID="own-sleep-earlier">
          <Text style={styles.note}>
            {[t("On your profile"), measuredDay(earlier.night)]
              .filter((part) => part !== "")
              .join(" · ")}
          </Text>
          {stopButton}
        </View>
      )}
      {problem !== null && <Text style={styles.problem}>{problem}</Text>}
    </>
  );

  if (tonight === null) {
    return (
      <SleepBox testID={OWN_SLEEP_TEST_ID}>
        {own.kind === "refused" ? (
          cannotRead
        ) : (
          <Text style={styles.message}>
            {t("No sleep data for last night in Apple Health.")}
          </Text>
        )}
        {under}
      </SleepBox>
    );
  }
  return (
    <ProfileSleep night={tonight} testID={OWN_SLEEP_TEST_ID}>
      {sharedNow ? (
        <View style={styles.row}>
          <Text style={styles.note}>{t("On your profile")}</Text>
          {stopButton}
        </View>
      ) : (
        <View style={styles.row}>
          <Text style={styles.note}>{t("Only you see this")}</Text>
          <Tap
            style={[styles.button, styles.primary]}
            onPress={() => share(tonight)}
            disabled={busy}
            accessibilityRole="button"
            accessibilityState={{ busy, disabled: busy }}
          >
            <Text style={styles.primaryText}>{t("Share")}</Text>
          </Tap>
        </View>
      )}
      {under}
    </ProfileSleep>
  );
}

// The buttons as those of the VO₂ max over it (OwnVo2Max.tsx).
const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
  },
  note: {
    flex: 1,
    color: color.textMuted,
    fontSize: fontSize.small,
  },
  // Under the first button: a line of its own, not beside one.
  line: {
    color: color.textMuted,
    fontSize: fontSize.small,
  },
  message: {
    color: color.textMuted,
    fontSize: fontSize.body,
  },
  button: {
    minHeight: MIN_TAP_SIZE,
    paddingHorizontal: space.lg,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: color.surfaceRaised,
    borderWidth: 1,
    borderColor: color.borderStrong,
  },
  primary: {
    backgroundColor: color.text,
    borderColor: color.text,
  },
  buttonText: {
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
  primaryText: {
    color: color.background,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
  problem: {
    color: color.error,
    fontSize: fontSize.small,
  },
});
