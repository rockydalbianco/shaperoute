import { REACTION_KINDS, type ReactionKind } from "@shaperoute/shared-types";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import { t, tPlural } from "../i18n";
import { HeartBadge } from "../intro/HeartBadge";
import {
  color,
  fontSize,
  fontWeight,
  MIN_TAP_SIZE,
  radius,
  space,
} from "../theme/tokens";
import { negativeComment } from "./commentText";
import {
  NO_REACTION_FACE,
  REACTION_EMOJI,
  reactionName,
  topKinds,
} from "./reactionKinds";
import { SuperLikeHeart, SuperLikeSheet } from "./SuperLikeSheet";
import { useDrawingReactions } from "./useDrawingReactions";

/** A reaction on the button and in the bar; smaller among the most used. */
const MARK_SIDE = 26;
const TOP_SIDE = 18;

const listeners = new Set<() => void>();

/**
 * A double tap on the map of the drawing that is open (TASK-119): its
 * super like. The map knows nothing of reactions, and says it here.
 */
export function drawingDoubleTapped(): void {
  listeners.forEach((listener) => listener());
}

type Props = {
  drawingId: string;
  /** A super like went, with its comment: the drawing has one comment more. */
  onSuperLiked?: () => void;
  /** What stays next to the reactions, on their row: the comments' button. */
  beside?: ReactNode;
};

/**
 * Under a drawing on the map (TASK-119, ADR-0193): a button with one's own
 * reaction, the three most used and how many there are. The button opens
 * the bar of the six; the Sgrava heart, there or with a double tap on the
 * drawing, is the super like and asks for its comment. Without an account,
 * or on an API without reactions, only what is `beside`, in its place.
 */
export function DrawingReactions({ drawingId, onSuperLiked, beside }: Props) {
  const reactions = useDrawingReactions(drawingId);
  const [barOpen, setBarOpen] = useState(false);
  const [writing, setWriting] = useState(false);
  // A count, not a flag: a double tap while the heart is up starts it again.
  const [hearts, setHearts] = useState(0);
  const ready = reactions.status === "ready";
  const { mine, forgetSendProblem } = reactions;

  function askSuperLike() {
    forgetSendProblem();
    setBarOpen(false);
    setWriting(true);
  }

  // The newest answer to a double tap, for the listener made once.
  const onDoubleTap = useRef(() => {});
  useEffect(() => {
    onDoubleTap.current = () => {
      if (!ready || writing) {
        return;
      }
      if (mine === "super_like") {
        // Never taken away by a double tap: the heart again, nothing else.
        setHearts((count) => count + 1);
      } else {
        askSuperLike();
      }
    };
  });
  useEffect(() => {
    const tapped = () => onDoubleTap.current();
    listeners.add(tapped);
    return () => {
      listeners.delete(tapped);
    };
  }, []);

  function onChoose(kind: ReactionKind) {
    setBarOpen(false);
    if (kind !== "super_like") {
      reactions.choose(kind);
    } else if (mine === "super_like") {
      // One's own again takes it away; its comment stays.
      reactions.remove();
    } else {
      askSuperLike();
    }
  }

  async function onSend(comment: string) {
    const sent = await reactions.superLike(comment);
    if (sent === "sent") {
      setWriting(false);
      onSuperLiked?.();
    } else if (sent === "rejected") {
      Alert.alert(negativeComment());
    }
  }

  return (
    <View style={styles.block}>
      {ready && barOpen && (
        <View style={styles.bar} accessibilityRole="toolbar">
          {REACTION_KINDS.map((kind) => (
            <Pressable
              key={kind}
              style={[styles.choice, mine === kind && styles.choiceMine]}
              onPress={() => onChoose(kind)}
              accessibilityRole="button"
              accessibilityLabel={reactionName(kind)}
              accessibilityState={{ selected: mine === kind }}
            >
              <ReactionMark kind={kind} side={MARK_SIDE} />
            </Pressable>
          ))}
        </View>
      )}
      <View style={styles.row}>
        {ready && (
          <>
            <Pressable
              style={[styles.own, mine !== null && styles.choiceMine]}
              onPress={() => setBarOpen((open) => !open)}
              accessibilityRole="button"
              accessibilityLabel={
                mine === null
                  ? t("React")
                  : t("Your reaction: {name}", { name: reactionName(mine) })
              }
              accessibilityState={{ expanded: barOpen }}
            >
              {mine === null ? (
                <Text style={[styles.emoji, styles.noReaction]}>
                  {NO_REACTION_FACE}
                </Text>
              ) : (
                <ReactionMark kind={mine} side={MARK_SIDE} />
              )}
            </Pressable>
            {reactions.total > 0 && (
              <View
                style={styles.summary}
                accessible
                accessibilityLabel={tPlural(
                  reactions.total,
                  "{count} reaction",
                  "{count} reactions",
                )}
                testID="reactions-summary"
              >
                {topKinds(reactions.counts).map((kind) => (
                  <ReactionMark key={kind} kind={kind} side={TOP_SIDE} />
                ))}
                <Text style={styles.total}>{reactions.total}</Text>
              </View>
            )}
          </>
        )}
        <View style={styles.beside}>{beside}</View>
      </View>
      {reactions.problem !== null && (
        <Text style={styles.problem} accessibilityLiveRegion="polite">
          {reactions.problem}
        </Text>
      )}
      <SuperLikeSheet
        visible={writing}
        sending={reactions.sending}
        problem={reactions.sendProblem}
        onSend={onSend}
        onCancel={() => setWriting(false)}
      />
      {hearts > 0 && <SuperLikeHeart key={hearts} onDone={() => setHearts(0)} />}
    </View>
  );
}

type MarkProps = {
  kind: ReactionKind;
  /** The side of the Sgrava heart; an emoji is as tall. */
  side: number;
};

/** A reaction, drawn: the Sgrava heart on its yellow, or the emoji. */
function ReactionMark({ kind, side }: MarkProps) {
  if (kind === "super_like") {
    return <HeartBadge size={side} />;
  }
  return (
    <Text
      style={[styles.emoji, { fontSize: side * EMOJI_SHARE }]}
      testID={`mark-${kind}`}
    >
      {REACTION_EMOJI[kind]}
    </Text>
  );
}

/** An emoji is drawn taller than its font size says. */
const EMOJI_SHARE = 0.85;

// Neutral, as every control that is not the route's (docs/UI.md, «Il tema»):
// the only yellow is the Sgrava heart's.
const styles = StyleSheet.create({
  block: {
    gap: space.sm,
  },
  bar: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: space.xs,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
  choice: {
    width: MIN_TAP_SIZE,
    height: MIN_TAP_SIZE,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
    borderWidth: 1,
    // The bar's own colour: a border only around one's own.
    borderColor: color.surface,
  },
  choiceMine: {
    borderColor: color.text,
    backgroundColor: color.surfaceRaised,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
  },
  own: {
    width: MIN_TAP_SIZE,
    height: MIN_TAP_SIZE,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.borderStrong,
    backgroundColor: color.surfaceRaised,
  },
  emoji: {
    color: color.text,
    fontSize: MARK_SIDE * EMOJI_SHARE,
  },
  noReaction: {
    opacity: 0.5,
  },
  summary: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.xs,
  },
  total: {
    marginLeft: space.xs / 2,
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
  beside: {
    flex: 1,
  },
  problem: {
    color: color.error,
    fontSize: fontSize.small,
  },
});
