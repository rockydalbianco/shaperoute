import { MAX_SHAPE_TEXT_LENGTH, type Shape, SHAPES } from "@shaperoute/shared-types";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import {
  color,
  fontSize,
  fontWeight,
  MIN_TAP_SIZE,
  radius,
  space,
} from "../theme/tokens";
import { Segmented } from "../screens/Segmented";
import { LONG_DISTANCE_KM, MAX_APP_DISTANCE_KM, MIN_DISTANCE_KM } from "./distance";
import { DistanceStepper } from "./DistanceStepper";
import { LoadingBar, ReadingBar } from "./LoadingBar";
import { problemText } from "./problems";
import { ShapeTiles } from "./ShapeTiles";
import { shapeList } from "./shapeWords";
import type { ExportState } from "./useGpxExport";
import type { RouteProblem, RouteState } from "./useRouteRequest";
import type { ShapeReadingState } from "./useShapeReading";
import { type Note, toNotes } from "./warnings";
import {
  type DrawKind,
  MAX_WORD_FIELD_LENGTH,
  routeName,
  type WordCheck,
  wordDistanceM,
} from "./wordInput";

const DRAW_KINDS = [
  { value: "shape", label: "Shape" },
  { value: "word", label: "Word" },
] as const;

type ChoiceProps = {
  /** A shape or a word: one of the two, and the switch shows which. */
  kind: DrawKind;
  onKind: (kind: DrawKind) => void;
  /** The shape field as typed, and the shape it names (null: none). */
  shapeText: string;
  shape: Shape | null;
  onShapeText: (text: string) => void;
  /** The AI's reading of words the table does not know; null otherwise. */
  reading: ShapeReadingState | null;
  /** The user is done typing the shape: the AI may read it. */
  onShapeDone: () => void;
  /** The word field as typed, and whether it can be sent (wordInput.ts). */
  wordText: string;
  onWordText: (text: string) => void;
  wordCheck: WordCheck;
  /** The km field as typed, and what it means in metres (null: not valid). */
  distanceText: string;
  distanceM: number | null;
  onDistanceText: (text: string) => void;
};

/**
 * What to draw (TASK-051): the shapes as tiles and a field for any other word,
 * or a word written letter by letter (TASK-057); then the distance. "Draw
 * route" sits apart, at the foot of the screen.
 */
export function RouteChoice({
  kind,
  onKind,
  shapeText,
  shape,
  onShapeText,
  reading,
  onShapeDone,
  wordText,
  onWordText,
  wordCheck,
  distanceText,
  distanceM,
  onDistanceText,
}: ChoiceProps) {
  return (
    <View style={styles.panel}>
      <Text style={styles.label}>DRAW</Text>
      <Segmented
        options={DRAW_KINDS}
        value={kind}
        onChange={onKind}
        style={styles.kinds}
      />
      {kind === "shape" ? (
        <>
          <ShapeTiles chosen={shape} onPick={onShapeText} />
          <TextInput
            style={styles.field}
            value={shapeText}
            onChangeText={onShapeText}
            onEndEditing={onShapeDone}
            maxLength={MAX_SHAPE_TEXT_LENGTH}
            placeholder="heart, star, horse…"
            placeholderTextColor={color.textFaint}
            keyboardAppearance="dark"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="done"
            selectTextOnFocus
            accessibilityLabel="Shape"
          />
          <ShapeNote text={shapeText} shape={shape} reading={reading} />
        </>
      ) : (
        <>
          <TextInput
            style={[styles.field, styles.wordField]}
            value={wordText}
            onChangeText={onWordText}
            maxLength={MAX_WORD_FIELD_LENGTH}
            placeholder="CIAO"
            placeholderTextColor={color.textFaint}
            keyboardAppearance="dark"
            autoCapitalize="characters"
            autoCorrect={false}
            spellCheck={false}
            autoComplete="off"
            returnKeyType="done"
            accessibilityLabel="Word"
          />
          <WordNote
            text={wordText}
            check={wordCheck}
            onDistance={(metres) => onDistanceText(String(metres / 1000))}
          />
        </>
      )}
      <Text style={[styles.label, styles.section]}>DISTANCE</Text>
      <DistanceStepper text={distanceText} onText={onDistanceText} editable />
      {distanceM === null ? (
        <Text style={styles.problem}>
          {`Enter a distance between ${MIN_DISTANCE_KM} and ${MAX_APP_DISTANCE_KM} km.`}
        </Text>
      ) : (
        distanceM > LONG_DISTANCE_KM * 1000 && (
          <Text style={styles.note}>Long routes take longer: up to a few minutes.</Text>
        )
      )}
    </View>
  );
}

/** The one yellow control: it makes the route, and the route is yellow. */
export function DrawButton({
  enabled,
  onDraw,
}: {
  enabled: boolean;
  onDraw: () => void;
}) {
  return (
    <Pressable
      style={[styles.draw, !enabled && styles.off]}
      onPress={onDraw}
      disabled={!enabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: !enabled }}
    >
      <Text style={styles.drawText}>Draw route</Text>
    </Pressable>
  );
}

type OutcomeProps = {
  /** The state of the request for the current start, shape and distance. */
  view: RouteState;
  onCancel: () => void;
  /** The GPX export of the route on screen. */
  exporting: ExportState;
  onExport: () => void;
  /** Ways out of a dead end (TASK-031): draw again at a distance the shape
   * fits, or choose a shape of the catalogue. */
  onTryDistance: (distanceM: number) => void;
  onPickShape: (shape: Shape) => void;
  /** Turn-by-turn along the route on screen (TASK-049). */
  onStart: () => void;
};

/** Under the map: the wait, the route, or why there is none. */
export function RouteOutcome({
  view,
  onCancel,
  exporting,
  onExport,
  onTryDistance,
  onPickShape,
  onStart,
}: OutcomeProps) {
  switch (view.status) {
    case "waiting":
      return (
        <View style={styles.panel}>
          <View style={styles.row}>
            <Text style={styles.waiting}>{waitingText(view)}</Text>
            <Pressable
              style={styles.secondary}
              onPress={onCancel}
              accessibilityRole="button"
            >
              <Text style={styles.secondaryText}>Cancel</Text>
            </Pressable>
          </View>
          {/* A bar, not the seconds: an estimate from the phase (ADR-0050). */}
          <LoadingBar
            phase={view.phase}
            distanceM={view.request.distance_m}
            word={view.request.word}
          />
        </View>
      );
    case "done":
      return (
        <View style={styles.panel}>
          <View>
            <Text style={styles.result}>
              {`${(view.result.distance_m / 1000).toFixed(1)} km`}
            </Text>
            <Text style={styles.target}>
              {`${routeName(view.request)} · on roads · target ${view.request.distance_m / 1000} km`}
            </Text>
          </View>
          {toNotes(view.result.warnings).map((note) => (
            <NoteRow key={note.text} note={note} />
          ))}
          {/* Only with directions: a route traced without them has no turns. */}
          {view.result.directions.length > 0 && (
            <Pressable style={styles.draw} onPress={onStart} accessibilityRole="button">
              <Text style={styles.drawText}>Start</Text>
            </Pressable>
          )}
          <Pressable
            style={[styles.secondary, styles.export]}
            onPress={onExport}
            disabled={exporting.status === "preparing"}
            accessibilityRole="button"
          >
            <Text style={styles.secondaryText}>
              {exporting.status === "preparing" ? "Preparing GPX…" : "Export GPX"}
            </Text>
          </Pressable>
          {exporting.status === "failed" && <Problem problem={exporting.problem} />}
        </View>
      );
    case "failed":
      return (
        <Problem
          problem={view.problem}
          kind={view.request.word ? "word" : "shape"}
          onTryDistance={onTryDistance}
          onPickShape={onPickShape}
        />
      );
    default:
      return null;
  }
}

/** Under the shape field: the shape the words name, or why there is none. */
function ShapeNote({
  text,
  shape,
  reading,
}: {
  text: string;
  shape: Shape | null;
  reading: ShapeReadingState | null;
}) {
  if (shape !== null) {
    return text.trim().toLowerCase() === shape ? null : (
      <Text style={styles.note}>→ {shape}</Text>
    );
  }
  switch (reading?.status) {
    case "unread":
      return <Text style={styles.note}>Press Done and the AI will read it.</Text>;
    case "reading":
      // A word may take the model 4–50 s: a bar, as for the route (TASK-058).
      return (
        <View style={styles.reading}>
          <Text style={styles.note}>The AI is reading it…</Text>
          <ReadingBar />
        </View>
      );
    case "read":
      // What the model does not know it does not guess (AI.md, «Limiti»):
      // plainer words may work, or a shape of the catalogue, the tiles above.
      return (
        <Text style={styles.problem}>
          {`No shape in the catalogue for “${text.trim()}”. Describe what it looks like (“prancing horse”, not “Ferrari badge”), or pick one:`}
        </Text>
      );
    case "failed":
      return <Problem problem={reading.problem} />;
    default:
      return (
        <Text style={styles.problem}>{`Unknown shape. Try: ${shapeList()}.`}</Text>
      );
  }
}

/**
 * Under the word field: how far the word needs, or why it cannot be drawn.
 * A distance too short for it can be raised with a tap.
 */
function WordNote({
  text,
  check,
  onDistance,
}: {
  text: string;
  check: WordCheck;
  onDistance: (distanceM: number) => void;
}) {
  if (check.ok) {
    const letters = Array.from(check.word).length;
    return (
      <Text style={styles.note}>
        {`${letters} ${letters === 1 ? "letter" : "letters"}: at least ${wordDistanceM(check.word) / 1000} km. A word takes a few minutes to draw.`}
      </Text>
    );
  }
  // An empty field is not a mistake: it says what to write.
  if (text.trim() === "") {
    return <Text style={styles.note}>{check.problem}</Text>;
  }
  const needs = check.needsDistanceM;
  return (
    <View style={styles.problemBox}>
      <Text style={styles.problem}>{check.problem}</Text>
      {needs !== undefined && (
        <Pressable
          style={[styles.secondary, styles.choice]}
          onPress={() => onDistance(needs)}
          accessibilityRole="button"
        >
          <Text style={styles.secondaryText}>{`Use ${needs / 1000} km`}</Text>
        </Pressable>
      )}
    </View>
  );
}

/** What the API is doing, as it said on its last answer. */
function waitingText({ phase, request }: Extract<RouteState, { status: "waiting" }>) {
  switch (phase) {
    case "sending":
    case "queued":
      return "Waiting for the API…";
    case "downloading_map":
      return "Downloading map data for this area…";
    default:
      return request.word
        ? `Drawing “${request.word}”, ${request.distance_m / 1000} km…`
        : `Drawing a ${request.distance_m / 1000} km ${request.shape}…`;
  }
}

function Problem({
  problem,
  kind,
  onTryDistance,
  onPickShape,
}: {
  problem: RouteProblem;
  kind?: DrawKind;
  onTryDistance?: (distanceM: number) => void;
  onPickShape?: (shape: Shape) => void;
}) {
  const { text, detail, tryDistanceM, pickShape } = problemText(problem, kind);
  return (
    <View style={styles.problemBox}>
      <Text style={styles.problem}>{text}</Text>
      {tryDistanceM !== undefined && onTryDistance && (
        <Pressable
          style={[styles.secondary, styles.choice]}
          onPress={() => onTryDistance(tryDistanceM)}
          accessibilityRole="button"
        >
          <Text style={styles.secondaryText}>{`Try ${tryDistanceM / 1000} km`}</Text>
        </Pressable>
      )}
      {pickShape && onPickShape && <ShapeChoices onPick={onPickShape} />}
      {detail && <Text style={styles.detail}>{detail}</Text>}
    </View>
  );
}

/** The shapes of the catalogue, each writing itself in the shape field. */
function ShapeChoices({ onPick }: { onPick: (shape: Shape) => void }) {
  return (
    <View style={styles.choices}>
      {SHAPES.map((shape) => (
        <Pressable
          key={shape}
          style={[styles.secondary, styles.chip]}
          onPress={() => onPick(shape)}
          accessibilityRole="button"
        >
          <Text style={styles.secondaryText}>{shape}</Text>
        </Pressable>
      ))}
    </View>
  );
}

/**
 * A warning of the engine in plain words (warnings.ts), with a stripe that says
 * whether to watch for it (warning) or just to know it.
 */
function NoteRow({ note }: { note: Note }) {
  return (
    <View
      style={[styles.noteRow, note.tone === "caution" ? styles.caution : styles.info]}
    >
      <Text style={styles.noteText}>{note.text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    gap: space.sm,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
  },
  // Section labels, uppercase and letter-spaced (tokens: fontSize.label).
  label: {
    color: color.textMuted,
    fontSize: fontSize.label,
    fontWeight: fontWeight.semibold,
    letterSpacing: 1.2,
  },
  section: {
    marginTop: space.lg,
  },
  // On the screen's background the track needs a surface to show.
  kinds: {
    backgroundColor: color.surface,
  },
  wordField: {
    letterSpacing: 2,
  },
  field: {
    minHeight: MIN_TAP_SIZE,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    fontSize: fontSize.input,
    color: color.text,
    backgroundColor: color.surface,
  },
  note: {
    color: color.textMuted,
  },
  reading: {
    gap: space.sm,
  },
  draw: {
    minHeight: MIN_TAP_SIZE + space.md,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.lg,
    backgroundColor: color.accent,
  },
  off: {
    opacity: 0.4,
  },
  // Dark on yellow: white does not reach the contrast minimum (ADR-0046).
  drawText: {
    color: color.onAccent,
    fontWeight: fontWeight.bold,
    fontSize: fontSize.input,
  },
  waiting: {
    flex: 1,
    color: color.text,
  },
  secondary: {
    minHeight: MIN_TAP_SIZE,
    justifyContent: "center",
    paddingHorizontal: space.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.borderStrong,
    backgroundColor: color.surfaceRaised,
  },
  secondaryText: {
    color: color.text,
    fontWeight: fontWeight.bold,
  },
  export: {
    alignItems: "center",
    marginTop: space.sm,
  },
  result: {
    color: color.text,
    fontWeight: fontWeight.bold,
    fontSize: fontSize.display,
  },
  target: {
    color: color.textMuted,
    fontSize: fontSize.body,
  },
  noteRow: {
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
    borderLeftWidth: 3,
    borderRadius: radius.sm,
    backgroundColor: color.surfaceRaised,
  },
  // Not yellow: that means "route", and a warning is something else.
  caution: {
    borderLeftColor: color.warning,
  },
  info: {
    borderLeftColor: color.borderStrong,
  },
  noteText: {
    color: color.text,
    fontSize: fontSize.small,
  },
  problem: {
    color: color.error,
  },
  problemBox: {
    gap: space.sm,
  },
  choice: {
    alignSelf: "flex-start",
  },
  choices: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: space.sm,
  },
  chip: {
    paddingHorizontal: space.md,
  },
  detail: {
    color: color.textFaint,
    fontSize: fontSize.detail,
  },
});
