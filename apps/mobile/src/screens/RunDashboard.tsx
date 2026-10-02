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
 * «Pocket» beside it; paused, «Stop» to hold and «Resume»; at the end of a
 * route, «Finish».
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
        <Text style={styles.pausedText} accessibilityLiveRegion="polite">
          {auto ? "Paused: you stopped moving" : "Paused"}
        </Text>
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
      <View style={styles.side}>{pocket}</View>
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
      <View style={styles.side} />
    </View>
  );
}

const PAGES: readonly { page: RunPage; title: string }[] = [
  { page: "map", title: "Map" },
  { page: "data", title: "Data" },
];

/** The two pages by name, in the order they lie in: touched, or swiped to. */
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
            style={styles.tab}
            onPress={() => onPage(each.page)}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={each.title}
          >
            <Text style={[styles.tabText, selected && styles.tabTextSelected]}>
              {each.title}
            </Text>
            <View style={[styles.mark, selected && styles.markSelected]} />
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
 * back. The run's switches live here: they are set once, not while running.
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
        {buttons}
        <PageTabs page="data" onPage={(page) => page === "map" && toMap.close()} />
        {dark}
      </Animated.View>
    </Modal>
  );
}

/** Each whole kilometre, its pace, and how it went against the one before. */
function Splits({ track }: { track: Track }) {
  const rows = useMemo(() => splits(track), [track]);
  return (
    <View style={styles.splits}>
      <View style={styles.splitRow}>
        <Text style={[styles.splitHead, styles.splitKm]}>Km</Text>
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
      <Text style={[styles.switchState, on && styles.switchStateOn]}>
        {on ? "On" : "Off"}
      </Text>
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
    fontSize: fontSize.small,
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
    alignItems: "center",
    gap: space.md,
  },
  // As wide as each other, so «Pause» stays in the middle.
  side: {
    flex: 1,
    alignItems: "flex-start",
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
  pausedText: {
    color: color.textMuted,
    fontSize: fontSize.small,
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
    justifyContent: "center",
    gap: space.xl,
  },
  tab: {
    minWidth: MIN_TAP_SIZE,
    alignItems: "center",
    gap: space.xs,
    paddingTop: space.xs,
  },
  tabText: {
    color: color.textMuted,
    fontSize: fontSize.small,
    fontWeight: fontWeight.semibold,
  },
  // The page on screen is told by light, not by yellow: that is the route's.
  tabTextSelected: {
    color: color.text,
  },
  mark: {
    width: space.xl,
    height: 3,
    borderRadius: radius.pill,
  },
  markSelected: {
    backgroundColor: color.text,
  },
  splits: {
    flex: 1,
    minHeight: MIN_TAP_SIZE * 2,
  },
  splitRow: {
    flexDirection: "row",
    paddingVertical: space.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: color.border,
  },
  splitKm: {
    flex: 1,
  },
  splitCell: {
    flex: 1,
    textAlign: "right",
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
  switchState: {
    color: color.textFaint,
    fontSize: fontSize.small,
    fontWeight: fontWeight.semibold,
  },
  switchStateOn: {
    color: color.text,
  },
});
