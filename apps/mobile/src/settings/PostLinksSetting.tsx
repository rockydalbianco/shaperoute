import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { accountProblem, sessionEnded } from "../account/messages";
import type { Account } from "../account/useAccount";
import { apiUrl } from "../api/apiUrl";
import { fetchPostLinks, savePostLinks } from "../api/postLinks";
import { t, tLater } from "../i18n";
import { color, fontSize, radius, space } from "../theme/tokens";
import { contactStyles } from "./ContactField";

/** Approved by the user with the texts of TASK-455 (2026-11-12). */
export const POST_LINKS_NOTE = tLater(
  "People who see your «Everyone» posts can share a link to them. Anyone with the link sees the drawing on the map, your username and the distance, even without MuW. Turn this off and the links stop working.",
);

type Props = {
  account: Pick<Account, "state" | "sessionEnded">;
  /** The API and, in the tests, its fake fetch. */
  api?: { baseUrl: string | null; fetchFn?: typeof fetch; key?: string | null };
};

/**
 * «Links to my posts» in «Settings» (TASK-455 part E, ADR-0382): on from
 * the start, kept by the API. Off, no link to the account's posts works,
 * its owner's own included, and «Share link» is on none of them. Only on
 * an API that has it: an older one answers 404 and the row is not there.
 */
export function PostLinksSetting({ account, api = { baseUrl: apiUrl() } }: Props) {
  const { baseUrl, fetchFn, key } = api;
  const { state, sessionEnded: onSessionEnded } = account;
  const token = state.status === "signedIn" ? state.session.token : null;
  const [answer, setAnswer] = useState<{ asked: string; on: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const asked = token ?? "";

  useEffect(() => {
    if (token === null || baseUrl === null) {
      return;
    }
    let live = true;
    void fetchPostLinks(baseUrl, token, { fetchFn, key }).then((outcome) => {
      if (!live) {
        return;
      }
      if (outcome.kind === "ok") {
        setAnswer({ asked, on: outcome.value.post_links });
      } else if (sessionEnded(outcome)) {
        onSessionEnded(token);
      }
    });
    return () => {
      live = false;
    };
  }, [asked, baseUrl, fetchFn, key, onSessionEnded, token]);

  const on = answer !== null && answer.asked === asked ? answer.on : null;
  if (on === null || token === null || baseUrl === null) {
    return null;
  }

  async function turn(next: boolean) {
    if (token === null || baseUrl === null) {
      return;
    }
    setBusy(true);
    setProblem(null);
    const outcome = await savePostLinks(baseUrl, token, next, { fetchFn, key });
    setBusy(false);
    if (outcome.kind === "ok") {
      setAnswer({ asked, on: outcome.value.post_links });
    } else if (sessionEnded(outcome)) {
      onSessionEnded(token);
    } else {
      setProblem(accountProblem(outcome));
    }
  }

  const note = t(POST_LINKS_NOTE);
  return (
    <View style={styles.setting}>
      <View style={contactStyles.menu}>
        <Pressable
          style={({ pressed }) => [contactStyles.row, pressed && contactStyles.pressed]}
          onPress={() => void turn(!on)}
          disabled={busy}
          accessibilityRole="switch"
          accessibilityLabel={t("Links to my posts")}
          accessibilityHint={note}
          accessibilityState={{ checked: on, busy, disabled: busy }}
          testID="post-links-setting"
        >
          <Text style={contactStyles.emoji}>🔗</Text>
          <Text style={contactStyles.rowText}>{t("Links to my posts")}</Text>
          <View style={[styles.track, on && styles.trackOn]}>
            <View style={[styles.knob, on && styles.knobOn]} />
          </View>
        </Pressable>
      </View>
      <Text style={styles.note}>{note}</Text>
      {problem !== null && <Text style={styles.problem}>{problem}</Text>}
    </View>
  );
}

// As the switch of MuW Style (`./StyleSetting`), with its note.
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
  note: {
    paddingHorizontal: space.md,
    color: color.textMuted,
    fontSize: fontSize.small,
  },
  problem: {
    paddingHorizontal: space.md,
    color: color.error,
    fontSize: fontSize.small,
  },
});
