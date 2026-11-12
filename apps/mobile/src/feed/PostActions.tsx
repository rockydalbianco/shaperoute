import { type ReactNode, type Ref, useRef, useState } from "react";
import { Image, type ImageSourcePropType, StyleSheet, Text, View } from "react-native";

import { t, tPlural } from "../i18n";
import { postOfFeed } from "../messages/messagePost";
import type { PostRun } from "../share/postRun";
import { CommentsSheet } from "../social/DrawingComments";
import { ReactionMark } from "../social/DrawingReactions";
import { reactionName } from "../social/reactionKinds";
import { useDrawingComments } from "../social/useDrawingComments";
import { useDrawingReactions } from "../social/useDrawingReactions";
import {
  color,
  font,
  fontSize,
  fontWeight,
  MIN_TAP_SIZE,
  space,
} from "../theme/tokens";
import { Tap } from "../ui/Tap";
import type { ShownPost } from "./feedPosts";
import { PostReactions, type PostReactionsHandle, type RowBox } from "./PostReactions";
import { PostShareSheet, usePostSendable } from "./PostShareSheet";

/** The actions' icons, from Lucide (ISC, assets/ui/icons/LICENSE-lucide.txt)
 * as the bar's are (TASK-444): white, coloured by `tintColor`. Emoji in
 * colours stood here, beside the bar's thin lines. */
const ICONS = {
  like: require("../../assets/ui/icons/heart.png"),
  comment: require("../../assets/ui/icons/message-circle.png"),
  share: require("../../assets/ui/icons/share.png"),
  editRun: require("../../assets/ui/icons/pencil.png"),
} satisfies Record<string, ImageSourcePropType>;

/**
 * A member's drawing as its post shows it. What the card has is already cut
 * (ADR-0114), and the post cuts it again: nothing but less leaves the phone.
 * No key: this picture is not kept as the post of a run of the account.
 */
export function postOfDrawing({ drawing }: Pick<ShownPost, "drawing">): PostRun {
  return {
    key: null,
    // A swim in a pool reads its lengths by it (TASK-400 part C).
    drawingId: drawing.id,
    title: drawing.title,
    track: drawing.track_preview,
    distanceM: drawing.distance_m,
    durationMs: drawing.duration_s * 1000,
    ...(drawing.activity === undefined ? {} : { activity: drawing.activity }),
    ...(drawing.rotation_deg == null ? {} : { rotationDeg: drawing.rotation_deg }),
  };
}

type Props = {
  post: ShownPost;
  /** One's own post: «Share» has «Poster and video» too. A drawing of
   * somebody else leaves the app as a picture only with a consent nobody
   * has asked for (TASK-355, the user's choice): it is sent to a friend, as
   * a pointer (TASK-455). */
  mine: boolean;
  /** «Edit & run»; none, no button (on the snow, at the gym, no line). */
  onEditRun?: () => void;
  /** For the picture of the post, drawn by who draws this row: two taps on
   * it are the super like (TASK-454 part B). */
  reactionsHandle?: Ref<PostReactionsHandle>;
};

/**
 * The four actions of a post (TASK-410, ADR-0340), the same in the card of
 * «Feed» (part F) and at the foot of its page (part B): «Like» opens the
 * six reactions in a bar that hangs over the row and moves nothing (there
 * is no 👍 among them: the user's choice, 2026-11-08), «Comment» the
 * comments with how many there are, «Share» a small sheet (TASK-455, the
 * user's choice of 2026-11-12: «Send to a friend», and on one's own post
 * «Poster and video»), «Edit & run» its line to change and run, in yellow:
 * what the post leads to. Beside the card's button and not inside it, or a
 * screen reader would never reach them.
 *
 * «Like» says what is there (TASK-454, the user's choices of 2026-11-11):
 * one's own reaction in place of the heart, its word in bold, and how many
 * reactions the post has, as «Comment» does. A super like's comment is one
 * of the post's comments, so they are read again once it went.
 */
export function PostActions({ post, mine, onEditRun, reactionsHandle }: Props) {
  const [reacting, setReacting] = useState(false);
  // Where the row is on the screen, asked at each «Like»: the bar hangs
  // over it, in a Modal of its own.
  const row = useRef<View>(null);
  const [rowBox, setRowBox] = useState<RowBox | null>(null);
  const [commenting, setCommenting] = useState(false);
  // The comments' sheet is made at the first «Comment», and kept: a card in
  // «Feed» does not carry one it never opens.
  const [commented, setCommented] = useState(false);
  // The sheet of «Share» is made at the first «Share», and kept, as the
  // comments' is. On somebody else's post it has only «Send to a friend»:
  // without the messages there would be nothing in it, so no «Share».
  const [sharing, setSharing] = useState(false);
  const [shared, setShared] = useState(false);
  const sendable = usePostSendable();
  const comments = useDrawingComments(post.drawing.id);
  const commentCount =
    comments.status === "ready" && comments.total > 0 ? ` · ${comments.total}` : "";
  const reactions = useDrawingReactions(post.drawing.id);
  const reactionsReady = reactions.status === "ready";
  const reaction = reactionsReady ? reactions.mine : null;
  const reactionCount = reactionsReady ? reactions.total : 0;

  function onLike() {
    // Nobody signed in, an API without reactions, no answer yet: no bar.
    if (!reactionsReady) {
      return;
    }
    // Asked again each time: the card has scrolled since the last.
    setRowBox(null);
    row.current?.measureInWindow((x, y, width) => setRowBox({ x, y, width }));
    setReacting(true);
  }

  return (
    <>
      <View ref={row} style={styles.actions} collapsable={false} testID="feed-actions">
        <Action
          icon={ICONS.like}
          mark={
            reaction === null ? undefined : (
              <ReactionMark kind={reaction} side={ICON_SIZE} />
            )
          }
          label={`${t("Like")}${reactionCount > 0 ? ` · ${reactionCount}` : ""}`}
          // The word and the number are for the eye; a screen reader hears
          // which reaction is one's own, and how many there are.
          spoken={
            reaction === null
              ? t("Like")
              : t("Your reaction: {name}", { name: reactionName(reaction) })
          }
          spokenValue={
            reactionCount > 0
              ? tPlural(reactionCount, "{count} reaction", "{count} reactions")
              : undefined
          }
          onPress={onLike}
          expanded={reacting}
          bold={reaction !== null}
          testID="post-like"
        />
        {comments.status !== "off" && (
          <Action
            icon={ICONS.comment}
            label={`${t("Comment")}${commentCount}`}
            onPress={() => {
              setCommented(true);
              setCommenting(true);
            }}
            testID="post-comment"
          />
        )}
        {(mine || sendable) && (
          <Action
            icon={ICONS.share}
            label={t("Share")}
            onPress={() => {
              setShared(true);
              setSharing(true);
            }}
            testID="post-share"
          />
        )}
        {onEditRun !== undefined && (
          <Action
            icon={ICONS.editRun}
            label={t("Edit & run")}
            onPress={onEditRun}
            strong
            testID="post-edit-run"
          />
        )}
      </View>
      {reactions.problem !== null && (
        <Text style={styles.problem} accessibilityLiveRegion="polite">
          {reactions.problem}
        </Text>
      )}
      <PostReactions
        reactions={reactions}
        open={reacting}
        row={rowBox}
        onClose={() => setReacting(false)}
        onSuperLiked={comments.reload}
        handle={reactionsHandle}
      />
      {commented && (
        <CommentsSheet
          visible={commenting}
          comments={comments}
          onClose={() => setCommenting(false)}
        />
      )}
      {shared && (
        <PostShareSheet
          visible={sharing}
          post={postOfFeed(post.drawing)}
          poster={mine ? () => postOfDrawing(post) : undefined}
          onClose={() => setSharing(false)}
        />
      )}
    </>
  );
}

type ActionProps = {
  /** Drawn over the word, hidden from a screen reader: the word says it. */
  icon: ImageSourcePropType;
  /** Drawn in place of the icon, in its box: one's own reaction on «Like». */
  mark?: ReactNode;
  label: string;
  /** What a screen reader says in place of the word; the word, without. */
  spoken?: string;
  /** And after it, as the button's value: how many there are. */
  spokenValue?: string;
  onPress: () => void;
  expanded?: boolean;
  /** The row's one yellow word: what the post leads to. */
  strong?: boolean;
  /** The word in bold, in its own colour: something of one's own is there. */
  bold?: boolean;
  testID: string;
};

function Action({
  icon,
  mark,
  label,
  spoken = label,
  spokenValue,
  onPress,
  expanded,
  strong = false,
  bold = false,
  testID,
}: ActionProps) {
  return (
    <Tap
      style={styles.action}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={spoken}
      {...(spokenValue === undefined
        ? {}
        : { accessibilityValue: { text: spokenValue } })}
      {...(expanded === undefined ? {} : { accessibilityState: { expanded } })}
      testID={testID}
    >
      {mark === undefined ? (
        <Image
          source={icon}
          style={[styles.icon, strong && styles.iconStrong]}
          accessible={false}
          importantForAccessibility="no"
          testID={`${testID}-icon`}
        />
      ) : (
        <View
          style={styles.mark}
          accessible={false}
          importantForAccessibility="no-hide-descendants"
          testID={`${testID}-mark`}
        >
          {mark}
        </View>
      )}
      <Text
        style={[styles.label, strong && styles.labelStrong, bold && styles.labelBold]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Tap>
  );
}

/** The side of an action's icon, in points: the size its PNG is drawn at. */
const ICON_SIZE = 22;

const styles = StyleSheet.create({
  actions: {
    flexDirection: "row",
  },
  problem: {
    paddingBottom: space.sm,
    color: color.error,
    fontSize: fontSize.small,
    textAlign: "center",
  },
  action: {
    flex: 1,
    minHeight: MIN_TAP_SIZE + space.md,
    alignItems: "center",
    justifyContent: "center",
    gap: space.xs,
  },
  icon: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    tintColor: color.text,
  },
  iconStrong: {
    tintColor: color.accent,
  },
  // The icon's own box: the row is as tall with a reaction as without.
  mark: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    ...font.detail,
    color: color.text,
  },
  labelStrong: {
    color: color.accent,
    fontWeight: fontWeight.semibold,
  },
  labelBold: {
    fontWeight: fontWeight.semibold,
  },
});
