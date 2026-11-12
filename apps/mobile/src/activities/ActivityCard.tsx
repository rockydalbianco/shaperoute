import { useEffect, useState } from "react";
import { Keyboard, StyleSheet, Text, View } from "react-native";

import { type ActivityDetail, isImported } from "../api/activities";
import { t } from "../i18n";
import { ImportedMark } from "../imports/ImportedMark";
import { drawingOfRun } from "../messages/messageDrawing";
import { SendDrawingButton } from "../messages/SendDrawingButton";
import { postOfActivity } from "../share/postRun";
import { SharePostButton } from "../share/SharePost";
import { useDrawingsDoor } from "../social/drawingsDoor";
import { PublicRow } from "../social/PublicRow";
import { StravaActivityRow } from "../strava/StravaActivityRow";
import {
  color,
  fontSize,
  fontWeight,
  MIN_TAP_SIZE,
  radius,
  space,
} from "../theme/tokens";
import { Tap } from "../ui/Tap";
import { useUnits } from "../units/useUnits";
import { clockLabel } from "../navigation/freeRun";
import { ActivityMenu, menuChoice } from "./ActivityMenu";
import { ActivitySheet } from "./ActivitySheet";
import { runFacts, startedLabel, whereAndWhat } from "./activityText";
import { isTrackless } from "./snow";

/** How much of the screen the form of the post may take in its sheet. */
export const EDIT_FORM_SHARE = 0.7;

type Props = {
  activity: ActivityDetail;
  /** Back to «My activities» in «Profile»: the map's «←» does it, the card
   * has no button for it any more (TASK-456). */
  onList?: () => void;
  /** The run goes, for good: asked for after a yes in the card's «…». */
  onDelete: () => void;
};

/**
 * A run of «My activities» on the map (TASK-172), under it. The map has the
 * room (TASK-456): the card is short, and as high before the API answers as
 * after. On it: the title of the run's post when it has one, else when it
 * was; where it was, how far and how fast; never its score (TASK-241). The
 * map shows it as the end of a run does: the route yellow, what was run
 * light. «Share» makes its post, for Instagram and Strava (TASK-231).
 * «Edit post» opens the form of its drawing in a sheet (TASK-117): to open
 * the run to the others, title it, tell it, add photos. In its «…»: «Send
 * to a friend», which puts it in a message (TASK-333), cut at its ends as
 * the Feed shows it; with Strava connected, «Send to Strava» or «View on
 * Strava» (TASK-187); and «Delete», which asks first. A run added from a
 * file of another app says «Imported», and has no «Send to Strava»
 * (TASK-312): it often comes from Strava itself.
 */
export function ActivityCard({ activity, onDelete }: Props) {
  const { choiceOf } = useDrawingsDoor();
  // The post has a form: an account, and an API with drawings.
  const [editable, setEditable] = useState(false);
  // The title of the post, as the API has it, then as the form does.
  const [title, setTitle] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  // The facts are written again when «Settings» changes the units (TASK-182).
  useUnits();
  useEffect(() => {
    let live = true;
    void choiceOf(activity.id).then((answer) => {
      if (live && answer !== null && answer.kind === "known") {
        setEditable(true);
        setTitle(answer.choice.title);
      }
    });
    return () => {
      live = false;
    };
  }, [activity.id, choiceOf]);

  const withRoute = activity.points !== null;
  const imported = isImported(activity);
  // A workout at the gym (TASK-385 B0): no line, no distance, nothing to
  // send as a route nor to Strava.
  const gym = isTrackless(activity.activity);
  const when = startedLabel(activity.started_at);
  const where = whereAndWhat(activity, withRoute);
  const shown = title === null || title.trim() === "" ? null : title;

  /** «Done», or a tap over the sheet: what is being typed goes first. */
  function doneEditing() {
    Keyboard.dismiss();
    setEditing(false);
  }

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={styles.words}>
          {/* Two lines with a title or without: the card keeps its height
              when the title comes, and the map its frame. */}
          <Text style={styles.heading} numberOfLines={1} testID="activity-card-heading">
            {shown ?? when}
          </Text>
          <Text style={styles.message} numberOfLines={1}>
            {shown === null ? where : `${when} · ${where}`}
          </Text>
          {imported && <ImportedMark />}
        </View>
        <ActivityMenu name={shown ?? when} onDelete={onDelete}>
          {!gym && (
            <SendDrawingButton
              drawing={() => drawingOfRun(activity)}
              style={menuChoice.button}
              textStyle={menuChoice.text}
            />
          )}
          {!imported && !gym && <StravaActivityRow activity={activity} />}
        </ActivityMenu>
      </View>
      <Text style={styles.facts}>
        {gym ? clockLabel(activity.duration_s * 1000) : runFacts(activity)}
      </Text>
      {!gym && (
        <Text style={styles.message}>
          {t(
            withRoute
              ? "Yellow: the route. White: what you ran."
              : "White: what you ran.",
          )}
        </Text>
      )}
      <View style={styles.buttons}>
        <View style={styles.half}>
          <SharePostButton makeRun={() => postOfActivity(activity)} />
        </View>
        {editable && (
          <Tap
            style={[styles.button, styles.half]}
            onPress={() => setEditing(true)}
            accessibilityRole="button"
          >
            <Text style={styles.buttonText}>{t("Edit post")}</Text>
          </Tap>
        )}
      </View>
      <ActivitySheet visible={editing} onClose={doneEditing} testID="edit-post-sheet">
        <View style={styles.sheetHead}>
          <Text style={styles.sheetTitle} accessibilityRole="header">
            {t("Edit post")}
          </Text>
          <Tap
            style={styles.done}
            onPress={doneEditing}
            accessibilityRole="button"
            hitSlop={space.sm}
          >
            <Text style={styles.buttonText}>{t("Done")}</Text>
          </Tap>
        </View>
        <PublicRow
          activityKey={activity.id}
          imported={imported}
          track={activity.track}
          rotationDeg={activity.rotation_deg ?? null}
          formShare={EDIT_FORM_SHARE}
          onTitle={setTitle}
        />
      </ActivitySheet>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: space.sm,
  },
  // The words, and the «…» at the top right.
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: space.md,
  },
  words: {
    flex: 1,
    gap: 2,
  },
  heading: {
    color: color.text,
    fontSize: fontSize.input,
    fontWeight: fontWeight.semibold,
  },
  message: {
    color: color.textMuted,
    fontSize: fontSize.small,
  },
  facts: {
    color: color.text,
    fontSize: fontSize.input,
    fontWeight: fontWeight.semibold,
  },
  // «Share» and «Edit post», side by side.
  buttons: {
    flexDirection: "row",
    gap: space.sm,
    paddingTop: space.xs,
  },
  half: {
    flex: 1,
  },
  // As «Share» beside it (SharePost.tsx).
  button: {
    minHeight: MIN_TAP_SIZE,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: space.xl,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.borderStrong,
    backgroundColor: color.surfaceRaised,
  },
  buttonText: {
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
  sheetHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space.md,
  },
  sheetTitle: {
    flex: 1,
    color: color.text,
    fontSize: fontSize.input,
    fontWeight: fontWeight.semibold,
  },
  done: {
    minHeight: MIN_TAP_SIZE,
    justifyContent: "center",
    paddingHorizontal: space.lg,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.borderStrong,
    backgroundColor: color.surfaceRaised,
  },
});
