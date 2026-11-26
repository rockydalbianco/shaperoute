import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { t } from "../i18n";
import { ConversationList } from "../messages/ConversationList";
import { useMessagesDoor } from "../messages/messagesDoor";
import { NewMessage } from "../messages/NewMessage";
import {
  color,
  font,
  fontSize,
  fontWeight,
  MIN_TAP_SIZE,
  radius,
  space,
} from "../theme/tokens";
import { useHeaderScroll } from "./headerScroll";
import { useTabBarRoom } from "./tabBarRoom";
import { useScrollToTopOnReselect } from "./tabReselect";

type Props = {
  /** The tab on screen. */
  active: boolean;
  /** The fake fetch of the tests. */
  fetchFn?: typeof fetch;
  apiKey?: string | null;
};

/**
 * «Messages» as a tab (TASK-367, ADR-0311): the conversations and, at the
 * top, the message requests (TASK-319). A conversation, or the requests,
 * open over the app as before, and «←» comes back here. Read again each
 * time it comes on screen, as «Messages» was each time it opened: in place,
 * the list on screen stays until the new one comes, so a swipe that lands
 * here never shows «Loading…» over what it slid in. Beside the title,
 * «New message» (TASK-458): whom to write to, chosen from a page of its own.
 */
export function MessagesPage({ active, fetchFn, apiKey }: Props) {
  const { screen, openConversation, recount } = useMessagesDoor();
  const scroll = useScrollToTopOnReselect<ScrollView>();
  // The header turns to glass once the page scrolls (TASK-469 A5b).
  const headerScroll = useHeaderScroll();
  // The page goes on under the tab bar: its room at the end (TASK-469 B2a).
  const barRoom = useTabBarRoom();
  const shown = active && screen === null;
  const [visit, setVisit] = useState(0);
  const [wasShown, setWasShown] = useState(shown);
  const [writing, setWriting] = useState(false);
  if (shown !== wasShown) {
    setWasShown(shown);
    if (shown) {
      setVisit(visit + 1);
    }
  }
  // The red numbers too: what was read is no news any more.
  useEffect(() => {
    if (shown) {
      recount();
    }
  }, [recount, shown]);
  return (
    <ScrollView
      ref={scroll}
      {...headerScroll}
      contentContainerStyle={[styles.content, { paddingBottom: space.xxl + barRoom }]}
    >
      <View style={styles.titleRow}>
        <Text style={styles.title} accessibilityRole="header">
          {t("Messages")}
        </Text>
        <Pressable
          style={({ pressed }) => [styles.write, pressed && styles.pressed]}
          onPress={() => setWriting(true)}
          accessibilityRole="button"
          testID="messages-new"
        >
          <Text style={styles.writeText}>{t("New message")}</Text>
        </Pressable>
      </View>
      <ConversationList
        visit={visit}
        box="inbox"
        onOpen={openConversation}
        fetchFn={fetchFn}
        apiKey={apiKey}
      />
      {writing && (
        <NewMessage
          onClose={() => setWriting(false)}
          fetchFn={fetchFn}
          apiKey={apiKey}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: space.lg,
    paddingBottom: space.xxl,
    gap: space.xl,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
  },
  title: {
    ...font.title,
    flex: 1,
    color: color.text,
  },
  // Neutral: the yellow is the route's, and one's own bubbles'.
  write: {
    minHeight: MIN_TAP_SIZE,
    paddingHorizontal: space.lg,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
    backgroundColor: color.surfaceRaised,
    borderWidth: 1,
    borderColor: color.borderStrong,
  },
  writeText: {
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
  pressed: {
    opacity: 0.6,
  },
});
