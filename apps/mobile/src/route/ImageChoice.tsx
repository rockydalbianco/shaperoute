import type { EditKind } from "@shaperoute/shared-types";
import { useContext, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  color,
  fontSize,
  fontWeight,
  MIN_TAP_SIZE,
  radius,
  space,
} from "../theme/tokens";
import { type ImageEdits, ImageEditsContext } from "./imageEdits";
import { ImagePreview } from "./ImagePreview";
import type { ImageSource } from "./pickImage";
import { editProblemText, imageProblemText } from "./problems";
import type { ImageState } from "./useImageOutline";

/**
 * A picture instead of a shape or a word (TASK-073): choose one or take a
 * photo, see the outline the engine traced from it, then draw the route.
 * The outline shows before the route is asked for: if it does not look like
 * the subject, the route will not either.
 *
 * On the outline a finger adds a part or a detail, and Undo takes the last
 * one away (TASK-079): one line always, which the engine checks.
 */
export function ImageChoice({
  state,
  onChoose,
}: {
  state: ImageState;
  onChoose: (source: ImageSource) => void;
}) {
  const [showPicture, setShowPicture] = useState(true);
  const [drawing, setDrawing] = useState<EditKind | null>(null);
  const edits = useContext(ImageEditsContext);
  const chosen = state.status !== "none" && state.picture !== null;
  const sending = edits?.edit.status === "sending";
  return (
    <View style={styles.panel}>
      <View style={styles.row}>
        <Pressable
          style={[styles.button, styles.grow]}
          onPress={() => onChoose("library")}
          accessibilityRole="button"
        >
          <Text style={styles.buttonText}>
            {chosen ? "Choose another" : "Choose picture"}
          </Text>
        </Pressable>
        <Pressable
          style={[styles.button, styles.grow]}
          onPress={() => onChoose("camera")}
          accessibilityRole="button"
        >
          <Text style={styles.buttonText}>Take photo</Text>
        </Pressable>
      </View>
      <ImageNote state={state} />
      {state.status === "traced" && (
        <>
          <ImagePreview
            picture={state.picture}
            points={state.outline.image_points}
            strokes={state.outline.image_strokes}
            aspect={state.outline.aspect}
            showPicture={showPicture}
            onDraw={
              edits && drawing && !sending
                ? (line) => edits.add(drawing, line)
                : undefined
            }
          />
          {edits && (
            <OutlineEditor edits={edits} drawing={drawing} onDrawing={setDrawing} />
          )}
          <Pressable
            style={styles.link}
            onPress={() => setShowPicture((shown) => !shown)}
            accessibilityRole="button"
          >
            <Text style={styles.linkText}>
              {showPicture ? "Hide the picture" : "Show the picture"}
            </Text>
          </Pressable>
        </>
      )}
    </View>
  );
}

const EDIT_BUTTONS: { kind: EditKind; label: string }[] = [
  { kind: "part", label: "Add a part" },
  { kind: "detail", label: "Add a detail" },
];

/** What to draw, once a button is on. */
const DRAW_HINT: Record<EditKind, string> = {
  part: "Draw a closed shape across the yellow line: it joins the outline.",
  detail:
    "Draw from the yellow line: the route runs along it and back. Cross your own line to close a loop, like an eye.",
};

/** The buttons that edit the outline, and what the last line drawn gave. */
function OutlineEditor({
  edits,
  drawing,
  onDrawing,
}: {
  edits: ImageEdits;
  drawing: EditKind | null;
  onDrawing: (kind: EditKind | null) => void;
}) {
  const { edit } = edits;
  const canUndo = edits.earlier.length > 0;
  const refused = edit.status === "refused" ? editProblemText(edit.problem) : null;
  return (
    <View style={styles.panel}>
      <View style={styles.row}>
        {EDIT_BUTTONS.map(({ kind, label }) => {
          const on = drawing === kind;
          return (
            <Pressable
              key={kind}
              style={[styles.button, styles.grow, on && styles.buttonOn]}
              onPress={() => onDrawing(on ? null : kind)}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
            >
              <Text style={[styles.buttonText, on && styles.buttonTextOn]}>
                {label}
              </Text>
            </Pressable>
          );
        })}
        <Pressable
          style={[styles.button, !canUndo && styles.buttonOff]}
          onPress={edits.undo}
          disabled={!canUndo}
          accessibilityRole="button"
          accessibilityState={{ disabled: !canUndo }}
        >
          <Text style={styles.buttonText}>Undo</Text>
        </Pressable>
      </View>
      {edit.status === "sending" ? (
        <Text style={styles.note}>
          {edit.kind === "part" ? "Adding the part…" : "Adding the detail…"}
        </Text>
      ) : refused ? (
        <View style={styles.problemBox}>
          <Text style={styles.problem}>{refused.text}</Text>
          {refused.detail && <Text style={styles.detail}>{refused.detail}</Text>}
        </View>
      ) : (
        drawing && <Text style={styles.note}>{DRAW_HINT[drawing]}</Text>
      )}
    </View>
  );
}

function ImageNote({ state }: { state: ImageState }) {
  switch (state.status) {
    case "none":
      return (
        <Text style={styles.note}>
          One subject on a plain background works best: a drawing, a logo, an object on
          a bare table. The route follows its outside line.
        </Text>
      );
    case "tracing":
      return <Text style={styles.note}>Tracing the outline…</Text>;
    case "traced":
      return (
        <Text style={styles.note}>
          The yellow line is what the route will draw. If it does not look like the
          subject, the route will not either: try another picture, or add to the line
          below. Only the largest piece is kept.
        </Text>
      );
    case "failed": {
      const { text, detail } = imageProblemText(state.problem);
      return (
        <View style={styles.problemBox}>
          <Text style={styles.problem}>{text}</Text>
          {detail && <Text style={styles.detail}>{detail}</Text>}
        </View>
      );
    }
  }
}

const styles = StyleSheet.create({
  panel: {
    gap: space.sm,
  },
  row: {
    flexDirection: "row",
    gap: space.sm,
  },
  grow: {
    flex: 1,
  },
  button: {
    minHeight: MIN_TAP_SIZE,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: space.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.borderStrong,
    backgroundColor: color.surfaceRaised,
  },
  buttonOn: {
    borderColor: color.accent,
    backgroundColor: color.accent,
  },
  buttonOff: {
    opacity: 0.4,
  },
  buttonText: {
    color: color.text,
    fontWeight: fontWeight.bold,
  },
  buttonTextOn: {
    color: color.onAccent,
  },
  link: {
    minHeight: MIN_TAP_SIZE,
    justifyContent: "center",
    alignSelf: "flex-start",
  },
  linkText: {
    color: color.text,
    fontWeight: fontWeight.bold,
    textDecorationLine: "underline",
  },
  note: {
    color: color.textMuted,
  },
  problemBox: {
    gap: space.sm,
  },
  problem: {
    color: color.error,
  },
  detail: {
    color: color.textFaint,
    fontSize: fontSize.detail,
  },
});
