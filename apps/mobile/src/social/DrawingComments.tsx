import {
  type Comment,
  COMMENT_MAX_LENGTH,
  type CommentReactionKind,
} from "@shaperoute/shared-types";
import { type RefObject, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { commentOf, commentTextProblem } from "../api/comments";
import { t, tPlural } from "../i18n";
import { Avatar } from "../profile/Avatar";
import {
  color,
  fontSize,
  fontWeight,
  MIN_TAP_SIZE,
  radius,
  space,
} from "../theme/tokens";
import { Cascade } from "../ui/Cascade";
import { IslandLayer } from "../ui/IslandLayer";
import { SheetModal } from "../ui/SheetModal";
import { useBlockedNow } from "./blockedNow";
import { CommentActions } from "./CommentActions";
import { useCommentChoices } from "./commentChoices";
import { useCommentsDoor } from "./commentsDoor";
import { hasThreads, hiddenReplies, shownReplies } from "./commentThreads";
import { agoLabel, commentsLabel, negativeComment } from "./commentText";
import { useFollowsDoor } from "./followsDoor";
import {
  type DrawingComments as Shown,
  useDrawingComments,
} from "./useDrawingComments";

/** How much of the screen the sheet takes, before the keyboard. */
const SHEET_SHARE = 0.72;
const AVATAR_SIDE = 32;
/** The picture beside a reply: smaller, under the words of its comment. */
const REPLY_AVATAR_SIDE = 24;
// The count shows from here, so the limit never comes as a surprise.
const COUNT_FROM = COMMENT_MAX_LENGTH - 50;

/** What a comment can be asked for, held or with VoiceOver's actions. */
type CommentAction = "report" | "block" | "delete";
/** The name of VoiceOver's action that answers a comment. */
const REPLY_ACTION = "reply";

type Props = {
  drawingId: string;
};

/**
 * Under a drawing on the map (TASK-120): a button with how many comments it
 * has, that opens them in a sheet over the map. Without an account, or on
 * an API without comments, nothing.
 */
export function DrawingComments({ drawingId }: Props) {
  const comments = useDrawingComments(drawingId);
  const [open, setOpen] = useState(false);
  if (comments.status === "off") {
    return null;
  }
  return (
    <>
      <Pressable
        style={styles.button}
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityHint={t("Opens the comments of this drawing.")}
      >
        <Text style={styles.buttonText}>
          {comments.status === "ready" ? commentsLabel(comments.total) : t("Comments")}
        </Text>
      </Pressable>
      <CommentsSheet
        visible={open}
        comments={comments}
        onClose={() => setOpen(false)}
      />
    </>
  );
}

type SheetProps = {
  visible: boolean;
  comments: Shown;
  onClose: () => void;
};

/**
 * The comments, the oldest first, and the field to write one, over the
 * keyboard. Under each comment its replies, one level deep (TASK-454 part
 * C, ADR-0377): «Reply» on a comment or on a reply fills «Replying to
 * {name}» over the field, and what is written goes under that comment.
 */
export function CommentsSheet({ visible, comments, onClose }: SheetProps) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const typing = useKeyboardShown();
  const [text, setText] = useState("");
  // The comment, or the reply, the words in the field answer.
  const [replyingTo, setReplyingTo] = useState<Comment | null>(null);
  const field = useRef<TextInput>(null);
  const list = useRef<FlatList<Comment>>(null);
  const length = [...commentOf(text)].length;
  const tooLong = length > COMMENT_MAX_LENGTH;
  const canSend = !comments.sending && commentTextProblem(text) === null;
  const choices = useCommentChoices();
  const me = choices?.me ?? null;
  const { openProfile } = useFollowsDoor();

  // The picture of who wrote it (TASK-338): their profile, as a tagged
  // name does; the sheet goes first, or it would stay over the profile.
  function onAuthor(comment: Comment) {
    onClose();
    openProfile({
      public_id: comment.author.public_id,
      username: comment.author.username,
      photo: null,
    });
  }

  async function onSend() {
    if (!canSend) {
      return;
    }
    const sent = await comments.send(text, replyingTo ?? undefined);
    if (sent === "sent") {
      setText("");
      setReplyingTo(null);
      // A comment is the newest, at the end; a reply is under its comment,
      // where who wrote it was looking.
      if (replyingTo === null) {
        list.current?.scrollToEnd({ animated: true });
      }
    } else if (sent === "rejected") {
      Alert.alert(negativeComment());
    }
  }

  function onReply(comment: Comment) {
    setReplyingTo(comment);
    field.current?.focus();
  }

  function askDelete(comment: Comment) {
    Alert.alert(t("Delete this comment?"), undefined, [
      { text: t("Cancel"), style: "cancel" },
      {
        text: t("Delete"),
        style: "destructive",
        onPress: () => {
          // Nothing is left to answer: the words go to the drawing.
          if (replyingTo !== null && goesWith(comment, replyingTo)) {
            setReplyingTo(null);
          }
          comments.remove(comment.id);
        },
      },
    ]);
  }

  function onAction(comment: Comment, action: CommentAction) {
    if (action === "delete") {
      askDelete(comment);
    } else if (action === "report") {
      choices?.report(comment);
    } else {
      // Their comments leave the sheet with the page asked again.
      choices?.block(comment, comments.reload);
    }
  }

  // Another's comment (TASK-275): «Report», «Block» its author, and «Delete»
  // too under one's own drawing. One's own: «Delete» straight away.
  function onHold(comment: Comment) {
    const actions = actionsOf(comment, me);
    if (actions.length === 1 && actions[0] === "delete") {
      askDelete(comment);
    } else if (actions.length > 0) {
      Alert.alert(t("Report or block"), undefined, [
        ...actions.map((action) => ({
          text: actionLabel(comment, action),
          style: action === "report" ? ("default" as const) : ("destructive" as const),
          onPress: () => onAction(comment, action),
        })),
        { text: t("Cancel"), style: "cancel" },
      ]);
    }
  }

  return (
    <SheetModal visible={visible} onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.fill}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* A tap over the sheet closes it, as its «Close». */}
        <Pressable
          style={[styles.backdrop, { minHeight: insets.top + space.xl }]}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={t("Close the comments")}
        />
        <View
          style={[
            styles.sheet,
            {
              height: Math.round(height * SHEET_SHARE),
              paddingBottom: (typing ? 0 : insets.bottom) + space.sm,
            },
          ]}
        >
          <View style={styles.header}>
            <Text style={styles.title} accessibilityRole="header">
              {t("Comments")}
            </Text>
            <Pressable
              style={styles.close}
              onPress={onClose}
              accessibilityRole="button"
            >
              <Text style={styles.closeText}>{t("Close")}</Text>
            </Pressable>
          </View>
          <CommentsList
            comments={comments}
            list={list}
            me={me}
            onHold={onHold}
            onAction={onAction}
            onAuthor={onAuthor}
            onReply={onReply}
          />
          {comments.sendProblem !== null && (
            <Text style={styles.problem} accessibilityLiveRegion="polite">
              {comments.sendProblem}
            </Text>
          )}
          {replyingTo !== null && (
            <View style={styles.replying} testID="comment-replying">
              <Text style={styles.replyingText} numberOfLines={1}>
                {t("Replying to {name}", { name: replyingTo.author.username })}
              </Text>
              <Pressable
                style={styles.replyingCancel}
                onPress={() => setReplyingTo(null)}
                accessibilityRole="button"
                accessibilityLabel={t("Cancel")}
              >
                <Text style={styles.replyingCross}>✕</Text>
              </Pressable>
            </View>
          )}
          <View style={styles.writeRow}>
            <TextInput
              ref={field}
              style={styles.field}
              value={text}
              onChangeText={setText}
              placeholder={t("Add a comment…")}
              placeholderTextColor={color.textFaint}
              accessibilityLabel={t("Comment")}
              multiline
              keyboardAppearance="dark"
              editable={!comments.sending}
            />
            <Pressable
              style={[styles.send, !canSend && styles.sendOff]}
              onPress={onSend}
              disabled={!canSend}
              accessibilityRole="button"
              accessibilityState={{ disabled: !canSend, busy: comments.sending }}
            >
              <Text style={styles.sendText}>{t("Post")}</Text>
            </Pressable>
          </View>
          {length >= COUNT_FROM && (
            <Text
              style={[styles.count, tooLong && styles.countOver]}
              accessibilityLabel={t("{count} of {max} characters", {
                count: length,
                max: COMMENT_MAX_LENGTH,
              })}
            >
              {length}/{COMMENT_MAX_LENGTH}
            </Text>
          )}
        </View>
        {/* «Thanks» of a report, over the sheet (TASK-388). */}
        <IslandLayer />
      </KeyboardAvoidingView>
    </SheetModal>
  );
}

/** `comment` deleted takes `other` with it: itself, or one of its replies. */
function goesWith(comment: Comment, other: Comment): boolean {
  return other.id === comment.id || (other.parent_id ?? null) === comment.id;
}

/** What `comment` offers to `me`: «Report» and «Block» if another wrote it,
 * «Delete» if the API says it can go. */
function actionsOf(comment: Comment, me: string | null): CommentAction[] {
  const another = me !== null && comment.author.public_id !== me;
  return [
    ...(another ? (["report", "block"] as const) : []),
    ...(comment.deletable ? (["delete"] as const) : []),
  ];
}

function actionLabel(comment: Comment, action: CommentAction): string {
  if (action === "report") {
    return t("Report");
  }
  if (action === "block") {
    return t("Block {user}", { user: comment.author.username });
  }
  return t("Delete");
}

type ListProps = {
  comments: Shown;
  list: RefObject<FlatList<Comment> | null>;
  /** The account signed in; null when nothing can be reported (`actionsOf`). */
  me: string | null;
  onHold: (comment: Comment) => void;
  onAction: (comment: Comment, action: CommentAction) => void;
  /** Opens the profile of who wrote `comment`. */
  onAuthor: (comment: Comment) => void;
  /** The field answers `comment`, a reply too. */
  onReply: (comment: Comment) => void;
};

function CommentsList({
  comments,
  list,
  me,
  onHold,
  onAction,
  onAuthor,
  onReply,
}: ListProps) {
  if (comments.status === "loading") {
    return (
      <View style={styles.middle}>
        <ActivityIndicator color={color.textMuted} />
        <Text style={styles.muted}>{t("Loading the comments…")}</Text>
      </View>
    );
  }
  if (comments.status === "failed") {
    return (
      <View style={styles.middle}>
        <Text style={styles.problem}>{comments.problem}</Text>
        <Pressable
          style={styles.again}
          onPress={comments.reload}
          accessibilityRole="button"
        >
          <Text style={styles.closeText}>{t("Try again")}</Text>
        </Pressable>
      </View>
    );
  }
  return (
    <FlatList<Comment>
      ref={list}
      style={styles.list}
      contentContainerStyle={styles.listContent}
      data={comments.comments}
      keyExtractor={(comment) => comment.id}
      renderItem={({ item, index }) => {
        // The replies and the reactions, where the app reaches them and the
        // API sent them: with one of before, the comments as they were.
        const threads = comments.threads && hasThreads(item);
        const row = (comment: Comment, reply: boolean) => (
          <CommentRow
            key={comment.id}
            comment={comment}
            reply={reply}
            me={me}
            onHold={onHold}
            onAction={onAction}
            onAuthor={onAuthor}
            onReply={threads ? onReply : undefined}
            onReact={threads ? comments.react : undefined}
          />
        );
        const hidden = hiddenReplies(item);
        return (
          <Cascade index={index}>
            {row(item, false)}
            {threads && (shownReplies(item).length > 0 || hidden > 0) && (
              <View style={styles.replies} testID={`comment-replies-${item.id}`}>
                {shownReplies(item).map((reply) => row(reply, true))}
                {hidden > 0 && (
                  <Pressable
                    style={styles.moreReplies}
                    onPress={() => comments.showReplies(item.id)}
                    accessibilityRole="button"
                  >
                    <Text style={styles.moreRepliesText}>
                      {tPlural(
                        hidden,
                        "View {count} more reply",
                        "View {count} more replies",
                      )}
                    </Text>
                  </Pressable>
                )}
              </View>
            )}
          </Cascade>
        );
      }}
      keyboardShouldPersistTaps="handled"
      ListEmptyComponent={
        <Text style={[styles.muted, styles.empty]}>
          {t("No comments yet. Be the first.")}
        </Text>
      }
      ListFooterComponent={
        comments.more ? (
          <Pressable
            style={styles.more}
            onPress={comments.showMore}
            accessibilityRole="button"
          >
            <Text style={styles.closeText}>{t("Show more comments")}</Text>
          </Pressable>
        ) : null
      }
    />
  );
}

type RowProps = {
  comment: Comment;
  /** Under its comment: a smaller picture. */
  reply: boolean;
  me: string | null;
  onHold: (comment: Comment) => void;
  onAction: (comment: Comment, action: CommentAction) => void;
  onAuthor: (comment: Comment) => void;
  /** «Reply» and the reactions under the words; none, as before them. */
  onReply?: (comment: Comment) => void;
  onReact?: (comment: Comment, kind: CommentReactionKind) => void;
};

/** The name of VoiceOver's action that opens the author's profile. */
const PROFILE_ACTION = "profile";

/**
 * One comment: who, how long ago, and the words, always as plain text. A
 * touch on the picture opens who wrote it (TASK-338). Under the words,
 * outside the row a screen reader takes as one, «Reply» and the reactions
 * (TASK-454 part C). A reply to a reply says who it answers, «@name», before
 * its words: a name the API gives, never read out of the text.
 */
function CommentRow({
  comment,
  reply,
  me,
  onHold,
  onAction,
  onAuthor,
  onReply,
  onReact,
}: RowProps) {
  const door = useCommentsDoor();
  const [photo, setPhoto] = useState<string | null>(null);
  const publicId = comment.author.public_id;
  useEffect(() => {
    let current = true;
    void door.photoOf(publicId).then((uri) => {
      if (current) {
        setPhoto(uri);
      }
    });
    return () => {
      current = false;
    };
  }, [door, publicId]);
  const ago = agoLabel(comment.created_at);
  const actions = actionsOf(comment, me);
  // Blocked while the sheet is open, as its card in «Feed»: no way to them
  // until the page, asked again, leaves them out.
  const blocked = useBlockedNow(publicId);
  const profileLabel = t("{name}'s profile", { name: comment.author.username });
  const side = reply ? REPLY_AVATAR_SIDE : AVATAR_SIDE;
  const picture = <Avatar name={comment.author.username} size={side} photo={photo} />;
  const mention =
    comment.mention === undefined || comment.mention === null
      ? ""
      : `@${comment.mention.username} `;
  const reactions = comment.reactions;
  const main = (
    <Pressable
      style={styles.row}
      onLongPress={() => onHold(comment)}
      accessible
      accessibilityLabel={t("{name}, {ago}: {text}", {
        name: comment.author.username,
        ago,
        text: `${mention}${comment.text}`,
      })}
      accessibilityHint={
        actions.includes("report")
          ? t("Report or block")
          : comment.deletable
            ? t("Touch and hold to delete.")
            : undefined
      }
      // VoiceOver has no long press: the same choices as actions. The row is
      // one element, so the picture's profile is one of them too.
      accessibilityActions={[
        ...(onReply === undefined ? [] : [{ name: REPLY_ACTION, label: t("Reply") }]),
        ...actions.map((action) => ({
          name: action,
          label: actionLabel(comment, action),
        })),
        ...(blocked ? [] : [{ name: PROFILE_ACTION, label: profileLabel }]),
      ]}
      onAccessibilityAction={(event) => {
        const name = event.nativeEvent.actionName;
        if (name === REPLY_ACTION) {
          onReply?.(comment);
          return;
        }
        if (name === PROFILE_ACTION) {
          if (!blocked) {
            onAuthor(comment);
          }
          return;
        }
        const asked = actions.find((action) => action === name);
        if (asked !== undefined) {
          onAction(comment, asked);
        }
      }}
    >
      {blocked ? (
        picture
      ) : (
        <Pressable
          onPress={() => onAuthor(comment)}
          // Held, the picture is still the comment's.
          onLongPress={() => onHold(comment)}
          // The picture is small: its touch reaches the size of a button.
          hitSlop={(MIN_TAP_SIZE - side) / 2}
          accessibilityRole="button"
          accessibilityLabel={profileLabel}
        >
          {picture}
        </Pressable>
      )}
      <View style={styles.words}>
        <Text style={styles.who}>
          {comment.author.username}
          <Text style={styles.ago}>{`  ${ago}`}</Text>
        </Text>
        <Text style={styles.text}>
          {mention !== "" && <Text style={styles.mention}>{mention}</Text>}
          {comment.text}
        </Text>
      </View>
    </Pressable>
  );
  if (onReply === undefined || onReact === undefined || reactions === undefined) {
    return main;
  }
  return (
    <View>
      {main}
      {/* Under the words, from where they start. */}
      <View style={{ marginLeft: side + space.md }}>
        <CommentActions
          reactions={reactions}
          onReply={() => onReply(comment)}
          onReact={(kind) => onReact(comment, kind)}
          testID={`comment-actions-${comment.id}`}
        />
      </View>
    </View>
  );
}

/** True while the keyboard is up: the sheet's bottom is then its top. */
function useKeyboardShown(): boolean {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    // iOS says it before it moves, Android only after.
    const ios = Platform.OS === "ios";
    const up = Keyboard.addListener(ios ? "keyboardWillShow" : "keyboardDidShow", () =>
      setShown(true),
    );
    const down = Keyboard.addListener(
      ios ? "keyboardWillHide" : "keyboardDidHide",
      () => setShown(false),
    );
    return () => {
      up.remove();
      down.remove();
    };
  }, []);
  return shown;
}

// Neutral, as every control that is not the route's (docs/UI.md, «Il tema»).
const styles = StyleSheet.create({
  button: {
    minHeight: MIN_TAP_SIZE,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.borderStrong,
    backgroundColor: color.surfaceRaised,
  },
  buttonText: {
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
  fill: {
    flex: 1,
  },
  backdrop: {
    flexGrow: 1,
  },
  sheet: {
    flexShrink: 1,
    paddingHorizontal: space.lg,
    paddingTop: space.lg,
    gap: space.sm,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    borderTopWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    color: color.text,
    fontSize: fontSize.input,
    fontWeight: fontWeight.semibold,
  },
  close: {
    minHeight: MIN_TAP_SIZE,
    justifyContent: "center",
    paddingHorizontal: space.sm,
  },
  closeText: {
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
  middle: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: space.sm,
  },
  list: {
    flex: 1,
  },
  listContent: {
    gap: space.md,
    paddingBottom: space.sm,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: space.md,
  },
  words: {
    flex: 1,
    gap: 2,
  },
  who: {
    color: color.text,
    fontSize: fontSize.small,
    fontWeight: fontWeight.semibold,
  },
  ago: {
    color: color.textMuted,
    fontWeight: fontWeight.regular,
  },
  text: {
    color: color.text,
    fontSize: fontSize.body,
  },
  mention: {
    fontWeight: fontWeight.semibold,
  },
  // The replies of a comment: under its words, from where they start.
  replies: {
    marginLeft: AVATAR_SIDE + space.md,
    marginTop: space.sm,
    gap: space.sm,
  },
  moreReplies: {
    minHeight: MIN_TAP_SIZE,
    justifyContent: "center",
    alignSelf: "flex-start",
  },
  moreRepliesText: {
    color: color.textMuted,
    fontSize: fontSize.small,
    fontWeight: fontWeight.semibold,
  },
  replying: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space.sm,
  },
  replyingText: {
    flex: 1,
    color: color.textMuted,
    fontSize: fontSize.small,
  },
  replyingCancel: {
    minWidth: MIN_TAP_SIZE,
    minHeight: MIN_TAP_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  replyingCross: {
    color: color.textMuted,
    fontSize: fontSize.body,
  },
  muted: {
    color: color.textMuted,
    fontSize: fontSize.body,
  },
  empty: {
    paddingVertical: space.xl,
    textAlign: "center",
  },
  more: {
    minHeight: MIN_TAP_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  again: {
    minHeight: MIN_TAP_SIZE,
    justifyContent: "center",
    paddingHorizontal: space.lg,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.borderStrong,
  },
  problem: {
    color: color.error,
    fontSize: fontSize.small,
  },
  writeRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: space.sm,
  },
  field: {
    flex: 1,
    minHeight: MIN_TAP_SIZE,
    maxHeight: 120,
    paddingHorizontal: space.md,
    paddingTop: space.md,
    paddingBottom: space.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.background,
    color: color.text,
    fontSize: fontSize.input,
  },
  send: {
    minHeight: MIN_TAP_SIZE,
    justifyContent: "center",
    paddingHorizontal: space.lg,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.borderStrong,
    backgroundColor: color.surfaceRaised,
  },
  sendOff: {
    opacity: 0.4,
  },
  sendText: {
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
  count: {
    alignSelf: "flex-end",
    color: color.textMuted,
    fontSize: fontSize.detail,
  },
  countOver: {
    color: color.error,
  },
});
