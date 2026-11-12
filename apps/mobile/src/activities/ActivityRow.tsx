import { StyleSheet, Text, View } from "react-native";

import { type Activity, isImported } from "../api/activities";
import { useBody } from "../body/useBody";
import { FactsText } from "../feed/FactsText";
import { GymTile } from "../gym/GymTile";
import { t } from "../i18n";
import { ImportedMark } from "../imports/ImportedMark";
import { clockLabel } from "../navigation/freeRun";
import { poolKcal, poolKcalLabel } from "../pool/poolKcal";
import { isPoolSwimRun, PoolTile } from "../pool/PoolTile";
import { color, fontSize, fontWeight, radius, space } from "../theme/tokens";
import { Tap } from "../ui/Tap";
import { useUnits } from "../units/useUnits";
import { ActivityMenu } from "./ActivityMenu";
import { runFacts, startedLabel, whereAndWhat } from "./activityText";
import { RunDrawing } from "./RunDrawing";
import { isTrackless } from "./snow";

/** The side of a run's drawing in the list. */
const DRAWING = 88;

type Props = {
  activity: Activity;
  /** Made public: a drawing in the profile (TASK-117). */
  isPublic: boolean;
  /** The title of its post, when it has one (TASK-456). */
  title: string | null;
  /** Its run is being fetched whole, for the map. */
  opening: boolean;
  onOpen: () => void;
  /** The run goes, for good: asked for after a yes in its «…». */
  onDelete: () => void;
};

/**
 * A run in the list of «My activities» (TASK-172): its drawing, and beside
 * it the title of its post when it has one, with the day and the time
 * under it (TASK-456), else the day and the time alone; then where it was
 * and what it drew, how far and how fast. A tap opens it on the map. A
 * public run says so (TASK-117), one added from a file of another app says
 * «Imported» (TASK-312). «Delete» is in its «…», which asks first.
 */
export function ActivityRow({
  activity,
  isPublic,
  title,
  opening,
  onOpen,
  onDelete,
}: Props) {
  const when = startedLabel(activity.started_at);
  // A swim in a pool has no line to draw nor to open on the map, and no
  // place: «Pool swim», its metres, time and pace (TASK-400 part B).
  const pool = isPoolSwimRun(activity);
  const where =
    pool && activity.place === null
      ? t("Pool swim")
      : whereAndWhat(activity, activity.route_preview !== null);
  // Written again when «Settings» changes the units (TASK-182).
  useUnits();
  // A workout at the gym has no distance: its time (TASK-385 B0).
  const gym = isTrackless(activity.activity);
  // A swim in a pool ends with its energy, "· 206 kcal" (TASK-409 part A).
  const body = useBody();
  const kcal = pool
    ? poolKcalLabel(
        poolKcal(
          activity.distance_m,
          activity.duration_s,
          body,
          new Date(activity.started_at).getFullYear(),
        ),
      )
    : null;
  const facts = gym
    ? clockLabel(activity.duration_s * 1000)
    : kcal === null
      ? runFacts(activity)
      : `${runFacts(activity)} · ${kcal}`;
  // As a screen reader says the run: its title first, as the card shows it.
  const said = title === null ? when : `${title}, ${when}`;
  return (
    <View style={styles.row} testID="activity-row">
      <Tap
        style={styles.open}
        onPress={pool ? undefined : onOpen}
        disabled={pool}
        accessibilityRole={pool ? undefined : "button"}
        accessibilityLabel={
          pool
            ? `${said}, ${where}, ${facts}`
            : t(
                isPublic
                  ? "{when}, {where}, {facts}, public, open on the map"
                  : "{when}, {where}, {facts}, open on the map",
                { when: said, where, facts },
              )
        }
      >
        {gym ? (
          <GymTile width={DRAWING} height={DRAWING} />
        ) : pool ? (
          <PoolTile width={DRAWING} height={DRAWING} />
        ) : (
          <RunDrawing
            route={activity.route_preview}
            track={activity.track_preview}
            width={DRAWING}
            height={DRAWING}
            rotationDeg={activity.rotation_deg}
          />
        )}
        <View style={styles.words}>
          <Text style={styles.heading} numberOfLines={1} testID="activity-heading">
            {title ?? when}
          </Text>
          {title !== null && (
            <Text style={styles.detail} numberOfLines={1}>
              {when}
            </Text>
          )}
          <Text style={styles.detail} numberOfLines={1}>
            {where}
          </Text>
          <FactsText
            style={styles.facts}
            numberOfLines={1}
            facts={opening ? t("Opening…") : facts}
            kcal={opening ? null : kcal}
          />
          {(isPublic || isImported(activity)) && (
            <View style={styles.marks}>
              {isPublic && (
                <Text style={styles.mark} testID="activity-public">
                  {t("Public")}
                </Text>
              )}
              {isImported(activity) && <ImportedMark />}
            </View>
          )}
        </View>
      </Tap>
      <ActivityMenu name={title ?? when} onDelete={onDelete} />
    </View>
  );
}

const styles = StyleSheet.create({
  // The run, and its «…» at the top right.
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: space.xs,
    padding: space.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
  open: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
  },
  words: {
    flex: 1,
    gap: 2,
  },
  heading: {
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
  detail: {
    color: color.textMuted,
    fontSize: fontSize.small,
  },
  marks: {
    flexDirection: "row",
    gap: space.xs,
  },
  // Neutral, as every mark that is not the route's.
  mark: {
    alignSelf: "flex-start",
    marginTop: 2,
    paddingHorizontal: space.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.borderStrong,
    color: color.text,
    fontSize: fontSize.small,
    fontWeight: fontWeight.semibold,
  },
  // Not yellow: that is the route's (docs/UI.md, «Il tema»).
  facts: {
    color: color.text,
    fontSize: fontSize.small,
  },
});
