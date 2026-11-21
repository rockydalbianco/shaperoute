import type { LiveAudience, RunActivity } from "@shaperoute/shared-types";
import { type ReactNode, useRef, useState } from "react";
import { Alert, Platform, Share, StyleSheet, Switch, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { t } from "../i18n";
import { runActivityOf } from "../settings/sport";
import { useSport } from "../settings/useSport";
import { useFollowsDoor } from "../social/followsDoor";
import {
  color,
  font,
  fontSize,
  fontWeight,
  MIN_TAP_SIZE,
  radius,
  space,
} from "../theme/tokens";
import { SheetModal } from "../ui/SheetModal";
import { Tap } from "../ui/Tap";
import {
  liveInFeed,
  liveShareLink,
  liveShareStatus,
  startLiveShare,
  stopLiveShare,
  useLiveShare,
} from "./liveShareStore";
import { SendLiveSheet } from "./SendLiveSheet";

/**
 * «Share live» on the recording screen (TASK-424 part B1, ADR-0352;
 * docs/UI.md «La corsa»). With an account, a button: it opens the sheet
 * that says what whoever has the link sees, heart rate included; «Share
 * link» makes the link and, once the sheet is down, opens the phone's
 * share sheet with one line and the link. While it shares, «Sharing live»:
 * a touch asks, then stops it. Without an account, «Sign in to share live»
 * in grey, with nothing to touch. Never on by itself. A swim in a pool and
 * a workout at the gym (part B2) have it too, with no map: the sheet says
 * what their page shows.
 *
 * TASK-468 part B1 (ADR-0381): the sheet also offers «Send in MuW», the
 * share in a message to people chosen in the app (made without its link),
 * and «Show my heart rate» for them, off unless turned on. While it
 * shares, a touch offers «Send in MuW», «Share link» and «Stop sharing».
 */

/** A recording with no map (part B2): its activity, and for a swim in a
 * pool its pool. */
export type Trackless = { activity: RunActivity; poolLengthM?: number | null };

type Props = {
  /** A link can be made now: the activity is under way. While one is on,
   * «Sharing live» shows whatever this says, so it can be stopped. */
  canStart: boolean;
  /** A recording with no map; absent, the sport of «Settings», with one. */
  trackless?: Trackless;
  /** For the tests: the fetch and the API key. */
  fetchFn?: typeof fetch;
  apiKey?: string | null;
};

/** The line the share sheet carries. */
export function liveShareMessage(url: string): string {
  return t("Follow my activity live on MuW: {url}", { url });
}

/** «Share link» while sharing: the link (made now for a share made for the
 * chat), then the phone's share sheet. */
async function shareLinkNow(): Promise<void> {
  const url = await liveShareLink();
  if (url !== null) {
    void Share.share({ message: liveShareMessage(url) }).catch(() => undefined);
  }
}

/** «Live in the Feed» (TASK-468 part B2a, the user's choices 1 and 6):
 * who can follow, then `onChoose`. */
export function askWhoFollows(onChoose: (audience: LiveAudience) => void): void {
  Alert.alert(t("Who can follow"), undefined, [
    { text: t("Followers"), onPress: () => onChoose("followers") },
    { text: t("Everyone"), onPress: () => onChoose("everyone") },
    { text: t("Not now"), style: "cancel" },
  ]);
}

/** What a touch on «Sharing live» offers (TASK-468 parts B1 and B2a). */
export function sharingMenu(onSend: () => void): void {
  Alert.alert(t("Sharing live"), undefined, [
    { text: t("Send in MuW"), onPress: onSend },
    {
      text: t("Live in the Feed"),
      onPress: () => askWhoFollows((audience) => void liveInFeed(audience)),
    },
    { text: t("Share link"), onPress: () => void shareLinkNow() },
    { text: t("Stop sharing"), style: "destructive", onPress: confirmStopSharing },
    { text: t("Keep sharing"), style: "cancel" },
  ]);
}

/** Asks, then stops sharing: the link stops working now; a share without
 * a link says nobody can follow any more (the user's choice 8). */
export function confirmStopSharing(): void {
  const now = liveShareStatus();
  const linked = now.kind === "sharing" && now.url !== null;
  const what = linked
    ? t("The link stops working now.")
    : t("Nobody can follow you any more.");
  Alert.alert(t("Stop sharing?"), what, [
    { text: t("Keep sharing"), style: "cancel" },
    {
      text: t("Stop sharing"),
      style: "destructive",
      onPress: () => void stopLiveShare(),
    },
  ]);
}

export function LiveShareButton({ canStart, trackless, fetchFn, apiKey }: Props) {
  const { apiUrl, account } = useFollowsDoor();
  const status = useLiveShare();
  const sport = runActivityOf(useSport());
  const activity = trackless?.activity ?? sport;
  const [open, setOpen] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  // TASK-468 part B1: the heart rate to the viewers in the app, and the
  // people sheet. It opens once the consent sheet is down, as the phone's.
  const [heart, setHeart] = useState(false);
  const [choosing, setChoosing] = useState(false);
  const toChoose = useRef(false);
  // The link made, until the sheet has gone: iOS opens one sheet at a time,
  // and the phone's, shown while ours is closing, never comes up
  // (TASK-358).
  const toShare = useRef<string | null>(null);
  const session = account.state.status === "signedIn" ? account.state.session : null;
  const starting = status.kind === "starting";

  const openShareSheet = () => {
    if (toChoose.current) {
      toChoose.current = false;
      setChoosing(true);
    }
    const url = toShare.current;
    toShare.current = null;
    if (url !== null) {
      // The link is on already: a share sheet closed without sending keeps
      // it on, and «Sharing live» says so.
      void Share.share({ message: liveShareMessage(url) }).catch(() => undefined);
    }
  };

  const share = async (link: boolean, audience?: LiveAudience) => {
    if (session === null || apiUrl === null) {
      return;
    }
    setProblem(null);
    const outcome = await startLiveShare(
      { baseUrl: apiUrl, token: session.token, fetchFn, key: apiKey },
      activity,
      trackless?.poolLengthM ?? null,
      { link, heartVisible: heart, audience },
    );
    if (outcome.kind === "started") {
      toShare.current = outcome.url;
      setOpen(false);
    } else if (outcome.kind === "started_without_link") {
      // The people once the sheet is down: iOS shows one at a time. Not
      // for «Live in the Feed»: its followers see it there.
      toChoose.current = audience === undefined;
      setOpen(false);
    } else if (outcome.kind === "failed") {
      setProblem(t("Couldn't create the link. Try again."));
    }
  };

  let control: ReactNode;
  if (status.kind !== "sharing" && !canStart && !open) {
    return null;
  }
  if (status.kind === "sharing") {
    control = (
      <Tap
        style={[styles.chip, styles.live]}
        onPress={() => sharingMenu(() => setChoosing(true))}
        accessibilityRole="button"
        accessibilityLabel={t("Sharing live")}
        testID="live-share-on"
      >
        <View style={styles.dot} />
        <Text style={styles.chipText}>{t("Sharing live")}</Text>
      </Tap>
    );
  } else if (session === null || apiUrl === null) {
    control = (
      <Text style={styles.signIn} testID="live-share-sign-in">
        {t("Sign in to share live")}
      </Text>
    );
  } else {
    control = (
      <Tap
        style={styles.chip}
        onPress={() => {
          setProblem(null);
          setOpen(true);
        }}
        disabled={starting}
        accessibilityRole="button"
        accessibilityState={{ disabled: starting, busy: starting }}
        testID="live-share"
      >
        <Text style={styles.chipText}>{t("Share live")}</Text>
      </Tap>
    );
  }

  return (
    <View style={styles.row}>
      {control}
      {/* Kept whatever the state: the link on, the sheet still goes down. */}
      <SheetModal
        visible={open}
        dim
        onRequestClose={() => !starting && setOpen(false)}
        onHidden={Platform.OS === "ios" ? undefined : openShareSheet}
        onDismiss={Platform.OS === "ios" ? openShareSheet : undefined}
        testID="live-share-sheet"
      >
        <ConsentSheet
          withMap={trackless === undefined}
          starting={starting}
          problem={problem}
          heart={heart}
          onHeart={setHeart}
          onShare={() => void share(true)}
          onSend={() => void share(false)}
          onFeed={() => askWhoFollows((audience) => void share(false, audience))}
          onCancel={() => setOpen(false)}
        />
      </SheetModal>
      {choosing && (
        <SendLiveSheet
          onClose={() => setChoosing(false)}
          fetchFn={fetchFn}
          apiKey={apiKey}
        />
      )}
    </View>
  );
}

function ConsentSheet({
  withMap,
  starting,
  problem,
  heart,
  onHeart,
  onShare,
  onSend,
  onFeed,
  onCancel,
}: {
  withMap: boolean;
  starting: boolean;
  problem: string | null;
  heart: boolean;
  onHeart: (on: boolean) => void;
  onShare: () => void;
  onSend: () => void;
  onFeed: () => void;
  onCancel: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.fill}>
      <Tap
        style={styles.backdrop}
        onPress={() => !starting && onCancel()}
        accessible={false}
        importantForAccessibility="no"
        pressScale={1}
      />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + space.md }]}>
        <Text style={styles.title} accessibilityRole="header">
          {t("Share this activity live")}
        </Text>
        <Text style={styles.body}>
          {withMap
            ? t(
                "Anyone with the link can follow you on a web page, without the app: your exact position on the map, the route so far, distance, time, pace or speed, elevation gain, calories and your heart rate when a watch sends it.",
              )
            : t(
                "Anyone with the link can follow you on a web page, without the app: time, lengths or exercise, calories and your heart rate when a watch sends it.",
              )}
        </Text>
        <Text style={styles.body}>
          {t(
            "The link stops working one hour after you finish, or as soon as you stop sharing. Then your positions are deleted.",
          )}
        </Text>
        <View style={styles.heartRow}>
          <View style={styles.heartWords}>
            <Text style={styles.heartTitle}>{t("Show my heart rate")}</Text>
            <Text style={styles.body}>
              {t(
                "Off: nobody sees your heart rate. On: they see it when a watch sends it.",
              )}
            </Text>
          </View>
          <Switch
            value={heart}
            onValueChange={onHeart}
            disabled={starting}
            accessibilityLabel={t("Show my heart rate")}
            testID="live-share-heart"
          />
        </View>
        {problem !== null && (
          <Text style={styles.problem} accessibilityLiveRegion="polite">
            {problem}
          </Text>
        )}
        <View style={styles.buttons}>
          <Tap
            style={styles.button}
            onPress={onCancel}
            disabled={starting}
            accessibilityRole="button"
            testID="live-share-not-now"
          >
            <Text style={styles.buttonText}>{t("Not now")}</Text>
          </Tap>
          <Tap
            style={[styles.button, styles.primary, starting && styles.off]}
            onPress={onShare}
            disabled={starting}
            accessibilityRole="button"
            accessibilityState={{ disabled: starting, busy: starting }}
            testID="live-share-confirm"
          >
            <Text style={[styles.buttonText, styles.primaryText]}>
              {t("Share link")}
            </Text>
          </Tap>
        </View>
        <Tap
          style={[styles.button, styles.wide, starting && styles.off]}
          onPress={onSend}
          disabled={starting}
          accessibilityRole="button"
          accessibilityState={{ disabled: starting, busy: starting }}
          testID="live-share-send-in-muw"
        >
          <Text style={styles.buttonText}>{t("Send in MuW")}</Text>
        </Tap>
        <Tap
          style={[styles.button, styles.wide, starting && styles.off]}
          onPress={onFeed}
          disabled={starting}
          accessibilityRole="button"
          accessibilityState={{ disabled: starting, busy: starting }}
          testID="live-share-in-feed"
        >
          <Text style={styles.buttonText}>{t("Live in the Feed")}</Text>
        </Tap>
      </View>
    </View>
  );
}

const DOT = 8;

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "center",
  },
  chip: {
    minHeight: MIN_TAP_SIZE,
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    paddingHorizontal: space.lg,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.borderStrong,
    backgroundColor: color.surfaceRaised,
  },
  live: {
    borderColor: color.warning,
  },
  dot: {
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    backgroundColor: color.warning,
  },
  chipText: {
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
  signIn: {
    minHeight: MIN_TAP_SIZE,
    textAlignVertical: "center",
    lineHeight: MIN_TAP_SIZE,
    color: color.textMuted,
    fontSize: fontSize.small,
  },
  fill: {
    flex: 1,
  },
  backdrop: {
    flexGrow: 1,
  },
  sheet: {
    paddingHorizontal: space.lg,
    paddingTop: space.lg,
    gap: space.md,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: color.hairline,
    backgroundColor: color.surface,
  },
  title: {
    ...font.heading,
    color: color.text,
  },
  body: {
    color: color.textMuted,
    fontSize: fontSize.body,
  },
  problem: {
    color: color.error,
    fontSize: fontSize.small,
  },
  buttons: {
    flexDirection: "row",
    gap: space.sm,
  },
  button: {
    flex: 1,
    minHeight: MIN_TAP_SIZE,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.borderStrong,
    backgroundColor: color.surfaceRaised,
  },
  wide: {
    flex: 0,
  },
  heartRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
  },
  heartWords: {
    flex: 1,
    gap: space.xs,
  },
  heartTitle: {
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
  primary: {
    borderColor: color.text,
    backgroundColor: color.text,
  },
  off: {
    opacity: 0.5,
  },
  buttonText: {
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
  primaryText: {
    color: color.background,
  },
});
