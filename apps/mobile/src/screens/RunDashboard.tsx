import {
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Animated,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaInsetsContext } from "react-native-safe-area-context";

import { openMusic } from "../navigation/music";
import {
  pauseRun,
  resumeRun,
  setAutoPause,
  setVoice,
  useRunControl,
} from "../navigation/runControl";
import { changeLabel, splits } from "../navigation/runMetrics";
import { paceClock } from "../navigation/runStats";
import { openPause, type Track } from "../navigation/trackRecorder";
import { usePocketMode } from "../navigation/usePocketMode";
import {
  color,
  fontSize,
  fontWeight,
  MIN_TAP_SIZE,
  radius,
  space,
} from "../theme/tokens";
import { VoiceSetting } from "../voice/VoiceSetting";
import { Countdown } from "./Countdown";
import { HoldButton, ROUND_BUTTON } from "./HoldButton";
import { confirmPocketMode, PocketScreen } from "./PocketScreen";
import {
  RouteBar,
  type RouteProgress,
  RunGrid,
  type RunNumbers,
  RunStrip,
  useRunNumbers,
} from "./RunPanel";

/**
 * A run in progress, with a route or without one (TASK-169, ADR-0137): two
 * pages a swipe apart. «Map» is the map with the turn over it and, under
 * it, a few numbers; «Data» is every number, the kilometres one by one and
 * the run's switches, with no map. Both have the same way to pause, to go
 * on and to stop.
 */

export type RunPage = "map" | "data";

/** A finger that moved this far sideways, and less up or down, is a swipe. */
export const SWIPE_M = 48;

/** The page a drag of (`dx`, `dy`) points asks for, or null: to the left
 * for «Data», which lies on the right, and to the right for «Map». */
export function swipedTo(dx: number, dy: number): RunPage | null {
  if (Math.abs(dx) < SWIPE_M || Math.abs(dx) < 2 * Math.abs(dy)) {
    return null;
  }
  return dx < 0 ? "data" : "map";
}

/** Whether a drag has gone sideways enough to be taken from what is under it. */
function sideways(dx: number, dy: number): boolean {
  return Math.abs(dx) > 16 && Math.abs(dx) > 2 * Math.abs(dy);
}

const NO_INSETS = { top: 0, right: 0, bottom: 0, left: 0 };

/** How long the page of the data takes to slide in or out. */
const SLIDE_MS = 220;

type Props = {
  /** The line run so far. */
  track: Track;
  /** The GPS is on and the run is not over. */
  live: boolean;
  /** Along a route: what is left of it. */
  route?: RouteProgress;
  /** The route is run to its end: only «Finish» is left. */
  arrived?: boolean;
  /** On «Data», in place of the map: the next turn, or where the start is. */
  heading?: ReactNode;
  /** The run ends: «Stop» held, or «Finish». */
  onStop: () => void;
};

export function RunCard({
  track,
  live,
  route,
  arrived = false,
  heading,
  onStop,
}: Props) {
  const numbers = useRunNumbers(track, live && !arrived, route);
  const control = useRunControl();
  const pocket = usePocketMode(live && !arrived);
  const [page, setPage] = useState<RunPage>("map");
  const paused = openPause(track) !== null;
  // One function for the whole run: a swipe in progress keeps its page.
  const toMap = useCallback(() => setPage("map"), []);
  const toData = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_event, { dx, dy }) => sideways(dx, dy),
        onPanResponderRelease: (_event, { dx, dy }) => {
          if (swipedTo(dx, dy) === "data") {
            setPage("data");
          }
        },
      }),
    [],
  );

  const buttons = (
    <RunButtons
      live={live}
      started={track.fixes.length > 0}
      arrived={arrived}
      paused={paused}
      auto={control.auto}
      onPocket={() => confirmPocketMode(pocket.enter)}
      onStop={onStop}
    />
  );
  // One screen is dark at a time: over the page that is open.
  const dark = <PocketScreen on={pocket.on} onExit={pocket.exit} />;

  return (
    <View style={styles.card} {...toData.panHandlers}>
      {paused ? (
        <>
          <Kilometres numbers={numbers} />
          <RunGrid numbers={numbers} />
        </>
      ) : (
        <RunStrip numbers={numbers} />
      )}
      {route && <RouteBar route={route} numbers={numbers} />}
      {buttons}
      <PageTabs page={page} onPage={setPage} />
      {page === "map" && dark}
      <Countdown />
      <DataPage
        open={page === "data"}
        onClose={toMap}
        track={track}
        numbers={numbers}
        route={route}
        heading={heading}
        buttons={buttons}
        dark={dark}
      />
    </View>
  );
}

function Kilometres({
  numbers,
  hero = false,
}: {
  numbers: RunNumbers;
  hero?: boolean;
}) {
  return (
    <View
      style={styles.km}
      accessible
      accessibilityLabel={`Distance: ${numbers.km} km`}
    >
      <Text
        style={hero ? styles.kmHero : styles.kmNumber}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {numbers.km}
      </Text>
      <Text style={styles.kmUnit}>kilometres</Text>
    </View>
  );
}

type ButtonsProps = {
  live: boolean;
  /** The run has its first fix: there is something to pause. */
  started: boolean;
  arrived: boolean;
  paused: boolean;
  /** Paused by standing still, not by the runner. */
  auto: boolean;
  onPocket: () => void;
  onStop: () => void;
};

/**
 * The way out and the way on. Before the first fix and without the GPS,
 * «Stop» as it was (nothing is lost by a touch); running, «Pause» with
 * «Pocket» on one side and «Music», which opens Spotify (TASK-173), on the
 * other; paused, «Stop» to hold and «Resume»; at the end of a route,
 * «Finish».
 */
function RunButtons({
  live,
  started,
  arrived,
  paused,
  auto,
  onPocket,
  onStop,
}: ButtonsProps) {
  const pocket = (
    <Pressable
      style={styles.small}
      onPress={onPocket}
      accessibilityRole="button"
      accessibilityLabel="Pocket mode"
    >
      <Text style={styles.pillText}>Pocket</Text>
    </Pressable>
  );
  if (arrived || !live || (!started && !paused)) {
    return (
      <View style={styles.waiting}>
        {live && !arrived && pocket}
        <Pressable style={styles.pill} onPress={onStop} accessibilityRole="button">
          {/* Both end the run and, along a route, show its score (TASK-113). */}
          <Text style={styles.pillText}>{arrived ? "Finish" : "Stop"}</Text>
        </Pressable>
      </View>
    );
  }
  if (paused) {
    return (
      <View style={styles.pausedBox}>
        <View style={styles.pausedChip}>
          <View style={styles.chipBars} accessibilityElementsHidden>
            <View style={styles.chipBar} />
            <View style={styles.chipBar} />
          </View>
          <Text style={styles.pausedText} accessibilityLiveRegion="polite">
            {auto ? "Paused: you stopped moving" : "Paused"}
          </Text>
        </View>
        <View style={styles.rounds}>
          <HoldButton onHeld={onStop} />
          <View style={styles.round}>
            <Pressable
              style={[styles.circle, styles.resume]}
              onPress={resumeRun}
              accessibilityRole="button"
              accessibilityLabel="Resume"
            >
              <View style={styles.play} />
            </Pressable>
            <Text style={styles.roundLabel}>Resume</Text>
          </View>
        </View>
      </View>
    );
  }
  return (
    <View style={styles.running}>
      <View style={styles.side}>
        <SideButton label="Pocket" a11yLabel="Pocket mode" onPress={onPocket}>
          <PhoneIcon />
        </SideButton>
      </View>
      <View style={styles.round}>
        <Pressable
          style={[styles.circle, styles.pause]}
          onPress={pauseRun}
          accessibilityRole="button"
          accessibilityLabel="Pause"
        >
          <View style={styles.bars}>
            <View style={styles.bar} />
            <View style={styles.bar} />
          </View>
        </Pressable>
        <Text style={styles.roundLabel}>Pause</Text>
      </View>
      <View style={[styles.side, styles.sideEnd]}>
        <SideButton
          label="Music"
          a11yHint="Opens Spotify"
          onPress={() => void openMusic()}
        >
          <Text style={styles.note}>♪</Text>
        </SideButton>
      </View>
    </View>
  );
}

/** The size of «Pocket» and «Music»: smaller than «Pause», which is the
 * button of the run, and still more than the smallest tap. */
export const SIDE_BUTTON = MIN_TAP_SIZE + space.md;

/** A round button beside «Pause», with its name under it, as «Stop» and
 * «Resume» have (TASK-204). */
function SideButton({
  label,
  a11yLabel = label,
  a11yHint,
  onPress,
  children,
}: {
  label: string;
  a11yLabel?: string;
  a11yHint?: string;
  onPress: () => void;
  children: ReactNode;
}) {
  return (
    <View style={styles.round}>
      <View style={styles.sideBox}>
        <Pressable
          style={styles.sideCircle}
          onPress={onPress}
          accessibilityRole="button"
          accessibilityLabel={a11yLabel}
          accessibilityHint={a11yHint}
        >
          {children}
        </Pressable>
      </View>
      <Text style={styles.roundLabel}>{label}</Text>
    </View>
  );
}

/** A phone, drawn: the screen that goes dark in pocket mode. */
function PhoneIcon() {
  return (
    <View style={styles.phone}>
      <View style={styles.phoneBar} />
    </View>
  );
}

/** «Map» and «Data»: a thumb's height, not the smallest a control may be. */
export const PAGE_TAB_HEIGHT = MIN_TAP_SIZE + space.md;

const PAGES: readonly { page: RunPage; title: string }[] = [
  { page: "map", title: "Map" },
  { page: "data", title: "Data" },
];

/**
 * The two pages by name, in the order they lie in: touched, or swiped to.
 * Two buttons as wide as the card and taller than the smallest tap (TASK-186):
 * they are hit while running, without looking for them.
 */
function PageTabs({
  page,
  onPage,
}: {
  page: RunPage;
  onPage: (page: RunPage) => void;
}) {
  return (
    <View style={styles.tabs} accessibilityRole="tablist">
      {PAGES.map((each) => {
        const selected = each.page === page;
        return (
          <Pressable
            key={each.page}
            style={[styles.tab, selected && styles.tabSelected]}
            onPress={() => onPage(each.page)}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={each.title}
          >
            <Text style={[styles.tabText, selected && styles.tabTextSelected]}>
              {each.title}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

type DataProps = {
  open: boolean;
  onClose: () => void;
  track: Track;
  numbers: RunNumbers;
  route?: RouteProgress;
  heading?: ReactNode;
  buttons: ReactNode;
  dark: ReactNode;
};

/**
 * «Data»: the page with every number and no map. It lies to the right of
 * the map and slides over it; a swipe to the right, or «Map», slides it
 * back. The run's switches live here: they are set once, not while running;
 * under «Voice», the language and the voice it speaks with (TASK-209).
 */
function DataPage({
  open,
  onClose,
  track,
  numbers,
  route,
  heading,
  buttons,
  dark,
}: DataProps) {
  const { width } = useWindowDimensions();
  const insets = useContext(SafeAreaInsetsContext) ?? NO_INSETS;
  const control = useRunControl();
  // Where the page is: a screen to the right while it is away.
  const [x] = useState(() => new Animated.Value(width));

  useEffect(() => {
    if (open) {
      x.setValue(width);
      Animated.timing(x, {
        toValue: 0,
        duration: SLIDE_MS,
        useNativeDriver: true,
      }).start();
    }
  }, [open, width, x]);

  const toMap = useMemo(() => {
    /** The page slides away, then it is closed: never cut short. */
    const close = () =>
      Animated.timing(x, {
        toValue: width,
        duration: SLIDE_MS,
        useNativeDriver: true,
      }).start(onClose);
    return {
      close,
      pan: PanResponder.create({
        onMoveShouldSetPanResponder: (_event, { dx, dy }) => dx > 0 && sideways(dx, dy),
        // The page follows the finger to the right.
        onPanResponderMove: (_event, { dx }) => x.setValue(Math.max(0, dx)),
        onPanResponderRelease: (_event, { dx, dy }) => {
          if (swipedTo(dx, dy) === "map") {
            close();
          } else {
            Animated.timing(x, {
              toValue: 0,
              duration: SLIDE_MS,
              useNativeDriver: true,
            }).start();
          }
        },
      }),
    };
  }, [onClose, width, x]);

  return (
    <Modal
      visible={open}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={toMap.close}
    >
      <Animated.View
        style={[
          styles.page,
          {
            paddingTop: insets.top + space.md,
            paddingBottom: insets.bottom + space.md,
            transform: [{ translateX: x }],
          },
        ]}
        {...toMap.pan.panHandlers}
      >
        {heading}
        <Kilometres numbers={numbers} hero />
        {route && <RouteBar route={route} numbers={numbers} />}
        <RunGrid numbers={numbers} />
        <Splits track={track} />
        <View style={styles.switches}>
          <Switch label="Auto-pause" on={control.autoPause} onChange={setAutoPause} />
          <Switch label="Voice" on={control.voice} onChange={setVoice} />
        </View>
        <VoiceSetting />
        {buttons}
        <PageTabs page="data" onPage={(page) => page === "map" && toMap.close()} />
        {dark}
      </Animated.View>
    </Modal>
  );
}

/** How long the bar of a kilometre of `seconds` is, 0 to 1, among
 * kilometres run in `fastest` to `slowest` seconds: the fastest is whole,
 * the slowest still shows. */
export function splitShare(seconds: number, fastest: number, slowest: number): number {
  if (slowest <= fastest) {
    return 1;
  }
  return (
    MIN_SPLIT_SHARE +
    (1 - MIN_SPLIT_SHARE) * ((slowest - seconds) / (slowest - fastest))
  );
}

/** The bar of the slowest kilometre, as a share of the fastest one's. */
const MIN_SPLIT_SHARE = 0.35;

/** Each whole kilometre, its pace, and how it went against the one before;
 * a bar beside each, longer the faster it was (TASK-204). */
function Splits({ track }: { track: Track }) {
  const rows = useMemo(() => splits(track), [track]);
  const fastest = Math.min(...rows.map((row) => row.seconds));
  const slowest = Math.max(...rows.map((row) => row.seconds));
  return (
    <View style={styles.splits}>
      <View style={styles.splitRow}>
        <Text style={[styles.splitHead, styles.splitKm]}>Km</Text>
        <View style={styles.splitBarCell} />
        <Text style={[styles.splitHead, styles.splitCell]}>Pace</Text>
        <Text style={[styles.splitHead, styles.splitCell]}>Change</Text>
      </View>
      {rows.length === 0 ? (
        <Text style={styles.noSplits}>Your first kilometre will show here.</Text>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* The last one first: it is the one just run. */}
          {[...rows].reverse().map((row) => (
            <View
              key={row.km}
              style={styles.splitRow}
              accessible
              accessibilityLabel={
                `Kilometre ${row.km}: ${paceClock(row.seconds)}` +
                (row.change === null ? "" : `, ${changeLabel(row.change)}`)
              }
            >
              <Text style={[styles.splitText, styles.splitKm]}>{row.km}</Text>
              <View style={styles.splitBarCell}>
                <View
                  testID={`split-bar-${row.km}`}
                  style={[
                    styles.splitBar,
                    rows.length > 1 && row.seconds === fastest && styles.splitBarBest,
                    {
                      width: `${Math.round(splitShare(row.seconds, fastest, slowest) * 100)}%`,
                    },
                  ]}
                />
              </View>
              <Text style={[styles.splitText, styles.splitCell]}>
                {paceClock(row.seconds)}
              </Text>
              <Text style={[styles.splitChange, styles.splitCell]}>
                {row.change === null ? "" : changeLabel(row.change)}
              </Text>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

function Switch({
  label,
  on,
  onChange,
}: {
  label: string;
  on: boolean;
  onChange: (on: boolean) => void;
}) {
  return (
    <Pressable
      style={[styles.switch, on && styles.switchOn]}
      onPress={() => onChange(!on)}
      accessibilityRole="switch"
      accessibilityState={{ checked: on }}
      accessibilityLabel={label}
    >
      <Text style={styles.switchText}>{label}</Text>
      <View style={[styles.track, on && styles.trackOn]}>
        <View style={[styles.knob, on && styles.knobOn]} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: space.md,
  },
  page: {
    flex: 1,
    gap: space.md,
    paddingHorizontal: space.lg,
    backgroundColor: color.surface,
  },
  km: {
    alignItems: "center",
  },
  // Not the yellow: that is the route's and the main action's (ADR-0046).
  kmNumber: {
    color: color.text,
    fontSize: fontSize.display,
    fontWeight: fontWeight.bold,
    fontVariant: ["tabular-nums"],
  },
  kmHero: {
    color: color.text,
    fontSize: fontSize.hero,
    fontWeight: fontWeight.bold,
    fontVariant: ["tabular-nums"],
  },
  kmUnit: {
    color: color.textMuted,
    fontSize: fontSize.label,
    fontWeight: fontWeight.semibold,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  waiting: {
    flexDirection: "row",
    gap: space.sm,
  },
  pill: {
    flex: 1,
    minHeight: MIN_TAP_SIZE,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: space.xl,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.borderStrong,
    backgroundColor: color.surfaceRaised,
  },
  pillText: {
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
  running: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: space.md,
  },
  // As wide as each other, so «Pause» stays in the middle.
  side: {
    flex: 1,
    alignItems: "flex-start",
  },
  sideEnd: {
    alignItems: "flex-end",
  },
  small: {
    minHeight: MIN_TAP_SIZE,
    justifyContent: "center",
    paddingHorizontal: space.lg,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.borderStrong,
    backgroundColor: color.surfaceRaised,
  },
  circle: {
    width: ROUND_BUTTON,
    height: ROUND_BUTTON,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
  },
  // Light, not yellow: pausing does not make the route.
  pause: {
    backgroundColor: color.text,
  },
  bars: {
    flexDirection: "row",
    gap: space.sm,
  },
  bar: {
    width: space.sm,
    height: space.xl,
    borderRadius: 2,
    backgroundColor: color.background,
  },
  // Going on is the main action of a paused run.
  resume: {
    backgroundColor: color.accent,
  },
  // A triangle pointing right, of borders.
  play: {
    width: 0,
    height: 0,
    marginLeft: space.xs,
    borderTopWidth: space.md,
    borderBottomWidth: space.md,
    borderLeftWidth: space.xl - space.xs,
    borderTopColor: "transparent",
    borderBottomColor: "transparent",
    borderLeftColor: color.onAccent,
  },
  pausedBox: {
    alignItems: "center",
    gap: space.sm,
  },
  // The state of the run, said where the eye already is: over its buttons.
  pausedChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    paddingVertical: space.xs + 2,
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.borderStrong,
    backgroundColor: color.surfaceRaised,
  },
  chipBars: {
    flexDirection: "row",
    gap: 3,
  },
  chipBar: {
    width: 3,
    height: space.md,
    borderRadius: 1,
    backgroundColor: color.text,
  },
  pausedText: {
    color: color.text,
    fontSize: fontSize.small,
    fontWeight: fontWeight.semibold,
  },
  // As tall as «Pause»: the circles and the names under them line up.
  sideBox: {
    height: ROUND_BUTTON,
    justifyContent: "center",
  },
  sideCircle: {
    width: SIDE_BUTTON,
    height: SIDE_BUTTON,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.borderStrong,
    backgroundColor: color.surfaceRaised,
  },
  phone: {
    width: 16,
    height: 26,
    alignItems: "center",
    justifyContent: "flex-end",
    paddingBottom: 3,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: color.text,
  },
  phoneBar: {
    width: 6,
    height: 2,
    borderRadius: 1,
    backgroundColor: color.text,
  },
  note: {
    color: color.text,
    fontSize: fontSize.title,
    fontWeight: fontWeight.bold,
    lineHeight: fontSize.title + space.xs,
  },
  rounds: {
    flexDirection: "row",
    justifyContent: "center",
    gap: space.xxl * 2,
  },
  round: {
    alignItems: "center",
    gap: space.xs,
  },
  roundLabel: {
    color: color.textMuted,
    fontSize: fontSize.small,
    fontWeight: fontWeight.semibold,
  },
  tabs: {
    flexDirection: "row",
    padding: space.xs,
    gap: space.xs,
    borderRadius: radius.pill,
    backgroundColor: color.background,
  },
  tab: {
    flex: 1,
    minHeight: PAGE_TAB_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: "transparent",
  },
  // The page on screen is told by a lighter surface, not by yellow: that is
  // the route's.
  tabSelected: {
    backgroundColor: color.surfaceRaised,
    borderColor: color.borderStrong,
  },
  tabText: {
    color: color.textMuted,
    fontSize: fontSize.input,
    fontWeight: fontWeight.bold,
  },
  tabTextSelected: {
    color: color.text,
  },
  splits: {
    flex: 1,
    minHeight: MIN_TAP_SIZE * 2,
  },
  splitRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    paddingVertical: space.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: color.border,
  },
  splitKm: {
    width: space.xl,
  },
  splitCell: {
    width: space.xxl * 2,
    textAlign: "right",
  },
  splitBarCell: {
    flex: 1,
  },
  // Grey, and the fastest kilometre light: not yellow, which is the route's.
  splitBar: {
    height: space.sm,
    borderRadius: radius.pill,
    backgroundColor: color.borderStrong,
  },
  splitBarBest: {
    backgroundColor: color.text,
  },
  splitHead: {
    color: color.textMuted,
    fontSize: fontSize.detail,
  },
  splitText: {
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
    fontVariant: ["tabular-nums"],
  },
  splitChange: {
    color: color.textMuted,
    fontSize: fontSize.body,
    fontVariant: ["tabular-nums"],
  },
  noSplits: {
    paddingVertical: space.md,
    color: color.textFaint,
    fontSize: fontSize.small,
  },
  switches: {
    flexDirection: "row",
    gap: space.sm,
  },
  switch: {
    flex: 1,
    minHeight: MIN_TAP_SIZE,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: space.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.background,
  },
  switchOn: {
    borderColor: color.borderStrong,
  },
  switchText: {
    color: color.text,
    fontSize: fontSize.small,
    fontWeight: fontWeight.semibold,
  },
  // A switch as phones draw one: the knob on the right when it is on.
  track: {
    width: 40,
    height: 24,
    justifyContent: "center",
    paddingHorizontal: 3,
    borderRadius: radius.pill,
    backgroundColor: color.surfaceRaised,
  },
  trackOn: {
    backgroundColor: color.text,
  },
  knob: {
    width: 18,
    height: 18,
    borderRadius: radius.pill,
    backgroundColor: color.textMuted,
  },
  knobOn: {
    alignSelf: "flex-end",
    backgroundColor: color.background,
  },
});
