import type { Shape } from "@shaperoute/shared-types";
import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { t, tLater } from "../i18n";
import type { CanvasMode } from "../map/messages";
import { imageProblemText } from "../route/problems";
import { DrawButton } from "../route/RoutePanel";
import type { SamplePicture } from "../route/samplePictures";
import type { ImageState } from "../route/useImageOutline";
import { Segmented } from "../screens/Segmented";
import {
  color,
  fontSize,
  fontWeight,
  MIN_TAP_SIZE,
  radius,
  space,
} from "../theme/tokens";
import { distanceLabel } from "../units/format";
import type { Placed } from "./figure";
import { FigureTiles } from "./FigureTiles";
import { placedTile } from "./resultFigure";
import type { ToolProblem } from "./tools";
import { normalDeg, TURN_STEP_DEG, turnOf } from "./turn";

// Translated where shown, with t().
const MODES = [
  { value: "draw", label: tLater("Draw") },
  { value: "line", label: tLater("Line") },
  { value: "erase", label: tLater("Erase") },
  { value: "move", label: tLater("Move") },
] as const;

/** What the fingers do, said under the switch: with «Draw», a first line
 * stays open unless it ends where it started, and the lines after it join
 * a drawing or a photo (TASK-331); the tools of TASK-331 part B. */
const HINTS: Record<CanvasMode, string> = {
  draw: tLater(
    "Draw with one finger. End where you started to close it. Two fingers move the map.",
  ),
  line: tLater(
    "Tap point after point. Tap the first point to close it, the last one to finish.",
  ),
  erase: tLater(
    "Rub a line to erase that piece. A piece cut off joins the drawing with a dash.",
  ),
  move: tLater(
    "Drag the figure or the map. Hold a line still, then drag to bend it. Two fingers resize and turn it.",
  ),
};
const ON_FIGURE = tLater("Each new line joins the drawing. Two fingers move the map.");

const PROBLEMS: Record<ToolProblem, string> = {
  too_much: tLater(
    "That is too much for one route. Undo something, or draw simpler lines.",
  ),
  crosses: tLater("The outline cannot cross itself. Bend it less."),
};

type Props = {
  mode: CanvasMode;
  onMode: (mode: CanvasMode) => void;
  placed: Placed | null;
  onPick: (shape: Shape) => void;
  /** A ready-made picture of «Draw» (TASK-280). */
  onSample: (sample: SamplePicture) => void;
  photo: ImageState;
  onPhoto: () => void;
  onUndo: () => void;
  canUndo: boolean;
  onRedo: () => void;
  canRedo: boolean;
  /** «Clear all»: asked first; on with a figure. */
  onClear: () => void;
  /** What the figure would make, in metres; none without a figure. */
  distanceM: number | null;
  problem: ToolProblem | null;
  /** «Draw route»: on with a figure. */
  onDraw: (() => void) | null;
  /** The figure turned to so many degrees (TASK-402): with «Move», «−15°»,
   * «+15°» and the angle typed. None leaves them out. */
  onTurn?: (deg: number) => void;
};

/**
 * Under the map of «Draw on the map» (TASK-281): «Draw | Line | Erase |
 * Move» (TASK-331), «Undo», «Redo» and «Clear all» (TASK-331 part B), what
 * the fingers do, a row of tiles that put a figure on the map or change it
 * where it is («+ photo» first, then the shapes of the catalogue and the
 * ready-made pictures of «Draw»), the distance the figure would make, and
 * «Draw route». With «Move», the figure's angle between «−15°» and «+15°»
 * (TASK-402).
 */
export function DrawOnMap({
  mode,
  onMode,
  placed,
  onPick,
  onSample,
  photo,
  onPhoto,
  onUndo,
  canUndo,
  onRedo,
  canRedo,
  onClear,
  distanceM,
  problem,
  onDraw,
  onTurn,
}: Props) {
  const askClear = () =>
    Alert.alert(t("Clear the whole drawing?"), undefined, [
      { text: t("Cancel"), style: "cancel" },
      { text: t("Clear all"), style: "destructive", onPress: onClear },
    ]);
  return (
    <View style={styles.panel}>
      <Segmented
        options={MODES.map((option) => ({ ...option, label: t(option.label) }))}
        value={mode}
        onChange={onMode}
      />
      <View style={styles.top}>
        <Step label={t("Undo")} onPress={onUndo} enabled={canUndo} />
        <Step label={t("Redo")} onPress={onRedo} enabled={canRedo} />
        <View style={styles.gap} />
        <Step label={t("Clear all")} onPress={askClear} enabled={placed !== null} />
      </View>
      {mode === "move" && placed !== null && onTurn !== undefined ? (
        <Turn deg={turnOf(placed)} onTurn={onTurn} />
      ) : null}
      <Note
        mode={mode}
        // A line joins a drawing or a photo; on a shape it is a new drawing.
        onFigure={placed !== null && placed.figure.kind !== "shape"}
        photo={photo}
        problem={problem}
      />
      <FigureTiles
        chosen={placedTile(placed)}
        onChoose={(choice) => {
          if (choice.kind === "shape") {
            onPick(choice.shape);
          } else {
            onSample(choice.sample);
          }
        }}
        onPhoto={onPhoto}
        photoBusy={photo.status === "tracing"}
        testID="map-tiles"
      />
      <View style={styles.foot}>
        <Text style={styles.distance} testID="map-distance">
          {distanceM === null ? " " : `≈ ${distanceLabel(distanceM)}`}
        </Text>
        <View style={styles.draw}>
          <DrawButton enabled={onDraw !== null} onDraw={() => onDraw?.()} />
        </View>
      </View>
    </View>
  );
}

/** «Undo», «Redo» or «Clear all»: a pill, faint while it would do nothing. */
function Step({
  label,
  onPress,
  enabled,
}: {
  label: string;
  onPress: () => void;
  enabled: boolean;
}) {
  return (
    <Pressable
      style={[styles.step, !enabled && styles.off]}
      onPress={onPress}
      disabled={!enabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: !enabled }}
    >
      <Text style={styles.stepText}>{label}</Text>
    </Pressable>
  );
}

/** An angle as shown: «30°», «−15°», with a true minus. */
export function degreesLabel(deg: number): string {
  return `${deg < 0 ? "\u2212" : ""}${Math.abs(deg)}°`;
}

/** The degrees typed, «−30», «30°» or «-30,5», as a whole angle within
 * (−180°, 180°]; null for anything else. */
export function typedDegrees(text: string): number | null {
  const plain = text.replace("\u2212", "-").replace(",", ".").replace("°", "").trim();
  const deg = plain === "" ? NaN : Number(plain);
  return Number.isFinite(deg) ? normalDeg(deg) : null;
}

/** «−15°», the figure's angle, «+15°» (TASK-402): a tap on the angle types
 * it. */
function Turn({ deg, onTurn }: { deg: number; onTurn: (deg: number) => void }) {
  const [typing, setTyping] = useState<string | null>(null);
  const done = () => {
    const typed = typing === null ? null : typedDegrees(typing);
    setTyping(null);
    if (typed !== null) {
      onTurn(typed);
    }
  };
  return (
    <View style={styles.turn}>
      <Pressable
        style={styles.step}
        onPress={() => onTurn(deg - TURN_STEP_DEG)}
        accessibilityRole="button"
        accessibilityLabel={t("Turn left 15 degrees")}
        testID="turn-left"
      >
        <Text style={styles.stepText}>{degreesLabel(-TURN_STEP_DEG)}</Text>
      </Pressable>
      {typing === null ? (
        <Pressable
          style={styles.angle}
          onPress={() => setTyping(String(deg))}
          accessibilityRole="button"
          accessibilityLabel={t("Angle, {deg} degrees. Double tap to type it", { deg })}
          testID="turn-angle"
        >
          <Text style={styles.angleText}>{degreesLabel(deg)}</Text>
        </Pressable>
      ) : (
        <TextInput
          style={[styles.angle, styles.angleText]}
          value={typing}
          onChangeText={setTyping}
          onSubmitEditing={done}
          onBlur={done}
          keyboardType="numbers-and-punctuation"
          returnKeyType="done"
          autoFocus
          selectTextOnFocus
          testID="turn-typed"
        />
      )}
      <Pressable
        style={styles.step}
        onPress={() => onTurn(deg + TURN_STEP_DEG)}
        accessibilityRole="button"
        accessibilityLabel={t("Turn right 15 degrees")}
        testID="turn-right"
      >
        <Text style={styles.stepText}>+{degreesLabel(TURN_STEP_DEG)}</Text>
      </Pressable>
    </View>
  );
}

/** One line: why the last line, tool or photo gave nothing, the photo
 * being traced, or what the fingers do; with «Draw» on a figure, that a
 * line joins it. */
function Note({
  mode,
  onFigure,
  photo,
  problem,
}: {
  mode: CanvasMode;
  onFigure: boolean;
  photo: ImageState;
  problem: ToolProblem | null;
}) {
  if (problem !== null) {
    return <Text style={styles.problem}>{t(PROBLEMS[problem])}</Text>;
  }
  if (photo.status === "tracing") {
    return <Text style={styles.note}>{t("Tracing the outline…")}</Text>;
  }
  const refused =
    photo.status === "failed"
      ? photo.problem
      : photo.status === "traced"
        ? (photo.problem ?? null)
        : null;
  if (refused !== null) {
    return <Text style={styles.problem}>{imageProblemText(refused).text}</Text>;
  }
  const hint = mode === "draw" && onFigure ? ON_FIGURE : HINTS[mode];
  return <Text style={styles.note}>{t(hint)}</Text>;
}

/** Two lines of the note, kept whatever it says: the modes do not move the
 * tiles up and down. */
const NOTE_HEIGHT = Math.ceil(fontSize.small * 1.35) * 2;

const styles = StyleSheet.create({
  panel: {
    gap: space.sm,
  },
  top: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
  },
  gap: {
    flex: 1,
  },
  turn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: space.sm,
  },
  angle: {
    minWidth: 88,
    minHeight: MIN_TAP_SIZE,
    justifyContent: "center",
    paddingHorizontal: space.md,
  },
  angleText: {
    color: color.text,
    fontSize: fontSize.input,
    fontWeight: fontWeight.bold,
    textAlign: "center",
  },
  step: {
    minHeight: MIN_TAP_SIZE,
    justifyContent: "center",
    paddingHorizontal: space.lg,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.borderStrong,
    backgroundColor: color.surfaceRaised,
  },
  stepText: {
    color: color.text,
    fontWeight: fontWeight.bold,
  },
  off: {
    opacity: 0.4,
  },
  note: {
    minHeight: NOTE_HEIGHT,
    color: color.textMuted,
    fontSize: fontSize.small,
  },
  problem: {
    minHeight: NOTE_HEIGHT,
    color: color.error,
    fontSize: fontSize.small,
  },
  foot: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
  },
  distance: {
    minWidth: 88,
    color: color.text,
    fontSize: fontSize.input,
    fontWeight: fontWeight.bold,
  },
  draw: {
    flex: 1,
  },
});
