import type { GroupDetail, Person } from "@shaperoute/shared-types";
import { useEffect, useState } from "react";
import { ActivityIndicator, Text } from "react-native";

import { sessionEnded } from "../account/messages";
import { t } from "../i18n";
import { useFollowsDoor } from "../social/followsDoor";
import { color } from "../theme/tokens";
import { answerGroupRequest, fetchGroupRequests } from "./groupsApi";
import { GroupSubPage, LineButton, PersonLine, subStyles } from "./GroupSubPage";
import { groupProblem } from "./groupText";

type Props = {
  group: Pick<GroupDetail, "id">;
  onBack: () => void;
  /** A request answered: the group's page reads it again. */
  onChanged: () => void;
  onOpenProfile: (person: Person) => void;
  /** For the tests: the fake fetch. */
  fetchFn?: typeof fetch;
  apiKey?: string | null;
};

type Listed = { people: Person[]; next: string | null };

/**
 * Who asked to join (TASK-495 part B, GRUPPI.md §3), the first first: the
 * admin or a co-admin accepts or refuses. Refusing tells nobody.
 */
export function GroupRequests({
  group,
  onBack,
  onChanged,
  onOpenProfile,
  fetchFn,
  apiKey,
}: Props) {
  const { apiUrl, account } = useFollowsDoor();
  const { state } = account;
  const token = state.status === "signedIn" ? state.session.token : null;
  const [listed, setListed] = useState<Listed | null>(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const options = { fetchFn, key: apiKey };

  useEffect(() => {
    if (apiUrl === null || token === null) {
      return;
    }
    let live = true;
    void fetchGroupRequests(apiUrl, token, group.id, null, {
      fetchFn,
      key: apiKey,
    }).then((outcome) => {
      if (!live) {
        return;
      }
      if (outcome.kind === "ok") {
        setListed({ people: outcome.value.people, next: outcome.value.next });
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
  }, [account, apiKey, apiUrl, fetchFn, group.id, token]);

  async function more() {
    if (apiUrl === null || token === null || listed === null || listed.next === null) {
      return;
    }
    const outcome = await fetchGroupRequests(
      apiUrl,
      token,
      group.id,
      listed.next,
      options,
    );
    if (outcome.kind === "ok") {
      setListed({
        people: [...listed.people, ...outcome.value.people],
        next: outcome.value.next,
      });
    } else {
      setProblem(groupProblem(outcome));
    }
  }

  async function answer(person: Person, accept: boolean) {
    if (apiUrl === null || token === null) {
      return;
    }
    setBusy(true);
    setProblem(null);
    const outcome = await answerGroupRequest(
      apiUrl,
      token,
      group.id,
      person.public_id,
      accept,
      options,
    );
    setBusy(false);
    if (outcome.kind === "ok") {
      setListed((was) =>
        was === null
          ? was
          : {
              ...was,
              people: was.people.filter((p) => p.public_id !== person.public_id),
            },
      );
      onChanged();
      return;
    }
    if (sessionEnded(outcome)) {
      account.sessionEnded(token);
    }
    setProblem(groupProblem(outcome));
  }

  return (
    <GroupSubPage title={t("Requests")} onBack={onBack} testID="group-requests">
      {listed === null && problem === null && (
        <ActivityIndicator color={color.textMuted} />
      )}
      {problem !== null && (
        <Text style={subStyles.problem} accessibilityRole="alert">
          {problem}
        </Text>
      )}
      {listed !== null && listed.people.length === 0 && (
        <Text style={subStyles.empty}>{t("No requests to join.")}</Text>
      )}
      {listed?.people.map((person) => (
        <PersonLine key={person.public_id} person={person} onOpen={onOpenProfile}>
          <LineButton
            label={t("Accept")}
            onPress={() => void answer(person, true)}
            disabled={busy}
            testID={`request-accept-${person.public_id}`}
          />
          <LineButton
            label={t("Decline")}
            onPress={() => void answer(person, false)}
            disabled={busy}
            testID={`request-refuse-${person.public_id}`}
          />
        </PersonLine>
      ))}
      {listed !== null && listed.next !== null && (
        <LineButton
          label={t("More")}
          onPress={() => void more()}
          testID="requests-more"
        />
      )}
    </GroupSubPage>
  );
}
