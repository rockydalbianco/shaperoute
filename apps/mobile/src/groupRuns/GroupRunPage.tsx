import type { GroupOutingDetail, Person } from "@shaperoute/shared-types";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { sessionEnded } from "../account/messages";
import { startedLabel } from "../activities/activityText";
import type { FavoriteDetail } from "../api/favorites";
import { useFavoritesDoor } from "../favorites/favoritesDoor";
import { closeGroupPage, openGroupPage } from "../groups/groupDoor";
import { fetchGroup } from "../groups/groupsApi";
import { t, tPlural } from "../i18n";
import { ReportMenu } from "../social/ReportMenu";
import { useFollowsDoor } from "../social/followsDoor";
import {
  color,
  fontSize,
  fontWeight,
  MIN_TAP_SIZE,
  radius,
  space,
} from "../theme/tokens";
import { useBackCloses } from "../ui/backLayers";
import { useEdgeBack } from "../ui/EdgeBack";
import { Tap } from "../ui/Tap";
import { distanceLabel } from "../units/format";
import { GroupRunForm, groupRunProblem } from "./GroupRunForm";
import { closeGroupRunPage, openGroupRunPage, useAskedGroupRun } from "./groupRunDoor";
import { cancelGroupRun, fetchGroupRun, setGoing, withoutRoute } from "./groupRunsApi";
import { askRecord } from "./recordDoor";

/** The group run as the map shows it, as a favorite: «Start» runs it. */
export function favoriteOfGroupRun(run: GroupOutingDetail): FavoriteDetail {
  return {
    id: `group-run-${run.id}`,
    city: run.city,
    shape: run.shape,
    word: run.word,
    style: run.style === "round" || run.style === "block" ? run.style : null,
    title: run.title,
    distance_m: run.distance_m ?? 0,
    route_m: run.route_m ?? 0,
    similarity: run.similarity ?? 0,
    created_at: run.created_at,
    points: run.points,
    walks: run.walks,
    on_foot: run.on_foot,
    activity: run.activity,
    ...(run.rotation_deg === null ? {} : { rotation_deg: run.rotation_deg }),
  };
}

/** Whether who goes may still say «I'm going» or «Not going». */
function open(run: GroupOutingDetail): boolean {
  return run.status === "upcoming" || run.status === "started";
}

type Loaded =
  | { kind: "loading" }
  | { kind: "failed"; problem: string }
  | { kind: "ready"; run: GroupOutingDetail };

type Props = {
  groupRunId: string;
  onBack: () => void;
  /** For the tests: the fake fetch. */
  fetchFn?: typeof fetch;
  apiKey?: string | null;
};

/**
 * The page of a group run (TASK-309 part B, docs/EVENTI.md §4), over the app
 * as the page of a monthly challenge: its title, when on the phone's clock,
 * «Where exactly», the route's distance, the notes, the organiser and who
 * goes. «I'm going» and «Not going» until it is over; «Start» puts the route
 * on the map, as a favorite opened. The organiser changes it or cancels it
 * before it starts; anybody else may report it.
 *
 * An outing of a group (TASK-495 part C2, docs/GRUPPI.md §6) says its group,
 * which opens the group's page; without a route it has its «Destination» in
 * place of the km, and «Start» records its sport without a route. The
 * group's admin and co-admins may cancel it too.
 */
export function GroupRunPage({ groupRunId, onBack, fetchFn, apiKey }: Props) {
  const insets = useSafeAreaInsets();
  const { apiUrl, account, openProfile: showProfile } = useFollowsDoor();
  // A name opens the member's profile in place of the page: the page lies
  // over the profiles, so it goes first.
  const openProfile = (person: Person) => {
    onBack();
    showProfile(person);
  };
  const favorites = useFavoritesDoor();
  const { state } = account;
  const signedIn = state.status === "signedIn";
  const token = signedIn ? state.session.token : null;
  const me = signedIn ? (state.session.user.public_id ?? null) : null;
  const [loaded, setLoaded] = useState<Loaded>({ kind: "loading" });
  const [asked, setAsked] = useState(0);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [changing, setChanging] = useState(false);
  // Of an outing of a group: whether who looks leads the group, and so may
  // cancel it.
  const [leads, setLeads] = useState(false);
  useBackCloses(true, onBack);
  const edge = useEdgeBack(onBack, true);
  const options = { fetchFn, key: apiKey };

  useEffect(() => {
    if (apiUrl === null || token === null) {
      return;
    }
    let live = true;
    void fetchGroupRun(apiUrl, token, groupRunId, { fetchFn, key: apiKey }).then(
      (outcome) => {
        if (!live) {
          return;
        }
        if (outcome.kind === "ok") {
          setLoaded({ kind: "ready", run: outcome.value });
          const groupId = outcome.value.group_id;
          if (typeof groupId === "string") {
            void fetchGroup(apiUrl, token, groupId, { fetchFn, key: apiKey }).then(
              (group) => {
                if (live && group.kind === "ok") {
                  setLeads(group.value.me === "admin" || group.value.me === "coadmin");
                }
              },
            );
          }
          return;
        }
        if (sessionEnded(outcome)) {
          account.sessionEnded(token);
        }
        setLoaded({
          kind: "failed",
          problem: groupRunProblem(outcome) ?? t("Something went wrong."),
        });
      },
    );
    return () => {
      live = false;
    };
  }, [account, apiKey, apiUrl, asked, fetchFn, groupRunId, token]);

  async function going(next: boolean) {
    if (apiUrl === null || token === null) {
      return;
    }
    setBusy(true);
    setProblem(null);
    const outcome = await setGoing(apiUrl, token, groupRunId, next, options);
    setBusy(false);
    if (outcome.kind === "ok") {
      setAsked((n) => n + 1);
      return;
    }
    if (sessionEnded(outcome)) {
      account.sessionEnded(token);
    }
    setProblem(groupRunProblem(outcome));
  }

  function cancel() {
    Alert.alert(
      t("Cancel group run"),
      t("Cancel this group run? Everyone going gets a notice."),
      [
        { text: t("Not now"), style: "cancel" },
        {
          text: t("Cancel group run"),
          style: "destructive",
          onPress: () => {
            if (apiUrl === null || token === null) {
              return;
            }
            void cancelGroupRun(apiUrl, token, groupRunId, options).then((outcome) => {
              if (outcome.kind === "ok") {
                setAsked((n) => n + 1);
              } else {
                setProblem(groupRunProblem(outcome));
              }
            });
          },
        },
      ],
    );
  }

  function start(run: GroupOutingDetail) {
    if (withoutRoute(run)) {
      // Its sport's recording, without a route; never over a run going on.
      if (!askRecord(run.activity)) {
        setProblem(t("Finish the activity under way first."));
        return;
      }
    } else {
      favorites.show(favoriteOfGroupRun(run), () => openGroupRunPage(run.id));
    }
    closeGroupRunPage();
    closeGroupPage();
  }

  function openGroup(groupId: string) {
    openGroupPage(groupId);
    closeGroupRunPage();
  }

  const paddingTop = insets.top + space.lg;
  const paddingBottom = insets.bottom + space.xl;
  const run = loaded.kind === "ready" ? loaded.run : null;
  const mine = run !== null && me !== null && run.organiser.public_id === me;
  const free = run !== null && withoutRoute(run);

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, styles.screen, edge.style]}
      {...edge.handlers}
      testID="group-run-page"
    >
      {edge.shade}
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop, paddingBottom }]}
      >
        <View style={styles.titleRow}>
          <Tap
            style={styles.back}
            onPress={onBack}
            accessibilityRole="button"
            accessibilityLabel={t("Back")}
          >
            <Text style={styles.backText}>←</Text>
          </Tap>
          <Text style={styles.eyebrow} accessibilityRole="header">
            {t("Group runs")}
          </Text>
          <View style={styles.fill} />
          {run !== null && !mine && apiUrl !== null && token !== null && (
            <ReportMenu
              apiUrl={apiUrl}
              token={token}
              target={{ kind: "group_run", id: run.id }}
              person={run.organiser}
              onBlocked={onBack}
              onSessionEnded={account.sessionEnded}
              fetchFn={fetchFn}
              apiKey={apiKey}
            />
          )}
        </View>
        {loaded.kind === "loading" && (
          <ActivityIndicator color={color.textMuted} testID="group-run-loading" />
        )}
        {loaded.kind === "failed" && (
          <View style={styles.block}>
            <Text style={styles.problem} accessibilityRole="alert">
              {loaded.problem}
            </Text>
            <Tap
              style={styles.button}
              onPress={() => {
                setLoaded({ kind: "loading" });
                setAsked((n) => n + 1);
              }}
              accessibilityRole="button"
            >
              <Text style={styles.buttonText}>{t("Try again")}</Text>
            </Tap>
          </View>
        )}
        {run !== null && (
          <>
            <Text style={styles.title}>{run.title}</Text>
            {run.status === "cancelled" && (
              <Text style={styles.status}>{t("Cancelled")}</Text>
            )}
            {run.status === "over" && <Text style={styles.status}>{t("Over")}</Text>}
            <Text style={styles.facts}>{startedLabel(run.starts_at)}</Text>
            {typeof run.group_id === "string" && typeof run.group_name === "string" && (
              <Tap
                style={styles.person}
                onPress={() => openGroup(run.group_id as string)}
                accessibilityRole="button"
                testID="group-run-group"
              >
                <Text style={styles.personName}>{run.group_name}</Text>
              </Tap>
            )}
            {free && (
              <>
                <Text style={styles.label}>{t("Destination")}</Text>
                <Text style={styles.facts} testID="group-run-destination">
                  {run.destination}
                </Text>
              </>
            )}
            {run.meeting_note !== null && (
              <Text style={styles.facts}>{run.meeting_note}</Text>
            )}
            {!free && run.distance_m !== null && (
              <Text style={styles.facts}>{distanceLabel(run.distance_m)}</Text>
            )}
            {run.description !== null && (
              <Text style={styles.notes}>{run.description}</Text>
            )}
            <Text style={styles.label}>{t("Organiser")}</Text>
            <PersonRow person={run.organiser} onOpen={openProfile} />
            <Text style={styles.label}>
              {tPlural(run.going, "1 going", "{count} going")}
            </Text>
            {run.people
              .filter((person) => person.public_id !== run.organiser.public_id)
              .map((person) => (
                <PersonRow
                  key={person.public_id}
                  person={person}
                  onOpen={openProfile}
                />
              ))}
            {problem !== null && (
              <Text style={styles.problem} accessibilityRole="alert">
                {problem}
              </Text>
            )}
            {open(run) && (
              <View style={styles.buttons}>
                <Tap
                  style={[styles.button, styles.primary]}
                  onPress={() => start(run)}
                  accessibilityRole="button"
                  testID="group-run-start"
                >
                  <Text style={[styles.buttonText, styles.primaryText]}>
                    {t("Start")}
                  </Text>
                </Tap>
                {!mine &&
                  (run.i_am_going ? (
                    <Tap
                      style={styles.button}
                      onPress={() => void going(false)}
                      disabled={busy}
                      accessibilityRole="button"
                      accessibilityHint={t("You're going")}
                      testID="group-run-not-going"
                    >
                      <Text style={styles.buttonText}>{t("Not going")}</Text>
                    </Tap>
                  ) : (
                    <Tap
                      style={styles.button}
                      onPress={() => void going(true)}
                      disabled={busy}
                      accessibilityRole="button"
                      testID="group-run-going"
                    >
                      <Text style={styles.buttonText}>{t("I'm going")}</Text>
                    </Tap>
                  ))}
              </View>
            )}
            {!mine && run.i_am_going && open(run) && (
              <Text style={styles.going}>{t("You're going")}</Text>
            )}
            {(mine || leads) && run.status === "upcoming" && (
              <View style={styles.buttons}>
                {mine && (
                  <Tap
                    style={styles.button}
                    onPress={() => setChanging(true)}
                    accessibilityRole="button"
                    testID="group-run-edit"
                  >
                    <Text style={styles.buttonText}>{t("Edit")}</Text>
                  </Tap>
                )}
                <Tap
                  style={styles.button}
                  onPress={cancel}
                  accessibilityRole="button"
                  testID="group-run-cancel"
                >
                  <Text style={[styles.buttonText, styles.danger]}>
                    {t("Cancel group run")}
                  </Text>
                </Tap>
              </View>
            )}
            {changing && (
              <GroupRunForm
                mode={{ kind: "change", run }}
                onClose={() => setChanging(false)}
                onDone={(changed) => {
                  setChanging(false);
                  setLoaded({ kind: "ready", run: changed });
                }}
                fetchFn={fetchFn}
                apiKey={apiKey}
              />
            )}
          </>
        )}
      </ScrollView>
    </Animated.View>
  );
}

/** A member who goes: the name opens the profile. */
function PersonRow({
  person,
  onOpen,
}: {
  person: Person;
  onOpen: (person: Person) => void;
}) {
  return (
    <Tap
      style={styles.person}
      onPress={() => onOpen(person)}
      accessibilityRole="button"
      accessibilityLabel={t("{name}'s profile", { name: person.username })}
    >
      <Text style={styles.personName}>{person.username}</Text>
    </Tap>
  );
}

/**
 * The page where the app asks for it (`groupRunDoor`): `ProfileLayer` puts
 * this over the app.
 */
export function GroupRunPageHost() {
  const asked = useAskedGroupRun();
  if (asked === null) {
    return null;
  }
  return (
    <GroupRunPage key={asked.id} groupRunId={asked.id} onBack={closeGroupRunPage} />
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: color.background,
  },
  content: {
    gap: space.md,
    paddingHorizontal: space.lg,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
  },
  back: {
    width: MIN_TAP_SIZE,
    height: MIN_TAP_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  backText: {
    color: color.text,
    fontSize: fontSize.title,
  },
  eyebrow: {
    color: color.textMuted,
    fontSize: fontSize.small,
    fontWeight: fontWeight.semibold,
  },
  fill: {
    flex: 1,
  },
  block: {
    gap: space.md,
  },
  title: {
    color: color.text,
    fontSize: fontSize.title,
    fontWeight: fontWeight.bold,
  },
  status: {
    color: color.error,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
  facts: {
    color: color.text,
    fontSize: fontSize.body,
  },
  notes: {
    color: color.textMuted,
    fontSize: fontSize.body,
  },
  label: {
    color: color.textMuted,
    fontSize: fontSize.small,
    fontWeight: fontWeight.semibold,
    marginTop: space.sm,
  },
  person: {
    minHeight: MIN_TAP_SIZE,
    justifyContent: "center",
  },
  personName: {
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
  going: {
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
    marginTop: space.sm,
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
    paddingHorizontal: space.md,
  },
  primary: {
    borderColor: color.accent,
    backgroundColor: color.accent,
  },
  buttonText: {
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
  primaryText: {
    color: color.onAccent,
  },
  danger: {
    color: color.error,
  },
});
