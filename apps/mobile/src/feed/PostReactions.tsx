import type { ReactionKind } from "@shaperoute/shared-types";
import { useRef, useState } from "react";
import { Alert, Modal, Platform, Pressable, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { t } from "../i18n";
import { negativeComment } from "../social/commentText";
import { REACTION_BAR_HEIGHT, ReactionBar } from "../social/DrawingReactions";
import { SuperLikeSheet } from "../social/SuperLikeSheet";
import type { DrawingReactions } from "../social/useDrawingReactions";
import { space } from "../theme/tokens";

/** Where the row of a post's actions is on the screen, in the window's points. */
export type RowBox = { x: number; y: number; width: number };

/** Where the bar hangs, in the window's points. */
export type BarPlace = { top: number; left: number; maxWidth: number };

/**
 * The bar over the row of the actions, from its start: a little above it,
 * never wider than it, and never under the clock at the top of the screen
 * (a row scrolled right under it: the bar then covers the row instead).
 */
export function barPlace(row: RowBox, topInset: number): BarPlace {
  return {
    top: Math.max(topInset + space.xs, row.y - REACTION_BAR_HEIGHT - space.xs),
    left: row.x + space.sm,
    maxWidth: Math.max(0, row.width - 2 * space.sm),
  };
}

type Props = {
  /** The reactions of the post, read once by the row for its «Like». */
  reactions: DrawingReactions;
  /** The bar of the six is up. */
  open: boolean;
  /** Where the row is; null until it has said so: the bar waits, unseen. */
  row: RowBox | null;
  /** A choice, a tap anywhere else, Android's back. */
  onClose: () => void;
  /** A super like went, with its comment: the post has one comment more. */
  onSuperLiked: () => void;
};

/**
 * The six reactions of a post, over its «Like» (TASK-454, the user's choice
 * of 2026-11-11): a bar that hangs above the row of the actions without
 * moving anything, where a strip used to open over the row and push the
 * four buttons down. A choice or a tap anywhere else closes it. One's own,
 * with its ring, chosen again takes it away. The MuW heart is the super
 * like and asks for its comment in the sheet of the drawings (ADR-0193).
 */
export function PostReactions({ reactions, open, row, onClose, onSuperLiked }: Props) {
  const [writing, setWriting] = useState(false);
  // The sheet is made at the first super like, and kept: a card in «Feed»
  // does not carry one it never opens.
  const [written, setWritten] = useState(false);
  // The heart chosen on iOS, until the bar is really gone: a sheet shown
  // while another Modal is closing never comes up (TASK-358). Android has
  // no such wait, and no `onDismiss` to wait for.
  const heartChosen = useRef(false);
  const { mine } = reactions;

  function askSuperLike() {
    reactions.forgetSendProblem();
    setWritten(true);
    setWriting(true);
  }

  function onChoose(kind: ReactionKind) {
    onClose();
    if (kind !== "super_like") {
      reactions.choose(kind);
    } else if (mine === "super_like") {
      // One's own again takes it away; its comment stays.
      reactions.remove();
    } else if (Platform.OS === "ios") {
      heartChosen.current = true;
    } else {
      askSuperLike();
    }
  }

  function barGone() {
    if (heartChosen.current) {
      heartChosen.current = false;
      askSuperLike();
    }
  }

  async function onSend(comment: string) {
    const sent = await reactions.superLike(comment);
    if (sent === "sent") {
      setWriting(false);
      onSuperLiked();
    } else if (sent === "rejected") {
      Alert.alert(negativeComment());
    }
  }

  return (
    <>
      <Modal
        visible={open}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={onClose}
        onDismiss={barGone}
      >
        <Hanging mine={mine} row={row} onChoose={onChoose} onClose={onClose} />
      </Modal>
      {written && (
        <SuperLikeSheet
          visible={writing}
          sending={reactions.sending}
          problem={reactions.sendProblem}
          onSend={onSend}
          onCancel={() => setWriting(false)}
        />
      )}
    </>
  );
}

type HangingProps = {
  mine: ReactionKind | null;
  row: RowBox | null;
  onChoose: (kind: ReactionKind) => void;
  onClose: () => void;
};

/** The bar where the row is, over a screen that closes it at a touch. Made
 * only while the bar is up: a card asks for the screen's edges only then. */
function Hanging({ mine, row, onChoose, onClose }: HangingProps) {
  const insets = useSafeAreaInsets();
  return (
    <>
      {/* A tap anywhere else closes the bar and changes nothing. */}
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel={t("Close")}
        testID="post-reactions-outside"
      />
      <ReactionBar
        mine={mine}
        onChoose={onChoose}
        style={[styles.bar, row === null ? styles.unseen : barPlace(row, insets.top)]}
        testID="post-reactions"
      />
    </>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: "absolute",
  },
  unseen: {
    opacity: 0,
  },
});
