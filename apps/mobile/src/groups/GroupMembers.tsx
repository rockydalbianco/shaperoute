import {
  GROUP_COADMINS_MAX,
  type GroupDetail,
  type GroupMember,
  type Person,
} from "@shaperoute/shared-types";
import { type ReactNode, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Text, View } from "react-native";

import { sessionEnded } from "../account/messages";
import type { AccountOutcome } from "../api/accounts";
import { t } from "../i18n";
import { useFollowsDoor } from "../social/followsDoor";
import { color } from "../theme/tokens";
import { fetchGroupMembers, removeGroupMember, setGroupRole } from "./groupsApi";
import { GroupSubPage, LineButton, PersonLine, subStyles } from "./GroupSubPage";
import { groupProblem, roleLabel } from "./groupText";

type Props = {
  group: GroupDetail;
  onBack: () => void;
  /** Something changed: the group's page reads it again. */
  onChanged: () => void;
  onOpenProfile: (person: Person) => void;
  /** For the tests: the fake fetch. */
  fetchFn?: typeof fetch;
  apiKey?: string | null;
};

type Listed = { members: GroupMember[]; next: string | null; total: number };

/**
 * All the members of a group (TASK-495 part B, GRUPPI.md §4): the admin,
 * the co-admins, the members, with their roles. The admin makes and
 * unmakes co-admins (3 at most), passes the role after a question, and
 * removes members; a co-admin removes members only.
 */
export function GroupMembers({
  group,
  onBack,
  onChanged,
  onOpenProfile,
  fetchFn,
  apiKey,
}: Props) {
  const { apiUrl, account } = useFollowsDoor();
  const { state } = account;
  const signedIn = state.status === "signedIn";
  const token = signedIn ? state.session.token : null;
  const me = signedIn ? (state.session.user.public_id ?? null) : null;
  const [listed, setListed] = useState<Listed | null>(null);
  const [asked, setAsked] = useState(0);
  const [open, setOpen] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const options = { fetchFn, key: apiKey };
  const admin = group.me === "admin";
  const coadmin = group.me === "coadmin";

  useEffect(() => {
    if (apiUrl === null || token === null) {
      return;
    }
    let live = true;
    void fetchGroupMembers(apiUrl, token, group.id, null, {
      fetchFn,
      key: apiKey,
    }).then((outcome) => {
      if (!live) {
        return;
      }
      if (outcome.kind === "ok") {
        setListed(outcome.value);
        return;
      }
      if (sessionEnded(outcome)) {
        account.sessionEnded(token);
      }
      setProblem(groupProblem(outcome));
    });
    return () => {
      live = false;
    };
  }, [account, apiKey, apiUrl, asked, fetchFn, group.id, token]);

  async function more() {
    if (apiUrl === null || token === null || listed === null || listed.next === null) {
      return;
    }
    const outcome = await fetchGroupMembers(
      apiUrl,
      token,
      group.id,
      listed.next,
      options,
    );
    if (outcome.kind === "ok") {
      setListed({
        members: [...listed.members, ...outcome.value.members],
        next: outcome.value.next,
        total: outcome.value.total,
      });
    } else {
      setProblem(groupProblem(outcome));
    }
  }

  async function act(run: () => Promise<AccountOutcome<null>>) {
    if (token === null) {
      return;
    }
    setBusy(true);
    setProblem(null);
    const outcome = await run();
    setBusy(false);
    if (outcome.kind === "ok") {
      setOpen(null);
      setAsked((n) => n + 1);
      onChanged();
      return;
    }
    if (sessionEnded(outcome)) {
      account.sessionEnded(token);
    }
    setProblem(groupProblem(outcome));
  }

  function role(member: GroupMember, next: GroupMember["role"]) {
    if (apiUrl === null || token === null) {
      return;
    }
    void act(() =>
      setGroupRole(apiUrl, token, group.id, member.public_id, next, options),
    );
  }

  function passAdmin(member: GroupMember) {
    Alert.alert(
      t("Make admin"),
      t("Make {name} the admin? You become a member.", { name: member.username }),
      [
        { text: t("Not now"), style: "cancel" },
        { text: t("Make admin"), onPress: () => role(member, "admin") },
      ],
    );
  }

  function remove(member: GroupMember) {
    Alert.alert(
      t("Remove from group"),
      t("Remove {name} from the group?", { name: member.username }),
      [
        { text: t("Not now"), style: "cancel" },
        {
          text: t("Remove"),
          style: "destructive",
          onPress: () => {
            if (apiUrl === null || token === null) {
              return;
            }
            void act(() =>
              removeGroupMember(apiUrl, token, group.id, member.public_id, options),
            );
          },
        },
      ],
    );
  }

  const coadmins = listed?.members.filter((m) => m.role === "coadmin").length ?? 0;

  /** What who looks may do to `member`: nothing to oneself nor to the admin. */
  function actions(member: GroupMember) {
    if (member.public_id === me || member.role === "admin") {
      return null;
    }
    if (admin) {
      return (
        <>
          {member.role === "member" ? (
            <LineButton
              label={t("Make co-admin")}
              onPress={() => role(member, "coadmin")}
              disabled={busy || coadmins >= GROUP_COADMINS_MAX}
              testID={`member-coadmin-${member.public_id}`}
            />
          ) : (
            <LineButton
              label={t("Remove co-admin")}
              onPress={() => role(member, "member")}
              disabled={busy}
              testID={`member-uncoadmin-${member.public_id}`}
            />
          )}
          <LineButton
            label={t("Make admin")}
            onPress={() => passAdmin(member)}
            disabled={busy}
            testID={`member-admin-${member.public_id}`}
          />
          <LineButton
            label={t("Remove")}
            onPress={() => remove(member)}
            disabled={busy}
            danger
            testID={`member-remove-${member.public_id}`}
          />
        </>
      );
    }
    if (coadmin && member.role === "member") {
      return (
        <LineButton
          label={t("Remove")}
          onPress={() => remove(member)}
          disabled={busy}
          danger
          testID={`member-remove-${member.public_id}`}
        />
      );
    }
    return null;
  }

  return (
    <GroupSubPage title={t("Members")} onBack={onBack} testID="group-members">
      {listed === null && problem === null && (
        <ActivityIndicator color={color.textMuted} />
      )}
      {problem !== null && (
        <Text style={subStyles.problem} accessibilityRole="alert">
          {problem}
        </Text>
      )}
      {listed?.members.map((member) => {
        const own = actions(member);
        return (
          <PersonRows
            key={member.public_id}
            member={member}
            open={open === member.public_id}
            onToggle={
              own === null
                ? null
                : () =>
                    setOpen((was) =>
                      was === member.public_id ? null : member.public_id,
                    )
            }
            onOpen={onOpenProfile}
          >
            {own}
          </PersonRows>
        );
      })}
      {listed !== null && listed.next !== null && (
        <LineButton
          label={t("More")}
          onPress={() => void more()}
          testID="members-more"
        />
      )}
    </GroupSubPage>
  );
}

/** A member, and the «⋯» that shows what may be done to them. */
function PersonRows({
  member,
  open,
  onToggle,
  onOpen,
  children,
}: {
  member: GroupMember;
  open: boolean;
  onToggle: (() => void) | null;
  onOpen: (person: Person) => void;
  children: ReactNode;
}) {
  return (
    <>
      <PersonLine person={member} note={roleLabel(member.role)} onOpen={onOpen}>
        {onToggle !== null && (
          <LineButton
            label="⋯"
            accessibilityLabel={t("More")}
            onPress={onToggle}
            testID={`member-more-${member.public_id}`}
          />
        )}
      </PersonLine>
      {open && <View style={subStyles.actions}>{children}</View>}
    </>
  );
}
