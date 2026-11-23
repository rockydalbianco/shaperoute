import type { Vo2MaxSettings } from "@shaperoute/shared-types";
import { File, Paths } from "expo-file-system";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { accountProblem, sessionEnded } from "../account/messages";
import { fetchVo2Max, saveVo2MaxShow } from "../api/vo2max";
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
import { Vo2MaxRow } from "./Vo2MaxRow";

/** Where the phone keeps that the question was answered: it is asked once. */
const ASKED_FILE = "vo2max-asked.json";

/** Whether «Show your VO₂ max?» was answered on this phone; no when unread. */
export function loadVo2MaxAsked(): boolean {
  try {
    const file = new File(Paths.document, ASKED_FILE);
    if (!file.exists) {
      return false;
    }
    const data: unknown = JSON.parse(file.textSync());
    return typeof data === "object" && data !== null && "asked" in data
      ? data.asked === true
      : false;
  } catch {
    return false;
  }
}

function saveVo2MaxAsked(): void {
  try {
    const file = new File(Paths.document, ASKED_FILE);
    file.create({ overwrite: true });
    file.write(JSON.stringify({ asked: true }));
  } catch {
    // Asked again next time: the yes stays the user's to give.
  }
}

type Props = {
  /** The fake fetch of the tests. */
  fetchFn?: typeof fetch;
  apiKey?: string | null;
};

/**
 * The VO₂ max on one's own «Profile» (TASK-397, ADR-0332), under the
 * personal bests. With the yes, the row as the others see it. Without, the
 * first time there is a value, «Show your VO₂ max?» once; then the row with
 * «Only you see this» and «Show it». Nothing without a value or from an API
 * older than TASK-397. The yes is taken back in «Settings».
 */
export function OwnVo2Max({ fetchFn, apiKey }: Props) {
  const { apiUrl, account } = useFollowsDoor();
  const { state, sessionEnded: onSessionEnded } = account;
  const token = state.status === "signedIn" ? state.session.token : null;
  const asked = token ?? "";
  // The yes of one token: another account's is not this.
  const [answer, setAnswer] = useState<{
    asked: string;
    settings: Vo2MaxSettings;
  } | null>(null);
  const [questioned, setQuestioned] = useState(loadVo2MaxAsked);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  useEffect(() => {
    if (token === null || apiUrl === null) {
      return;
    }
    let live = true;
    void fetchVo2Max(apiUrl, token, { fetchFn, key: apiKey }).then((outcome) => {
      if (!live) {
        return;
      }
      if (outcome.kind === "ok") {
        setAnswer({ asked, settings: outcome.value });
      } else if (sessionEnded(outcome)) {
        onSessionEnded(token);
      }
    });
    return () => {
      live = false;
    };
  }, [apiKey, apiUrl, asked, fetchFn, onSessionEnded, token]);

  const settings = answer !== null && answer.asked === asked ? answer.settings : null;
  if (settings === null || settings.vo2max === null) {
    return null;
  }
  if (settings.show) {
    return <Vo2MaxRow vo2max={settings.vo2max} own />;
  }

  function answered() {
    saveVo2MaxAsked();
    setQuestioned(true);
  }

  async function show() {
    if (token === null || apiUrl === null || busy) {
      return;
    }
    setBusy(true);
    setProblem(null);
    const outcome = await saveVo2MaxShow(apiUrl, token, true, {
      fetchFn,
      key: apiKey,
    });
    setBusy(false);
    if (outcome.kind === "ok") {
      answered();
      setAnswer({ asked, settings: outcome.value });
    } else if (sessionEnded(outcome)) {
      onSessionEnded(token);
    } else {
      setProblem(accountProblem(outcome));
    }
  }

  const showIt = (
    <Tap
      style={[styles.button, styles.primary]}
      onPress={() => void show()}
      disabled={busy}
      accessibilityRole="button"
      accessibilityState={{ busy, disabled: busy }}
    >
      <Text style={styles.primaryText}>{t("Show it")}</Text>
    </Tap>
  );
  return (
    <Vo2MaxRow vo2max={settings.vo2max} own>
      {questioned ? (
        <View style={styles.only}>
          <Text style={styles.note}>{t("Only you see this")}</Text>
          {showIt}
        </View>
      ) : (
        <View style={styles.question} testID="vo2max-question">
          <Text style={styles.questionTitle} accessibilityRole="header">
            {t("Show your VO₂ max?")}
          </Text>
          <Text style={styles.note}>
            {t(
              "Everyone who can see your profile will see it. You can turn it off in Settings.",
            )}
          </Text>
          <View style={styles.buttons}>
            {showIt}
            <Tap
              style={styles.button}
              onPress={answered}
              disabled={busy}
              accessibilityRole="button"
            >
              <Text style={styles.buttonText}>{t("Not now")}</Text>
            </Tap>
          </View>
        </View>
      )}
      {problem !== null && <Text style={styles.problem}>{problem}</Text>}
    </Vo2MaxRow>
  );
}

const styles = StyleSheet.create({
  only: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
  },
  question: {
    gap: space.sm,
  },
  questionTitle: {
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
  note: {
    flex: 1,
    color: color.textMuted,
    fontSize: fontSize.small,
  },
  buttons: {
    flexDirection: "row",
    gap: space.sm,
  },
  // Neutral, as «Edit profile» (ProfileHome.tsx); the yes in the text's colour.
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
