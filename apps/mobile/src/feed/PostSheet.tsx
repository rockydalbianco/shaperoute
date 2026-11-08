import { type ReactNode, useMemo, useState } from "react";
import { Animated, PanResponder, StyleSheet, Text, View } from "react-native";

import { t } from "../i18n";
import { SharePost } from "../share/SharePost";
import type { PostRun } from "../share/postRun";
import { CommentsSheet } from "../social/DrawingComments";
import { DrawingReactions } from "../social/DrawingReactions";
import { useDrawingComments } from "../social/useDrawingComments";
import { color, font, fontWeight, MIN_TAP_SIZE, radius, space } from "../theme/tokens";
import { Tap } from "../ui/Tap";
import { useReduceMotion } from "../ui/useReduceMotion";
import { postOfDrawing } from "./ActionBar";
import type { ShownPost } from "./feedPosts";

/** How far a drag must go, in points, to open or close the sheet. */
const DRAG_TO_TOGGLE = 40;

type Props = {
  post: ShownPost;
  /** One's own post: «Share», and the settings under the bar. */
  mine: boolean;
  /** «Edit & run»; none, no button (on the snow, at the gym, no line). */
  onEditRun?: () => void;
  /** What the open sheet shows of one's own post: its settings. */
  settings?: ReactNode;
  /** How far the phone's bottom edge reaches into the screen. */
  insetBottom: number;
};

/**
 * The bar at the foot of the page of a post (TASK-410, ADR-0340), always
 * there: «Like» opens the six reactions over it (there is no 👍 among them:
 * the user's choice, 2026-11-08), «Comment» the comments, «Share» one's own
 * post only, «Edit & run» its line to change and run. On one's own post a
 * drag up, or a tap on the handle, opens the settings under the bar, a drag
 * down closes them. React Native's `Animated` and `PanResponder`: no
 * library.
 */
export function PostSheet({ post, mine, onEditRun, settings, insetBottom }: Props) {
  const [open, setOpen] = useState(false);
  const [reacting, setReacting] = useState(false);
  const [commenting, setCommenting] = useState(false);
  const [sharing, setSharing] = useState<PostRun | null>(null);
  const comments = useDrawingComments(post.drawing.id);
  const still = useReduceMotion();
  const openable = mine && settings !== undefined;
  // How far the finger has dragged the sheet; back to nothing at its end.
  const [drag] = useState(() => new Animated.Value(0));
  // Made again when the sheet opens or closes: each drag knows which way.
  const responder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_event, { dx, dy }) =>
          openable && Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 4,
        onPanResponderMove: (_event, { dy }) => {
          // Up only while closed, down only while open.
          drag.setValue(open ? Math.max(0, dy) : Math.min(0, dy));
        },
        onPanResponderRelease: (_event, { dy }) => {
          if (!open && dy < -DRAG_TO_TOGGLE) {
            setOpen(true);
          } else if (open && dy > DRAG_TO_TOGGLE) {
            setOpen(false);
          }
          if (still) {
            drag.setValue(0);
          } else {
            Animated.spring(drag, { toValue: 0, useNativeDriver: true }).start();
          }
        },
        onPanResponderTerminate: () => drag.setValue(0),
      }),
    [drag, open, openable, still],
  );
  const commentCount =
    comments.status === "ready" && comments.total > 0 ? ` · ${comments.total}` : "";
  return (
    <>
      <Animated.View
        style={[
          styles.sheet,
          { paddingBottom: insetBottom + space.sm, transform: [{ translateY: drag }] },
        ]}
        testID="post-sheet"
        {...responder.panHandlers}
      >
        {openable ? (
          <Tap
            style={styles.handleTap}
            onPress={() => setOpen((was) => !was)}
            accessibilityRole="button"
            accessibilityLabel={t("Post settings")}
            accessibilityState={{ expanded: open }}
            testID="post-sheet-handle"
          >
            <View style={styles.handle} />
          </Tap>
        ) : (
          <View style={styles.handleTap}>
            <View style={styles.handle} />
          </View>
        )}
        {reacting && (
          <View style={styles.reactions} testID="post-reactions">
            <DrawingReactions drawingId={post.drawing.id} barAtStart />
          </View>
        )}
        <View style={styles.actions}>
          <Action
            mark="👍"
            label={t("Like")}
            onPress={() => setReacting((was) => !was)}
            expanded={reacting}
            testID="post-like"
          />
          {comments.status !== "off" && (
            <Action
              mark="💬"
              label={`${t("Comment")}${commentCount}`}
              onPress={() => setCommenting(true)}
              testID="post-comment"
            />
          )}
          {mine && (
            <Action
              mark="↗"
              label={t("Share")}
              onPress={() => setSharing(postOfDrawing(post))}
              testID="post-share"
            />
          )}
          {onEditRun !== undefined && (
            <Action
              mark="✏️"
              label={t("Edit & run")}
              onPress={onEditRun}
              strong
              testID="post-edit-run"
            />
          )}
        </View>
        {open && openable && (
          <View style={styles.settings} testID="post-settings">
            <Text style={styles.heading} accessibilityRole="header">
              {t("Post settings")}
            </Text>
            {settings}
          </View>
        )}
      </Animated.View>
      <CommentsSheet
        visible={commenting}
        comments={comments}
        onClose={() => setCommenting(false)}
      />
      {sharing !== null && <SharePost run={sharing} onClose={() => setSharing(null)} />}
    </>
  );
}

type ActionProps = {
  /** Drawn over the word, hidden from a screen reader: the word says it. */
  mark: string;
  label: string;
  onPress: () => void;
  expanded?: boolean;
  /** The bar's one yellow word: what the page leads to. */
  strong?: boolean;
  testID: string;
};

function Action({
  mark,
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
      <Text style={styles.mark} accessible={false} importantForAccessibility="no">
        {mark}
      </Text>
      <Text style={[styles.label, strong && styles.labelStrong]} numberOfLines={1}>
        {label}
      </Text>
    </Tap>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: space.md,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
  handleTap: {
    alignSelf: "center",
    minWidth: MIN_TAP_SIZE,
    minHeight: space.xl,
    alignItems: "center",
    justifyContent: "center",
  },
  handle: {
    width: 36,
    height: 5,
    borderRadius: radius.pill,
    backgroundColor: color.borderStrong,
  },
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
  mark: {
    ...font.body,
    color: color.text,
  },
  label: {
    ...font.detail,
    color: color.text,
  },
  labelStrong: {
    color: color.accent,
    fontWeight: fontWeight.semibold,
  },
  settings: {
    gap: space.md,
    paddingTop: space.md,
    paddingBottom: space.md,
  },
  heading: {
    ...font.label,
    color: color.textMuted,
  },
});
