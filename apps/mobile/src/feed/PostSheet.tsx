import { type ReactNode, type Ref, useMemo, useState } from "react";
import { Animated, PanResponder, StyleSheet, Text, View } from "react-native";

import { t } from "../i18n";
import { color, font, MIN_TAP_SIZE, radius, space } from "../theme/tokens";
import { Tap } from "../ui/Tap";
import { useReduceMotion } from "../ui/useReduceMotion";
import type { ShownPost } from "./feedPosts";
import { PostActions } from "./PostActions";
import type { PostReactionsHandle } from "./PostReactions";

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
  /** For the picture of the page, above the bar: two taps on it are the
   * super like (TASK-454 part B). */
  reactionsHandle?: Ref<PostReactionsHandle>;
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
export function PostSheet({
  post,
  mine,
  onEditRun,
  settings,
  insetBottom,
  reactionsHandle,
}: Props) {
  const [open, setOpen] = useState(false);
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
  return (
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
      <PostActions
        post={post}
        mine={mine}
        onEditRun={onEditRun}
        reactionsHandle={reactionsHandle}
      />
      {open && openable && (
        <View style={styles.settings} testID="post-settings">
          <Text style={styles.heading} accessibilityRole="header">
            {t("Post settings")}
          </Text>
          {settings}
        </View>
      )}
    </Animated.View>
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
