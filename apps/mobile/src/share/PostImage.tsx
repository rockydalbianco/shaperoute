import { forwardRef, useMemo, useRef } from "react";
import { type GestureResponderEvent, StyleSheet, Text, View } from "react-native";

import { dayLabel } from "../activities/activityText";
import { fitLines, type Segment } from "../activities/fitLines";
import { t } from "../i18n";
import { HeartBadge } from "../intro/HeartBadge";
import { bearingOf } from "../map/turnedMap";
import { fontWeight } from "../theme/tokens";
import { FIRST_LOOK, lookColours, type PostLook } from "./postLook";
import {
  POST_RESULTS,
  postLine,
  type PostResult,
  type PostRun,
  resultName,
  resultValue,
} from "./postRun";
import { isTap, type Sticker } from "./stickers";

/** A story's shape on Instagram: 9 wide, 16 tall. */
export const POST_RATIO = 16 / 9;

/** Where the drawing sits, as shares of the post's height: between the
 * title and the numbers. */
const DRAWING_TOP = 0.2;
const DRAWING_BOTTOM = 0.7;
/** Where the title and the day under it begin, as a share of the post's
 * height: under the logo, and with two lines of title still over the
 * drawing. */
const HEADING_TOP = 0.085;
/** Every size of the post is a share of its width: the picture made from it
 * looks the same on any phone. */
const SIDE = 0.08;
const LINE = 0.02;
const BADGE = 0.09;
const NAME = 0.05;
const TITLE = 0.065;
const DAY = 0.035;
/** A line of the title and of the day, as a multiple of its size: fixed, so
 * two lines of title and the day end over the drawing on any phone. */
const LINE_HEIGHT = 1.2;
const LABEL = 0.035;
const VALUE = 0.075;
const EMOJI = 0.11;

type Props = {
  run: PostRun;
  /** The results on, in any order: the post keeps its own. */
  shown: readonly PostResult[];
  stickers: readonly Sticker[];
  /** Its ground and colours (TASK-450); the logo's yellow when not given. */
  look?: PostLook;
  /** The post's width in points; its height follows (POST_RATIO). */
  width: number;
  onMoveSticker: (id: number, x: number, y: number) => void;
  onRemoveSticker: (id: number) => void;
};

/**
 * The post as it is shared (TASK-231): on the yellow of Sgrava, the logo,
 * the title, the day of the run under it (TASK-450), the drawing the run
 * made in black, the results chosen and the emoji where the runner dragged
 * them. On «Night» and «Day» the ground and the colours are the look's
 * (postLook). The whole track is drawn, start and
 * end too (ADR-0330). A run along a turned route is drawn turned back, so the
 * drawing reads upright (TASK-232). The ref is the View the picture is
 * made of.
 */
export const PostImage = forwardRef<View, Props>(function PostImage(
  { run, shown, stickers, look = FIRST_LOOK, width, onMoveSticker, onRemoveSticker },
  ref,
) {
  const colours = lookColours(look);
  const ink = { color: colours.ink };
  // "" for a run that does not know its day: no line then.
  const day = run.startedAt === undefined ? "" : dayLabel(run.startedAt);
  const height = width * POST_RATIO;
  const boxWidth = width * (1 - 2 * SIDE);
  const boxHeight = height * (DRAWING_BOTTOM - DRAWING_TOP);
  const line = width * LINE;
  const bearing = bearingOf(run.rotationDeg);
  const [segments] = useMemo(
    () => fitLines([postLine(run.track)], boxWidth, boxHeight, line, bearing),
    [run.track, boxWidth, boxHeight, line, bearing],
  );
  const results = POST_RESULTS.filter(
    (result) => shown.includes(result) && resultValue(run, result) !== null,
  );

  return (
    <View
      ref={ref}
      // Android draws a View it can fold away into its parent: the picture
      // would come out empty.
      collapsable={false}
      style={[styles.post, { width, height, backgroundColor: colours.ground }]}
      testID="post-image"
    >
      <View
        style={[styles.brand, { top: width * SIDE * 0.6, left: width * SIDE * 0.6 }]}
      >
        <HeartBadge size={width * BADGE} />
        <Text style={[styles.name, ink, { fontSize: width * NAME }]}>MuW</Text>
      </View>
      <View
        style={[
          styles.heading,
          { top: height * HEADING_TOP, left: width * SIDE, right: width * SIDE },
        ]}
        testID="post-heading"
      >
        {run.title !== null && (
          <Text
            style={[
              styles.title,
              ink,
              { fontSize: width * TITLE, lineHeight: width * TITLE * LINE_HEIGHT },
            ]}
            numberOfLines={2}
          >
            {run.title}
          </Text>
        )}
        {day !== "" && (
          <Text
            style={[
              styles.day,
              ink,
              { fontSize: width * DAY, lineHeight: width * DAY * LINE_HEIGHT },
            ]}
            numberOfLines={1}
            testID="post-day"
          >
            {day}
          </Text>
        )}
      </View>
      <View
        style={[
          styles.drawing,
          { top: height * DRAWING_TOP, left: width * SIDE },
          { width: boxWidth, height: boxHeight },
        ]}
        accessible={false}
      >
        {segments.map((s, i) => (
          <View
            key={i}
            testID="post-drawing"
            style={[
              styles.line,
              placed(s, line),
              { borderRadius: line / 2, backgroundColor: colours.line },
            ]}
          />
        ))}
      </View>
      <View
        style={[
          styles.results,
          { left: width * SIDE, right: width * SIDE, bottom: height * 0.04 },
        ]}
      >
        {results.map((result) => (
          <View key={result} style={styles.result}>
            <Text style={[styles.label, ink, { fontSize: width * LABEL }]}>
              {resultName(result)}
            </Text>
            <Text style={[styles.value, ink, { fontSize: width * VALUE }]}>
              {resultValue(run, result)}
            </Text>
          </View>
        ))}
      </View>
      {stickers.map((sticker) => (
        <StickerView
          key={sticker.id}
          sticker={sticker}
          width={width}
          height={height}
          onMove={onMoveSticker}
          onRemove={onRemoveSticker}
        />
      ))}
    </View>
  );
});

function placed(s: Segment, thickness: number) {
  return {
    left: s.left,
    top: s.top - thickness / 2,
    width: s.length + thickness / 2,
    height: thickness,
    transform: [{ rotate: `${s.angle}deg` }],
  };
}

type StickerProps = {
  sticker: Sticker;
  width: number;
  height: number;
  onMove: (id: number, x: number, y: number) => void;
  onRemove: (id: number) => void;
};

/** One emoji on the post: dragged, it moves; tapped, it goes. */
function StickerView({ sticker, width, height, onMove, onRemove }: StickerProps) {
  const size = width * EMOJI;
  // Where the finger went down, on the screen, and the emoji then.
  const from = useRef({ pageX: 0, pageY: 0, x: sticker.x, y: sticker.y });
  const moved = (event: GestureResponderEvent) => ({
    dx: event.nativeEvent.pageX - from.current.pageX,
    dy: event.nativeEvent.pageY - from.current.pageY,
  });
  return (
    <View
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      // A drag on the emoji is the emoji's, not the page's under it.
      onResponderTerminationRequest={() => false}
      onResponderGrant={(event) => {
        const { pageX, pageY } = event.nativeEvent;
        from.current = { pageX, pageY, x: sticker.x, y: sticker.y };
      }}
      onResponderMove={(event) => {
        const { dx, dy } = moved(event);
        onMove(sticker.id, from.current.x + dx / width, from.current.y + dy / height);
      }}
      onResponderRelease={(event) => {
        const { dx, dy } = moved(event);
        if (isTap(dx, dy)) {
          onRemove(sticker.id);
        }
      }}
      style={[
        styles.sticker,
        {
          left: sticker.x * width - size * 0.7,
          top: sticker.y * height - size * 0.7,
          width: size * 1.4,
          height: size * 1.4,
        },
      ]}
      accessible
      accessibilityRole="button"
      accessibilityLabel={sticker.emoji}
      accessibilityHint={t("Drag it to move it. Tap it to take it off.")}
      // VoiceOver cannot drag: its double tap takes the emoji off.
      accessibilityActions={[{ name: "activate" }]}
      onAccessibilityAction={(event) => {
        if (event.nativeEvent.actionName === "activate") {
          onRemove(sticker.id);
        }
      }}
      testID="post-sticker"
    >
      <Text style={{ fontSize: size }}>{sticker.emoji}</Text>
    </View>
  );
}

// The post is a picture of Sgrava, the same in any theme: its ground and
// its colours are its look's (postLook), the logo's yellow and black first
// (ADR-0129).
const styles = StyleSheet.create({
  post: {
    overflow: "hidden",
  },
  brand: {
    position: "absolute",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  name: {
    fontWeight: fontWeight.bold,
  },
  heading: {
    position: "absolute",
    alignItems: "center",
  },
  title: {
    fontWeight: fontWeight.bold,
    textAlign: "center",
  },
  day: {
    fontWeight: fontWeight.medium,
    textAlign: "center",
  },
  drawing: {
    position: "absolute",
  },
  line: {
    position: "absolute",
  },
  results: {
    position: "absolute",
    flexDirection: "row",
    flexWrap: "wrap",
    rowGap: 8,
  },
  result: {
    width: "50%",
  },
  label: {
    fontWeight: fontWeight.medium,
  },
  value: {
    fontWeight: fontWeight.bold,
  },
  sticker: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
});
