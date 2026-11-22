import { useRef, useState } from "react";
import { Modal, ScrollView, StyleSheet, Text, View } from "react-native";
import {
  initialWindowMetrics,
  SafeAreaProvider,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { accountProblem, sessionEnded } from "../account/messages";
import { dayLabel } from "../activities/activityText";
import { sleepSummaryOf } from "../api/sleep";
import { removeSleepPost } from "../api/sleepPosts";
import { sleepPostsOn } from "../health/sleepModules";
import { t } from "../i18n";
import { Avatar } from "../profile/Avatar";
import { OverAppSlot, useModalPage, useOverAppShown } from "../screens/overAppContext";
import { useFollowsDoor } from "../social/followsDoor";
import { ReportMenu } from "../social/ReportMenu";
import {
  color,
  font,
  fontSize,
  fontWeight,
  MIN_TAP_SIZE,
  radius,
  space,
} from "../theme/tokens";
import { closeTopLayer } from "../ui/backLayers";
import { Tap } from "../ui/Tap";
import type { ShownPost } from "./feedPosts";
import { AUTHOR_SIDE } from "./PostPage";
import type { PostReactionsHandle } from "./PostReactions";
import { PostSheet } from "./PostSheet";
import { SleepPostCard } from "./SleepPostCard";
import { useDoubleTap } from "./useDoubleTap";

export const SLEEP_POST_DETAIL_TEST_ID = "sleep-post-detail";

/** Room under the night for the bar at the foot. */
const SHEET_ROOM = 120;

type Props = {
  post: ShownPost;
  onClose: () => void;
  /** One's own post was taken off the Feed: the lists read again. */
  onRemoved?: () => void;
  /** The fakes of the tests. */
  fetchFn?: typeof fetch;
  apiKey?: string | null;
};

/**
 * The page of the post of a night of sleep (TASK-467 part E), over the
 * whole screen, as the page of a run's post (PostPage) without its map and
 * its cards: who posted it and when, the night (SleepPostCard, with the
 * line that says MuW worked the score out), two taps on it are the super
 * like; at the foot `PostSheet`, and on one's own post «Remove post» under
 * the bar, which takes it off the Feed and closes the page. Nothing while
 * the sleep is off.
 */
export function SleepPostDetailPage(props: Props) {
  useModalPage();
  const overShown = useOverAppShown();
  if (!sleepPostsOn()) {
    return null;
  }
  return (
    <Modal
      visible
      animationType="slide"
      onRequestClose={() => (overShown ? closeTopLayer() : props.onClose())}
      testID={SLEEP_POST_DETAIL_TEST_ID}
    >
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        <Page {...props} />
        <OverAppSlot />
      </SafeAreaProvider>
    </Modal>
  );
}

function Page({ post, onClose, onRemoved, fetchFn, apiKey }: Props) {
  const insets = useSafeAreaInsets();
  const { apiUrl, account } = useFollowsDoor();
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const reactions = useRef<PostReactionsHandle>(null);
  const tap = useDoubleTap(() => reactions.current?.superLike());
  const { drawing } = post;
  const { state } = account;
  const signedIn = state.status === "signedIn" ? state.session : null;
  const mine =
    signedIn !== null && signedIn.user.public_id === drawing.author.public_id;
  const night = sleepSummaryOf(drawing.sleep);

  async function remove() {
    if (apiUrl === null || signedIn === null || night === null || busy) {
      return;
    }
    setBusy(true);
    setProblem(null);
    const outcome = await removeSleepPost(apiUrl, signedIn.token, night.night, {
      fetchFn,
      key: apiKey,
    });
    setBusy(false);
    if (outcome.kind === "ok") {
      onRemoved?.();
      onClose();
    } else if (sessionEnded(outcome)) {
      account.sessionEnded(signedIn.token);
    } else {
      setProblem(accountProblem(outcome));
    }
  }

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
        {!mine && apiUrl !== null && signedIn !== null && (
          <ReportMenu
            apiUrl={apiUrl}
            token={signedIn.token}
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
          <Avatar name={drawing.author.username} size={AUTHOR_SIDE} />
          <View style={styles.names}>
            <Text style={styles.user}>{drawing.author.username}</Text>
            <Text style={styles.where} numberOfLines={1}>
              {dayLabel(drawing.started_at)}
            </Text>
          </View>
        </View>
        <Tap
          style={styles.night}
          onPress={() => tap(() => {})}
          accessible={false}
          testID="post-night"
        >
          <SleepPostCard sleep={night} detail />
        </Tap>
      </ScrollView>
      <PostSheet
        post={post}
        mine={mine}
        insetBottom={insets.bottom}
        settings={
          mine && night !== null ? (
            <View style={styles.settings}>
              <Tap
                style={styles.button}
                onPress={() => void remove()}
                disabled={busy}
                accessibilityRole="button"
                accessibilityState={{ busy, disabled: busy }}
                testID="sleep-post-remove"
              >
                <Text style={styles.buttonText}>{t("Remove post")}</Text>
              </Tap>
              {problem !== null && (
                <Text style={styles.problem} accessibilityRole="alert">
                  {problem}
                </Text>
              )}
            </View>
          ) : undefined
        }
        reactionsHandle={reactions}
      />
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
  night: {
    paddingHorizontal: space.lg,
  },
  settings: {
    gap: space.sm,
  },
  button: {
    minHeight: MIN_TAP_SIZE,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: space.lg,
    borderRadius: radius.pill,
    backgroundColor: color.surfaceRaised,
  },
  buttonText: {
    ...font.body,
    color: color.text,
    fontWeight: fontWeight.medium,
  },
  problem: {
    color: color.error,
    fontSize: fontSize.small,
  },
});
