import * as Sharing from "expo-sharing";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import {
  initialWindowMetrics,
  SafeAreaProvider,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { useActivitiesDoor } from "../activities/activitiesDoor";
import { isTrackless } from "../activities/snow";
import { GymSharePicture } from "../gym/GymSharePicture";
import { PoolSharePicture } from "../pool/PoolSharePicture";
import { isPoolLine } from "../pool/PoolTile";
import { t } from "../i18n";
import {
  color,
  fontSize,
  fontWeight,
  MIN_TAP_SIZE,
  radius,
  space,
} from "../theme/tokens";
import { EditVideoSheet } from "./EditVideoSheet";
import { MusicRow } from "./MusicRow";
import { PostButton } from "./PostButton";
import { POST_RATIO, PostImage } from "./PostImage";
import {
  type PostResult,
  type PostRun,
  postCaption,
  postRequestOf,
  resultName,
  resultsOf,
} from "./postRun";
import { RunVideo } from "./RunVideo";
import { pictureProblem, sharePicture } from "./sharePicture";
import {
  addSticker,
  MAX_STICKERS,
  moveSticker,
  placedOf,
  POST_EMOJI,
  removeSticker,
  type Sticker,
  stickersOf,
} from "./stickers";
import { StravaPostRow } from "./StravaPostRow";
import { characterName } from "./videoCharacter";
import { FIRST_EDIT, type VideoEdit } from "./videoEdit";
import { sceneName } from "./videoScenes";
import { type VideoOutcome, videoProblem } from "./videoFile";
import { hearMusic, type Music } from "./videoMusic";
import { type VideoScene, videoScene } from "./videoScene";
import { styleName } from "./videoStyle";

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
 * Strava, where the emoji and the results go as the activity's text. Once
 * shared, the post goes to the API with its saved run (TASK-258), and
 * opens as it was the next time. «Export video» shares the same post as a
 * short video of the run drawing itself over the map of the run (TASK-295,
 * TASK-351), with the track chosen in «Music» (TASK-301), as chosen in
 * «Edit video» (TASK-408): its style, the animal running the line, the
 * line's colour, the emoji of the way and of the end. A workout at the gym shares its yellow tile alone
 * (TASK-385 part D): no line to draw, so no results, emoji, video nor
 * Strava. A swim in a pool shares its tile alone too (TASK-400 part C).
 */
export function SharePost({ run, onClose }: Props) {
  return (
    <Modal
      visible
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      {/* Its own edges: from the Feed it opens inside the Pager, whose pages
          have no top edge, and «Close» went under the status bar. */}
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        <SharePage run={run} onClose={onClose} />
      </SafeAreaProvider>
    </Modal>
  );
}

function SharePage({ run, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const window = useWindowDimensions();
  const postWidth = Math.min(
    window.width - 2 * space.lg,
    (window.height * POST_HEIGHT_SHARE) / POST_RATIO,
  );
  const results = useMemo(() => resultsOf(run), [run]);
  // A swim in a pool goes as a workout: its tile alone (TASK-400 part C).
  const pool = isPoolLine(run.activity, run.track);
  const gym = isTrackless(run.activity) || pool;
  const { keepPost } = useActivitiesDoor();
  const kept = run.post ?? null;
  // Every result the run has, on: the runner turns off what they keep. A
  // post shared before opens as it was (TASK-258).
  const [shown, setShown] = useState<PostResult[]>(() =>
    kept === null ? results : results.filter((r) => kept.results.includes(r)),
  );
  const [stickers, setStickers] = useState<Sticker[]>(() =>
    kept === null ? [] : stickersOf(kept.emoji),
  );
  const [sharing, setSharing] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  // The video's music, none when the post opens (TASK-301).
  const [music, setMusic] = useState<Music | null>(null);
  // The video as «Edit video» makes it: «Night», no animal, the yellow
  // line, no emoji of its own when the post opens (TASK-351, TASK-408).
  const [edit, setEdit] = useState<VideoEdit>(FIRST_EDIT);
  const [editing, setEditing] = useState(false);
  // The video being made, with its music, and how much of it is (TASK-295);
  // the map under it, and the post on yellow for when the map does not
  // come (TASK-351).
  const [video, setVideo] = useState<{
    scene: VideoScene;
    fallback: VideoScene;
    music: Music | null;
  } | null>(null);
  const [made, setMade] = useState(0);
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

  /** The post as it is now, to the API with its run; nothing before «Save». */
  function keep() {
    // A workout's post has nothing of a run's to keep (TASK-385 part D).
    if (run.key !== null && !gym) {
      keepPost(run.key, postRequestOf(run, shown, placedOf(stickers)));
    }
  }

  async function share() {
    setProblem(null);
    setSharing(true);
    const outcome = await sharePicture(post);
    setSharing(false);
    setProblem(pictureProblem(outcome));
    if (outcome === "shared") {
      keep();
    }
  }

  /** The post as it is now, as a video: made, then shared (TASK-295). */
  async function exportVideo() {
    setProblem(null);
    if (!(await Sharing.isAvailableAsync())) {
      setProblem(videoProblem("no_sharing"));
      return;
    }
    hearMusic(null);
    setMade(0);
    setVideo({
      scene: videoScene(run, shown, stickers, edit.style, edit),
      fallback: videoScene(run, shown, stickers, "paper", edit),
      music,
    });
  }

  function videoEnded(outcome: VideoOutcome) {
    setVideo(null);
    setProblem(videoProblem(outcome));
    if (outcome === "shared") {
      keep();
    }
  }

  const busy = sharing || video !== null;
  // The video with an edit, for the preview in «Edit video» (part C2c).
  const sceneOf = useCallback(
    (next: VideoEdit) => videoScene(run, shown, stickers, next.style, next),
    [run, shown, stickers],
  );

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Under the screen's content, at the top corner (RunVideo). */}
      {video !== null && (
        <RunVideo
          scene={video.scene}
          fallback={video.fallback}
          music={video.music}
          onProgress={setMade}
          onEnd={videoEnded}
        />
      )}
      <View style={styles.header}>
        <Pressable style={styles.close} onPress={onClose} accessibilityRole="button">
          <Text style={styles.link}>{t("Close")}</Text>
        </Pressable>
        <Text style={styles.title} accessibilityRole="header">
          {t(gym ? "Share" : "Share your run")}
        </Text>
      </View>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + space.xxl },
        ]}
      >
        <View style={styles.center}>
          {pool ? (
            <PoolSharePicture
              ref={post}
              poolKey={run.key}
              drawingId={run.drawingId ?? null}
              durationS={Math.round(run.durationMs / 1000)}
              metres={Math.round(run.distanceM)}
              width={postWidth}
              height={postWidth * POST_RATIO}
            />
          ) : gym ? (
            <GymSharePicture
              ref={post}
              gymKey={run.key}
              durationS={Math.round(run.durationMs / 1000)}
              width={postWidth}
              height={postWidth * POST_RATIO}
            />
          ) : (
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
          )}
        </View>
        {stickers.length > 0 && (
          <Text style={styles.hint}>
            {t("Drag the emoji to move them. Tap one to take it off.")}
          </Text>
        )}

        {!gym && results.length > 0 && (
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

        {!gym && (
          <>
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

            <Pressable
              style={styles.editRow}
              onPress={() => setEditing(true)}
              accessibilityRole="button"
              accessibilityHint={editSummary(edit)}
              testID="edit-video-open"
            >
              <View style={styles.editWords}>
                <Text style={styles.editTitle}>{t("Edit video")}</Text>
                <Text style={styles.hint} numberOfLines={1}>
                  {editSummary(edit)}
                </Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </Pressable>
            <MusicRow music={music} onChange={setMusic} />
          </>
        )}

        <View style={styles.actions}>
          <View style={styles.buttons}>
            <PostButton
              text={sharing ? t("Making the picture…") : "Instagram"}
              onPress={() => void share()}
              busy={busy}
              main
            />
            {!gym && (
              <PostButton
                text={
                  video === null
                    ? t("Export video")
                    : t("Making the video… {percent}%", {
                        percent: Math.round(made * 100),
                      })
                }
                onPress={() => void exportVideo()}
                busy={busy}
              />
            )}
          </View>
          <Text style={styles.hint}>
            {t("Pick Instagram in the list: Story, Feed or Messages.")}
          </Text>
          {problem !== null && (
            <Text style={styles.problem} accessibilityRole="alert">
              {problem}
            </Text>
          )}
          {!gym && <StravaPostRow runKey={run.key} caption={caption} onSent={keep} />}
        </View>
      </ScrollView>
      {!gym && (
        <EditVideoSheet
          visible={editing}
          run={run}
          edit={edit}
          onChange={setEdit}
          onClose={() => setEditing(false)}
          sceneOf={sceneOf}
        />
      )}
    </View>
  );
}

/** What «Edit video» has chosen, in a line: the style, the animal, the
 * emoji of the way and of the end. */
function editSummary(edit: VideoEdit): string {
  const parts = [
    styleName(edit.style),
    edit.character === null ? t("No animal") : characterName(edit.character),
  ];
  const emoji = [edit.along, edit.end].filter((e): e is string => e !== null);
  if (emoji.length > 0) {
    parts.push(emoji.join(" "));
  }
  // The scenes on, in order, once they are not the ones of before (C2).
  const scenes = edit.order.filter((scene) => !edit.off.includes(scene));
  if (
    edit.off.join() !== FIRST_EDIT.off.join() ||
    edit.order.join() !== FIRST_EDIT.order.join()
  ) {
    parts.push(scenes.map(sceneName).join(" › "));
  }
  return parts.join(" · ");
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
  editRow: {
    minHeight: MIN_TAP_SIZE,
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.borderStrong,
  },
  editWords: {
    flex: 1,
    gap: space.xs,
  },
  editTitle: {
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
  chevron: {
    color: color.textMuted,
    fontSize: fontSize.title,
  },
  actions: {
    gap: space.sm,
    paddingTop: space.sm,
  },
  buttons: {
    flexDirection: "row",
    gap: space.sm,
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
