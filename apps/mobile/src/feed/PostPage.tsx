import { useRef, useState } from "react";
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

import { dayLabel } from "../activities/activityText";
import { isOnSnow, isTrackless } from "../activities/snow";
import type { DrawingChoice } from "../api/drawings";
import { cityName } from "../explore/recommendedRoutes";
import { SleepCard } from "../health/SleepCard";
import { t } from "../i18n";
import { isPoolLine } from "../pool/PoolTile";
import { Avatar } from "../profile/Avatar";
import { useFollowsDoor } from "../social/followsDoor";
import { activityName } from "../social/PublicParts";
import { OverAppSlot, useModalPage, useOverAppShown } from "../screens/overAppContext";
import { ReportMenu } from "../social/ReportMenu";
import { color, font, fontWeight, MIN_TAP_SIZE, radius, space } from "../theme/tokens";
import { closeTopLayer } from "../ui/backLayers";
import { Tap } from "../ui/Tap";
import { useUnits } from "../units/useUnits";
import { useEditRunDoor } from "./editRunDoor";
import type { ShownPost } from "./feedPosts";
import { PostElevation } from "./PostElevation";
import type { PostReactionsHandle } from "./PostReactions";
import { type PostSection, postSections } from "./postSections";
import { PostSettings } from "./PostSettings";
import { PostSheet } from "./PostSheet";
import { PostSplits } from "./PostSplits";
import { RouteMap } from "./RouteMap";
import { useDoubleTap } from "./useDoubleTap";
import { usePostStats } from "./usePostStats";

/** The side of the author's picture at the top of the page. */
export const AUTHOR_SIDE = 40;
/** How much room the bar at the foot takes, its handle and its icons. */
const SHEET_ROOM = 120;

type Props = {
  post: ShownPost;
  onClose: () => void;
  /** Opens the drawing whole on the map, with «Start», «Export GPX» and
   * the rest of its card; none, the drawing is not a button. */
  onMap?: () => void;
};

/**
 * The page of a post of «Feed» (TASK-410, ADR-0340), over the whole
 * screen: at the top who ran it, where, when and what; then the drawing on
 * its map, still (the run's video comes with TASK-336), a tap on it opens
 * it on the map as before (`onMap`), its title and its
 * description; then its cards (`postSections`), each only when it has
 * something to show: the summary, and with the figures of GET
 * /drawings/{id} (part D) the splits, the elevation, the heart rate; at the
 * foot `PostSheet`, always there. On somebody else's post the «…» reports
 * it, as on the card.
 */
export function PostPage({ post, onClose, onMap }: Props) {
  // A profile opened from it comes over it, in its slot (TASK-470 D).
  useModalPage();
  const overShown = useOverAppShown();
  return (
    <Modal
      visible
      animationType="slide"
      // Android's «back»: a page opened over the post first.
      onRequestClose={() => (overShown ? closeTopLayer() : onClose())}
      testID="post-page"
    >
      {/* Its own edges, as «Heart rate zones» has them (TASK-366): inside a
          Modal the app's are none, and «‹» sat under the clock (TASK-410). */}
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        <Page post={post} onClose={onClose} onMap={onMap} />
        <OverAppSlot />
      </SafeAreaProvider>
    </Modal>
  );
}

function Page({ post, onClose, onMap }: Props) {
  const units = useUnits();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { apiUrl, account } = useFollowsDoor();
  const editRun = useEditRunDoor();
  // What the owner changed in the sheet, shown at once.
  const [saved, setSaved] = useState<DrawingChoice | null>(null);
  // Two taps on the drawing are the post's super like (TASK-454 part B):
  // asked of the reactions the bar at the foot reads. One tap waits to know
  // it is alone, then opens the drawing on the map as before.
  const reactions = useRef<PostReactionsHandle>(null);
  const tap = useDoubleTap(() => reactions.current?.superLike());
  const { drawing } = post;
  const { state } = account;
  const mine =
    state.status === "signedIn" &&
    state.session.user.public_id === drawing.author.public_id;
  const title = saved === null ? post.title : (saved.title ?? post.title);
  const description = saved === null ? drawing.description : saved.description;
  const pool = isPoolLine(drawing.activity, post.line);
  const lined = post.line.length >= 2 && !isTrackless(drawing.activity) && !pool;
  const run = lined && !isOnSnow(drawing.activity) ? editRun(post.line) : undefined;
  // The page goes first: left open, it stayed over the map (TASK-410).
  const onEditRun =
    run === undefined
      ? undefined
      : () => {
          onClose();
          run();
        };
  const city = cityName(post.city);
  const where = [
    city === "" ? null : city,
    dayLabel(drawing.started_at),
    drawing.activity === undefined ? null : activityName(drawing.activity),
  ]
    .filter((part): part is string => part !== null)
    .join(" · ");
  const stats = usePostStats(drawing.id);
  const sections = postSections(post, units, undefined, stats);
  const map = (
    <RouteMap
      id={post.id}
      line={post.line}
      gaps={post.gaps}
      rotationDeg={post.rotation_deg}
      width={width}
      marks
    />
  );
  return (
    <View style={[styles.page, { paddingTop: insets.top }]}>
      <View style={styles.top}>
        <Tap
          style={styles.back}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={t("Back")}
          testID="post-back"
        >
          <Text style={styles.backMark} accessible={false}>
            ‹
          </Text>
        </Tap>
        {!mine && apiUrl !== null && state.status === "signedIn" && (
          <ReportMenu
            apiUrl={apiUrl}
            token={state.session.token}
            target={{ kind: "drawing", id: drawing.id }}
            person={drawing.author}
            onSessionEnded={account.sessionEnded}
          />
        )}
      </View>
      <ScrollView
        contentContainerStyle={{ paddingBottom: SHEET_ROOM + insets.bottom }}
        showsVerticalScrollIndicator={false}
        testID="post-scroll"
      >
        <View style={styles.who}>
          {/* The picture comes with TASK-355 B: the letter until then. */}
          <Avatar name={drawing.author.username} size={AUTHOR_SIDE} />
          <View style={styles.names}>
            <Text style={styles.user}>{drawing.author.username}</Text>
            <Text style={styles.where} numberOfLines={1}>
              {where}
            </Text>
          </View>
        </View>
        {lined &&
          (onMap === undefined ? (
            // Not a button: nothing opens. Two taps are still the super like.
            <Pressable
              onPress={() => tap(() => {})}
              accessible={false}
              testID="post-map-taps"
            >
              {map}
            </Pressable>
          ) : (
            // A tap opens it on the map, as from the card before the page:
            // «Start» on its track, «Export GPX», «Send to a friend».
            <Tap
              onPress={() => tap(onMap)}
              accessibilityRole="button"
              accessibilityLabel={title}
              accessibilityHint={t("Opens the route on the map")}
              testID="post-map"
            >
              {map}
            </Tap>
          ))}
        <View style={styles.words}>
          <Text style={styles.title} accessibilityRole="header">
            {title}
          </Text>
          {description != null && description !== "" && (
            <Text style={styles.description}>{description}</Text>
          )}
        </View>
        {sections.map((section) => (
          <View key={section.kind} style={styles.card} testID={`post-${section.kind}`}>
            <Text style={styles.cardTitle} accessibilityRole="header">
              {section.title}
            </Text>
            <SectionBody section={section} />
          </View>
        ))}
        <SleepCard drawingId={drawing.id} sleep={drawing.sleep} />
      </ScrollView>
      <PostSheet
        post={post}
        mine={mine}
        onEditRun={onEditRun}
        insetBottom={insets.bottom}
        settings={mine ? <PostSettings post={post} onSaved={setSaved} /> : undefined}
        reactionsHandle={reactions}
      />
    </View>
  );
}

/** What a card holds under its title: rows, two to a line; the table of
 * the splits; the profile. */
function SectionBody({ section }: { section: PostSection }) {
  if (section.kind === "splits") {
    return (
      <PostSplits unit={section.unit} rows={section.rows} fastest={section.fastest} />
    );
  }
  if (section.kind === "elevation") {
    return (
      <PostElevation
        gain={section.gain}
        columns={section.columns}
        label={section.label}
      />
    );
  }
  return (
    <View style={styles.rows}>
      {section.rows.map((row) => (
        <View
          key={row.label}
          style={styles.row}
          accessible
          accessibilityLabel={`${row.label}: ${row.value}`}
        >
          <Text style={styles.rowLabel}>{row.label}</Text>
          <Text style={[styles.rowValue, row.energy && styles.energy]}>
            {row.value}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: color.background,
  },
  top: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: space.sm,
  },
  back: {
    width: MIN_TAP_SIZE,
    height: MIN_TAP_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  backMark: {
    ...font.title,
    color: color.text,
  },
  who: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingBottom: space.md,
  },
  names: {
    flex: 1,
    gap: 2,
  },
  user: {
    ...font.body,
    color: color.text,
    fontWeight: fontWeight.medium,
  },
  where: {
    ...font.detail,
    color: color.textMuted,
  },
  words: {
    gap: space.xs,
    paddingHorizontal: space.lg,
    paddingTop: space.lg,
  },
  title: {
    ...font.heading,
    color: color.text,
  },
  description: {
    ...font.body,
    color: color.textMuted,
  },
  card: {
    gap: space.md,
    marginHorizontal: space.lg,
    marginTop: space.lg,
    padding: space.lg,
    borderRadius: radius.lg,
    backgroundColor: color.surface,
  },
  cardTitle: {
    ...font.label,
    color: color.textMuted,
  },
  rows: {
    flexDirection: "row",
    flexWrap: "wrap",
    rowGap: space.md,
  },
  // Two to a line.
  row: {
    width: "50%",
    gap: 2,
  },
  rowLabel: {
    ...font.detail,
    color: color.textMuted,
  },
  rowValue: {
    ...font.heading,
    color: color.text,
  },
  // The calories, in red wherever they are (TASK-424 part C3).
  energy: {
    color: color.energy,
  },
});
