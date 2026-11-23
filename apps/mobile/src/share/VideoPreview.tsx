import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { WebView } from "react-native-webview";

import { t } from "../i18n";
import { color, fontSize, radius, space } from "../theme/tokens";
import { pageMessageOf } from "./videoFile";
import { useMyImageStamp } from "./myImage";
import { prepareActorCall } from "./videoActor";
import { MAP_HEIGHT, MAP_WIDTH } from "./videoMap";
import {
  pauseCall,
  playCall,
  prepareMapCall,
  resumeCall,
  VIDEO_PAGE,
  VIDEO_PAGE_BASE,
} from "./videoPage";
import type { VideoEdit } from "./videoEdit";
import type { VideoScene } from "./videoScene";

type Props = {
  /** What «Edit video» chose now. */
  edit: VideoEdit;
  /** The video of the post with `edit`. */
  sceneOf: (edit: VideoEdit) => VideoScene;
};

/** How long after the last choice the preview takes it, in milliseconds. */
export const PREVIEW_DELAY_MS = 500;
/** The preview's width, in points: the page is drawn at the size of its
 * map and shown this much smaller. */
export const PREVIEW_WIDTH = 150;
const SCALE = PREVIEW_WIDTH / MAP_WIDTH;

/** «0:06 / 0:12». */
function clock(seconds: number): string {
  const whole = Math.floor(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

/**
 * The preview at the top of «Edit video» (TASK-408, ADR-0339, part C2c;
 * the user's choice 13): the video itself, small, round and round, with
 * no music, made by the same page as the video, in play mode, so the map,
 * the animal and the camera are as the video will have them. It takes a
 * choice half a second after it is made; a new style or animal loads the
 * page again, as the map or the model changes. A tap holds the picture or
 * goes on; under it, a thin bar and the second shown. On the map looks it
 * starts once the map is ready (on «3D» it can take some seconds), the
 * page's ground still until then; without the map, it plays all the same.
 */
export function VideoPreview({ edit, sceneOf }: Props) {
  const [shown, setShown] = useState(() => sceneOf(edit));
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const timer = setTimeout(() => setShown(sceneOf(edit)), PREVIEW_DELAY_MS);
    return () => clearTimeout(timer);
  }, [edit, sceneOf]);
  const sceneJson = useMemo(() => JSON.stringify(shown), [shown]);
  // A page for each map and animal: the page prepares them once.
  const mapJson = useMemo(
    () => (shown.map === null ? null : JSON.stringify(shown.map)),
    [shown.map],
  );
  // A new image of the runner's own (TASK-417) is a new page too.
  const image = useMyImageStamp();
  const actorKey =
    shown.character === "my_image" ? `my_image:${image}` : (shown.character ?? "none");
  const pageKey = `${mapJson ?? "none"}|${actorKey}`;
  return (
    <PreviewPage
      key={pageKey}
      sceneJson={sceneJson}
      mapJson={mapJson}
      character={shown.character}
      seconds={shown.frames.length / shown.fps}
    />
  );
}

type PageProps = {
  sceneJson: string;
  mapJson: string | null;
  character: VideoScene["character"];
  seconds: number;
};

function PreviewPage({ sceneJson, mapJson, character, seconds }: PageProps) {
  const webView = useRef<WebView>(null);
  // Playing: once the map is there, or at once with no map to wait for.
  const playing = useRef(false);
  const [paused, setPaused] = useState(false);
  const [at, setAt] = useState(0);

  // A new scene for the same page: played at once, at the same second.
  useEffect(() => {
    if (playing.current) {
      webView.current?.injectJavaScript(playCall(sceneJson));
    }
  }, [sceneJson]);

  function play() {
    playing.current = true;
    webView.current?.injectJavaScript(playCall(sceneJson));
  }

  function start() {
    // The map first: the preview starts once it is there (or could not
    // come), the page's ground under nothing until then.
    if (mapJson !== null) {
      webView.current?.injectJavaScript(prepareMapCall(mapJson));
    } else {
      play();
    }
    if (character !== null) {
      // The animal comes in when its model is read, the runner's image when
      // it is read; without them, the tip.
      void prepareActorCall(character).then((call) => {
        if (call !== null) {
          webView.current?.injectJavaScript(call);
        }
      });
    }
  }

  function receive(data: string) {
    const message = pageMessageOf(data);
    if (message?.type === "ready") {
      start();
    } else if (message?.type === "map" && !playing.current) {
      play();
    } else if (message?.type === "time") {
      setAt(message.seconds);
    }
  }

  function toggle() {
    webView.current?.injectJavaScript(paused ? resumeCall() : pauseCall());
    setPaused(!paused);
  }

  return (
    <View style={styles.block}>
      <Pressable
        style={styles.frame}
        onPress={toggle}
        accessibilityRole="button"
        accessibilityLabel={t("Video preview")}
        accessibilityHint={paused ? t("Resume") : t("Pause")}
        testID="video-preview"
      >
        <View style={styles.scaled} pointerEvents="none">
          <WebView
            ref={webView}
            testID="video-preview-page"
            containerStyle={styles.page}
            style={styles.page}
            source={{ html: VIDEO_PAGE, baseUrl: VIDEO_PAGE_BASE }}
            originWhitelist={["*"]}
            javaScriptEnabled
            scrollEnabled={false}
            onMessage={(event) => receive(event.nativeEvent.data)}
          />
        </View>
      </Pressable>
      <View style={styles.bar}>
        <View
          style={[styles.done, { width: `${Math.min(100, (at / seconds) * 100)}%` }]}
        />
      </View>
      <Text style={styles.time}>
        {clock(at)} / {clock(seconds)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    alignSelf: "center",
    width: PREVIEW_WIDTH,
    gap: space.xs,
  },
  frame: {
    width: PREVIEW_WIDTH,
    height: MAP_HEIGHT * SCALE,
    overflow: "hidden",
    borderRadius: radius.md,
    backgroundColor: color.background,
  },
  // The page at the size of its map, shown smaller about its corner.
  scaled: {
    width: MAP_WIDTH,
    height: MAP_HEIGHT,
    transform: [
      { translateX: (-MAP_WIDTH * (1 - SCALE)) / 2 },
      { translateY: (-MAP_HEIGHT * (1 - SCALE)) / 2 },
      { scale: SCALE },
    ],
  },
  page: {
    width: MAP_WIDTH,
    height: MAP_HEIGHT,
    backgroundColor: color.background,
  },
  bar: {
    height: 3,
    borderRadius: 2,
    backgroundColor: color.border,
    overflow: "hidden",
  },
  done: {
    height: 3,
    backgroundColor: color.text,
  },
  time: {
    alignSelf: "center",
    color: color.textMuted,
    fontSize: fontSize.small,
    fontVariant: ["tabular-nums"],
  },
});
