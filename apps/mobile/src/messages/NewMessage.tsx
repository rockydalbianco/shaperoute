import type { Person } from "@shaperoute/shared-types";
import { useEffect, useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  initialWindowMetrics,
  SafeAreaProvider,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { fetchFollowList } from "../api/follows";
import { fetchConversations } from "../api/messages";
import { findPeople, personPhotoUri, searchable } from "../api/people";
import { t } from "../i18n";
import { Avatar } from "../profile/Avatar";
import {
  color,
  fontSize,
  fontWeight,
  MIN_TAP_SIZE,
  radius,
  space,
} from "../theme/tokens";
import { useMessagesDoor } from "./messagesDoor";
import { peopleOf } from "./SendToFriend";

/** The side of a member's picture in the list. */
const PHOTO_SIDE = 36;

type Props = {
  onClose: () => void;
  fetchFn?: typeof fetch;
  apiKey?: string | null;
};

/**
 * «New message» (TASK-458): from the list of the conversations, whom to
 * write to. The people one writes to already, then those one follows, or
 * anyone found by name, as «Send to…» lists them; a touch closes the page
 * and opens the conversation, where the first message is written. Nothing
 * is sent from here.
 */
export function NewMessage(props: Props) {
  return (
    <Modal visible animationType="slide" onRequestClose={props.onClose}>
      {/* Its own edges, as «Send to…» has them: a Modal has none of the app's. */}
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        <People {...props} />
      </SafeAreaProvider>
    </Modal>
  );
}

function People({ onClose, fetchFn, apiKey }: Props) {
  const insets = useSafeAreaInsets();
  const { apiUrl, account, openConversation } = useMessagesDoor();
  const token =
    account.state.status === "signedIn" ? account.state.session.token : null;
  const [near, setNear] = useState<Person[] | null>(null);
  const [typed, setTyped] = useState("");
  const [found, setFound] = useState<Person[] | null>(null);

  useEffect(() => {
    if (apiUrl === null || token === null) {
      return;
    }
    let live = true;
    const asked = { fetchFn, key: apiKey };
    void Promise.all([
      fetchConversations(apiUrl, token, "inbox", null, asked),
      fetchFollowList(apiUrl, token, "following", null, asked),
    ]).then(([talking, following]) => {
      if (!live) {
        return;
      }
      setNear(
        peopleOf(
          talking.kind === "ok" ? talking.value.conversations.map((c) => c.person) : [],
          following.kind === "ok" ? following.value.people : [],
        ),
      );
    });
    return () => {
      live = false;
    };
  }, [apiKey, apiUrl, fetchFn, token]);

  useEffect(() => {
    if (apiUrl === null || token === null || !searchable(typed)) {
      return;
    }
    let live = true;
    void findPeople(apiUrl, token, typed, { fetchFn, key: apiKey }).then((outcome) => {
      if (live) {
        setFound(outcome.kind === "ok" ? outcome.value.people : []);
      }
    });
    return () => {
      live = false;
    };
  }, [apiKey, apiUrl, fetchFn, token, typed]);

  function write(person: Person) {
    onClose();
    openConversation(person);
  }

  const searching = searchable(typed);
  const shown = searching ? found : near;
  return (
    <View style={[styles.screen, { paddingTop: insets.top + space.md }]}>
      <View style={styles.titleRow}>
        <Text style={styles.title} accessibilityRole="header">
          {t("New message")}
        </Text>
        <Pressable
          style={({ pressed }) => [styles.close, pressed && styles.pressed]}
          onPress={onClose}
          accessibilityRole="button"
        >
          <Text style={styles.closeText}>{t("Close")}</Text>
        </Pressable>
      </View>
      <TextInput
        style={styles.search}
        value={typed}
        onChangeText={setTyped}
        placeholder={t("Search people")}
        placeholderTextColor={color.textFaint}
        autoCapitalize="none"
        autoCorrect={false}
        accessibilityLabel={t("Search people")}
      />
      {shown === null ? (
        <Text style={styles.note}>{t("Loading…")}</Text>
      ) : shown.length === 0 ? (
        <Text style={styles.note}>
          {searching
            ? t("Nobody has a name like that.")
            : t("Search someone by name to write to them.")}
        </Text>
      ) : (
        <FlatList
          data={shown}
          keyExtractor={(person) => person.public_id}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: insets.bottom + space.lg }}
          renderItem={({ item }) => (
            <Pressable
              style={({ pressed }) => [styles.person, pressed && styles.pressed]}
              onPress={() => write(item)}
              accessibilityRole="button"
              accessibilityLabel={t("Message {name}", { name: item.username })}
            >
              <Avatar
                name={item.username}
                size={PHOTO_SIDE}
                photo={personPhotoUri(item)}
              />
              <Text style={styles.name} numberOfLines={1}>
                {item.username}
              </Text>
            </Pressable>
          )}
        />
      )}
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
  search: {
    minHeight: MIN_TAP_SIZE,
    paddingHorizontal: space.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.borderStrong,
    backgroundColor: color.surface,
    color: color.text,
    fontSize: fontSize.input,
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
  note: {
    color: color.textMuted,
    fontSize: fontSize.body,
    textAlign: "center",
    paddingVertical: space.lg,
  },
  pressed: {
    opacity: 0.6,
  },
});
