import type { GymPlan, PlanPostVisibility } from "@shaperoute/shared-types";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import {
  keepPlanPost,
  keepPlanPostDeleted,
  type PlanPostKeep,
  sendWaitingPlanPosts,
} from "../api/planPosts";
import { planLine } from "../gym/GymPlans";
import { gymKey } from "../gym/gymKey";
import { gymStyles } from "../gym/gymStyles";
import { postedPlan } from "../gym/planCopy";
import { useGymPlans } from "../gym/plans";
import { t } from "../i18n";
import { useFollowsDoor } from "../social/followsDoor";
import { color, font, MIN_TAP_SIZE, radius, space } from "../theme/tokens";
import { glassRaise } from "../ui/glassRaise";
import { useGlassMode } from "../ui/useGlassMode";
import { PlanPostTile } from "./PlanPostTile";

/**
 * «Workout plan» of the Feed's «+» (TASK-485 part B, ADR-0394, the user's
 * texts of 2026-11-21): «Choose a plan» among one's own, as «My plans» has
 * them; then a line about it, optional, «Who sees it: Everyone», which can
 * be changed there, and «Post». The post goes into a file on the phone
 * first and up from there, now or when there is a network
 * (api/planPosts.ts), with the phone's key.
 */

/** At most this many characters of the line (a drawing's description). */
const MAX_LINE = 500;

type Listener = () => void;
const listeners = new Set<Listener>();
let sending = false;

/** Called after a round that reached the API (the Feed reads again);
 * returns the way to stop. */
export function onPlanPostsSent(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** What «Post» or a deletion did: kept, too many, the phone refused, or
 * nobody signed in. */
export type PlanPostSaved = PlanPostKeep | "signed_out";

/**
 * The plans posted, into the file and up to the API: those left from
 * before go when somebody is signed in and when the app comes back to the
 * front; one round at a time for the whole app.
 */
export function usePlanPostOutbox(fetchFn?: typeof fetch): {
  post: (
    plan: GymPlan,
    description: string,
    visibility: PlanPostVisibility,
  ) => PlanPostSaved;
  remove: (key: string) => PlanPostSaved;
  owner: number | null;
} {
  const { apiUrl, account } = useFollowsDoor();
  const session = account.state.status === "signedIn" ? account.state.session : null;
  const token = session?.token ?? null;
  const owner = session?.user.id ?? null;
  const latest = useRef({ apiUrl, token, owner, fetchFn });
  useEffect(() => {
    latest.current = { apiUrl, token, owner, fetchFn };
  });

  const send = useCallback(async () => {
    const { apiUrl: url, token: key, owner: who } = latest.current;
    if (sending || url === null || key === null || who === null) {
      return;
    }
    sending = true;
    let sent = false;
    try {
      ({ sent } = await sendWaitingPlanPosts(url, key, who, {
        fetchFn: latest.current.fetchFn,
      }));
    } finally {
      sending = false;
    }
    if (sent) {
      for (const listener of [...listeners]) {
        listener();
      }
    }
  }, []);

  useEffect(() => {
    void send();
  }, [send, token, owner]);
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (next) => {
      if (next === "active") {
        void send();
      }
    });
    return () => subscription.remove();
  }, [send]);

  const post = useCallback(
    (plan: GymPlan, description: string, visibility: PlanPostVisibility) => {
      const who = latest.current.owner;
      if (who === null) {
        return "signed_out" as const;
      }
      const line = description.trim().slice(0, MAX_LINE);
      const kept = keepPlanPost(who, gymKey(Date.now()), {
        plan: postedPlan(plan),
        description: line === "" ? null : line,
        visibility,
      });
      if (kept === "kept") {
        void send();
      }
      return kept;
    },
    [send],
  );

  const remove = useCallback(
    (key: string) => {
      const who = latest.current.owner;
      if (who === null) {
        return "signed_out" as const;
      }
      if (!keepPlanPostDeleted(who, key)) {
        return "not_written" as const;
      }
      void send();
      return "kept" as const;
    },
    [send],
  );

  return { post, remove, owner };
}

type Props = {
  /** Posted, or nothing to post: the sheet closes. */
  onDone: () => void;
  /** The tests' fake network. */
  fetchFn?: typeof fetch;
  /** The sheet's width less its sides, for the plan shown before «Post». */
  width?: number;
};

export function PlanPostFlow({ onDone, fetchFn, width = 320 }: Props) {
  const { plans } = useGymPlans(fetchFn);
  const outbox = usePlanPostOutbox(fetchFn);
  const [chosen, setChosen] = useState<string | null>(null);
  const [line, setLine] = useState("");
  const [visibility, setVisibility] = useState<PlanPostVisibility>("everyone");
  // The chip stands out of the glass (TASK-469 A7c).
  const chipRaise = glassRaise(useGlassMode());
  const [choosingWho, setChoosingWho] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const plan = plans.find((one) => one.key === chosen) ?? null;

  if (plan === null) {
    return (
      <View style={styles.flow} testID="plan-post-choose">
        <Text style={styles.title} accessibilityRole="header">
          {t("Choose a plan")}
        </Text>
        {plans.length === 0 ? (
          <Text style={gymStyles.muted} testID="plan-post-none">
            {t("No plans yet: make one in Gym › Plans.")}
          </Text>
        ) : (
          plans.map((one) => (
            <Pressable
              key={one.key}
              style={({ pressed }) => [styles.plan, pressed && styles.pressed]}
              onPress={() => setChosen(one.key)}
              accessibilityRole="button"
              testID="plan-post-plan"
            >
              <View style={styles.planText}>
                <Text style={styles.name}>{one.name}</Text>
                <Text style={gymStyles.muted}>
                  {planLine(one, one.program == null)}
                </Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </Pressable>
          ))
        )}
      </View>
    );
  }

  const who = visibility === "everyone" ? t("Everyone") : t("Followers");
  function onPost() {
    if (plan === null) {
      return;
    }
    const kept = outbox.post(plan, line, visibility);
    if (kept === "kept") {
      onDone();
      return;
    }
    setProblem(
      kept === "signed_out"
        ? t("Your session has ended. Log in again.")
        : t("Something went wrong on our side. Try again in a moment."),
    );
  }

  return (
    <View style={styles.flow} testID="plan-post-say">
      <PlanPostTile plan={postedPlan(plan)} width={width} />
      <TextInput
        style={[gymStyles.input, styles.line]}
        value={line}
        onChangeText={setLine}
        placeholder={t("Say something about this plan (optional)")}
        placeholderTextColor={color.textFaint}
        maxLength={MAX_LINE}
        multiline
        accessibilityLabel={t("Say something about this plan (optional)")}
        testID="plan-post-line"
      />
      <Pressable
        style={({ pressed }) => [styles.who, pressed && styles.pressed]}
        onPress={() => setChoosingWho(!choosingWho)}
        accessibilityRole="button"
        accessibilityState={{ expanded: choosingWho }}
        testID="plan-post-who"
      >
        <Text style={gymStyles.text}>{t("Who sees it: {who}", { who })}</Text>
        <Text style={styles.chevron}>{choosingWho ? "⌃" : "⌄"}</Text>
      </Pressable>
      {choosingWho && (
        <View style={gymStyles.row}>
          {(["everyone", "followers"] as const).map((one) => (
            <Pressable
              key={one}
              style={[
                gymStyles.chip,
                chipRaise,
                visibility === one && gymStyles.chipOn,
              ]}
              onPress={() => {
                setVisibility(one);
                setChoosingWho(false);
              }}
              accessibilityRole="radio"
              accessibilityState={{ checked: visibility === one }}
              testID={`plan-post-who-${one}`}
            >
              <Text
                style={[gymStyles.chipText, visibility === one && gymStyles.chipTextOn]}
              >
                {one === "everyone" ? t("Everyone") : t("Followers")}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
      {problem !== null && (
        <Text style={[gymStyles.muted, gymStyles.danger]} accessibilityRole="alert">
          {problem}
        </Text>
      )}
      <Pressable
        style={({ pressed }) => [
          gymStyles.button,
          gymStyles.primary,
          pressed && styles.pressed,
        ]}
        onPress={onPost}
        accessibilityRole="button"
        testID="plan-post-post"
      >
        <Text style={[gymStyles.buttonText, gymStyles.primaryText]}>{t("Post")}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  flow: {
    gap: space.md,
    paddingBottom: space.md,
  },
  title: {
    ...font.heading,
    color: color.text,
  },
  plan: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: MIN_TAP_SIZE,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: radius.md,
    backgroundColor: color.surfaceRaised,
  },
  planText: {
    flex: 1,
    gap: space.xs,
  },
  name: {
    ...font.body,
    color: color.text,
  },
  chevron: {
    ...font.body,
    color: color.textMuted,
  },
  line: {
    minHeight: MIN_TAP_SIZE * 2,
    paddingTop: space.sm,
    textAlignVertical: "top",
  },
  who: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: MIN_TAP_SIZE,
  },
  pressed: {
    opacity: 0.6,
  },
});
