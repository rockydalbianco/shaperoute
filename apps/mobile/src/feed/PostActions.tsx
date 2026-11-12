import { useState } from "react";
import { Image, type ImageSourcePropType, StyleSheet, Text, View } from "react-native";

import { t } from "../i18n";
import { SharePost } from "../share/SharePost";
import type { PostRun } from "../share/postRun";
import { CommentsSheet } from "../social/DrawingComments";
import { DrawingReactions } from "../social/DrawingReactions";
import { useDrawingComments } from "../social/useDrawingComments";
import { color, font, fontWeight, MIN_TAP_SIZE, space } from "../theme/tokens";
import { Tap } from "../ui/Tap";
import type { ShownPost } from "./feedPosts";

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
  /** One's own post: «Share». A drawing of somebody else leaves the app
   * only with a consent nobody has asked for (TASK-355, the user's choice). */
  mine: boolean;
  /** «Edit & run»; none, no button (on the snow, at the gym, no line). */
  onEditRun?: () => void;
};

/**
 * The four actions of a post (TASK-410, ADR-0340), the same in the card of
 * «Feed» (part F) and at the foot of its page (part B): «Like» opens the
 * six reactions over the row (there is no 👍 among them: the user's choice,
 * 2026-11-08), «Comment» the comments with how many there are, «Share» one's
 * own post only, «Edit & run» its line to change and run, in yellow: what
 * the post leads to. Beside the card's button and not inside it, or a
 * screen reader would never reach them.
 */
export function PostActions({ post, mine, onEditRun }: Props) {
  const [reacting, setReacting] = useState(false);
  const [commenting, setCommenting] = useState(false);
  // The comments' sheet is made at the first «Comment», and kept: a card in
  // «Feed» does not carry one it never opens.
  const [commented, setCommented] = useState(false);
  const [sharing, setSharing] = useState<PostRun | null>(null);
  const comments = useDrawingComments(post.drawing.id);
  const commentCount =
    comments.status === "ready" && comments.total > 0 ? ` · ${comments.total}` : "";
  return (
    <>
      {reacting && (
        <View style={styles.reactions} testID="post-reactions">
          <DrawingReactions drawingId={post.drawing.id} barAtStart />
        </View>
      )}
      <View style={styles.actions} testID="feed-actions">
        <Action
          icon={ICONS.like}
          label={t("Like")}
          onPress={() => setReacting((was) => !was)}
          expanded={reacting}
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
        {mine && (
          <Action
            icon={ICONS.share}
            label={t("Share")}
            onPress={() => setSharing(postOfDrawing(post))}
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
      {commented && (
        <CommentsSheet
          visible={commenting}
          comments={comments}
          onClose={() => setCommenting(false)}
        />
      )}
      {sharing !== null && <SharePost run={sharing} onClose={() => setSharing(null)} />}
    </>
  );
}

type ActionProps = {
  /** Drawn over the word, hidden from a screen reader: the word says it. */
  icon: ImageSourcePropType;
  label: string;
  onPress: () => void;
  expanded?: boolean;
  /** The row's one yellow word: what the post leads to. */
  strong?: boolean;
  testID: string;
};

function Action({
  icon,
  label,
  onPress,
  expanded,
  strong = false,
  testID,
}: ActionProps) {
  return (
    <Tap
      style={styles.action}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      {...(expanded === undefined ? {} : { accessibilityState: { expanded } })}
      testID={testID}
    >
      <Image
        source={icon}
        style={[styles.icon, strong && styles.iconStrong]}
        accessible={false}
        importantForAccessibility="no"
        testID={`${testID}-icon`}
      />
      <Text style={[styles.label, strong && styles.labelStrong]} numberOfLines={1}>
        {label}
      </Text>
    </Tap>
  );
}

/** The side of an action's icon, in points: the size its PNG is drawn at. */
const ICON_SIZE = 22;

const styles = StyleSheet.create({
  reactions: {
    paddingBottom: space.sm,
  },
  actions: {
    flexDirection: "row",
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
  label: {
    ...font.detail,
    color: color.text,
  },
  labelStrong: {
    color: color.accent,
    fontWeight: fontWeight.semibold,
  },
});
