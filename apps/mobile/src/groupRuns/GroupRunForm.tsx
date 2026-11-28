import {
  GROUP_OUTING_DESTINATION_MAX,
  GROUP_RUN_DESCRIPTION_MAX,
  GROUP_RUN_MEETING_NOTE_MAX,
  GROUP_RUN_TITLE_MAX,
  type Group,
  type GroupDetail,
  type GroupOutingDetail,
  type GroupOutingVisibility,
  type GroupRunRequest,
  type GroupRunVisibility,
  type LatLon,
} from "@shaperoute/shared-types";
import { useEffect, useState } from "react";
import { Modal, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import {
  initialWindowMetrics,
  SafeAreaProvider,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { accountProblem, sessionEnded } from "../account/messages";
import type { AccountOutcome } from "../api/accounts";
import { favoriteTitle, type Keepable } from "../favorites/favoriteRoute";
import { fetchMyGroups } from "../groups/groupsApi";
import { ALPINISM_SAFETY, GROUP_SAFETY } from "../groups/groupText";
import { t, tLater } from "../i18n";
import { findProfile } from "../sports";
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
import { changeGroupRun, createGroupOuting, createGroupRun } from "./groupRunsApi";
import { MeetingPointMap } from "./MeetingPointMap";
import { sportOfActivity } from "./recordDoor";

/** The safety words under the form (approved with the proposal, 2026-10-26). */
export const SAFETY = tLater(
  "Meet in a public place, never at your home. MuW doesn't organise or check group runs. Everyone on MuW is 16 or older.",
);

/** The group an outing is of, as the form needs it. */
export type OutingGroup = Pick<Group, "id" | "name" | "access" | "sports">;

export type FormMode =
  /** A route on the map; with `group`, an outing of it (TASK-495 part C2):
   * the «Group» row starts on it. */
  | { kind: "new"; route: Keepable; group?: OutingGroup | null }
  /** An outing of `group` without a route: its sport, the meeting point on
   * the map from the group's area, the «Destination». */
  | { kind: "outing"; group: GroupDetail }
  | { kind: "change"; run: GroupOutingDetail };

type Visibility = GroupRunVisibility | GroupOutingVisibility;

/** The sports an outing without a route of `group` may be of: its own,
 * recorded outdoors (not the gym, not the stretching). */
export function outingSports(group: Pick<Group, "sports">): string[] {
  return group.sports.filter((sport) => sportOfActivity(sport) !== null);
}

/** Who can see a group run, or an outing of `group`: the members only, or
 * everyone in a public group (GRUPPI.md §6). */
function visibilities(group: OutingGroup | null): Visibility[] {
  if (group === null) {
    return ["everyone", "followers"];
  }
  return group.access === "public" ? ["group", "everyone"] : ["group"];
}

const VISIBILITY_TEXTS: Readonly<Record<Visibility, string>> = {
  everyone: tLater("Everyone"),
  followers: tLater("Followers"),
  group: tLater("Members only"),
};

type Props = {
  mode: FormMode;
  onClose: () => void;
  /** The group run published or changed, as the API keeps it. */
  onDone: (run: GroupOutingDetail) => void;
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
 *
 * An outing of a group (TASK-495 part C2, docs/GRUPPI.md §6, the user's
 * choices of 2026-11-27): a route with «Group» chosen among mine, or,
 * without a route, its sport, the meeting point on the map and the
 * «Destination»; for the members only, or for everyone in a public group.
 * The notice of mountaineering over a day of it.
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
  // The route's own name to begin with: «Star», «CIAO», the theme; an
  // outing without a route has none.
  const [title, setTitle] = useState(() =>
    (mode.kind === "change"
      ? mode.run.title
      : mode.kind === "new"
        ? favoriteTitle(mode.route.request)
        : ""
    ).slice(0, GROUP_RUN_TITLE_MAX),
  );
  const [at, setAt] = useState(() =>
    was === null ? firstStart(now()) : new Date(was.starts_at),
  );
  const [meeting, setMeeting] = useState(was?.meeting_note ?? "");
  const [notes, setNotes] = useState(was?.description ?? "");
  const [destination, setDestination] = useState(was?.destination ?? "");
  // The group of a new one: the one it was opened from, or chosen in the
  // «Group» row among mine.
  const [group, setGroup] = useState<OutingGroup | null>(() =>
    mode.kind === "outing"
      ? mode.group
      : mode.kind === "new"
        ? (mode.group ?? null)
        : null,
  );
  const [mine, setMine] = useState<OutingGroup[]>([]);
  const [visibility, setVisibility] = useState<Visibility>(
    () => was?.visibility ?? visibilities(group)[0],
  );
  const sports = mode.kind === "outing" ? outingSports(mode.group) : [];
  const [sport, setSport] = useState<string | null>(sports[0] ?? null);
  const [point, setPoint] = useState<LatLon | null>(null);
  const [picking, setPicking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const outing = mode.kind === "outing" || (was !== null && was.destination !== null);
  const ready =
    title.trim() !== "" &&
    !busy &&
    apiUrl !== null &&
    token !== null &&
    (!outing || destination.trim() !== "") &&
    (mode.kind !== "outing" || (sport !== null && point !== null));

  // My groups, for the «Group» row of a new group run with a route.
  useEffect(() => {
    if (mode.kind !== "new" || apiUrl === null || token === null) {
      return;
    }
    let live = true;
    void fetchMyGroups(apiUrl, token, { fetchFn, key: apiKey }).then((outcome) => {
      if (live && outcome.kind === "ok") {
        setMine(outcome.value.groups);
      }
    });
    return () => {
      live = false;
    };
  }, [apiKey, apiUrl, fetchFn, mode.kind, token]);

  function chooseGroup(next: OutingGroup | null) {
    setGroup(next);
    setVisibility(visibilities(next)[0]);
  }

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
    let outcome: AccountOutcome<GroupOutingDetail>;
    if (mode.kind === "new") {
      const body: GroupRunRequest = {
        ...mode.route.request,
        ...texts,
        visibility,
        ...(group === null ? {} : { group_id: group.id }),
      };
      outcome = await createGroupRun(apiUrl, token, body, options);
    } else if (mode.kind === "outing") {
      if (sport === null || point === null) {
        setBusy(false);
        return;
      }
      outcome = await createGroupOuting(
        apiUrl,
        token,
        {
          ...texts,
          group_id: mode.group.id,
          activity: sport,
          meeting_point: point,
          destination: destination.trim(),
          visibility: visibility === "everyone" ? "everyone" : "group",
        },
        options,
      );
    } else {
      outcome = await changeGroupRun(
        apiUrl,
        token,
        mode.run.id,
        outing ? { ...texts, destination: destination.trim() } : texts,
        options,
      );
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
  const heading =
    mode.kind === "change"
      ? t("Edit")
      : group !== null
        ? t("New outing")
        : t("New group run");
  // The notice of GRUPPI.md §9 over a day of mountaineering.
  const activity = mode.kind === "outing" ? sport : (was?.activity ?? null);
  const alpinism = activity === "alpinism";
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
          {heading}
        </Text>
        {mode.kind === "new" && (mine.length > 0 || group !== null) && (
          <>
            <Text style={styles.label}>{t("Group")}</Text>
            <View style={[styles.choices, styles.wrap]}>
              <Choice
                label={t("None")}
                chosen={group === null}
                onPress={() => chooseGroup(null)}
                testID="group-run-no-group"
              />
              {(mine.some((one) => one.id === group?.id) || group === null
                ? mine
                : [group, ...mine]
              ).map((one) => (
                <Choice
                  key={one.id}
                  label={one.name}
                  chosen={group?.id === one.id}
                  onPress={() => chooseGroup(one)}
                  testID={`group-run-group-${one.id}`}
                />
              ))}
            </View>
          </>
        )}
        {mode.kind === "outing" && (
          <>
            <Text style={styles.facts}>{mode.group.name}</Text>
            <Text style={styles.label}>{t("Sport")}</Text>
            <View style={[styles.choices, styles.wrap]}>
              {sports.map((one) => {
                const profile = findProfile(one);
                return (
                  <Choice
                    key={one}
                    label={
                      profile === undefined
                        ? one
                        : `${profile.emoji} ${t(profile.name)}`
                    }
                    chosen={sport === one}
                    onPress={() => setSport(one)}
                    testID={`group-run-sport-${one}`}
                  />
                );
              })}
            </View>
          </>
        )}
        <Text style={styles.label}>{t("Title")}</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          maxLength={GROUP_RUN_TITLE_MAX}
          accessibilityLabel={t("Title")}
          testID="group-run-title"
        />
        {outing && (
          <>
            <Text style={styles.label}>{t("Destination")}</Text>
            <TextInput
              style={styles.input}
              value={destination}
              onChangeText={setDestination}
              placeholder={t("e.g. Cima Tosa, normal route")}
              placeholderTextColor={color.textFaint}
              maxLength={GROUP_OUTING_DESTINATION_MAX}
              accessibilityLabel={t("Destination")}
              testID="group-run-destination"
            />
          </>
        )}
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
        {mode.kind === "outing" && (
          <>
            <Text style={styles.label}>{t("Meeting point")}</Text>
            <Tap
              style={styles.button}
              onPress={() => setPicking(true)}
              accessibilityRole="button"
              testID="group-run-meeting-point"
            >
              <Text style={styles.buttonText}>
                {point === null ? t("Choose on the map") : t("Move the pin")}
              </Text>
            </Tap>
          </>
        )}
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
        {mode.kind !== "change" && (
          <>
            <Text style={styles.label}>{t("Who can see it")}</Text>
            <View style={styles.choices}>
              {visibilities(group).map((one) => (
                <Choice
                  key={one}
                  label={t(VISIBILITY_TEXTS[one])}
                  chosen={visibility === one}
                  onPress={() => setVisibility(one)}
                  testID={`group-run-${one}`}
                  radio
                />
              ))}
            </View>
          </>
        )}
        {alpinism && <Text style={styles.safety}>{t(ALPINISM_SAFETY)}</Text>}
        <Text style={styles.safety}>
          {t(group !== null || outing ? GROUP_SAFETY : SAFETY)}
        </Text>
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
      {picking && mode.kind === "outing" && (
        <MeetingPointMap
          from={point ?? mode.group.area}
          onDone={(picked) => {
            setPoint(picked);
            setPicking(false);
          }}
          onClose={() => setPicking(false)}
        />
      )}
    </View>
  );
}

/** One of the chips of a row: a group, a sport, who can see it. */
function Choice({
  label,
  chosen,
  onPress,
  testID,
  radio = false,
}: {
  label: string;
  chosen: boolean;
  onPress: () => void;
  testID: string;
  radio?: boolean;
}) {
  return (
    <Tap
      style={[styles.choice, !radio && styles.chip, chosen && styles.chosen]}
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected: chosen }}
      testID={testID}
    >
      <Text style={[styles.choiceText, chosen && styles.chosenText]} numberOfLines={1}>
        {label}
      </Text>
    </Tap>
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
  wrap: {
    flexWrap: "wrap",
  },
  facts: {
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
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
  chip: {
    flex: 0,
    paddingHorizontal: space.md,
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
