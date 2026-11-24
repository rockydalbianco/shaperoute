import type {
  FeedPost as ApiPost,
  GroupDetail,
  GroupMember,
  Person,
} from "@shaperoute/shared-types";
import { type ReactNode, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { sessionEnded } from "../account/messages";
import type { AccountOutcome } from "../api/accounts";
import { FeedPost } from "../feed/FeedPost";
import { shownPost } from "../feed/feedPosts";
import { t, tPlural } from "../i18n";
import { useDrawingsDoor } from "../social/drawingsDoor";
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
import { GroupPicture } from "./GroupCard";
import {
  closeGroupForm,
  closeGroupPage,
  openGroupPage,
  useAskedGroup,
  useAskedGroupForm,
} from "./groupDoor";
import { GroupForm } from "./GroupForm";
import { GroupInvite } from "./GroupInvite";
import { GroupMembers } from "./GroupMembers";
import { GroupReport } from "./GroupReport";
import { GroupRequests } from "./GroupRequests";
import {
  fetchGroup,
  fetchGroupActivity,
  fetchGroupMembers,
  fetchGroupRequests,
  joinGroup,
  leaveGroup,
  setGroupMuted,
} from "./groupsApi";
import { LineButton, PersonLine } from "./GroupSubPage";
import { ACCESS_TEXTS, groupProblem, roleLabel, sportsLabel } from "./groupText";

/** The members the page shows before «All members». */
export const MEMBERS_SHOWN = 5;
/** The side of the group's picture at the top of its page. */
const PICTURE = 3 * MIN_TAP_SIZE;

type Loaded =
  | { kind: "loading" }
  | { kind: "failed"; problem: string }
  | { kind: "ready"; group: GroupDetail };

/** What the members see more of: the first members, the activity, the
 * requests waiting. Null while asked, or for who may not see it. */
type Inside = {
  members: GroupMember[] | null;
  total: number;
  posts: ApiPost[] | null;
  requests: number | null;
};

type Over = "members" | "requests" | "invite" | "edit" | null;

type Props = {
  groupId: string;
  onBack: () => void;
  /** For the tests: the fake fetch. */
  fetchFn?: typeof fetch;
  apiKey?: string | null;
};

function isMember(group: GroupDetail): boolean {
  return group.me === "admin" || group.me === "coadmin" || group.me === "member";
}

/**
 * The page of a group (TASK-495 part B, docs/GRUPPI.md §5), over the app as
 * the page of a group run: its picture, name, sports, city and members, and
 * the button of who looks («Join», «Requested», «Accept invite»; for a
 * member «Mute» and «Leave group»; for the admin «Edit»; for admin and
 * co-admins «Requests» and «Invite»). Then «Next outings», «Members»,
 * «Recent activity» and «Past outings»; the members and the activity only
 * for the members, and of a group one asks to join only the top for the
 * others. Anybody but the admin may report it.
 */
export function GroupPage({ groupId, onBack, fetchFn, apiKey }: Props) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { apiUrl, account, openProfile: showProfile } = useFollowsDoor();
  const drawings = useDrawingsDoor();
  const { state } = account;
  const token = state.status === "signedIn" ? state.session.token : null;
  const [loaded, setLoaded] = useState<Loaded>({ kind: "loading" });
  const [inside, setInside] = useState<Inside | null>(null);
  const [asked, setAsked] = useState(0);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [over, setOver] = useState<Over>(null);
  useBackCloses(over === null, onBack);
  const edge = useEdgeBack(onBack, over === null);
  const options = { fetchFn, key: apiKey };
  const reload = () => setAsked((n) => n + 1);

  // A name opens the member's profile in place of the page: the page lies
  // over the profiles, so it goes first.
  const openProfile = (person: Person) => {
    onBack();
    showProfile(person);
  };

  useEffect(() => {
    if (apiUrl === null || token === null) {
      return;
    }
    let live = true;
    const options = { fetchFn, key: apiKey };
    void fetchGroup(apiUrl, token, groupId, options).then(async (outcome) => {
      if (!live) {
        return;
      }
      if (outcome.kind !== "ok") {
        if (sessionEnded(outcome)) {
          account.sessionEnded(token);
        }
        setLoaded({
          kind: "failed",
          problem: groupProblem(outcome, true) ?? t("Something went wrong."),
        });
        return;
      }
      const group = outcome.value;
      setLoaded({ kind: "ready", group });
      if (!isMember(group)) {
        setInside(null);
        return;
      }
      const leads = group.me === "admin" || group.me === "coadmin";
      const [members, posts, requests] = await Promise.all([
        fetchGroupMembers(apiUrl, token, groupId, null, options),
        fetchGroupActivity(apiUrl, token, groupId, options),
        leads && group.access === "request"
          ? fetchGroupRequests(apiUrl, token, groupId, null, options)
          : Promise.resolve(null),
      ]);
      if (!live) {
        return;
      }
      setInside({
        members: members.kind === "ok" ? members.value.members : null,
        total: members.kind === "ok" ? members.value.total : group.members,
        // An API without the activity yet says 404: none to show.
        posts: posts.kind === "ok" ? posts.value.posts : [],
        requests:
          requests !== null && requests.kind === "ok" ? requests.value.total : null,
      });
    });
    return () => {
      live = false;
    };
  }, [account, apiKey, apiUrl, asked, fetchFn, groupId, token]);

  /** One of the buttons of who looks: the page reads the group again. */
  async function act(
    run: () => Promise<AccountOutcome<unknown>>,
    then: () => void = reload,
  ) {
    if (token === null) {
      return;
    }
    setBusy(true);
    setProblem(null);
    const outcome = await run();
    setBusy(false);
    if (outcome.kind === "ok") {
      then();
      return;
    }
    if (sessionEnded(outcome)) {
      account.sessionEnded(token);
    }
    setProblem(groupProblem(outcome));
  }

  function join() {
    if (apiUrl !== null && token !== null) {
      void act(() => joinGroup(apiUrl, token, groupId, options));
    }
  }

  /** Leaves, withdraws the request or declines the invite. A group by
   * invite only is not to be seen after: the page goes. */
  function out(group: GroupDetail) {
    if (apiUrl !== null && token !== null) {
      void act(
        () => leaveGroup(apiUrl, token, groupId, options),
        group.access === "invite" ? onBack : reload,
      );
    }
  }

  function leave(group: GroupDetail) {
    Alert.alert(t("Leave group"), t("Leave {name}?", { name: group.name }), [
      { text: t("Not now"), style: "cancel" },
      { text: t("Leave group"), style: "destructive", onPress: () => out(group) },
    ]);
  }

  function mute(next: boolean) {
    if (apiUrl !== null && token !== null) {
      void act(() => setGroupMuted(apiUrl, token, groupId, next, options));
    }
  }

  function openPost(post: ApiPost) {
    onBack();
    drawings.open({ id: post.id });
  }

  const paddingTop = insets.top + space.lg;
  const paddingBottom = insets.bottom + space.xl;
  const group = loaded.kind === "ready" ? loaded.group : null;
  const member = group !== null && isMember(group);
  const leads = group !== null && (group.me === "admin" || group.me === "coadmin");
  // Of a group one asks to join, who is not in sees only the top.
  const outings = group !== null && (member || group.access === "public");
  const cardWidth = width - 2 * space.lg;

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, styles.screen, edge.style]}
      {...edge.handlers}
      testID="group-page"
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
            {t("Groups")}
          </Text>
          <View style={styles.fill} />
          {group !== null &&
            group.me !== "admin" &&
            apiUrl !== null &&
            token !== null && (
              <GroupReport
                apiUrl={apiUrl}
                token={token}
                groupId={group.id}
                onSessionEnded={account.sessionEnded}
                fetchFn={fetchFn}
                apiKey={apiKey}
              />
            )}
        </View>
        {loaded.kind === "loading" && (
          <ActivityIndicator color={color.textMuted} testID="group-loading" />
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
                reload();
              }}
              accessibilityRole="button"
            >
              <Text style={styles.buttonText}>{t("Try again")}</Text>
            </Tap>
          </View>
        )}
        {group !== null && (
          <>
            <View style={styles.top}>
              <GroupPicture group={group} size={PICTURE} big />
              <Text style={styles.title}>{group.name}</Text>
              <Text style={styles.facts}>{sportsLabel(group.sports)}</Text>
              <Text style={styles.facts}>
                {group.city} ·{" "}
                {tPlural(group.members, "{count} member", "{count} members")} ·{" "}
                {t(ACCESS_TEXTS[group.access])}
              </Text>
            </View>
            {group.description !== null && (
              <Text style={styles.notes}>{group.description}</Text>
            )}
            {problem !== null && (
              <Text style={styles.problem} accessibilityRole="alert">
                {problem}
              </Text>
            )}
            <View style={styles.buttons}>
              {group.me === "none" && (
                <Button
                  label={t("Join")}
                  onPress={join}
                  disabled={busy}
                  primary
                  testID="group-join"
                />
              )}
              {group.me === "requested" && (
                <Button
                  label={t("Requested")}
                  hint={t("Withdraw the request")}
                  onPress={() => out(group)}
                  disabled={busy}
                  testID="group-requested"
                />
              )}
              {group.me === "invited" && (
                <>
                  <Button
                    label={t("Accept invite")}
                    onPress={join}
                    disabled={busy}
                    primary
                    testID="group-accept"
                  />
                  <Button
                    label={t("Decline")}
                    onPress={() => out(group)}
                    disabled={busy}
                    testID="group-decline"
                  />
                </>
              )}
              {member && (
                <>
                  <Button
                    label={group.muted ? t("Unmute") : t("Mute")}
                    hint={t("Mute only stops the news of new outings.")}
                    onPress={() => mute(!group.muted)}
                    disabled={busy}
                    testID="group-mute"
                  />
                  <Button
                    label={t("Leave group")}
                    onPress={() => leave(group)}
                    disabled={busy}
                    danger
                    testID="group-leave"
                  />
                </>
              )}
            </View>
            {leads && (
              <View style={styles.buttons}>
                {group.me === "admin" && (
                  <Button
                    label={t("Edit")}
                    onPress={() => setOver("edit")}
                    testID="group-edit"
                  />
                )}
                {group.access === "request" && (
                  <Button
                    label={
                      inside?.requests != null && inside.requests > 0
                        ? t("Requests ({count})", { count: inside.requests })
                        : t("Requests")
                    }
                    onPress={() => setOver("requests")}
                    testID="group-open-requests"
                  />
                )}
                <Button
                  label={t("Invite")}
                  onPress={() => setOver("invite")}
                  testID="group-open-invite"
                />
              </View>
            )}
            {outings && (
              <Section title={t("Next outings")}>
                <Text style={styles.empty}>{t("No outings yet.")}</Text>
              </Section>
            )}
            {member && (
              <Section title={t("Members")}>
                {inside === null && <ActivityIndicator color={color.textMuted} />}
                {inside?.members?.slice(0, MEMBERS_SHOWN).map((one) => (
                  <PersonLine
                    key={one.public_id}
                    person={one}
                    note={roleLabel(one.role)}
                    onOpen={openProfile}
                  />
                ))}
                {inside !== null && (
                  <LineButton
                    label={t("All members ({count})", { count: inside.total })}
                    onPress={() => setOver("members")}
                    testID="group-all-members"
                  />
                )}
              </Section>
            )}
            {member && (
              <Section title={t("Recent activity")}>
                {inside === null && <ActivityIndicator color={color.textMuted} />}
                {inside?.posts?.length === 0 && (
                  <Text style={styles.empty}>
                    {t("No activity in the last 14 days.")}
                  </Text>
                )}
                {inside?.posts?.map((post) => (
                  <FeedPost
                    key={post.id}
                    post={shownPost(post)}
                    width={cardWidth}
                    onOpen={() => openPost(post)}
                  />
                ))}
              </Section>
            )}
            {outings && (
              <Section title={t("Past outings")}>
                <Text style={styles.empty}>{t("No outings yet.")}</Text>
              </Section>
            )}
          </>
        )}
      </ScrollView>
      {group !== null && over === "members" && (
        <GroupMembers
          group={group}
          onBack={() => setOver(null)}
          onChanged={reload}
          onOpenProfile={openProfile}
          fetchFn={fetchFn}
          apiKey={apiKey}
        />
      )}
      {group !== null && over === "requests" && (
        <GroupRequests
          group={group}
          onBack={() => setOver(null)}
          onChanged={reload}
          onOpenProfile={openProfile}
          fetchFn={fetchFn}
          apiKey={apiKey}
        />
      )}
      {group !== null && over === "invite" && (
        <GroupInvite
          group={group}
          onBack={() => setOver(null)}
          onOpenProfile={openProfile}
          fetchFn={fetchFn}
          apiKey={apiKey}
        />
      )}
      {group !== null && over === "edit" && (
        <GroupForm
          mode={{ kind: "change", group }}
          onClose={() => setOver(null)}
          onDone={(changed) => {
            setOver(null);
            setLoaded({ kind: "ready", group: changed });
          }}
          fetchFn={fetchFn}
          apiKey={apiKey}
        />
      )}
    </Animated.View>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.label} accessibilityRole="header">
        {title}
      </Text>
      {children}
    </View>
  );
}

function Button({
  label,
  hint,
  onPress,
  disabled = false,
  primary = false,
  danger = false,
  testID,
}: {
  label: string;
  hint?: string;
  onPress: () => void;
  disabled?: boolean;
  primary?: boolean;
  danger?: boolean;
  testID: string;
}) {
  return (
    <Tap
      style={[styles.button, primary && styles.primary, disabled && styles.off]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityHint={hint}
      accessibilityState={{ disabled }}
      testID={testID}
    >
      <Text
        style={[
          styles.buttonText,
          primary && styles.primaryText,
          danger && styles.danger,
          disabled && styles.off,
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Tap>
  );
}

/**
 * The page where the app asks for it (`groupDoor`): `ProfileLayer` puts
 * this over the app.
 */
export function GroupPageHost() {
  const asked = useAskedGroup();
  if (asked === null) {
    return null;
  }
  return <GroupPage key={asked.id} groupId={asked.id} onBack={closeGroupPage} />;
}

/**
 * «New group» where the app asks for it (`groupDoor`): the group created,
 * its page opens.
 */
export function GroupFormHost() {
  const asked = useAskedGroupForm();
  if (asked === null) {
    return null;
  }
  return (
    <GroupForm
      mode={asked}
      onClose={closeGroupForm}
      onDone={(group) => {
        closeGroupForm();
        openGroupPage(group.id);
      }}
    />
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
  top: {
    alignItems: "center",
    gap: space.xs,
  },
  title: {
    color: color.text,
    fontSize: fontSize.title,
    fontWeight: fontWeight.bold,
    textAlign: "center",
  },
  facts: {
    color: color.textMuted,
    fontSize: fontSize.body,
    textAlign: "center",
  },
  notes: {
    color: color.text,
    fontSize: fontSize.body,
  },
  section: {
    gap: space.sm,
    marginTop: space.sm,
  },
  label: {
    color: color.textMuted,
    fontSize: fontSize.small,
    fontWeight: fontWeight.semibold,
  },
  empty: {
    color: color.textMuted,
    fontSize: fontSize.body,
  },
  problem: {
    color: color.error,
    fontSize: fontSize.body,
  },
  buttons: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: space.sm,
  },
  button: {
    flexGrow: 1,
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
  off: {
    opacity: 0.5,
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
