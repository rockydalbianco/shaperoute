import {
  GROUP_RUN_DESCRIPTION_MAX,
  GROUP_RUN_MEETING_NOTE_MAX,
  GROUP_RUN_TITLE_MAX,
  type GroupRunDetail,
  type GroupRunRequest,
  type GroupRunVisibility,
} from "@shaperoute/shared-types";
import { useState } from "react";
import { Modal, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import {
  initialWindowMetrics,
  SafeAreaProvider,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { accountProblem, sessionEnded } from "../account/messages";
import type { AccountOutcome } from "../api/accounts";
import { favoriteTitle, type Keepable } from "../favorites/favoriteRoute";
import { t, tLater } from "../i18n";
import { negativeComment } from "../social/commentText";
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
import { firstStart, movedDay, movedTime, withOffset } from "./dayTime";
import { changeGroupRun, createGroupRun } from "./groupRunsApi";

/** The safety words under the form (approved with the proposal, 2026-10-26). */
export const SAFETY = tLater(
  "Meet in a public place, never at your home. MuW doesn't organise or check group runs. Everyone on MuW is 16 or older.",
);

export type FormMode =
  { kind: "new"; route: Keepable } | { kind: "change"; run: GroupRunDetail };

type Props = {
  mode: FormMode;
  onClose: () => void;
  /** The group run published or changed, as the API keeps it. */
  onDone: (run: GroupRunDetail) => void;
  /** For the tests: the clock, the fake fetch. */
  now?: () => Date;
  fetchFn?: typeof fetch;
  apiKey?: string | null;
};

/** What the API said, as the form shows it. */
export function groupRunProblem(outcome: AccountOutcome<unknown>): string | null {
  if (outcome.kind === "ok") {
    return null;
  }
  if (outcome.kind === "api_error") {
    // The API's own words: a title too long, a time too soon, ten upcoming.
    if (outcome.code === "invalid_request") {
      return outcome.message;
    }
    if (outcome.code === "comment_rejected") {
      return negativeComment();
    }
    if (outcome.code === "http_error") {
      return t("Something went wrong.");
    }
  }
  return accountProblem(outcome);
}

/** A text the API keeps as null when empty. */
function orNull(text: string): string | null {
  const trimmed = text.trim();
  return trimmed === "" ? null : trimmed;
}

/**
 * «New group run» (TASK-309 part B, docs/EVENTI.md §3): the route on the map
 * published with a title, the day and the time on the phone's clock (with
 * steps, no picker: no new dependency), «Where exactly» at the start, notes
 * and who can see it, under the safety words. The same form changes one
 * already published, before it starts: who can see it does not change any
 * more, and the route never does.
 */
export function GroupRunForm(props: Props) {
  return (
    <Modal visible animationType="slide" onRequestClose={props.onClose}>
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        <Form {...props} />
      </SafeAreaProvider>
    </Modal>
  );
}

function Form({
  mode,
  onClose,
  onDone,
  now = () => new Date(),
  fetchFn,
  apiKey,
}: Props) {
  const insets = useSafeAreaInsets();
  const { apiUrl, account } = useFollowsDoor();
  const { state } = account;
  const token = state.status === "signedIn" ? state.session.token : null;
  const was = mode.kind === "change" ? mode.run : null;
  // The route's own name to begin with: «Star», «CIAO», the theme.
  const [title, setTitle] = useState(() =>
    (mode.kind === "change" ? mode.run.title : favoriteTitle(mode.route.request)).slice(
      0,
      GROUP_RUN_TITLE_MAX,
    ),
  );
  const [at, setAt] = useState(() =>
    was === null ? firstStart(now()) : new Date(was.starts_at),
  );
  const [meeting, setMeeting] = useState(was?.meeting_note ?? "");
  const [notes, setNotes] = useState(was?.description ?? "");
  const [visibility, setVisibility] = useState<GroupRunVisibility>(
    was?.visibility ?? "everyone",
  );
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const ready = title.trim() !== "" && !busy && apiUrl !== null && token !== null;

  async function publish() {
    if (apiUrl === null || token === null) {
      return;
    }
    setBusy(true);
    setProblem(null);
    const texts = {
      title: title.trim(),
      starts_at: withOffset(at),
      meeting_note: orNull(meeting),
      description: orNull(notes),
    };
    const options = { fetchFn, key: apiKey };
    let outcome: AccountOutcome<GroupRunDetail>;
    if (mode.kind === "new") {
      const body: GroupRunRequest = {
        ...mode.route.request,
        ...texts,
        visibility,
      };
      outcome = await createGroupRun(apiUrl, token, body, options);
    } else {
      outcome = await changeGroupRun(apiUrl, token, mode.run.id, texts, options);
    }
    setBusy(false);
    if (outcome.kind === "ok") {
      onDone(outcome.value);
      return;
    }
    if (sessionEnded(outcome)) {
      account.sessionEnded(token);
    }
    setProblem(groupRunProblem(outcome));
  }

  const day = at.toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  const time = at.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  return (
    <View
      style={[
        styles.screen,
        { paddingTop: insets.top + space.md, paddingBottom: insets.bottom + space.md },
      ]}
    >
      <ScrollView
        contentContainerStyle={styles.fields}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title} accessibilityRole="header">
          {mode.kind === "new" ? t("New group run") : t("Edit")}
        </Text>
        <Text style={styles.label}>{t("Title")}</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          maxLength={GROUP_RUN_TITLE_MAX}
          accessibilityLabel={t("Title")}
          testID="group-run-title"
        />
        <Text style={styles.label}>{t("Day and time")}</Text>
        <Stepper
          value={day}
          onLess={() => setAt((then) => movedDay(then, -1, now()))}
          onMore={() => setAt((then) => movedDay(then, 1, now()))}
          testID="group-run-day"
        />
        <Stepper
          value={time}
          onLess={() => setAt((then) => movedTime(then, -1, now()))}
          onMore={() => setAt((then) => movedTime(then, 1, now()))}
          testID="group-run-time"
        />
        <Text style={styles.label}>{t("Where exactly")}</Text>
        <TextInput
          style={styles.input}
          value={meeting}
          onChangeText={setMeeting}
          placeholder={t("e.g. MUSE entrance")}
          placeholderTextColor={color.textFaint}
          maxLength={GROUP_RUN_MEETING_NOTE_MAX}
          accessibilityLabel={t("Where exactly")}
          testID="group-run-meeting"
        />
        <Text style={styles.label}>{t("Notes")}</Text>
        <TextInput
          style={[styles.input, styles.notes]}
          value={notes}
          onChangeText={setNotes}
          placeholder={t("Pace, what to bring…")}
          placeholderTextColor={color.textFaint}
          maxLength={GROUP_RUN_DESCRIPTION_MAX}
          multiline
          accessibilityLabel={t("Notes")}
          testID="group-run-notes"
        />
        {mode.kind === "new" && (
          <>
            <Text style={styles.label}>{t("Who can see it")}</Text>
            <View style={styles.choices}>
              {(["everyone", "followers"] as const).map((one) => (
                <Tap
                  key={one}
                  style={[styles.choice, visibility === one && styles.chosen]}
                  onPress={() => setVisibility(one)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: visibility === one }}
                  testID={`group-run-${one}`}
                >
                  <Text
                    style={[styles.choiceText, visibility === one && styles.chosenText]}
                  >
                    {one === "followers" ? t("Followers") : t("Everyone")}
                  </Text>
                </Tap>
              ))}
            </View>
          </>
        )}
        <Text style={styles.safety}>{t(SAFETY)}</Text>
        {problem !== null && (
          <Text style={styles.problem} accessibilityRole="alert">
            {problem}
          </Text>
        )}
      </ScrollView>
      <View style={styles.buttons}>
        <Tap style={styles.button} onPress={onClose} accessibilityRole="button">
          <Text style={styles.buttonText}>{t("Not now")}</Text>
        </Tap>
        <Tap
          style={[styles.button, styles.primary, !ready && styles.off]}
          onPress={() => void publish()}
          disabled={!ready}
          accessibilityRole="button"
          accessibilityState={{ disabled: !ready, busy }}
          testID="group-run-publish"
        >
          <Text style={[styles.buttonText, styles.primaryText]}>{t("Publish")}</Text>
        </Tap>
      </View>
    </View>
  );
}

function Stepper({
  value,
  onLess,
  onMore,
  testID,
}: {
  value: string;
  onLess: () => void;
  onMore: () => void;
  testID: string;
}) {
  return (
    <View style={styles.stepper} testID={testID}>
      <Tap
        style={styles.step}
        onPress={onLess}
        accessibilityRole="button"
        accessibilityLabel="−"
        testID={`${testID}-less`}
      >
        <Text style={styles.stepText}>−</Text>
      </Tap>
      <Text style={styles.value} accessibilityLiveRegion="polite">
        {value}
      </Text>
      <Tap
        style={styles.step}
        onPress={onMore}
        accessibilityRole="button"
        accessibilityLabel="+"
        testID={`${testID}-more`}
      >
        <Text style={styles.stepText}>+</Text>
      </Tap>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: space.lg,
    backgroundColor: color.background,
  },
  fields: {
    gap: space.md,
    paddingBottom: space.md,
  },
  title: {
    color: color.text,
    fontSize: fontSize.title,
    fontWeight: fontWeight.bold,
  },
  input: {
    minHeight: MIN_TAP_SIZE,
    paddingHorizontal: space.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.borderStrong,
    backgroundColor: color.surface,
    color: color.text,
    fontSize: fontSize.input,
  },
  notes: {
    minHeight: 3 * MIN_TAP_SIZE,
    paddingTop: space.sm,
    textAlignVertical: "top",
  },
  label: {
    color: color.textMuted,
    fontSize: fontSize.small,
    fontWeight: fontWeight.semibold,
  },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
  },
  step: {
    width: MIN_TAP_SIZE,
    height: MIN_TAP_SIZE,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.borderStrong,
    backgroundColor: color.surfaceRaised,
  },
  stepText: {
    color: color.text,
    fontSize: fontSize.title,
  },
  value: {
    flex: 1,
    textAlign: "center",
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
  choices: {
    flexDirection: "row",
    gap: space.sm,
  },
  choice: {
    flex: 1,
    minHeight: MIN_TAP_SIZE,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.borderStrong,
  },
  chosen: {
    borderColor: color.text,
    backgroundColor: color.text,
  },
  choiceText: {
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
  chosenText: {
    color: color.background,
  },
  safety: {
    color: color.textMuted,
    fontSize: fontSize.small,
  },
  problem: {
    color: color.error,
    fontSize: fontSize.body,
  },
  buttons: {
    flexDirection: "row",
    gap: space.sm,
    paddingTop: space.sm,
  },
  button: {
    flex: 1,
    minHeight: MIN_TAP_SIZE,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.borderStrong,
    backgroundColor: color.surfaceRaised,
  },
  primary: {
    borderColor: color.text,
    backgroundColor: color.text,
  },
  off: {
    opacity: 0.5,
  },
  buttonText: {
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
  primaryText: {
    color: color.background,
  },
});
