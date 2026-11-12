import type { MessageDrawing } from "@shaperoute/shared-types";
import { useState } from "react";
import {
  Pressable,
  type StyleProp,
  StyleSheet,
  Text,
  type TextStyle,
  type ViewStyle,
} from "react-native";

import { t } from "../i18n";
import { color, fontSize, MIN_TAP_SIZE, radius } from "../theme/tokens";
import type { PostToSend } from "./messagePost";
import { useMessagesDoor } from "./messagesDoor";
import { SendToFriend } from "./SendToFriend";

/** An envelope as text, not as an emoji: the app has no icons. */
export const ENVELOPE = "✉︎";

type Props = {
  /** The drawing to send, made when the button is touched; null: none. */
  drawing?: () => MessageDrawing | null;
  /** A post to send in its place (TASK-455): a pointer, not a copy. */
  post?: PostToSend;
  /** Round, beside the heart on the map; else a row of a card, with its
   * card's look. */
  round?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  fetchFn?: typeof fetch;
  apiKey?: string | null;
};

/**
 * «Send to a friend» (TASK-333, the user's choice 5): on the map beside the
 * heart, and on the cards of «My activities» and of a drawing. Only with an
 * account and an API that has the messages (TASK-319): their numbers say it.
 * With `post` it sends a post as a pointer (TASK-455): somebody else's
 * drawing is never copied into a message.
 */
export function SendDrawingButton({
  drawing,
  post,
  round = false,
  style,
  textStyle,
  fetchFn,
  apiKey,
}: Props) {
  const { account, unread } = useMessagesDoor();
  const [sending, setSending] = useState<MessageDrawing | null>(null);
  const [sendingPost, setSendingPost] = useState(false);
  if (account.state.status !== "signedIn" || unread === null) {
    return null;
  }

  function open() {
    if (post !== undefined) {
      setSendingPost(true);
      return;
    }
    const made = drawing?.() ?? null;
    if (made !== null) {
      setSending(made);
    }
  }

  return (
    <>
      <Pressable
        style={({ pressed }) => [
          round ? styles.round : style,
          pressed && styles.pressed,
        ]}
        onPress={open}
        accessibilityRole="button"
        accessibilityLabel={t("Send to a friend")}
      >
        <Text style={round ? styles.envelope : textStyle}>
          {round ? ENVELOPE : t("Send to a friend")}
        </Text>
      </Pressable>
      {sending !== null && (
        <SendToFriend
          drawing={sending}
          onClose={() => setSending(null)}
          fetchFn={fetchFn}
          apiKey={apiKey}
        />
      )}
      {sendingPost && post !== undefined && (
        <SendToFriend
          post={post}
          onClose={() => setSendingPost(false)}
          fetchFn={fetchFn}
          apiKey={apiKey}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  // As the heart beside it (FavoriteHeart.tsx).
  round: {
    width: MIN_TAP_SIZE,
    height: MIN_TAP_SIZE,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.borderStrong,
    backgroundColor: color.surfaceRaised,
  },
  envelope: {
    color: color.text,
    fontSize: fontSize.title,
  },
  pressed: {
    opacity: 0.6,
  },
});
