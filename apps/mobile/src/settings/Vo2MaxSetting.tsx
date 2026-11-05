import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { accountProblem, sessionEnded } from "../account/messages";
import type { Account } from "../account/useAccount";
import { apiUrl } from "../api/apiUrl";
import { fetchVo2Max, saveVo2MaxShow } from "../api/vo2max";
import { t } from "../i18n";
import { color, fontSize, radius, space } from "../theme/tokens";
import { contactStyles } from "./ContactField";

type Props = {
  account: Pick<Account, "state" | "sessionEnded">;
  /** The API and, in the tests, its fake fetch. */
  api?: { baseUrl: string | null; fetchFn?: typeof fetch; key?: string | null };
};

/**
 * «Show VO₂ max on my profile» in «Settings» (TASK-397, ADR-0332), under
 * «Body»: the owner's yes, kept by the API. Off, the profile shows no VO₂
 * max to anyone and the API forgets the value of Health. Only on an API
 * that has it: an older one answers 404 and the row is not there.
 */
export function Vo2MaxSetting({ account, api = { baseUrl: apiUrl() } }: Props) {
  const { baseUrl, fetchFn, key } = api;
  const { state, sessionEnded: onSessionEnded } = account;
  const token = state.status === "signedIn" ? state.session.token : null;
  const [answer, setAnswer] = useState<{ asked: string; show: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const asked = token ?? "";

  useEffect(() => {
    if (token === null || baseUrl === null) {
      return;
    }
    let live = true;
    void fetchVo2Max(baseUrl, token, { fetchFn, key }).then((outcome) => {
      if (!live) {
        return;
      }
      if (outcome.kind === "ok") {
        setAnswer({ asked, show: outcome.value.show });
      } else if (sessionEnded(outcome)) {
        onSessionEnded(token);
      }
    });
    return () => {
      live = false;
    };
  }, [asked, baseUrl, fetchFn, key, onSessionEnded, token]);

  const on = answer !== null && answer.asked === asked ? answer.show : null;
  if (on === null || token === null || baseUrl === null) {
    return null;
  }

  async function turn(show: boolean) {
    if (token === null || baseUrl === null) {
      return;
    }
    setBusy(true);
    setProblem(null);
    const outcome = await saveVo2MaxShow(baseUrl, token, show, { fetchFn, key });
    setBusy(false);
    if (outcome.kind === "ok") {
      setAnswer({ asked, show: outcome.value.show });
    } else if (sessionEnded(outcome)) {
      onSessionEnded(token);
    } else {
      setProblem(accountProblem(outcome));
    }
  }

  return (
    <View style={styles.setting}>
      <View style={contactStyles.menu}>
        <Pressable
          style={({ pressed }) => [contactStyles.row, pressed && contactStyles.pressed]}
          onPress={() => void turn(!on)}
          disabled={busy}
          accessibilityRole="switch"
          accessibilityLabel={t("Show VO₂ max on my profile")}
          accessibilityState={{ checked: on, busy, disabled: busy }}
          testID="vo2max-setting"
        >
          <Text style={contactStyles.emoji}>🫁</Text>
          <Text style={contactStyles.rowText}>{t("Show VO₂ max on my profile")}</Text>
          <View style={[styles.track, on && styles.trackOn]}>
            <View style={[styles.knob, on && styles.knobOn]} />
          </View>
        </Pressable>
      </View>
      {problem !== null && <Text style={styles.problem}>{problem}</Text>}
    </View>
  );
}

// As the switch of MuW Style (`./StyleSetting`).
const styles = StyleSheet.create({
  setting: {
    gap: space.sm,
  },
  track: {
    width: 40,
    height: 24,
    justifyContent: "center",
    paddingHorizontal: 3,
    borderRadius: radius.pill,
    backgroundColor: color.surfaceRaised,
  },
  trackOn: {
    backgroundColor: color.text,
  },
  knob: {
    width: 18,
    height: 18,
    borderRadius: radius.pill,
    backgroundColor: color.textMuted,
  },
  knobOn: {
    alignSelf: "flex-end",
    backgroundColor: color.background,
  },
  problem: {
    paddingHorizontal: space.md,
    color: color.error,
    fontSize: fontSize.small,
  },
});
