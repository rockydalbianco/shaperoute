import {
  type MySleepPost,
  SLEEP_POST_VISIBILITIES,
  type SleepPostVisibility,
  type SleepSummary,
} from "@shaperoute/shared-types";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { accountProblem, sessionEnded } from "../account/messages";
import { fetchSleepPost, publishSleepPost, removeSleepPost } from "../api/sleepPosts";
import { keepSleepOn, loadSleepOn } from "../health/sleepChoice";
import { sleepPostsOn, sleepReader } from "../health/sleepModules";
import { type OwnNight, readOwnNight } from "../health/sleepProfile";
import type { SleepReader } from "../health/sleepSamples";
import { t } from "../i18n";
import { ProfileSleep } from "../profile/ProfileSleep";
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

/** The page, in every state: what a test looks for. */
export const SLEEP_POST_PAGE_TEST_ID = "sleep-post-page";

/** Who sees a post of a night when the page opens (the user's choice of
 * 2026-11-21): everyone, as what else is added from the «+» (ADR-0387),
 * with the choice in view over «Publish». */
export const SLEEP_POST_VISIBILITY_AT_FIRST: SleepPostVisibility = "everyone";

type Props = {
  /** The night is in the Feed: the sheet closes. */
  onDone?: () => void;
  /** The night went in the Feed, or was taken off it: the Feed reads again. */
  onChanged?: () => void;
  /** The phone's reader of the sleep: none in every build until part C. */
  reader?: SleepReader | null;
  /** For the tests: the moment the page opens. */
  nowMs?: number;
  /** The fake fetch of the tests. */
  fetchFn?: typeof fetch;
  apiKey?: string | null;
};

function visibilityName(visibility: SleepPostVisibility): string {
  return visibility === "everyone" ? t("Everyone") : t("Followers");
}

/**
 * «Sleep», opened from the Feed's «+» (TASK-467 part E), in the texts the
 * user approved on 2026-11-21, under the sheet's own title: last night as on the profile's card — the
 * score and its word, the hours slept, the stages — then who sees it,
 * «Everyone» at first, and «Publish», which puts the night in the Feed as
 * a post of its own. A night already there says «Already in the Feed» and
 * can be taken off with «Remove post». Apart from «Share» on the profile:
 * neither does the other.
 *
 * Reading the sleep needs the same yes as the profile's card, asked here
 * with the same button when it was never given. Nothing, and nothing read
 * or asked, while the sleep is off (`sleepPostsOn`) or the phone has no
 * reader. Nothing leaves the phone before «Publish»: the API is asked only
 * whether this night is already a post.
 */
export function SleepPostPage({
  onDone,
  onChanged,
  reader = sleepReader(),
  nowMs,
  fetchFn,
  apiKey,
}: Props) {
  const on = sleepPostsOn() && reader !== null;
  const { apiUrl, account } = useFollowsDoor();
  const { state, sessionEnded: onSessionEnded } = account;
  const token = state.status === "signedIn" ? state.session.token : null;
  const [allowed, setAllowed] = useState(() => on && loadSleepOn());
  // Last night as the phone has it; null until read.
  const [own, setOwn] = useState<OwnNight | null>(null);
  // The post of that night, of one token and one night; null for none.
  const [posted, setPosted] = useState<{
    asked: string;
    post: MySleepPost | null;
  } | null>(null);
  const [visibility, setVisibility] = useState<SleepPostVisibility>(
    SLEEP_POST_VISIBILITY_AT_FIRST,
  );
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const night = own?.kind === "night" ? own.night : null;
  const day = night?.night ?? null;
  const asked = `${token ?? ""} ${day ?? ""}`;

  // The yes already kept: last night, without asking.
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

  // Whether this night is a post already: only its day is said.
  useEffect(() => {
    if (!on || token === null || apiUrl === null || day === null) {
      return;
    }
    let live = true;
    void fetchSleepPost(apiUrl, token, day, { fetchFn, key: apiKey }).then(
      (outcome) => {
        if (!live) {
          return;
        }
        if (outcome.kind === "ok") {
          setPosted({ asked, post: outcome.value });
        } else if (sessionEnded(outcome)) {
          onSessionEnded(token);
        } else if (outcome.kind === "api_error" && outcome.code === "http_error") {
          // 404: not a post yet.
          setPosted({ asked, post: null });
        }
      },
    );
    return () => {
      live = false;
    };
  }, [apiKey, apiUrl, asked, day, fetchFn, on, onSessionEnded, token]);

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

  async function publish(of: SleepSummary) {
    if (apiUrl === null || busy) {
      return;
    }
    setBusy(true);
    setProblem(null);
    const outcome = await publishSleepPost(apiUrl, session, of, visibility, {
      fetchFn,
      key: apiKey,
    });
    setBusy(false);
    if (outcome.kind === "ok") {
      setPosted({ asked, post: outcome.value });
      onChanged?.();
      onDone?.();
    } else if (sessionEnded(outcome)) {
      onSessionEnded(session);
    } else {
      setProblem(accountProblem(outcome));
    }
  }

  async function remove(of: string) {
    if (apiUrl === null || busy) {
      return;
    }
    setBusy(true);
    setProblem(null);
    const outcome = await removeSleepPost(apiUrl, session, of, {
      fetchFn,
      key: apiKey,
    });
    setBusy(false);
    if (outcome.kind === "ok") {
      setPosted({ asked, post: null });
      onChanged?.();
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
      <View style={styles.page} testID={SLEEP_POST_PAGE_TEST_ID}>
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
      </View>
    );
  }
  if (own === null) {
    // Being read.
    return <View style={styles.page} testID={SLEEP_POST_PAGE_TEST_ID} />;
  }
  if (night === null) {
    return (
      <View style={styles.page} testID={SLEEP_POST_PAGE_TEST_ID}>
        {own.kind === "refused" ? (
          cannotRead
        ) : (
          <Text style={styles.message}>
            {t("No sleep data for last night in Apple Health.")}
          </Text>
        )}
      </View>
    );
  }

  const inFeed = posted !== null && posted.asked === asked && posted.post !== null;
  return (
    <View style={styles.page} testID={SLEEP_POST_PAGE_TEST_ID}>
      <ProfileSleep night={night} testID="sleep-post-night" />
      {inFeed ? (
        <View style={styles.row}>
          <Text style={styles.note}>{t("Already in the Feed")}</Text>
          <Tap
            style={styles.button}
            onPress={() => void remove(night.night)}
            disabled={busy}
            accessibilityRole="button"
            accessibilityState={{ busy, disabled: busy }}
          >
            <Text style={styles.buttonText}>{t("Remove post")}</Text>
          </Tap>
        </View>
      ) : (
        <>
          <View style={styles.field}>
            <Text style={styles.label}>{t("Who can see it")}</Text>
            <View
              style={styles.chips}
              accessibilityRole="radiogroup"
              accessibilityLabel={t("Who can see it")}
            >
              {SLEEP_POST_VISIBILITIES.map((option) => {
                const chosen = option === visibility;
                return (
                  <Pressable
                    key={option}
                    style={[styles.chip, chosen && styles.chipOn, busy && styles.busy]}
                    onPress={() => setVisibility(option)}
                    disabled={busy}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: chosen, disabled: busy }}
                  >
                    <Text style={[styles.chipText, chosen && styles.chipTextOn]}>
                      {visibilityName(option)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
          <Tap
            style={[styles.button, styles.primary]}
            onPress={() => void publish(night)}
            disabled={busy}
            accessibilityRole="button"
            accessibilityState={{ busy, disabled: busy }}
          >
            <Text style={styles.primaryText}>{t("Publish")}</Text>
          </Tap>
          <Text style={styles.line}>
            {t("Your score, hours slept and sleep stages go in the Feed.")}
          </Text>
        </>
      )}
      {problem !== null && <Text style={styles.problem}>{problem}</Text>}
    </View>
  );
}

// The buttons as those of the profile's card (profile/OwnSleep.tsx), the
// chips as «Who can see it» of a run (social/PublicParts.tsx).
const styles = StyleSheet.create({
  page: {
    gap: space.md,
  },
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
  line: {
    color: color.textMuted,
    fontSize: fontSize.small,
  },
  message: {
    color: color.textMuted,
    fontSize: fontSize.body,
  },
  field: {
    gap: space.xs,
  },
  label: {
    color: color.textMuted,
    fontSize: fontSize.small,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: space.xs,
  },
  chip: {
    minHeight: MIN_TAP_SIZE - space.sm,
    justifyContent: "center",
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
  chipOn: {
    borderColor: color.borderStrong,
    backgroundColor: color.surfaceRaised,
  },
  chipText: {
    color: color.textMuted,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
  chipTextOn: {
    color: color.text,
  },
  busy: {
    opacity: 0.6,
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
