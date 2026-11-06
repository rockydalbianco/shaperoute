import type { GymLeaderboard, GymLeaderboardRow } from "@shaperoute/shared-types";
import { useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import {
  initialWindowMetrics,
  SafeAreaProvider,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { accountProblem } from "../account/messages";
import { MONTHS } from "../activities/activityText";
import { fetchGymLeaderboard, shiftMonth } from "../api/gymLeaderboard";
import { t } from "../i18n";
import { useLanguage } from "../i18n/useLanguage";
import { useDrawingsDoor } from "../social/drawingsDoor";
import { useFollowsDoor } from "../social/followsDoor";
import { ReportMenu } from "../social/ReportMenu";
import {
  color,
  fontSize,
  fontWeight,
  MIN_TAP_SIZE,
  radius,
  space,
} from "../theme/tokens";
import { useUnits } from "../units/useUnits";
import { exerciseName, gymExercise } from "./catalog";
import { ExercisePicker } from "./ExercisePicker";
import { gymStyles } from "./gymStyles";
import { levelValue } from "./levelValue";

/** The exercises of the catalog with no scale, so no leaderboard
 * (fixtures/gym-exercises.json; Leaderboard.test.tsx compares). */
export const NO_LEADERBOARD: ReadonlySet<string> = new Set(["assisted_pull_up"]);

/** An exercise of the catalog with a leaderboard. */
export function hasLeaderboard(key: string | undefined): key is string {
  return (
    key !== undefined && gymExercise(key) !== undefined && !NO_LEADERBOARD.has(key)
  );
}

/** «Nov 2026»: a month (YYYY-MM) in the app's language. */
export function monthLabel(month: string): string {
  const [year, number] = month.split("-").map(Number);
  return `${t(MONTHS[number - 1])} ${year}`;
}

/** This month on the phone's calendar (YYYY-MM): the label until the API
 * says the month of Rome. */
function thisMonth(now: Date = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

/** The title of a leaderboard and of the line that opens it. */
export function leaderboardTitle(month: string = thisMonth()): string {
  return t("Gym leaderboard · {month}", { month: monthLabel(month) });
}

type Props = {
  visible: boolean;
  /** The exercise it opens on; another is chosen from the catalog. */
  exercise: string;
  onClose: () => void;
  /** For the tests: the API asked with this instead of `fetch`. */
  fetchFn?: typeof fetch;
};

/**
 * The monthly leaderboard at the gym over the whole screen (TASK-385 F,
 * ADR-0327, the user's choices of 2026-11-04 and 2026-11-06): an exercise,
 * a month of Rome (this one first, the ones before with «‹»), each person's
 * best live set, the best first, and who asks besides when it is further
 * down. A row opens its post; «…» reports the post or blocks its owner. Only
 * the sets logged live count, and the page says so.
 */
export function Leaderboard({ visible, exercise, onClose, fetchFn }: Props) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      {/* Over the whole screen: the Pager's pages have no top edge of their own. */}
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        {visible && (
          <LeaderboardPage exercise={exercise} onClose={onClose} fetchFn={fetchFn} />
        )}
      </SafeAreaProvider>
    </Modal>
  );
}

/** What the API said, for the exercise and month of `asked`. */
type Shown = { asked: string } & (
  { kind: "ok"; board: GymLeaderboard } | { kind: "failed"; words: string }
);

function LeaderboardPage({
  exercise: first,
  onClose,
  fetchFn,
}: Omit<Props, "visible">) {
  const insets = useSafeAreaInsets();
  const language = useLanguage();
  const units = useUnits();
  const { apiUrl, account } = useFollowsDoor();
  const drawings = useDrawingsDoor();
  const session = account.state.status === "signedIn" ? account.state.session : null;
  const token = session?.token ?? null;
  const [exercise, setExercise] = useState(first);
  // Null: this month of Rome, as the API says it.
  const [month, setMonth] = useState<string | null>(null);
  const [latest, setLatest] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const [shown, setShown] = useState<Shown | null>(null);
  const asked = `${exercise} ${month ?? ""}`;

  useEffect(() => {
    if (apiUrl === null || token === null) {
      return;
    }
    let live = true;
    void fetchGymLeaderboard(apiUrl, token, exercise, month, { fetchFn }).then(
      (outcome) => {
        if (!live) {
          return;
        }
        if (outcome.kind === "ok") {
          setShown({ asked, kind: "ok", board: outcome.value });
          if (month === null) {
            setLatest(outcome.value.month);
          }
        } else {
          setShown({ asked, kind: "failed", words: accountProblem(outcome) });
        }
      },
    );
    return () => {
      live = false;
    };
  }, [apiUrl, token, exercise, month, asked, fetchFn]);

  if (picking) {
    return (
      <View style={[gymStyles.screen, { paddingTop: insets.top + space.lg }]}>
        <ExercisePicker
          onPick={(entry) => {
            setPicking(false);
            if ("exercise" in entry && hasLeaderboard(entry.exercise)) {
              setExercise(entry.exercise);
            }
          }}
          onClose={() => setPicking(false)}
        />
      </View>
    );
  }

  const current = month ?? latest ?? thisMonth();
  // Another exercise or month asked: nothing until it comes.
  const now = shown !== null && shown.asked === asked ? shown : null;
  const board = now?.kind === "ok" ? now.board : null;
  const isLatest = latest === null || current >= latest;
  const before = shiftMonth(current, -1);
  const after = shiftMonth(current, 1);

  function open(row: GymLeaderboardRow) {
    onClose();
    drawings.open({ id: row.drawing_id });
  }

  function line(row: GymLeaderboardRow, mine: boolean) {
    const value =
      board === null
        ? ""
        : levelValue({ value: row.value, measure: board.measure }, units);
    const other =
      session !== null &&
      apiUrl !== null &&
      session.user.public_id !== row.user.public_id;
    return (
      <View key={`${mine ? "mine" : "row"}-${row.rank}`} style={styles.line}>
        <Pressable
          style={({ pressed }) => [
            styles.row,
            mine && styles.mine,
            pressed && styles.pressed,
          ]}
          onPress={() => open(row)}
          accessibilityRole="button"
          accessibilityLabel={`${row.rank}, ${row.user.username}, ${value}`}
          testID={mine ? "leaderboard-mine" : "leaderboard-row"}
        >
          <Text style={styles.rank}>{row.rank}</Text>
          <Text style={styles.name} numberOfLines={1}>
            {row.user.username}
          </Text>
          <Text style={styles.value}>{value}</Text>
        </Pressable>
        {other && (
          <ReportMenu
            apiUrl={apiUrl}
            token={session.token}
            target={{ kind: "drawing", id: row.drawing_id }}
            person={row.user}
            onSessionEnded={account.sessionEnded}
            fetchFn={fetchFn}
          />
        )}
      </View>
    );
  }

  const mineApart =
    board?.mine != null && !board.rows.some((row) => row.rank === board.mine?.rank)
      ? board.mine
      : null;

  return (
    <View
      style={[
        styles.screen,
        { paddingTop: insets.top + space.lg, paddingBottom: insets.bottom + space.lg },
      ]}
      testID="gym-leaderboard"
    >
      <View style={styles.months}>
        <Pressable
          style={styles.arrow}
          onPress={() => setMonth(before)}
          accessibilityRole="button"
          accessibilityLabel={monthLabel(before)}
          testID="leaderboard-before"
        >
          <Text style={styles.arrowText}>‹</Text>
        </Pressable>
        <Text style={styles.title} accessibilityRole="header">
          {leaderboardTitle(current)}
        </Text>
        <Pressable
          style={[styles.arrow, isLatest && styles.hidden]}
          disabled={isLatest}
          onPress={() => setMonth(after === latest ? null : after)}
          accessibilityRole="button"
          accessibilityLabel={monthLabel(after)}
          accessibilityElementsHidden={isLatest}
          testID="leaderboard-after"
        >
          <Text style={styles.arrowText}>›</Text>
        </Pressable>
      </View>
      <Pressable
        style={({ pressed }) => [styles.exercise, pressed && styles.pressed]}
        onPress={() => setPicking(true)}
        accessibilityRole="button"
        testID="leaderboard-exercise"
      >
        <Text
          style={styles.exerciseText}
        >{`${exerciseName({ exercise }, language)} ▾`}</Text>
      </Pressable>
      <Text style={gymStyles.muted}>{t("Only sets logged live count.")}</Text>
      <ScrollView contentContainerStyle={styles.rows}>
        {board?.rows.map((row) => line(row, row.rank === board.mine?.rank))}
        {mineApart !== null && line(mineApart, true)}
        {now?.kind === "failed" && (
          <Text style={[gymStyles.muted, gymStyles.danger]}>{now.words}</Text>
        )}
      </ScrollView>
      <Pressable
        style={({ pressed }) => [styles.close, pressed && styles.pressed]}
        onPress={onClose}
        accessibilityRole="button"
        testID="leaderboard-close"
      >
        <Text style={styles.closeText}>{t("Close")}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    gap: space.md,
    paddingHorizontal: space.lg,
    backgroundColor: color.background,
  },
  months: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
  },
  arrow: {
    minWidth: MIN_TAP_SIZE,
    minHeight: MIN_TAP_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  arrowText: {
    color: color.text,
    fontSize: fontSize.title,
  },
  hidden: {
    opacity: 0,
  },
  title: {
    flex: 1,
    textAlign: "center",
    color: color.text,
    fontSize: fontSize.heading,
    fontWeight: fontWeight.bold,
  },
  exercise: {
    alignSelf: "flex-start",
    minHeight: MIN_TAP_SIZE,
    justifyContent: "center",
    paddingHorizontal: space.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
  exerciseText: {
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
  rows: {
    gap: space.xs,
    paddingBottom: space.lg,
  },
  line: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
  },
  row: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    minHeight: MIN_TAP_SIZE,
    paddingHorizontal: space.md,
    borderRadius: radius.md,
    backgroundColor: color.surface,
  },
  mine: {
    borderWidth: 1,
    borderColor: color.accent,
  },
  pressed: {
    opacity: 0.7,
  },
  rank: {
    minWidth: space.xl,
    color: color.textMuted,
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold,
    fontVariant: ["tabular-nums"],
  },
  name: {
    flex: 1,
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
  value: {
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold,
    fontVariant: ["tabular-nums"],
  },
  close: {
    minHeight: MIN_TAP_SIZE,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.lg,
    backgroundColor: color.surface,
  },
  closeText: {
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
});
