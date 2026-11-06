import type { Shape } from "@shaperoute/shared-types";
import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

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
import { normalDeg, TURN_STEP_DEG, turnOf } from "./turn";
import type { CanvasProblem, PiecesState } from "./useMapCanvas";

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
/** With «Move» on two pieces or more (TASK-402 part B). */
const AMONG_PIECES = tLater(
  "Tap a piece to choose it, then drag, resize or turn it. Tap outside to take them all.",
);

/** What a tile does on a figure (TASK-402 part B): change the piece chosen,
 * or the first, or add a piece. */
const TILE_MODES = [
  { value: "change", label: tLater("Change@@piece") },
  { value: "add", label: tLater("Add") },
] as const;

const PROBLEMS: Record<CanvasProblem, string> = {
  too_much: tLater(
    "That is too much for one route. Undo something, or draw simpler lines.",
  ),
  crosses: tLater("The outline cannot cross itself. Bend it less."),
  too_many: tLater("Up to 6 pieces in one drawing."),
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
  problem: CanvasProblem | null;
  /** «Draw route»: on with a figure. */
  onDraw: (() => void) | null;
  /** The figure turned to so many degrees (TASK-402): with «Move», «−15°»,
   * «+15°» and the angle typed. None leaves them out. */
  onTurn?: (deg: number) => void;
  /** The pieces of the figure (TASK-402 part B): «Change | Add» over the
   * tiles, the piece chosen and «Delete piece». None leaves them out. */
  pieces?: PiecesState;
};

/**
 * Under the map of «Draw on the map» (TASK-281): «Draw | Line | Erase |
 * Move» (TASK-331), «Undo», «Redo» and «Clear all» (TASK-331 part B), what
 * the fingers do, a row of tiles that put a figure on the map or change it
 * where it is («+ photo» first, then the shapes of the catalogue and the
 * ready-made pictures of «Draw»), the distance the figure would make, and
 * «Draw route». With «Move», the figure's angle between «−15°» and «+15°»
 * (TASK-402). On a figure, «Change | Add» over the tiles, and with a piece
 * chosen «Delete piece» after its angle (TASK-402 part B).
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
  pieces,
}: Props) {
  // What the angle and the tiles are of: the piece chosen, or the figure.
  const chosen = pieces?.chosen ?? null;
  const target = chosen ?? placed;
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
      {mode === "move" && target !== null && onTurn !== undefined ? (
        <Turn
          deg={turnOf(target)}
          onTurn={onTurn}
          onDelete={chosen === null ? null : pieces?.deleteChosen}
        />
      ) : null}
      <Note
        mode={mode}
        // A line joins a drawing or a photo; on a shape it is a new drawing.
        onFigure={placed !== null && placed.figure.kind !== "shape"}
        amongPieces={(pieces?.count ?? 0) > 1}
        photo={photo}
        problem={problem}
      />
      {pieces !== undefined && placed !== null ? (
        <Segmented
          options={TILE_MODES.map((option) => ({ ...option, label: t(option.label) }))}
          value={pieces.adding ? "add" : "change"}
          onChange={(value) => pieces.setAdding(value === "add")}
        />
      ) : null}
      <FigureTiles
        // Adding, no tile is the figure's.
        chosen={placedTile(pieces?.adding === true ? null : target)}
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
 * it, in a box over the keyboard, empty with the angle as a hint; «Done» or
 * a tap around it turns the figure to it. With a piece chosen, «Delete
 * piece» after them (TASK-402 part B). */
function Turn({
  deg,
  onTurn,
  onDelete,
}: {
  deg: number;
  onTurn: (deg: number) => void;
  onDelete?: (() => void) | null;
}) {
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
      <Pressable
        style={styles.angle}
        onPress={() => setTyping("")}
        accessibilityRole="button"
        accessibilityLabel={t("Angle, {deg} degrees. Double tap to type it", { deg })}
        testID="turn-angle"
      >
        <Text style={styles.angleText}>{degreesLabel(deg)}</Text>
      </Pressable>
      <Modal
        transparent
        visible={typing !== null}
        animationType="fade"
        onRequestClose={done}
      >
        <KeyboardAvoidingView
          style={styles.typingRoom}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={done}
            accessible={false}
          />
          <View style={styles.typingBox}>
            <TextInput
              style={styles.typed}
              value={typing ?? ""}
              onChangeText={setTyping}
              onSubmitEditing={done}
              placeholder={degreesLabel(deg).slice(0, -1)}
              placeholderTextColor={color.textMuted}
              keyboardType="numbers-and-punctuation"
              returnKeyType="done"
              autoFocus
              testID="turn-typed"
            />
            <Text style={styles.degree}>°</Text>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      <Pressable
        style={styles.step}
        onPress={() => onTurn(deg + TURN_STEP_DEG)}
        accessibilityRole="button"
        accessibilityLabel={t("Turn right 15 degrees")}
        testID="turn-right"
      >
        <Text style={styles.stepText}>+{degreesLabel(TURN_STEP_DEG)}</Text>
      </Pressable>
      {onDelete ? <Step label={t("Delete piece")} onPress={onDelete} enabled /> : null}
    </View>
  );
}

/** One line: why the last line, tool or photo gave nothing, the photo
 * being traced, or what the fingers do; with «Draw» on a figure, that a
 * line joins it. */
function Note({
  mode,
  onFigure,
  amongPieces,
  photo,
  problem,
}: {
  mode: CanvasMode;
  onFigure: boolean;
  amongPieces: boolean;
  photo: ImageState;
  problem: CanvasProblem | null;
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
  const hint =
    mode === "draw" && onFigure
      ? ON_FIGURE
      : mode === "move" && amongPieces
        ? AMONG_PIECES
        : HINTS[mode];
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
  typingRoom: {
    flex: 1,
    justifyContent: "flex-end",
    alignItems: "center",
  },
  degree: {
    color: color.text,
    fontSize: fontSize.input,
    fontWeight: fontWeight.bold,
  },
  typingBox: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: space.lg,
    paddingHorizontal: space.xl,
    minHeight: MIN_TAP_SIZE,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.borderStrong,
    backgroundColor: color.surfaceRaised,
  },
  typed: {
    minWidth: 64,
    color: color.text,
    fontSize: fontSize.input,
    fontWeight: fontWeight.bold,
    textAlign: "right",
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
