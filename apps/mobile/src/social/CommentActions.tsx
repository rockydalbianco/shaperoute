import {
  COMMENT_REACTION_KINDS,
  type CommentReactionKind,
  type CommentReactions,
} from "@shaperoute/shared-types";
import { useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import { t, tPlural } from "../i18n";
import {
  color,
  fontSize,
  fontWeight,
  MIN_TAP_SIZE,
  radius,
  space,
} from "../theme/tokens";
import { topCommentKinds } from "./commentThreads";
import { REACTION_EMOJI, reactionName } from "./reactionKinds";

/** How tall the line is: the words of a comment stay close to what they offer. */
export const COMMENT_ACTIONS_HEIGHT = 32;
/** How wide an emoji to choose is, on a line that also fits under a reply. */
const CHOICE_WIDTH = 36;
const EMOJI_SIZE = 18;
const HEART_SIDE = 18;
/** How many of the most used show beside the count. */
const TOP_SHOWN = 3;
// The line is low: every touch on it reaches the height of a button.
const SLOP = {
  top: (MIN_TAP_SIZE - COMMENT_ACTIONS_HEIGHT) / 2,
  bottom: (MIN_TAP_SIZE - COMMENT_ACTIONS_HEIGHT) / 2,
};

/** The heart of «Like» (TASK-444), from Lucide (ISC,
 * assets/ui/icons/LICENSE-lucide.txt): on a comment one did not react to. */
const NO_REACTION_ICON = require("../../assets/ui/icons/heart.png");

type Props = {
  /** The reactions of the comment, or of the reply. */
  reactions: CommentReactions;
  onReply: () => void;
  /** One's own again takes it away: the comments know. */
  onReact: (kind: CommentReactionKind) => void;
  /** For the tests: `…-reply`, `…-react`, `…-choices`. */
  testID?: string;
};

/**
 * Under a comment, and under a reply (TASK-454 part C, ADR-0377, the user's
 * choices of 2026-11-11): «Reply», and the reactions to it. A button with
 * one's own reaction, or the line heart until there is one, then the most
 * used and how many. The button turns the line into the five emoji to choose
 * from, one's own with a ring; the line is as tall either way, so nothing in
 * the list moves. There is no MuW heart here: the super like is a post's.
 */
export function CommentActions({ reactions, onReply, onReact, testID }: Props) {
  const [choosing, setChoosing] = useState(false);
  const { mine, total } = reactions;

  if (choosing) {
    return (
      <View
        style={styles.line}
        accessibilityRole="toolbar"
        testID={testID === undefined ? undefined : `${testID}-choices`}
      >
        {COMMENT_REACTION_KINDS.map((kind) => (
          <Pressable
            key={kind}
            style={[styles.choice, mine === kind && styles.choiceMine]}
            onPress={() => {
              setChoosing(false);
              onReact(kind);
            }}
            hitSlop={SLOP}
            accessibilityRole="button"
            accessibilityLabel={reactionName(kind)}
            accessibilityState={{ selected: mine === kind }}
          >
            <Text style={styles.emoji}>{REACTION_EMOJI[kind]}</Text>
          </Pressable>
        ))}
        <Pressable
          style={styles.word}
          onPress={() => setChoosing(false)}
          hitSlop={SLOP}
          accessibilityRole="button"
        >
          <Text style={styles.wordText}>{t("Cancel")}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.line}>
      <Pressable
        style={styles.word}
        onPress={onReply}
        hitSlop={SLOP}
        accessibilityRole="button"
        testID={testID === undefined ? undefined : `${testID}-reply`}
      >
        <Text style={styles.wordText}>{t("Reply")}</Text>
      </Pressable>
      <Pressable
        style={styles.own}
        onPress={() => setChoosing(true)}
        hitSlop={SLOP}
        accessibilityRole="button"
        accessibilityLabel={
          mine === null
            ? t("React")
            : t("Your reaction: {name}", { name: reactionName(mine) })
        }
        accessibilityState={{ expanded: false }}
        testID={testID === undefined ? undefined : `${testID}-react`}
      >
        {mine === null ? (
          <Image
            source={NO_REACTION_ICON}
            style={styles.heart}
            accessible={false}
            importantForAccessibility="no"
          />
        ) : (
          <Text style={styles.emoji}>{REACTION_EMOJI[mine]}</Text>
        )}
      </Pressable>
      {total > 0 && (
        <View
          style={styles.summary}
          accessible
          accessibilityLabel={tPlural(total, "{count} reaction", "{count} reactions")}
          testID={testID === undefined ? undefined : `${testID}-summary`}
        >
          {topCommentKinds(reactions.counts, TOP_SHOWN)
            // One's own is on the button already.
            .filter((kind) => kind !== mine)
            .map((kind) => (
              <Text key={kind} style={styles.top}>
                {REACTION_EMOJI[kind]}
              </Text>
            ))}
          <Text style={styles.total}>{total}</Text>
        </View>
      )}
    </View>
  );
}

// Neutral, as every control that is not the route's (docs/UI.md, «Il tema»).
const styles = StyleSheet.create({
  line: {
    height: COMMENT_ACTIONS_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
  },
  word: {
    height: COMMENT_ACTIONS_HEIGHT,
    justifyContent: "center",
    paddingRight: space.sm,
  },
  wordText: {
    color: color.textMuted,
    fontSize: fontSize.small,
    fontWeight: fontWeight.semibold,
  },
  own: {
    width: CHOICE_WIDTH,
    height: COMMENT_ACTIONS_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
  },
  heart: {
    width: HEART_SIDE,
    height: HEART_SIDE,
    tintColor: color.textMuted,
  },
  choice: {
    width: CHOICE_WIDTH,
    height: COMMENT_ACTIONS_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
    borderWidth: 1,
    // The sheet's own colour: a border only around one's own.
    borderColor: color.surface,
  },
  choiceMine: {
    borderColor: color.text,
    backgroundColor: color.surfaceRaised,
  },
  emoji: {
    color: color.text,
    fontSize: EMOJI_SIZE,
  },
  summary: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.xs / 2,
  },
  top: {
    color: color.text,
    fontSize: fontSize.small,
  },
  total: {
    marginLeft: space.xs / 2,
    color: color.textMuted,
    fontSize: fontSize.small,
    fontWeight: fontWeight.semibold,
  },
});
