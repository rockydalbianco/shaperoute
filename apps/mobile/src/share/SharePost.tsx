import { useMemo, useRef, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { t } from "../i18n";
import {
  color,
  fontSize,
  fontWeight,
  MIN_TAP_SIZE,
  radius,
  space,
} from "../theme/tokens";
import { PostButton } from "./PostButton";
import { POST_RATIO, PostImage } from "./PostImage";
import {
  type PostResult,
  type PostRun,
  postCaption,
  resultName,
  resultsOf,
} from "./postRun";
import { pictureProblem, sharePicture } from "./sharePicture";
import {
  addSticker,
  MAX_STICKERS,
  moveSticker,
  POST_EMOJI,
  removeSticker,
  type Sticker,
} from "./stickers";
import { StravaPostRow } from "./StravaPostRow";

/** The share of the screen's height the post takes: the choices fit under it. */
const POST_HEIGHT_SHARE = 0.5;

type Props = {
  run: PostRun;
  onClose: () => void;
};

/**
 * The post of a run, to make and share (TASK-231, ADR-0194): the picture
 * on top, then which results it shows, the emoji to lay on it, «Instagram»
 * (the share sheet, where Instagram has Story, Feed and Messages) and
 * Strava, where the emoji and the results go as the activity's text.
 */
export function SharePost({ run, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const window = useWindowDimensions();
  const postWidth = Math.min(
    window.width - 2 * space.lg,
    (window.height * POST_HEIGHT_SHARE) / POST_RATIO,
  );
  const results = useMemo(() => resultsOf(run), [run]);
  // Every result the run has, on: the runner turns off what they keep.
  const [shown, setShown] = useState<PostResult[]>(results);
  const [stickers, setStickers] = useState<Sticker[]>([]);
  const [sharing, setSharing] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const post = useRef<View>(null);
  const caption = postCaption(
    run,
    shown,
    stickers.map((s) => s.emoji),
  );

  function toggle(result: PostResult) {
    setShown((now) =>
      now.includes(result) ? now.filter((r) => r !== result) : [...now, result],
    );
  }

  async function share() {
    setProblem(null);
    setSharing(true);
    const outcome = await sharePicture(post);
    setSharing(false);
    setProblem(pictureProblem(outcome));
  }

  return (
    <Modal
      visible
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable style={styles.close} onPress={onClose} accessibilityRole="button">
            <Text style={styles.link}>{t("Close")}</Text>
          </Pressable>
          <Text style={styles.title} accessibilityRole="header">
            {t("Share your run")}
          </Text>
        </View>
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingBottom: insets.bottom + space.xxl },
          ]}
        >
          <View style={styles.center}>
            <PostImage
              ref={post}
              run={run}
              shown={shown}
              stickers={stickers}
              width={postWidth}
              onMoveSticker={(id, x, y) =>
                setStickers((now) => moveSticker(now, id, x, y))
              }
              onRemoveSticker={(id) => setStickers((now) => removeSticker(now, id))}
            />
          </View>
          {stickers.length > 0 && (
            <Text style={styles.hint}>
              {t("Drag the emoji to move them. Tap one to take it off.")}
            </Text>
          )}

          {results.length > 0 && (
            <>
              <Text style={styles.label}>{t("Results")}</Text>
              <View style={styles.chips}>
                {results.map((result) => {
                  const on = shown.includes(result);
                  return (
                    <Pressable
                      key={result}
                      style={[styles.chip, on && styles.chipOn]}
                      onPress={() => toggle(result)}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: on }}
                    >
                      <Text style={[styles.chipText, on && styles.chipTextOn]}>
                        {resultName(result)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </>
          )}

          <Text style={styles.label}>{t("Add emoji")}</Text>
          <View style={styles.emojiRow}>
            {POST_EMOJI.map((emoji) => (
              <Pressable
                key={emoji}
                style={styles.emoji}
                onPress={() => setStickers((now) => addSticker(now, emoji))}
                accessibilityRole="button"
                accessibilityLabel={t("Add {emoji}", { emoji })}
              >
                <Text style={styles.emojiText}>{emoji}</Text>
              </Pressable>
            ))}
          </View>
          {stickers.length >= MAX_STICKERS && (
            <Text style={styles.hint}>
              {t("Up to {count} emoji: tap one on the post to take it off.", {
                count: MAX_STICKERS,
              })}
            </Text>
          )}

          <View style={styles.actions}>
            <PostButton
              text={sharing ? t("Making the picture…") : "Instagram"}
              onPress={() => void share()}
              busy={sharing}
              main
            />
            <Text style={styles.hint}>
              {t("Pick Instagram in the list: Story, Feed or Messages.")}
            </Text>
            {problem !== null && (
              <Text style={styles.problem} accessibilityRole="alert">
                {problem}
              </Text>
            )}
            <StravaPostRow runKey={run.key} caption={caption} />
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

type ButtonProps = {
  /** The run as the post shows it, made when the button is pressed. */
  makeRun: () => PostRun;
};

/** «Share» on a run's card (TASK-231): opens the post of the run. */
export function SharePostButton({ makeRun }: ButtonProps) {
  const [run, setRun] = useState<PostRun | null>(null);
  return (
    <>
      <Pressable
        style={styles.shareButton}
        onPress={() => setRun(makeRun())}
        accessibilityRole="button"
      >
        <Text style={styles.shareText}>{t("Share")}</Text>
      </Pressable>
      {run !== null && <SharePost run={run} onClose={() => setRun(null)} />}
    </>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: color.background,
  },
  header: {
    minHeight: MIN_TAP_SIZE,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: space.lg,
  },
  close: {
    position: "absolute",
    left: space.lg,
    minHeight: MIN_TAP_SIZE,
    justifyContent: "center",
  },
  link: {
    color: color.accent,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
  title: {
    color: color.text,
    fontSize: fontSize.input,
    fontWeight: fontWeight.semibold,
  },
  content: {
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
  },
  center: {
    alignItems: "center",
  },
  label: {
    color: color.textMuted,
    fontSize: fontSize.small,
    fontWeight: fontWeight.semibold,
  },
  hint: {
    color: color.textMuted,
    fontSize: fontSize.small,
  },
  problem: {
    color: color.error,
    fontSize: fontSize.small,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: space.sm,
  },
  chip: {
    minHeight: MIN_TAP_SIZE,
    justifyContent: "center",
    paddingHorizontal: space.lg,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.borderStrong,
  },
  chipOn: {
    borderColor: color.text,
    backgroundColor: color.surfaceRaised,
  },
  chipText: {
    color: color.textMuted,
    fontSize: fontSize.body,
  },
  chipTextOn: {
    color: color.text,
    fontWeight: fontWeight.semibold,
  },
  emojiRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: space.xs,
  },
  emoji: {
    width: MIN_TAP_SIZE,
    height: MIN_TAP_SIZE,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md,
    backgroundColor: color.surface,
  },
  emojiText: {
    fontSize: fontSize.title,
  },
  actions: {
    gap: space.sm,
    paddingTop: space.sm,
  },
  shareButton: {
    minHeight: MIN_TAP_SIZE,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: space.xl,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.borderStrong,
    backgroundColor: color.surfaceRaised,
  },
  shareText: {
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
});
