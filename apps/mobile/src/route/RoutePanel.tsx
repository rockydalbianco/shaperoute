import { MAX_SHAPE_TEXT_LENGTH, type Shape, SHAPES } from "@shaperoute/shared-types";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import {
  color,
  fontSize,
  fontWeight,
  MIN_TAP_SIZE,
  radius,
  space,
} from "../theme/tokens";
import { LONG_DISTANCE_KM, MAX_APP_DISTANCE_KM, MIN_DISTANCE_KM } from "./distance";
import { DistanceStepper } from "./DistanceStepper";
import { problemText } from "./problems";
import { ShapeTiles } from "./ShapeTiles";
import { shapeList } from "./shapeWords";
import type { ExportState } from "./useGpxExport";
import type { RouteProblem, RouteState } from "./useRouteRequest";
import type { ShapeReadingState } from "./useShapeReading";

type ChoiceProps = {
  /** The shape field as typed, and the shape it names (null: none). */
  shapeText: string;
  shape: Shape | null;
  onShapeText: (text: string) => void;
  /** The AI's reading of words the table does not know; null otherwise. */
  reading: ShapeReadingState | null;
  /** The user is done typing the shape: the AI may read it. */
  onShapeDone: () => void;
  /** The km field as typed, and what it means in metres (null: not valid). */
  distanceText: string;
  distanceM: number | null;
  onDistanceText: (text: string) => void;
};

/**
 * What to draw (TASK-051): the shapes as tiles, a field for any other word,
 * and the distance. "Draw route" sits apart, at the foot of the screen.
 */
export function RouteChoice({
  shapeText,
  shape,
  onShapeText,
  reading,
  onShapeDone,
  distanceText,
  distanceM,
  onDistanceText,
}: ChoiceProps) {
  return (
    <View style={styles.panel}>
      <Text style={styles.label}>SHAPE</Text>
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
};

/** Under the map: the wait, the route, or why there is none. */
export function RouteOutcome({
  view,
  onCancel,
  exporting,
  onExport,
  onTryDistance,
  onPickShape,
}: OutcomeProps) {
  switch (view.status) {
    case "waiting":
      return (
        <View style={styles.row}>
          <Text style={styles.waiting}>
            {waitingText(view)} <Elapsed since={view.startedAt} />
          </Text>
          <Pressable
            style={styles.secondary}
            onPress={onCancel}
            accessibilityRole="button"
          >
            <Text style={styles.secondaryText}>Cancel</Text>
          </Pressable>
        </View>
      );
    case "done":
      return (
        <View style={styles.panel}>
          <Text style={styles.result}>
            {(view.result.distance_m / 1000).toFixed(1)} km on roads (target{" "}
            {view.request.distance_m / 1000} km)
          </Text>
          {view.result.warnings.map((warning) => (
            <Text key={warning} style={styles.warning}>
              • {warning}
            </Text>
          ))}
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
      return <Text style={styles.note}>The AI is reading it…</Text>;
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

/** What the API is doing, as it said on its last answer. */
function waitingText({ phase, request }: Extract<RouteState, { status: "waiting" }>) {
  switch (phase) {
    case "sending":
    case "queued":
      return "Waiting for the API…";
    case "downloading_map":
      return "Downloading map data for this area…";
    default:
      return `Drawing a ${request.distance_m / 1000} km ${request.shape}…`;
  }
}

function Problem({
  problem,
  onTryDistance,
  onPickShape,
}: {
  problem: RouteProblem;
  onTryDistance?: (distanceM: number) => void;
  onPickShape?: (shape: Shape) => void;
}) {
  const { text, detail, tryDistanceM, pickShape } = problemText(problem);
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

/** Seconds since `since`, updated every second while it is on screen. */
function Elapsed({ since }: { since: number }) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  return <Text>{Math.max(0, Math.floor((now - since) / 1000))} s</Text>;
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
    alignSelf: "flex-start",
    marginTop: space.sm,
  },
  result: {
    color: color.text,
    fontWeight: fontWeight.bold,
    fontSize: fontSize.input,
  },
  // Not yellow: that means "route", and a warning is something else.
  warning: {
    color: color.warning,
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
