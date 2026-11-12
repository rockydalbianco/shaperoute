import type { Person } from "@shaperoute/shared-types";
import { useEffect, useState } from "react";
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import {
  initialWindowMetrics,
  SafeAreaProvider,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { fetchFollowList } from "../api/follows";
import { fetchConversations } from "../api/messages";
import { personPhotoUri } from "../api/people";
import { t } from "../i18n";
import { peopleOf } from "../messages/SendToFriend";
import { Avatar } from "../profile/Avatar";
import { useFollowsDoor } from "../social/followsDoor";
import {
  color,
  fontSize,
  fontWeight,
  MIN_TAP_SIZE,
  radius,
  space,
} from "../theme/tokens";
import { sendLiveTo } from "./liveShareStore";

/** The side of a member's picture in the list. */
const PHOTO_SIDE = 36;
/** As the API takes them in one «Send in MuW» (LIVE_RECIPIENTS_MAX). */
export const MOST_PEOPLE = 20;

type Props = {
  onClose: () => void;
  fetchFn?: typeof fetch;
  apiKey?: string | null;
};

/** One more chosen, or one less; never more than MOST_PEOPLE. */
export function toggled(chosen: string[], id: string): string[] {
  if (chosen.includes(id)) {
    return chosen.filter((one) => one !== id);
  }
  return chosen.length >= MOST_PEOPLE ? chosen : [...chosen, id];
}

/**
 * «Send in MuW» (TASK-468 part B1, ADR-0381; texts approved by the user on
 * 2026-11-12): the live share on, sent in a message to the people chosen.
 * The list is who one writes to, then who follows one: a conversation open
 * to who sends, since a message request carries no attachment (the API
 * skips the others). Several at once, at most MOST_PEOPLE.
 */
export function SendLiveSheet(props: Props) {
  return (
    <Modal visible animationType="slide" onRequestClose={props.onClose}>
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        <People {...props} />
      </SafeAreaProvider>
    </Modal>
  );
}

function People({ onClose, fetchFn, apiKey }: Props) {
  const insets = useSafeAreaInsets();
  const { apiUrl, account } = useFollowsDoor();
  const token =
    account.state.status === "signedIn" ? account.state.session.token : null;
  const [near, setNear] = useState<Person[] | null>(null);
  const [chosen, setChosen] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  useEffect(() => {
    if (apiUrl === null || token === null) {
      return;
    }
    let live = true;
    const asked = { fetchFn, key: apiKey };
    void Promise.all([
      fetchConversations(apiUrl, token, "inbox", null, asked),
      fetchFollowList(apiUrl, token, "followers", null, asked),
    ]).then(([talking, followers]) => {
      if (live) {
        setNear(
          peopleOf(
            talking.kind === "ok"
              ? talking.value.conversations.map((c) => c.person)
              : [],
            followers.kind === "ok" ? followers.value.people : [],
          ),
        );
      }
    });
    return () => {
      live = false;
    };
  }, [apiKey, apiUrl, fetchFn, token]);

  async function send() {
    setSending(true);
    setProblem(null);
    const sent = await sendLiveTo(chosen);
    setSending(false);
    if (sent === null) {
      setProblem(t("Couldn't send. Tap to try again."));
      return;
    }
    onClose();
  }

  return (
    <View
      style={[
        styles.screen,
        { paddingTop: insets.top + space.md, paddingBottom: insets.bottom + space.md },
      ]}
    >
      <View style={styles.titleRow}>
        <Text style={styles.title} accessibilityRole="header">
          {t("Choose who gets your live")}
        </Text>
        <Pressable
          style={({ pressed }) => [styles.close, pressed && styles.pressed]}
          onPress={onClose}
          accessibilityRole="button"
          testID="send-live-close"
        >
          <Text style={styles.closeText}>{t("Close")}</Text>
        </Pressable>
      </View>
      <Text style={styles.note}>
        {t(
          "They can follow you in the app: your exact position on the map, the route so far, distance, time, pace or speed, elevation gain and calories.",
        )}
      </Text>
      {problem !== null && (
        <Text style={styles.problem} accessibilityRole="alert">
          {problem}
        </Text>
      )}
      {near === null ? (
        <Text style={styles.note}>{t("Loading…")}</Text>
      ) : (
        <FlatList
          style={styles.list}
          data={near}
          keyExtractor={(person) => person.public_id}
          renderItem={({ item }) => {
            const on = chosen.includes(item.public_id);
            return (
              <Pressable
                style={({ pressed }) => [styles.person, pressed && styles.pressed]}
                onPress={() => setChosen((now) => toggled(now, item.public_id))}
                disabled={sending}
                accessibilityRole="checkbox"
                accessibilityLabel={item.username}
                accessibilityState={{ checked: on, disabled: sending }}
                testID={`send-live-person-${item.public_id}`}
              >
                <Avatar
                  name={item.username}
                  size={PHOTO_SIDE}
                  photo={personPhotoUri(item)}
                />
                <Text style={styles.name} numberOfLines={1}>
                  {item.username}
                </Text>
                <View style={[styles.box, on && styles.boxOn]}>
                  {on && <Text style={styles.tick}>✓</Text>}
                </View>
              </Pressable>
            );
          }}
        />
      )}
      <Pressable
        style={({ pressed }) => [
          styles.send,
          (chosen.length === 0 || sending) && styles.off,
          pressed && styles.pressed,
        ]}
        onPress={() => void send()}
        disabled={chosen.length === 0 || sending}
        accessibilityRole="button"
        accessibilityState={{ disabled: chosen.length === 0 || sending, busy: sending }}
        testID="send-live-send"
      >
        <Text style={styles.sendText}>
          {sending ? t("Sending…") : t("Send ({count})", { count: chosen.length })}
        </Text>
      </Pressable>
    </View>
  );
}

const BOX = 24;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    gap: space.md,
    paddingHorizontal: space.lg,
    backgroundColor: color.background,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
  },
  title: {
    flex: 1,
    color: color.text,
    fontSize: fontSize.title,
    fontWeight: fontWeight.bold,
  },
  close: {
    minHeight: MIN_TAP_SIZE,
    paddingHorizontal: space.lg,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
    backgroundColor: color.surfaceRaised,
    borderWidth: 1,
    borderColor: color.borderStrong,
  },
  closeText: {
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
  list: {
    flex: 1,
  },
  person: {
    minHeight: MIN_TAP_SIZE,
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    paddingVertical: space.sm,
  },
  name: {
    flex: 1,
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
  box: {
    width: BOX,
    height: BOX,
    borderRadius: BOX / 2,
    borderWidth: 1,
    borderColor: color.borderStrong,
    alignItems: "center",
    justifyContent: "center",
  },
  boxOn: {
    borderColor: color.text,
    backgroundColor: color.text,
  },
  tick: {
    color: color.background,
    fontSize: fontSize.small,
    fontWeight: fontWeight.bold,
  },
  note: {
    color: color.textMuted,
    fontSize: fontSize.body,
  },
  problem: {
    color: color.error,
    fontSize: fontSize.body,
  },
  send: {
    minHeight: MIN_TAP_SIZE,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
    backgroundColor: color.text,
  },
  sendText: {
    color: color.background,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
  off: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.6,
  },
});
