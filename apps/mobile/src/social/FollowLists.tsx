import type { Person } from "@shaperoute/shared-types";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { sessionEnded } from "../account/messages";
import type { AccountOutcome } from "../api/accounts";
import {
  answerFollowRequest,
  fetchFollowList,
  FOLLOW_LISTS,
  type FollowList,
  followProblem,
  removeFollower,
} from "../api/follows";
import { personPhotoUri } from "../api/people";
import { t, tLater } from "../i18n";
import { Avatar } from "../profile/Avatar";
import {
  color,
  fontSize,
  fontWeight,
  MIN_TAP_SIZE,
  radius,
  space,
} from "../theme/tokens";
import { useFollowsDoor } from "./followsDoor";

/** What the app has of one list. */
type Shown =
  | { kind: "loading" }
  | { kind: "ready"; people: Person[]; next: string | null; total: number }
  | { kind: "failed"; problem: string };

type Lists = Record<FollowList, Shown>;

const LOADING: Lists = {
  requests: { kind: "loading" },
  followers: { kind: "loading" },
  following: { kind: "loading" },
};

/** In English: shown with `t()` (TASK-210). */
const NAMES: Record<FollowList, string> = {
  requests: tLater("Requests"),
  followers: tLater("Followers"),
  following: tLater("Following"),
};

const EMPTY: Record<FollowList, string> = {
  requests: tLater("Nobody is asking to follow you."),
  followers: tLater("Nobody follows you yet."),
  following: tLater("You are not following anyone yet. Find friends from Feed."),
};

/** The side of a member's picture in a list, as in the search. */
const PHOTO_SIDE = 40;

type Props = {
  /** The fake fetch of the tests. */
  fetchFn?: typeof fetch;
  apiKey?: string | null;
};

/** `shown` without the member `publicId`, and one less in its number. */
function without(shown: Shown, publicId: string): Shown {
  if (shown.kind !== "ready" || !shown.people.some((p) => p.public_id === publicId)) {
    return shown;
  }
  return {
    ...shown,
    people: shown.people.filter((p) => p.public_id !== publicId),
    total: Math.max(0, shown.total - 1),
  };
}

/** `shown` with `person` first, and one more in its number. */
function withFirst(shown: Shown, person: Person): Shown {
  if (shown.kind !== "ready") {
    return shown;
  }
  return {
    ...shown,
    people: [person, ...shown.people.filter((p) => p.public_id !== person.public_id)],
    total: shown.total + 1,
  };
}

/**
 * Who follows the account, in «Profile» (TASK-211, ADR-0173): three
 * numbers, «Requests», «Followers» and «Following», and under them the
 * list of the one touched. A request is accepted or declined here, the
 * only place that shows it; a follower can be removed; a name opens the
 * member's profile. Nothing with an API older than following.
 */
export function FollowLists({ fetchFn, apiKey }: Props) {
  const { apiUrl, account, openProfile } = useFollowsDoor();
  const { state, sessionEnded: onSessionEnded } = account;
  const token = state.status === "signedIn" ? state.session.token : null;
  // The lists of one account: another's are not this one's.
  const [answer, setAnswer] = useState<{ asked: string; lists: Lists } | null>(null);
  // An API older than TASK-211 has no lists.
  const [off, setOff] = useState(false);
  const [open, setOpen] = useState<FollowList | null>(null);
  // The member a request is on its way for: no second tap.
  const [busy, setBusy] = useState<string | null>(null);
  // The follower «Remove» was touched for: it asks first.
  const [removing, setRemoving] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  useEffect(() => {
    if (token === null || apiUrl === null) {
      return;
    }
    let live = true;
    for (const list of FOLLOW_LISTS) {
      void fetchFollowList(apiUrl, token, list, null, { fetchFn, key: apiKey }).then(
        (outcome) => {
          if (!live) {
            return;
          }
          if (outcome.kind === "api_error" && outcome.code === "http_error") {
            setOff(true);
            return;
          }
          const shown: Shown =
            outcome.kind === "ok"
              ? { kind: "ready", ...outcome.value }
              : { kind: "failed", problem: followProblem(outcome) };
          setAnswer((was) => ({
            asked: token,
            lists: {
              ...(was !== null && was.asked === token ? was.lists : LOADING),
              [list]: shown,
            },
          }));
          if (sessionEnded(outcome)) {
            onSessionEnded(token);
          }
        },
      );
    }
    return () => {
      live = false;
    };
  }, [apiKey, apiUrl, fetchFn, onSessionEnded, token]);

  if (token === null || apiUrl === null || off) {
    return null;
  }
  const url = apiUrl;
  const asked = token;
  const lists = answer !== null && answer.asked === token ? answer.lists : LOADING;

  function change(next: (lists: Lists) => Lists) {
    setAnswer((was) =>
      was !== null && was.asked === asked ? { asked, lists: next(was.lists) } : was,
    );
  }

  /** Sends what was asked about `person`, and shows what came of it. */
  function send(
    person: Person,
    request: Promise<AccountOutcome<null>>,
    done: (lists: Lists) => Lists,
  ) {
    setBusy(person.public_id);
    setProblem(null);
    setRemoving(null);
    void request.then((outcome) => {
      setBusy(null);
      if (outcome.kind === "ok") {
        change(done);
        return;
      }
      setProblem(followProblem(outcome));
      if (sessionEnded(outcome)) {
        onSessionEnded(asked);
      }
    });
  }

  function answerRequest(person: Person, reply: "accept" | "decline") {
    const id = person.public_id;
    send(
      person,
      answerFollowRequest(url, asked, id, reply, { fetchFn, key: apiKey }),
      (was) => ({
        ...was,
        requests: without(was.requests, id),
        followers:
          reply === "accept" ? withFirst(was.followers, person) : was.followers,
      }),
    );
  }

  function remove(person: Person) {
    const id = person.public_id;
    send(person, removeFollower(url, asked, id, { fetchFn, key: apiKey }), (was) => ({
      ...was,
      followers: without(was.followers, id),
    }));
  }

  function loadMore(list: FollowList) {
    const shown = lists[list];
    if (shown.kind !== "ready" || shown.next === null) {
      return;
    }
    setLoadingMore(true);
    void fetchFollowList(url, asked, list, shown.next, { fetchFn, key: apiKey }).then(
      (outcome) => {
        setLoadingMore(false);
        if (outcome.kind !== "ok") {
          return;
        }
        change((was) => {
          const now = was[list];
          if (now.kind !== "ready") {
            return was;
          }
          // A member already shown is not shown twice.
          const seen = new Set(now.people.map((p) => p.public_id));
          return {
            ...was,
            [list]: {
              kind: "ready",
              people: [
                ...now.people,
                ...outcome.value.people.filter((p) => !seen.has(p.public_id)),
              ],
              next: outcome.value.next,
              total: outcome.value.total,
            },
          };
        });
      },
    );
  }

  const shown = open !== null ? lists[open] : null;
  return (
    <View style={styles.section}>
      <View style={styles.counts}>
        {FOLLOW_LISTS.map((list) => {
          const of = lists[list];
          const count = of.kind === "ready" ? of.total : null;
          const name = t(NAMES[list]);
          return (
            <Pressable
              key={list}
              style={({ pressed }) => [
                styles.count,
                open === list && styles.countOpen,
                pressed && styles.pressed,
              ]}
              onPress={() => {
                setProblem(null);
                setRemoving(null);
                setOpen(open === list ? null : list);
              }}
              accessibilityRole="button"
              // One name for the tile: the number is not read on its own.
              accessibilityLabel={count !== null ? `${name}, ${count}` : name}
              accessibilityState={{ expanded: open === list }}
            >
              <View style={styles.numberRow}>
                <Text style={[styles.number, count === null && styles.numberUnknown]}>
                  {count !== null ? String(count) : "–"}
                </Text>
                {list === "requests" && count !== null && count > 0 && (
                  // Someone waits for an answer: the only place that says it.
                  <View style={styles.dot} testID="requests-waiting" />
                )}
              </View>
              <Text style={styles.countName} numberOfLines={1}>
                {name}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {open !== null && shown !== null && (
        <View style={styles.list}>
          {problem !== null && (
            <Text style={styles.problem} accessibilityRole="alert">
              {problem}
            </Text>
          )}
          {shown.kind === "loading" && <Text style={styles.note}>{t("Loading…")}</Text>}
          {shown.kind === "failed" && (
            <Text style={styles.problem}>{shown.problem}</Text>
          )}
          {shown.kind === "ready" && shown.people.length === 0 && (
            <Text style={styles.note}>{t(EMPTY[open])}</Text>
          )}
          {shown.kind === "ready" &&
            shown.people.map((person) => {
              const waiting = busy === person.public_id;
              return (
                <View key={person.public_id} style={styles.member}>
                  <View style={styles.row}>
                    <Pressable
                      style={({ pressed }) => [styles.who, pressed && styles.pressed]}
                      onPress={() => openProfile(person)}
                      accessibilityRole="button"
                      accessibilityLabel={person.username}
                    >
                      <Avatar
                        name={person.username}
                        size={PHOTO_SIDE}
                        photo={personPhotoUri(person)}
                      />
                      <Text style={styles.name} numberOfLines={1}>
                        {person.username}
                      </Text>
                    </Pressable>
                    {open === "requests" && (
                      <>
                        <Action
                          text={t("Accept")}
                          label={t("Accept {name}", { name: person.username })}
                          strong
                          disabled={waiting}
                          onPress={() => answerRequest(person, "accept")}
                        />
                        <Action
                          text={t("Decline")}
                          label={t("Decline {name}", { name: person.username })}
                          disabled={waiting}
                          onPress={() => answerRequest(person, "decline")}
                        />
                      </>
                    )}
                    {open === "followers" && removing !== person.public_id && (
                      <Action
                        text={t("Remove")}
                        label={t("Remove {name}", { name: person.username })}
                        disabled={waiting}
                        onPress={() => {
                          setProblem(null);
                          setRemoving(person.public_id);
                        }}
                      />
                    )}
                  </View>
                  {open === "followers" && removing === person.public_id && (
                    <View style={styles.confirm}>
                      <Text style={styles.confirmText}>
                        {t("Remove {name} from your followers?", {
                          name: person.username,
                        })}
                      </Text>
                      <Action text={t("Keep it")} onPress={() => setRemoving(null)} />
                      <Action
                        text={t("Remove")}
                        danger
                        onPress={() => remove(person)}
                      />
                    </View>
                  )}
                </View>
              );
            })}
          {shown.kind === "ready" && shown.next !== null && (
            <Pressable
              style={({ pressed }) => [
                styles.more,
                (pressed || loadingMore) && styles.pressed,
              ]}
              onPress={() => loadMore(open)}
              disabled={loadingMore}
              accessibilityRole="button"
            >
              <Text style={styles.moreText}>{t("Show more")}</Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}

function Action({
  text,
  label,
  strong = false,
  danger = false,
  disabled = false,
  onPress,
}: {
  text: string;
  /** What a screen reader says, with the member's name; left out: `text`. */
  label?: string;
  /** The answer most given: white. */
  strong?: boolean;
  danger?: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.action,
        strong && styles.actionStrong,
        (pressed || disabled) && styles.pressed,
      ]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label ?? text}
      accessibilityState={{ disabled }}
    >
      <Text
        style={[
          styles.actionText,
          strong && styles.actionStrongText,
          danger && styles.dangerText,
        ]}
      >
        {text}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: space.md,
  },
  counts: {
    flexDirection: "row",
    gap: space.md,
  },
  // As the tiles of «Favorites» and «My activities», smaller.
  count: {
    flex: 1,
    minHeight: MIN_TAP_SIZE,
    alignItems: "center",
    gap: space.xs,
    paddingVertical: space.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
  countOpen: {
    borderColor: color.borderStrong,
    backgroundColor: color.surfaceRaised,
  },
  pressed: {
    opacity: 0.6,
  },
  numberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.xs,
  },
  number: {
    color: color.text,
    fontSize: fontSize.title,
    fontWeight: fontWeight.bold,
  },
  numberUnknown: {
    color: color.textFaint,
  },
  // Not yellow, which is the route's: `warning` is what asks for attention.
  dot: {
    width: space.sm,
    height: space.sm,
    borderRadius: radius.pill,
    backgroundColor: color.warning,
  },
  countName: {
    color: color.textMuted,
    fontSize: fontSize.small,
    fontWeight: fontWeight.semibold,
  },
  list: {
    gap: space.sm,
  },
  note: {
    color: color.textMuted,
    fontSize: fontSize.body,
  },
  problem: {
    color: color.error,
    fontSize: fontSize.body,
  },
  member: {
    gap: space.sm,
    paddingVertical: space.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: color.border,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
  },
  who: {
    flex: 1,
    minHeight: MIN_TAP_SIZE,
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
  },
  name: {
    flex: 1,
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold,
  },
  action: {
    minHeight: MIN_TAP_SIZE,
    justifyContent: "center",
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.borderStrong,
    backgroundColor: color.surfaceRaised,
  },
  actionStrong: {
    borderColor: color.text,
    backgroundColor: color.text,
  },
  actionText: {
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
  actionStrongText: {
    color: color.background,
  },
  dangerText: {
    color: color.error,
  },
  confirm: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    paddingBottom: space.xs,
  },
  confirmText: {
    flex: 1,
    color: color.text,
    fontSize: fontSize.body,
  },
  more: {
    minHeight: MIN_TAP_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  moreText: {
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
});
