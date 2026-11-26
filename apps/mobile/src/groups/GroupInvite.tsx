import type { GroupDetail, Person } from "@shaperoute/shared-types";
import { useEffect, useState } from "react";
import { StyleSheet, Text, TextInput } from "react-native";

import { sessionEnded } from "../account/messages";
import { findPeople, searchable } from "../api/people";
import { t } from "../i18n";
import { useFollowsDoor } from "../social/followsDoor";
import { color, fontSize, MIN_TAP_SIZE, radius, space } from "../theme/tokens";
import { setGroupInvite } from "./groupsApi";
import { GroupSubPage, LineButton, PersonLine, subStyles } from "./GroupSubPage";
import { groupProblem } from "./groupText";

/** How long after the last letter the search asks, as «Find friends». */
export const INVITE_SEARCH_DELAY_MS = 300;

type Props = {
  group: Pick<GroupDetail, "id">;
  onBack: () => void;
  onOpenProfile: (person: Person) => void;
  /** For the tests: the fake fetch. */
  fetchFn?: typeof fetch;
  apiKey?: string | null;
};

/**
 * «Invite» (TASK-495 part B, GRUPPI.md §3): people found by name, as the
 * search of «Feed» finds them (GET /users?q=), each with «Invite». The
 * invited one is told, and accepts or declines.
 */
export function GroupInvite({ group, onBack, onOpenProfile, fetchFn, apiKey }: Props) {
  const { apiUrl, account } = useFollowsDoor();
  const { state } = account;
  const token = state.status === "signedIn" ? state.session.token : null;
  const [typed, setTyped] = useState("");
  // The people found for one text: another text's are nobody's.
  const [answer, setAnswer] = useState<{ typed: string; people: Person[] } | null>(
    null,
  );
  const [invited, setInvited] = useState<ReadonlySet<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  useEffect(() => {
    if (apiUrl === null || token === null || !searchable(typed)) {
      return;
    }
    let live = true;
    const timer = setTimeout(() => {
      void findPeople(apiUrl, token, typed, { fetchFn, key: apiKey }).then(
        (outcome) => {
          if (!live) {
            return;
          }
          if (outcome.kind === "ok") {
            setAnswer({ typed, people: outcome.value.people });
            return;
          }
          if (sessionEnded(outcome)) {
            account.sessionEnded(token);
          }
          setProblem(groupProblem(outcome));
        },
      );
    }, INVITE_SEARCH_DELAY_MS);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [account, apiKey, apiUrl, fetchFn, token, typed]);

  async function invite(person: Person) {
    if (apiUrl === null || token === null) {
      return;
    }
    setBusy(true);
    setProblem(null);
    const outcome = await setGroupInvite(
      apiUrl,
      token,
      group.id,
      person.public_id,
      true,
      {
        fetchFn,
        key: apiKey,
      },
    );
    setBusy(false);
    if (outcome.kind === "ok") {
      setInvited((was) => new Set([...was, person.public_id]));
      return;
    }
    if (sessionEnded(outcome)) {
      account.sessionEnded(token);
    }
    setProblem(groupProblem(outcome));
  }

  const found = searchable(typed) && answer?.typed === typed ? answer.people : null;

  return (
    <GroupSubPage title={t("Invite")} onBack={onBack} testID="group-invite">
      <TextInput
        style={styles.input}
        value={typed}
        onChangeText={(text) => {
          setTyped(text);
          setProblem(null);
        }}
        placeholder={t("Search by name")}
        placeholderTextColor={color.textFaint}
        autoCapitalize="none"
        autoCorrect={false}
        accessibilityLabel={t("Search by name")}
        testID="group-invite-search"
      />
      {problem !== null && (
        <Text style={subStyles.problem} accessibilityRole="alert">
          {problem}
        </Text>
      )}
      {found !== null && found.length === 0 && (
        <Text style={subStyles.empty}>{t("Nobody found.")}</Text>
      )}
      {found?.map((person) => {
        const done = invited.has(person.public_id);
        return (
          <PersonLine key={person.public_id} person={person} onOpen={onOpenProfile}>
            <LineButton
              label={done ? t("Invited") : t("Invite")}
              onPress={() => void invite(person)}
              disabled={busy || done}
              testID={`invite-${person.public_id}`}
            />
          </PersonLine>
        );
      })}
    </GroupSubPage>
  );
}

const styles = StyleSheet.create({
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
});
