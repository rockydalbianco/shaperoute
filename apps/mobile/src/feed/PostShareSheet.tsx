import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { t } from "../i18n";
import type { PostToSend } from "../messages/messagePost";
import { useMessagesDoor } from "../messages/messagesDoor";
import { SendToFriend } from "../messages/SendToFriend";
import type { PostRun } from "../share/postRun";
import { SharePost } from "../share/SharePost";
import {
  color,
  fontSize,
  fontWeight,
  MIN_TAP_SIZE,
  radius,
  space,
} from "../theme/tokens";
import { SheetModal } from "../ui/SheetModal";
import { Tap } from "../ui/Tap";
import { sharePostLink } from "./postLink";

/**
 * Whether a post can be sent to a friend from here: with an account, and an
 * API that has the messages (TASK-319), as «Send to a friend» everywhere.
 */
export function usePostSendable(): boolean {
  const { account, unread } = useMessagesDoor();
  return account.state.status === "signedIn" && unread !== null;
}

type Props = {
  visible: boolean;
  /** The post «Send to a friend» sends, as a pointer. */
  post: PostToSend;
  /** One's own post: «Poster and video», what «Share» opened before
   * (TASK-231). Made when it is touched. None on somebody else's post: a
   * drawing of another member leaves the app as a picture with nobody's
   * consent (TASK-355, the user's choice). */
  poster?: () => PostRun;
  /** The post's link, when it has one (`postLinkOf`): «Share link» gives it
   * to the phone's own sheet. None on a post that is not for everyone, or
   * whose owner turned «Links to my posts» off. */
  link?: string | null;
  onClose: () => void;
};

/**
 * What «Share» opens under a post (TASK-455, ADR-0382, the user's choice 2
 * of 2026-11-12): a small sheet with «Send to a friend», which sends the
 * post in a message as a pointer, and on one's own post «Poster and video».
 * What each opens comes over the sheet, and closing it closes the sheet
 * too: nothing is left open underneath. «Share link» (part E) hands the
 * post's link to the phone's own sheet, and the sheet closes after it.
 */
export function PostShareSheet({ visible, post, poster, link, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const sendable = usePostSendable();
  const [sending, setSending] = useState(false);
  const [run, setRun] = useState<PostRun | null>(null);

  function closeAll() {
    setSending(false);
    setRun(null);
    onClose();
  }

  return (
    <SheetModal visible={visible} onRequestClose={closeAll} testID="post-share">
      <Pressable
        style={styles.backdrop}
        onPress={closeAll}
        accessible={false}
        importantForAccessibility="no"
        testID="post-share-backdrop"
      />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + space.sm }]}>
        {sendable && (
          <Choice label={t("Send to a friend")} onPress={() => setSending(true)} />
        )}
        {link != null && (
          <Choice
            label={t("Share link")}
            onPress={() => void sharePostLink(link).then(closeAll)}
          />
        )}
        {poster !== undefined && (
          <Choice label={t("Poster and video")} onPress={() => setRun(poster())} />
        )}
        <Choice label={t("Cancel")} onPress={closeAll} />
      </View>
      {sending && <SendToFriend post={post} onClose={closeAll} />}
      {run !== null && <SharePost run={run} onClose={closeAll} />}
    </SheetModal>
  );
}

function Choice({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Tap style={styles.choice} onPress={onPress} accessibilityRole="button">
      <Text style={styles.choiceText}>{label}</Text>
    </Tap>
  );
}

// As the sheet of «…» (social/ReportMenu.tsx).
const styles = StyleSheet.create({
  // Clear: a tap on it closes the sheet.
  backdrop: {
    flex: 1,
  },
  sheet: {
    gap: space.sm,
    padding: space.lg,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    borderTopWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
  choice: {
    minHeight: MIN_TAP_SIZE,
    justifyContent: "center",
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    backgroundColor: color.surfaceRaised,
  },
  choiceText: {
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
    textAlign: "center",
  },
});
