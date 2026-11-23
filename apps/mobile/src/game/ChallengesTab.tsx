import type { GameTeam } from "@shaperoute/shared-types";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { t, tPlural } from "../i18n";
import { useLanguage } from "../i18n/useLanguage";
import { useContest } from "../contest/useContest";
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
import { useUnits } from "../units/useUnits";
import {
  clearRequestedChallenge,
  type RequestedChallenge,
  useRequestedChallenge,
} from "./challengeDoor";
import { useGameCatalog } from "./gameCatalog";
import { MonthChallengeRow } from "./MonthChallengeRow";
import { PersonalCard } from "./PersonalCard";
import { challengeName, medalName, periodLeftText, periodText } from "./personalText";
import { shapeNameIn } from "./ShapeCard";
import { SlideIn } from "./SlideIn";
import { StreakCard } from "./StreakCard";
import { TeamView } from "./TeamView";
import { keepChallenge } from "./useChallenge";
import { usePersonal } from "./usePersonal";
import { useTeams } from "./useTeams";

type Props = {
  /** The tab is on screen: the teams are asked for. */
  active: boolean;
  /** «Sign in to play with a team.» touched: the way to the account. */
  onSignIn: () => void;
  /** The fake fetch of the tests. */
  fetchFn?: typeof fetch;
  apiKey?: string | null;
  now?: () => number;
};

/** What is open over the list: a team, or the challenge a notification
 * named, whose team the challenge itself says. A team just created or
 * joined is kept here too, while the list is read again. */
type Open = { teamId: string | null; challengeId: string | null; team?: GameTeam };

/**
 * The «Challenges» tab of «Play» (TASK-296 part D, TASK-423 part D;
 * docs/GIOCO.md §9): one list in three parts. «In progress»: the personal
 * challenges of the week and the month, the streak, the teams with a
 * challenge going, the monthly challenge once entered. «Available»: the
 * other teams, «Create» with a name and «Join» with a code, the monthly
 * challenge not entered yet. «Finished»: the medals of the last weeks, the
 * teams' challenges done or out of time, the link to the past monthly
 * challenges. A team touched opens, with its challenge. Without an account,
 * the way to sign in; on an API without the teams or the personal
 * challenges yet, a quiet line and no error. A challenge's notification
 * touched opens that challenge (`challengeDoor`).
 */
export function ChallengesTab({ active, onSignIn, fetchFn, apiKey, now }: Props) {
  const { account } = useFollowsDoor();
  const me =
    account.state.status === "signedIn"
      ? (account.state.session.user.public_id ?? null)
      : null;
  const units = useUnits();
  const language = useLanguage();
  const catalog = useGameCatalog();
  const teams = useTeams(active, { fetchFn, key: apiKey });
  const personal = usePersonal(active, { fetchFn, key: apiKey });
  // The monthly challenge (TASK-343): only its link, for who is signed in.
  const month = useContest(active && me !== null, { fetchFn, key: apiKey });
  const [open, setOpen] = useState<Open | null>(null);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [createProblem, setCreateProblem] = useState<string | null>(null);
  const [joinProblem, setJoinProblem] = useState<string | null>(null);

  // A challenge asked for from outside: opened, once per request.
  const requested = useRequestedChallenge();
  const [seen, setSeen] = useState<RequestedChallenge | null>(null);
  if (requested !== null && requested !== seen) {
    setSeen(requested);
    setOpen({ teamId: null, challengeId: requested.id });
  }
  useEffect(() => {
    if (requested !== null && requested === seen) {
      clearRequestedChallenge();
    }
  }, [requested, seen]);

  const list: GameTeam[] = teams.shown.status === "ready" ? teams.shown.teams : [];

  function show(team: GameTeam) {
    if (team.challenge !== null) {
      keepChallenge(team.challenge);
    }
    setOpen({ teamId: team.id, challengeId: team.challenge?.id ?? null, team });
  }

  async function create() {
    Keyboard.dismiss();
    setCreating(true);
    setCreateProblem(null);
    const done = await teams.create(name.trim());
    setCreating(false);
    if (done.ok) {
      setName("");
      show(done.value);
    } else {
      setCreateProblem(done.problem);
    }
  }

  async function join() {
    Keyboard.dismiss();
    setJoining(true);
    setJoinProblem(null);
    const done = await teams.join(code.trim());
    setJoining(false);
    if (done.ok) {
      setCode("");
      show(done.value);
    } else {
      setJoinProblem(done.problem);
    }
  }

  if (teams.shown.status === "off") {
    return (
      <Tap
        style={styles.notice}
        onPress={onSignIn}
        accessibilityRole="button"
        testID="challenges-sign-in"
      >
        <Text style={styles.noticeText}>{t("Sign in to play with a team.")}</Text>
      </Tap>
    );
  }
  if (open !== null) {
    const team =
      list.find((each) => each.id === open.teamId) ??
      teamOf(list, open.challengeId) ??
      open.team ??
      null;
    return (
      // A team opened slides in (TASK-423, the motion of «Play»).
      <SlideIn key={`${open.teamId ?? ""}-${open.challengeId ?? ""}`} from="right">
        <TeamView
          key={`${open.teamId ?? ""}-${open.challengeId ?? ""}`}
          team={team}
          challengeId={open.challengeId}
          me={me}
          catalog={catalog}
          units={units}
          language={language}
          onBack={() => {
            setOpen(null);
            teams.reread();
          }}
          onRemove={teams.remove}
          onChanged={teams.reread}
          fetchFn={fetchFn}
          apiKey={apiKey}
          now={now}
        />
      </SlideIn>
    );
  }
  const nowMs = (now ?? Date.now)();
  const going = list.filter((team) => team.challenge?.status === "active");
  const others = list.filter((team) => team.challenge?.status !== "active");
  const ended = list.filter(
    (team) => team.challenge !== null && team.challenge.status !== "active",
  );
  const mine = personal.shown.status === "ready" ? personal.shown.personal : null;
  const contest = month.contest;
  const contestOpen = contest !== null && contest.closed_at === null;
  // `mine` of the contest: the account's best post in it; undefined before
  // the API answered for this account.
  const entered = contestOpen && month.mine !== null && month.mine !== undefined;

  function teamRow(team: GameTeam) {
    const shape = catalog?.shapes.find((each) => each.id === team.challenge?.shape_id);
    const summary =
      team.challenge === null
        ? t("No challenge yet")
        : `${shape === undefined ? team.challenge.shape_id : shapeNameIn(shape, language)} · ${t(
            "{done} of {total} pieces done",
            {
              done: team.challenge.pieces.filter((piece) => piece.done).length,
              total: team.challenge.pieces.length,
            },
          )}`;
    return (
      <Tap
        key={team.id}
        style={styles.team}
        onPress={() => show(team)}
        accessibilityRole="button"
        accessibilityLabel={`${team.name}, ${tPlural(
          team.members.length,
          "{count} member",
          "{count} members",
        )}, ${summary}`}
        testID={`team-${team.id}`}
      >
        <Text style={styles.teamName} numberOfLines={1}>
          {team.name}
        </Text>
        <Text style={styles.teamLine}>
          {tPlural(team.members.length, "{count} member", "{count} members")}
        </Text>
        <Text style={styles.teamLine} numberOfLines={1}>
          {summary}
        </Text>
      </Tap>
    );
  }

  const finishedCount =
    (mine?.finished.length ?? 0) + ended.length + (contest !== null ? 1 : 0);

  return (
    <View style={styles.tab} testID="challenges-tab">
      <Text style={styles.heading} accessibilityRole="header">
        {t("In progress")}
      </Text>
      {personal.shown.status === "loading" && (
        <ActivityIndicator color={color.textMuted} style={styles.wait} />
      )}
      {personal.shown.status === "failed" && (
        <View style={styles.notice}>
          <Text style={styles.noticeText}>{personal.shown.problem}</Text>
          <Tap
            style={styles.button}
            onPress={personal.refresh}
            accessibilityRole="button"
            testID="personal-retry"
          >
            <Text style={styles.buttonText}>{t("Try again")}</Text>
          </Tap>
        </View>
      )}
      {mine !== null && (
        <>
          <Text style={styles.period} testID="personal-week">
            {`${t("This week")} · ${periodLeftText(mine.week.end, nowMs)}`}
          </Text>
          {mine.week.challenges.map((standing) => (
            <PersonalCard key={standing.id} standing={standing} units={units} />
          ))}
          <Text style={styles.period} testID="personal-month">
            {`${t("This month")} · ${periodLeftText(mine.month.end, nowMs)}`}
          </Text>
          {mine.month.challenges.map((standing) => (
            <PersonalCard key={standing.id} standing={standing} units={units} />
          ))}
          <StreakCard streaks={mine.streaks} />
        </>
      )}
      {going.map(teamRow)}
      {entered && (
        <MonthChallengeRow
          contest={contest}
          language={language}
          kind="challenge"
          nowMs={nowMs}
        />
      )}
      {mine === null &&
        going.length === 0 &&
        !entered &&
        personal.shown.status !== "loading" && (
          <Text style={styles.muted} testID="in-progress-empty">
            {t("Nothing in progress.")}
          </Text>
        )}

      <Text style={styles.heading} accessibilityRole="header">
        {t("Available")}
      </Text>
      {contestOpen && !entered && (
        <MonthChallengeRow
          contest={contest}
          language={language}
          kind="challenge"
          nowMs={nowMs}
        />
      )}
      {teams.shown.status === "none" && (
        <Text style={styles.muted} testID="challenges-none">
          {t("Teams are not on this server yet.")}
        </Text>
      )}
      {teams.shown.status === "loading" && (
        <ActivityIndicator color={color.textMuted} style={styles.wait} />
      )}
      {teams.shown.status === "failed" && (
        <View style={styles.notice}>
          <Text style={styles.noticeText}>{teams.shown.problem}</Text>
          <Tap
            style={styles.button}
            onPress={teams.refresh}
            accessibilityRole="button"
            testID="challenges-retry"
          >
            <Text style={styles.buttonText}>{t("Try again")}</Text>
          </Tap>
        </View>
      )}
      {teams.shown.status === "ready" && list.length === 0 && (
        <Text style={styles.muted} testID="challenges-empty">
          {t("No team yet. Create one, or join one with its code.")}
        </Text>
      )}
      {others.map(teamRow)}

      {teams.shown.status !== "none" && (
        <>
          <Text style={styles.subheading}>{t("Create")}</Text>
          <View style={styles.form}>
            <TextInput
              style={styles.field}
              value={name}
              onChangeText={setName}
              placeholder={t("Team name")}
              placeholderTextColor={color.textFaint}
              accessibilityLabel={t("Team name")}
              maxLength={40}
              editable={!creating}
              keyboardAppearance="dark"
              returnKeyType="done"
              onSubmitEditing={() => void create()}
              testID="team-name"
            />
            <Tap
              style={[styles.button, (creating || name.trim() === "") && styles.off]}
              onPress={() => void create()}
              disabled={creating || name.trim() === ""}
              accessibilityRole="button"
              testID="team-create"
            >
              <Text style={styles.buttonText}>{t("Create")}</Text>
            </Tap>
          </View>
          {createProblem !== null && (
            <Text
              style={styles.problem}
              accessibilityLiveRegion="polite"
              testID="create-problem"
            >
              {createProblem}
            </Text>
          )}

          <Text style={styles.subheading}>{t("Join")}</Text>
          <View style={styles.form}>
            <TextInput
              style={styles.field}
              value={code}
              onChangeText={setCode}
              placeholder={t("Team code")}
              placeholderTextColor={color.textFaint}
              accessibilityLabel={t("Team code")}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={8}
              editable={!joining}
              keyboardAppearance="dark"
              returnKeyType="done"
              onSubmitEditing={() => void join()}
              testID="team-code-field"
            />
            <Tap
              style={[styles.button, (joining || code.trim() === "") && styles.off]}
              onPress={() => void join()}
              disabled={joining || code.trim() === ""}
              accessibilityRole="button"
              testID="team-join"
            >
              <Text style={styles.buttonText}>{t("Join")}</Text>
            </Tap>
          </View>
          {joinProblem !== null && (
            <Text
              style={styles.problem}
              accessibilityLiveRegion="polite"
              testID="join-problem"
            >
              {joinProblem}
            </Text>
          )}
        </>
      )}

      <Text style={styles.heading} accessibilityRole="header">
        {t("Finished")}
      </Text>
      {mine?.finished.map((medal) => (
        <View
          key={`${medal.period}-${medal.start}-${medal.id}`}
          style={styles.medal}
          accessible
          accessibilityLabel={`${challengeName(medal.id)}, ${medalName(medal.tier)}, ${periodText(
            medal.period,
            medal.start,
          )}`}
          testID={`medal-${medal.id}-${medal.start}`}
        >
          <View style={styles.medalLine}>
            <Text style={[styles.teamName, styles.grow]} numberOfLines={1}>
              {challengeName(medal.id)}
            </Text>
            <Text style={styles.medalName}>{medalName(medal.tier)}</Text>
          </View>
          <Text style={styles.teamLine}>{periodText(medal.period, medal.start)}</Text>
        </View>
      ))}
      {ended.map((team) => {
        const done = team.challenge?.status === "completed";
        const shape = catalog?.shapes.find(
          (each) => each.id === team.challenge?.shape_id,
        );
        const shapeName =
          shape === undefined
            ? (team.challenge?.shape_id ?? "")
            : shapeNameIn(shape, language);
        const line = `${shapeName} · ${done ? t("Shape completed") : t("Time is up")}`;
        return (
          <Tap
            key={`ended-${team.id}`}
            style={styles.team}
            onPress={() => show(team)}
            accessibilityRole="button"
            accessibilityLabel={`${team.name}, ${line}`}
            testID={`ended-${team.id}`}
          >
            <Text style={styles.teamName} numberOfLines={1}>
              {team.name}
            </Text>
            <Text style={styles.teamLine} numberOfLines={1}>
              {line}
            </Text>
          </Tap>
        );
      })}
      {contest !== null && (
        <MonthChallengeRow
          contest={contest}
          language={language}
          kind="archive"
          nowMs={nowMs}
        />
      )}
      {finishedCount === 0 && (
        <Text style={styles.muted} testID="finished-empty">
          {t("Nothing finished yet.")}
        </Text>
      )}
    </View>
  );
}

/** The team whose newest challenge is `challengeId`; null if none is. */
function teamOf(
  list: readonly GameTeam[],
  challengeId: string | null,
): GameTeam | null {
  if (challengeId === null) {
    return null;
  }
  return list.find((team) => team.challenge?.id === challengeId) ?? null;
}

const styles = StyleSheet.create({
  tab: {
    gap: space.sm,
  },
  heading: {
    marginTop: space.sm,
    color: color.textMuted,
    fontSize: fontSize.label,
    fontWeight: fontWeight.semibold,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  subheading: {
    marginTop: space.xs,
    color: color.textMuted,
    fontSize: fontSize.small,
    fontWeight: fontWeight.semibold,
  },
  period: {
    marginTop: space.xs,
    color: color.textMuted,
    fontSize: fontSize.small,
    fontWeight: fontWeight.semibold,
  },
  medal: {
    padding: space.md,
    borderRadius: radius.lg,
    backgroundColor: color.surface,
    gap: 2,
  },
  medalLine: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: space.sm,
  },
  grow: {
    flex: 1,
  },
  medalName: {
    color: color.accent,
    fontSize: fontSize.label,
    fontWeight: fontWeight.bold,
  },
  wait: {
    marginVertical: space.sm,
  },
  notice: {
    padding: space.md,
    borderRadius: radius.lg,
    backgroundColor: color.surface,
    gap: space.sm,
    minHeight: MIN_TAP_SIZE,
    justifyContent: "center",
  },
  noticeText: {
    color: color.text,
    fontSize: fontSize.body,
  },
  muted: {
    color: color.textMuted,
    fontSize: fontSize.body,
  },
  team: {
    padding: space.md,
    borderRadius: radius.lg,
    backgroundColor: color.surface,
    gap: 2,
  },
  teamName: {
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold,
  },
  teamLine: {
    color: color.textMuted,
    fontSize: fontSize.small,
  },
  form: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
  },
  field: {
    flex: 1,
    minHeight: MIN_TAP_SIZE,
    paddingHorizontal: space.md,
    borderRadius: radius.md,
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.border,
    color: color.text,
    fontSize: fontSize.input,
  },
  button: {
    minHeight: MIN_TAP_SIZE,
    justifyContent: "center",
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    backgroundColor: color.surfaceRaised,
    borderWidth: 1,
    borderColor: color.borderStrong,
  },
  buttonText: {
    color: color.text,
    fontSize: fontSize.small,
    fontWeight: fontWeight.bold,
  },
  off: {
    opacity: 0.4,
  },
  problem: {
    color: color.error,
    fontSize: fontSize.small,
  },
});
