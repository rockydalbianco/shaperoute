import type {
  Direction,
  LatLon,
  LetterStyle,
  OutlinePoint,
  Shape,
} from "@shaperoute/shared-types";
import { StatusBar } from "expo-status-bar";
import { useMemo, useState } from "react";
import { Keyboard, StyleSheet, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { useActivitiesDoor } from "./src/activities/activitiesDoor";
import { ActivityCard } from "./src/activities/ActivityCard";
import { type Drawn, sameLine } from "./src/activities/recordedRun";
import { RunEnd } from "./src/activities/RunEnd";
import { useAdBeforeRoute } from "./src/ads/useAdBeforeRoute";
import { apiUrl } from "./src/api/apiUrl";
import {
  chooseStart,
  showsSearch,
  type Start,
  type StartMode,
} from "./src/location/startMode";
import {
  type PositionState,
  useCurrentPosition,
} from "./src/location/useCurrentPosition";
import { ExploredCard } from "./src/explore/ExploredCard";
import { useExplored } from "./src/explore/explored";
import { ExploreScreen } from "./src/explore/ExploreScreen";
import {
  loadRecentCities,
  remember,
  saveRecentCities,
} from "./src/explore/recentCities";
import { ThemedCard, themedGpx } from "./src/explore/ThemedCard";
import { startViewOf, useStartDirections } from "./src/explore/useStartDirections";
import { useThemedRoute } from "./src/explore/useThemedRoute";
import { FavoriteHeart } from "./src/favorites/FavoriteHeart";
import {
  drawnKeepable,
  exploredKeepable,
  themedKeepable,
} from "./src/favorites/favoriteRoute";
import { useFavoritesDoor } from "./src/favorites/favoritesDoor";
import { MapView } from "./src/map/MapView";
import {
  canResume,
  endFreeRun,
  type FreeRun,
  pendingFreeRun,
} from "./src/navigation/freeRun";
import { headingDeg } from "./src/navigation/runStats";
import {
  clearRun,
  endRun,
  pendingRun,
  type ScorableRun,
} from "./src/navigation/trackStore";
import { trackOf, useFreeRun } from "./src/navigation/useFreeRun";
import { trackOfNavigation, useNavigation } from "./src/navigation/useNavigation";
import type { Place } from "./src/places/photon";
import { choicesOf, type Picked, pickedIndex } from "./src/route/choices";
import { toDistanceM } from "./src/route/distance";
import { ImageEditsContext } from "./src/route/imageEdits";
import type { ChoiceKind } from "./src/route/problems";
import { DrawButton, RouteChoice, RouteOutcome } from "./src/route/RoutePanel";
import { shapeName, toShape } from "./src/route/shapeWords";
import { type ExportState, useGpxExport } from "./src/route/useGpxExport";
import { useImageOutline } from "./src/route/useImageOutline";
import {
  type AnyRouteRequest,
  type RouteState,
  sameRequest,
  useRouteRequest,
} from "./src/route/useRouteRequest";
import { useShapeReading } from "./src/route/useShapeReading";
import { checkWord } from "./src/route/wordInput";
import { ChooseScreen } from "./src/screens/ChooseScreen";
import { FeedScreen } from "./src/screens/FeedScreen";
import { FinishBanner, FinishCard } from "./src/screens/FinishScreen";
import {
  FreeFinishBanner,
  FreeFinishCard,
  FreeRunBanner,
  FreeRunCard,
} from "./src/screens/FreeRunScreen";
import { MapScreen } from "./src/screens/MapScreen";
import { NavigationBanner, NavigationCard } from "./src/screens/NavigateScreen";
import { Pager } from "./src/screens/Pager";
import { ProfileButton, ProfileLayer } from "./src/screens/ProfileLayer";
import { color } from "./src/theme/tokens";

/** A route without directions: one list, so navigation does not restart. */
const NO_DIRECTIONS: Direction[] = [];
/** No other routes on the map: one list, so the map is not told again. */
const NO_OTHERS: LatLon[][] = [];

/** The API on the PC that serves the app (ADR-0031); null if unknown. */
const API_URL = apiUrl();

/** The screens (TASK-051): what to draw, the map with the route, the
 * turn-by-turn along it (TASK-049), the run with its score (TASK-113), the
 * best routes near the start (TASK-126), a run without a route with its
 * end (TASK-149), and what runners publish (TASK-154, then TASK-118). */
type Screen =
  "choose" | "map" | "navigate" | "finish" | "explore" | "run" | "runFinish" | "feed";

/** The screens that are pages side by side, left to right, one swipe apart
 * (TASK-154, ADR-0124); the others take the whole screen. */
const PAGES: readonly Screen[] = ["feed", "choose", "explore"];

/** A run that ended, shown on the finish screen. */
type Finished = {
  run: ScorableRun;
  /** Its points, once: a new list would draw the line again. */
  line: ScorableRun["route"];
  /** Stopped just now, its route still on screen: it can go on. */
  resumable: boolean;
};

/** A route of "Explore" run with the directions asked for it (TASK-145). */
type ExploreRun = { points: LatLon[]; directions: Direction[]; similarity: number };

function finishedRun(run: ScorableRun, resumable: boolean): Finished {
  return { run, line: run.track.fixes.map((fix) => fix.point), resumable };
}

/** A run left without its score when the app was last open, if any. */
function leftRun(): Finished | null {
  const run = pendingRun();
  return run === null ? null : finishedRun(run, false);
}

/** A run without a route that ended (TASK-149). */
type FreeFinished = {
  run: FreeRun;
  /** Its points, once: a new list would draw the line again. */
  line: LatLon[];
  /** «Run» again would go on with its track. */
  resumable: boolean;
};

function freeFinishedRun(run: FreeRun, resumable: boolean): FreeFinished {
  return { run, line: run.track.fixes.map((fix) => fix.point), resumable };
}

/** A run without a route left when the app was last open, if any. */
function leftFreeRun(): FreeFinished | null {
  const run = pendingFreeRun();
  return run === null ? null : freeFinishedRun(run, canResume(run, Date.now()));
}

export default function App() {
  return (
    <SafeAreaProvider>
      {/* The account, and «Profile» over the app (TASK-115, TASK-154). */}
      <ProfileLayer apiUrl={API_URL}>
        <Sgrava />
      </ProfileLayer>
      {/* The app is dark: light status bar text on any phone setting. */}
      <StatusBar style="light" />
    </SafeAreaProvider>
  );
}

function Sgrava() {
  // A run still waiting for its score comes first (TASK-113).
  const [finished, setFinished] = useState<Finished | null>(leftRun);
  // Or a run without a route, closed with the app (TASK-149).
  const [freeFinished, setFreeFinished] = useState<FreeFinished | null>(() =>
    finished === null ? leftFreeRun() : null,
  );
  const [screenNow, setScreen] = useState<Screen>(() =>
    finished !== null ? "finish" : freeFinished !== null ? "runFinish" : "choose",
  );
  // A favorite opened from «Profile» (TASK-171) takes the map at once, over
  // the page it was opened from, as a route of "Explore" does.
  const {
    opened: favorite,
    close: closeFavorite,
    showList: showFavorites,
  } = useFavoritesDoor();
  // And so does a run opened from «My activities» (TASK-172).
  const {
    opened: activity,
    close: closeActivity,
    showList: showActivities,
    remove: removeActivity,
    record: recordRun,
    signedIn,
  } = useActivitiesDoor();
  const onPage = PAGES.includes(screenNow);
  const screen: Screen =
    (favorite !== null || activity !== null) && onPage ? "map" : screenNow;
  // A run of «My activities» on the map, as the end of a run shows one: its
  // route, and over it what was run.
  const reviewing = screen === "map" && activity !== null;
  const reviewed = useMemo(
    () =>
      activity === null
        ? null
        : {
            start: activity.track[0] ?? null,
            route: activity.points,
            others: NO_OTHERS,
            track: activity.track,
          },
    [activity],
  );
  const { position, refresh } = useCurrentPosition();
  const [startMode, setStartMode] = useState<StartMode>("gps");
  const [place, setPlace] = useState<Place | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [kind, setKind] = useState<ChoiceKind>("shape");
  const [shapeText, setShapeText] = useState("heart");
  const tableShape = toShape(shapeText);
  const shapeReading = useShapeReading(API_URL);
  // The table first; the AI only for other words (ADR-0012).
  const reading =
    tableShape === null && shapeText.trim() !== ""
      ? shapeReading.stateOf(shapeText)
      : null;
  const shape = tableShape ?? (reading?.status === "read" ? reading.shape : null);
  const [distanceText, setDistanceText] = useState("5");
  const distanceM = toDistanceM(distanceText);
  const [wordText, setWordText] = useState("");
  const wordCheck = checkWord(wordText, distanceM);
  const [letterStyle, setLetterStyle] = useState<LetterStyle>("round");
  const image = useImageOutline(API_URL);
  // Past RouteChoice to the image panel (TASK-079).
  const { edits, add, undo } = image;
  const imageEdits = useMemo(() => ({ ...edits, add, undo }), [edits, add, undo]);
  const routeRequest = useRouteRequest(API_URL);
  const { draw, cancel } = routeRequest;
  // A ready route waits behind the ad, if there is one (TASK-132).
  const state = useAdBeforeRoute(routeRequest.state);
  const gpx = useGpxExport(API_URL);
  const {
    explored: exploredRoute,
    open: openExplored,
    close: closeExplored,
  } = useExplored(API_URL);
  const explored = favorite ?? exploredRoute;
  // "Explore" for any city, and a shape through a theme's places (TASK-129).
  const [exploreCity, setExploreCity] = useState<Place | null>(null);
  // The cities chosen last, kept on the phone (TASK-134).
  const [recentCities, setRecentCities] = useState<Place[]>(loadRecentCities);
  const themedRoute = useThemedRoute(API_URL);
  const themedState = useAdBeforeRoute(themedRoute.state);
  const themed = { ...themedRoute, state: themedState };
  const themedExport = useMemo(
    () => (themed.state.status === "done" ? themedGpx(themed.state.result) : null),
    [themed.state],
  );

  const start = useMemo(
    () => chooseStart(startMode, position, place),
    [startMode, position, place],
  );

  // One of them (ADR-0051): the kinds not chosen are not sent. An image
  // sends the outline the engine traced and the user has seen (ADR-0069),
  // with the details drawn on it (TASK-079).
  const drawn:
    | { shape: Shape }
    | { word: string; style: LetterStyle }
    | { outline: OutlinePoint[]; strokes?: OutlinePoint[][] }
    | null =
    kind === "shape"
      ? shape !== null
        ? { shape }
        : null
      : kind === "word"
        ? wordCheck.ok
          ? { word: wordCheck.word, style: letterStyle }
          : null
        : image.state.status === "traced"
          ? {
              outline: image.state.outline.points,
              strokes: image.state.outline.strokes,
            }
          : null;
  const request: AnyRouteRequest | null =
    start && drawn !== null && distanceM !== null
      ? { start: start.point, ...drawn, distance_m: distanceM, activity: "running" }
      : null;
  // A new start, shape, word or distance leaves the last answer behind.
  const view: RouteState =
    request && state.status !== "idle" && sameRequest(state.request, request)
      ? state
      : { status: "idle" };
  // The routes to choose from (TASK-093): what follows shows, runs and
  // exports the one chosen; a new result starts from the engine's.
  const [picked, setPicked] = useState<Picked>(null);
  const answer = view.status === "done" ? view.result : null;
  const choices = useMemo(() => (answer ? choicesOf(answer) : []), [answer]);
  const chosenIndex = pickedIndex(picked, answer);
  const chosen = choices[chosenIndex] ?? null;
  const shown: RouteState =
    view.status === "done" && chosen !== null ? { ...view, result: chosen } : view;
  const others = useMemo(
    () =>
      choices.length < 2
        ? NO_OTHERS
        : choices.filter((_, i) => i !== chosenIndex).map((other) => other.points),
    [choices, chosenIndex],
  );
  // The export state of another route does not belong on screen.
  const exporting: ExportState =
    chosen !== null && gpx.state.status !== "idle" && gpx.state.result === chosen
      ? gpx.state
      : { status: "idle" };
  const themedExporting: ExportState =
    themedExport !== null &&
    gpx.state.status !== "idle" &&
    gpx.state.result === themedExport.result
      ? gpx.state
      : { status: "idle" };

  // Start on a route of "Explore": its directions are asked for first,
  // then it is the route followed, in place of the drawn one (TASK-145).
  const startDirections = useStartDirections(API_URL);
  const [exploreRun, setExploreRun] = useState<ExploreRun | null>(null);
  const followed = exploreRun ?? chosen;
  const navigating = screen === "navigate" && followed !== null;
  const navigation = useNavigation(
    followed?.points ?? null,
    followed?.directions ?? NO_DIRECTIONS,
    navigating,
    followed?.similarity,
  );
  const finishing = screen === "finish" && finished !== null;
  // A run without a route (TASK-149): the map follows the runner and draws
  // the line run so far.
  const running = screen === "run";
  const freeRun = useFreeRun(running);
  const freeTrack = trackOf(freeRun);
  const freeLine = useMemo(() => freeTrack.fixes.map((fix) => fix.point), [freeTrack]);
  const freeStart =
    freeTrack.fixes[0]?.point ?? (position.status === "ok" ? position.point : null);
  const freeFinishing = screen === "runFinish" && freeFinished !== null;
  // Where the runner is heading, with a route or without (TASK-164): the
  // arrow on the map.
  const runTrack = navigating ? trackOfNavigation(navigation) : freeTrack;
  const heading = useMemo(() => headingDeg(runTrack), [runTrack]);
  // A route of "Explore" on the map, in place of the drawn one (TASK-126).
  const theming =
    screen === "map" &&
    !reviewing &&
    explored === null &&
    themed.state.status !== "idle";
  const exploring = screen === "map" && !reviewing && explored !== null;
  const exploredExport: ExportState =
    explored?.status === "done" &&
    gpx.state.status !== "idle" &&
    gpx.state.result === explored.result
      ? gpx.state
      : { status: "idle" };
  // The route on the map as a favorite keeps it (TASK-171), made once per
  // route: the heart knows it by its key.
  const startPlace = start?.source === "search" ? start.label : null;
  const drawnRequest = view.status === "done" ? view.request : null;
  const drawnFavorite = useMemo(
    () =>
      drawnRequest && chosen ? drawnKeepable(drawnRequest, chosen, startPlace) : null,
    [drawnRequest, chosen, startPlace],
  );
  const exploredFavorite = useMemo(
    () =>
      exploredRoute?.status === "done"
        ? exploredKeepable(exploredRoute.route, exploredRoute.detail)
        : null,
    [exploredRoute],
  );
  const themedFavorite = useMemo(
    () => (themed.state.status === "done" ? themedKeepable(themed.state.result) : null),
    [themed.state],
  );
  const onMap =
    screen !== "map" || reviewing
      ? null
      : theming
        ? themedFavorite
        : exploring
          ? (favorite?.keepable ?? exploredFavorite)
          : drawnFavorite;

  /** Stop or Finish: the run ends, and with a line to judge shows its score. */
  function onEndRun() {
    const run = endRun();
    if (run === null) {
      setScreen("map");
      return;
    }
    setFinished(finishedRun(run, run.status !== "arrived"));
    setScreen("finish");
  }

  /** Stop on a run without a route: its end, when there is a line to show. */
  function onStopFreeRun() {
    const run = endFreeRun();
    if (run === null) {
      setScreen("choose");
      return;
    }
    setFreeFinished(freeFinishedRun(run, true));
    setScreen("runFinish");
  }

  /** What the route of a run draws, while the app still has that route: a
   * run left from another opening has only its line. */
  function drawnBy(route: LatLon[]): Drawn | null {
    const kept = [
      drawnFavorite,
      exploredFavorite,
      themedFavorite,
      favorite?.keepable ?? null,
    ].find((known) => known != null && sameLine(known.request.points, route));
    return kept?.request ?? null;
  }

  /** The end of a run without a route leaves the screen. */
  function leaveFreeFinish() {
    setFreeFinished(null);
    setScreen("choose");
  }

  /** «Done», with nobody signed in: with no score to wait for, the run
   * leaves the phone at once. */
  function onFreeDone() {
    clearRun();
    leaveFreeFinish();
  }

  /** The end of a run along a route leaves the screen. */
  function leaveFinish() {
    setFinished(null);
    // A run of "Explore" goes back to its route's card.
    setScreen(exploreRun !== null || view.status === "done" ? "map" : "choose");
  }

  /** «Done», with nobody signed in. */
  function onFinishDone(settled: boolean) {
    // Without its score the run stays in the file, for the next opening.
    if (settled) {
      clearRun();
    }
    leaveFinish();
  }

  /** «Save» (TASK-172): the run that ended goes to «My activities», where
   * the API scores it by itself, and leaves the screen. False when the
   * phone could not keep it: the run stays where it is. */
  function onSaveRun(): boolean {
    const kept =
      finished !== null
        ? recordRun(finished.run, drawnBy(finished.run.route))
        : freeFinished !== null && recordRun(freeFinished.run, null);
    if (kept) {
      onDiscardRun();
    }
    return kept;
  }

  /** «Discard», or what follows «Save»: the run leaves the file of the run
   * in progress, with its score or without, and the screen. */
  function onDiscardRun() {
    clearRun();
    if (finished !== null) {
      leaveFinish();
    } else {
      leaveFreeFinish();
    }
  }

  /** "Explore" leaves the map: its route, its directions, its run. */
  function closeExplore() {
    closeExplored();
    closeFavorite();
    themed.close();
    startDirections.reset();
    setExploreRun(null);
  }

  /** Start on a route of "Explore": its directions first (TASK-145). */
  function onStartExplore(route: { points: LatLon[]; similarity: number }) {
    startDirections.start(route.points, (directions) => {
      setExploreRun({ points: route.points, directions, similarity: route.similarity });
      setScreen("navigate");
    });
  }

  function onDraw() {
    // The decimal pad has no return key: drawing closes it.
    Keyboard.dismiss();
    // The drawn route takes the map back from "Explore".
    closeExplore();
    // The same route already drawn is shown again, not asked for again.
    if (request && view.status !== "done") {
      draw(request);
    }
    setScreen("map");
  }

  /** A run of «My activities» leaves the map for the list it came from. */
  function onActivityList() {
    closeActivity();
    showActivities();
  }

  function onBack() {
    if (reviewing) {
      onActivityList();
      return;
    }
    if (favorite !== null) {
      // Back to the list it was opened from, over the page left under it.
      closeExplore();
      if (!onPage) {
        setScreen("choose");
      }
      showFavorites();
      return;
    }
    if (theming || exploring) {
      closeExplore();
      setScreen("explore");
      return;
    }
    // Nobody is left watching the wait: drop it, as Cancel does.
    if (view.status === "waiting") {
      cancel();
    }
    setScreen("choose");
  }

  function onPickShape(picked: Shape) {
    setShapeText(shapeName(picked));
    setScreen("choose");
  }

  // The page on screen; -1 while the map or a run takes the whole screen.
  const page = PAGES.indexOf(screen);

  return (
    <View style={styles.screen}>
      <MapScreen
        active={screen === "map" || navigating || finishing || running || freeFinishing}
        onBack={onBack}
        mapError={mapError}
        banner={
          finishing ? (
            <FinishBanner />
          ) : freeFinishing ? (
            <FreeFinishBanner />
          ) : running ? (
            <FreeRunBanner state={freeRun} />
          ) : navigating ? (
            <NavigationBanner state={navigation} />
          ) : undefined
        }
        map={
          <MapView
            style={styles.map}
            start={
              running
                ? freeStart
                : freeFinishing
                  ? (freeFinished.line[0] ?? null)
                  : theming
                    ? themed.state.status === "done"
                      ? themed.state.result.centre
                      : null
                    : exploring
                      ? explored.route.start
                      : (exploreRun?.points[0] ?? start?.point ?? null)
            }
            stops={
              theming && themed.state.status === "done"
                ? themed.state.result.stops
                : null
            }
            route={
              finishing
                ? finished.run.route
                : running || freeFinishing
                  ? null
                  : theming
                    ? themed.state.status === "done"
                      ? themed.state.result.points
                      : null
                    : exploring
                      ? explored.status === "done"
                        ? explored.detail.points
                        : null
                      : (followed?.points ?? null)
            }
            // Only while choosing, a drawn route or an example of "Explore"
            // (TASK-155): running, or on a themed route, one route is the route.
            others={
              screen !== "map" || theming
                ? NO_OTHERS
                : exploring
                  ? explored.status === "done"
                    ? explored.others
                    : NO_OTHERS
                  : others
            }
            track={
              finishing
                ? finished.line
                : freeFinishing
                  ? freeFinished.line
                  : running
                    ? freeLine
                    : null
            }
            following={
              navigating && navigation.status === "following"
                ? navigation.position
                : running && freeRun.status === "running"
                  ? freeRun.position
                  : null
            }
            heading={heading}
            onError={setMapError}
            // A run of «My activities» takes the map from whatever was on it.
            {...(reviewing ? reviewed : null)}
          />
        }
      >
        {reviewing ? (
          <ActivityCard
            // A new card for each run: «Delete» asks again.
            key={activity.id}
            activity={activity}
            onList={onActivityList}
            onDelete={() => {
              removeActivity(activity.id);
              onActivityList();
            }}
          />
        ) : freeFinishing ? (
          <FreeFinishCard
            run={freeFinished.run}
            onResume={
              freeFinished.resumable
                ? () => {
                    setFreeFinished(null);
                    setScreen("run");
                  }
                : undefined
            }
            // With an account the way out is «Save» or «Discard», below.
            onDone={signedIn ? undefined : onFreeDone}
          />
        ) : running ? (
          <FreeRunCard
            running={freeRun.status === "running"}
            track={freeTrack}
            onStop={onStopFreeRun}
          />
        ) : theming ? (
          <ThemedCard
            state={themed.state}
            exporting={themedExporting}
            onExport={() => {
              if (themedExport !== null) {
                gpx.exportGpx(themedExport.request, themedExport.result);
              }
            }}
            onCancel={() => {
              closeExplore();
              setScreen("explore");
            }}
            start={startViewOf(
              startDirections.state,
              themed.state.status === "done" ? themed.state.result.points : null,
            )}
            onStart={() => {
              if (themed.state.status === "done") {
                onStartExplore(themed.state.result);
              }
            }}
          />
        ) : exploring ? (
          <ExploredCard
            explored={explored}
            exporting={exploredExport}
            onExport={() => {
              if (explored.status === "done") {
                gpx.exportGpx(explored.request, explored.result);
              }
            }}
            // The list it came from: "Explore", or the favorites.
            onList={onBack}
            start={startViewOf(
              startDirections.state,
              explored.status === "done" ? explored.result.points : null,
            )}
            onStart={() => {
              if (explored.status === "done") {
                onStartExplore(explored.result);
              }
            }}
          />
        ) : finishing ? (
          <FinishCard
            apiUrl={API_URL}
            run={finished.run}
            onDone={signedIn ? undefined : onFinishDone}
            onResume={
              finished.resumable && (exploreRun !== null || view.status === "done")
                ? () => {
                    setFinished(null);
                    setScreen("navigate");
                  }
                : undefined
            }
          />
        ) : navigating ? (
          <NavigationCard
            navigation={
              navigation.status === "following" ? navigation.navigation : null
            }
            track={trackOfNavigation(navigation)}
            onStop={onEndRun}
          />
        ) : (
          <RouteOutcome
            view={shown}
            onCancel={() => {
              cancel();
              setScreen("choose");
            }}
            exporting={exporting}
            onExport={() => {
              if (view.status === "done" && chosen !== null) {
                gpx.exportGpx(view.request, chosen);
              }
            }}
            onTryDistance={(distance_m) => {
              setDistanceText(String(distance_m / 1000));
              if (request) {
                draw({ ...request, distance_m });
              }
            }}
            onPickShape={onPickShape}
            onStart={() => setScreen("navigate")}
            choices={choices}
            chosen={chosenIndex}
            onChoose={(index) => answer && setPicked({ of: answer, index })}
          />
        )}
        {/* Under the card of a run that ended: «Save» or «Discard», with an
            account (TASK-172). */}
        {(finishing || freeFinishing) && (
          <RunEnd onSave={onSaveRun} onDiscard={onDiscardRun} />
        )}
      </MapScreen>
      {/* Over the map, opposite the way back: keep the route shown. */}
      <FavoriteHeart route={onMap} />
      {page !== -1 && (
        <Pager
          page={page}
          onPage={(index) => {
            // A keyboard left open would follow to the next page.
            Keyboard.dismiss();
            setScreen(PAGES[index]);
          }}
          action={<ProfileButton />}
          pages={[
            { title: "Feed", render: () => <FeedScreen /> },
            {
              title: "Draw",
              render: () => (
                <ChooseScreen
                  status={statusText(startMode, position, start)}
                  denied={startMode === "gps" && position.status === "denied"}
                  mode={startMode}
                  onMode={(mode) => {
                    setStartMode(mode);
                    if (mode === "gps") {
                      // Asked again, as the old button did: the permission may be on now.
                      refresh();
                    }
                  }}
                  searching={showsSearch(startMode, position)}
                  onPlace={setPlace}
                  near={
                    position.status === "ok" ? position.point : (place?.point ?? null)
                  }
                  mapError={mapError}
                  footer={<DrawButton enabled={request !== null} onDraw={onDraw} />}
                  onRun={() => {
                    Keyboard.dismiss();
                    setScreen("run");
                  }}
                >
                  <ImageEditsContext.Provider value={imageEdits}>
                    <RouteChoice
                      kind={kind}
                      onKind={setKind}
                      shapeText={shapeText}
                      shape={shape}
                      onShapeText={setShapeText}
                      reading={reading}
                      onShapeDone={() => {
                        if (reading) {
                          shapeReading.read(shapeText);
                        }
                      }}
                      wordText={wordText}
                      onWordText={setWordText}
                      wordCheck={wordCheck}
                      letterStyle={letterStyle}
                      onLetterStyle={setLetterStyle}
                      image={image.state}
                      onChooseImage={image.choose}
                      distanceText={distanceText}
                      distanceM={distanceM}
                      onDistanceText={setDistanceText}
                    />
                  </ImageEditsContext.Provider>
                </ChooseScreen>
              ),
            },
            {
              title: "Explore",
              // It asks the API for its routes as it opens: not before.
              lazy: true,
              render: () => (
                <ExploreScreen
                  apiUrl={API_URL}
                  near={start?.point ?? null}
                  onOpen={(route) => {
                    closeExplore();
                    openExplored(route);
                    setScreen("map");
                  }}
                  city={exploreCity}
                  onCity={(city) => {
                    setExploreCity(city);
                    if (city !== null) {
                      const recent = remember(recentCities, city);
                      setRecentCities(recent);
                      saveRecentCities(recent);
                    }
                  }}
                  recent={recentCities}
                  onAsk={(request) => {
                    Keyboard.dismiss();
                    closeExplore();
                    themed.ask(request);
                    setScreen("map");
                  }}
                />
              ),
            },
          ]}
        />
      )}
    </View>
  );
}

function statusText(
  mode: StartMode,
  position: PositionState,
  start: Start | null,
): string {
  if (start?.source === "gps") {
    return "Starting from your position.";
  }
  if (start?.source === "search") {
    return `Starting from ${start.label}.`;
  }
  if (mode === "place") {
    return "Search for a city or street to start from.";
  }
  switch (position.status) {
    case "denied":
      return "Location is off for Sgrava. Allow it in Settings, or search for a place to start from.";
    case "unavailable":
      return "Your position is not available right now. Search for a place to start from.";
    default:
      return "Finding your position…";
  }
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: color.background,
  },
  map: {
    flex: 1,
    // Under the page while the WebView starts, so it never flashes white.
    backgroundColor: color.map.background,
  },
});
