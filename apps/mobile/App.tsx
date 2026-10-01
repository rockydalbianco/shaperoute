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
import { ThemedCard, themedGpx } from "./src/explore/ThemedCard";
import { useThemedRoute } from "./src/explore/useThemedRoute";
import { MapView } from "./src/map/MapView";
import {
  clearRun,
  endRun,
  pendingRun,
  type ScorableRun,
} from "./src/navigation/trackStore";
import { useNavigation } from "./src/navigation/useNavigation";
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
import { FinishBanner, FinishCard } from "./src/screens/FinishScreen";
import { MapScreen } from "./src/screens/MapScreen";
import { NavigationBanner, NavigationCard } from "./src/screens/NavigateScreen";
import { color } from "./src/theme/tokens";

/** A route without directions: one list, so navigation does not restart. */
const NO_DIRECTIONS: Direction[] = [];
/** No other routes on the map: one list, so the map is not told again. */
const NO_OTHERS: LatLon[][] = [];

/** The API on the PC that serves the app (ADR-0031); null if unknown. */
const API_URL = apiUrl();

/** The screens (TASK-051): what to draw, the map with the route, the
 * turn-by-turn along it (TASK-049), the run with its score (TASK-113) and
 * the best routes near the start (TASK-126). */
type Screen = "choose" | "map" | "navigate" | "finish" | "explore";

/** A run that ended, shown on the finish screen. */
type Finished = {
  run: ScorableRun;
  /** Its points, once: a new list would draw the line again. */
  line: ScorableRun["route"];
  /** Stopped just now, its route still on screen: it can go on. */
  resumable: boolean;
};

function finishedRun(run: ScorableRun, resumable: boolean): Finished {
  return { run, line: run.track.fixes.map((fix) => fix.point), resumable };
}

/** A run left without its score when the app was last open, if any. */
function leftRun(): Finished | null {
  const run = pendingRun();
  return run === null ? null : finishedRun(run, false);
}

export default function App() {
  return (
    <SafeAreaProvider>
      <Sgrava />
      {/* The app is dark: light status bar text on any phone setting. */}
      <StatusBar style="light" />
    </SafeAreaProvider>
  );
}

function Sgrava() {
  // A run still waiting for its score comes first (TASK-113).
  const [finished, setFinished] = useState<Finished | null>(leftRun);
  const [screen, setScreen] = useState<Screen>(() =>
    finished === null ? "choose" : "finish",
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
  const { explored, open: openExplored, close: closeExplored } = useExplored(API_URL);
  // "Explore" for any city, and a shape through a theme's places (TASK-129).
  const [exploreCity, setExploreCity] = useState<Place | null>(null);
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

  const navigating = screen === "navigate" && chosen !== null;
  const navigation = useNavigation(
    chosen?.points ?? null,
    chosen?.directions ?? NO_DIRECTIONS,
    navigating,
    chosen?.similarity,
  );
  const finishing = screen === "finish" && finished !== null;
  // A route of "Explore" on the map, in place of the drawn one (TASK-126).
  const theming =
    screen === "map" && explored === null && themed.state.status !== "idle";
  const exploring = screen === "map" && explored !== null;
  const exploredExport: ExportState =
    explored?.status === "done" &&
    gpx.state.status !== "idle" &&
    gpx.state.result === explored.result
      ? gpx.state
      : { status: "idle" };

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

  function onFinishDone(settled: boolean) {
    // Without its score the run stays in the file, for the next opening.
    if (settled) {
      clearRun();
    }
    setFinished(null);
    setScreen(view.status === "done" ? "map" : "choose");
  }

  function onDraw() {
    // The decimal pad has no return key: drawing closes it.
    Keyboard.dismiss();
    // The drawn route takes the map back from "Explore".
    closeExplored();
    themed.close();
    // The same route already drawn is shown again, not asked for again.
    if (request && view.status !== "done") {
      draw(request);
    }
    setScreen("map");
  }

  function onBack() {
    if (theming) {
      themed.close();
      setScreen("explore");
      return;
    }
    if (exploring) {
      closeExplored();
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

  return (
    <View style={styles.screen}>
      <MapScreen
        active={screen === "map" || navigating || finishing}
        onBack={onBack}
        mapError={mapError}
        banner={
          finishing ? (
            <FinishBanner />
          ) : navigating ? (
            <NavigationBanner state={navigation} />
          ) : undefined
        }
        map={
          <MapView
            style={styles.map}
            start={
              theming
                ? themed.state.status === "done"
                  ? themed.state.result.centre
                  : null
                : exploring
                  ? explored.route.start
                  : (start?.point ?? null)
            }
            stops={
              theming && themed.state.status === "done"
                ? themed.state.result.stops
                : null
            }
            route={
              finishing
                ? finished.run.route
                : theming
                  ? themed.state.status === "done"
                    ? themed.state.result.points
                    : null
                  : exploring
                    ? explored.status === "done"
                      ? explored.detail.points
                      : null
                    : (chosen?.points ?? null)
            }
            // Only while choosing a drawn route: running, or on a route of
            // "Explore", one route is the route.
            others={screen === "map" && !exploring && !theming ? others : NO_OTHERS}
            track={finishing ? finished.line : null}
            following={
              navigating && navigation.status === "following"
                ? navigation.position
                : null
            }
            onError={setMapError}
          />
        }
      >
        {theming ? (
          <ThemedCard
            state={themed.state}
            exporting={themedExporting}
            onExport={() => {
              if (themedExport !== null) {
                gpx.exportGpx(themedExport.request, themedExport.result);
              }
            }}
            onCancel={() => {
              themed.close();
              setScreen("explore");
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
            onList={() => {
              closeExplored();
              setScreen("explore");
            }}
          />
        ) : finishing ? (
          <FinishCard
            apiUrl={API_URL}
            run={finished.run}
            onDone={onFinishDone}
            onResume={
              finished.resumable && view.status === "done"
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
      </MapScreen>
      {screen === "choose" && (
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
          near={position.status === "ok" ? position.point : (place?.point ?? null)}
          mapError={mapError}
          footer={<DrawButton enabled={request !== null} onDraw={onDraw} />}
          onExplore={() => setScreen("explore")}
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
      )}
      {screen === "explore" && (
        <ExploreScreen
          apiUrl={API_URL}
          near={start?.point ?? null}
          onBack={() => setScreen("choose")}
          onOpen={(route) => {
            themed.close();
            openExplored(route);
            setScreen("map");
          }}
          city={exploreCity}
          onCity={setExploreCity}
          onAsk={(request) => {
            Keyboard.dismiss();
            closeExplored();
            themed.ask(request);
            setScreen("map");
          }}
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
      return "Location is off for ShapeRoute. Allow it in Settings, or search for a place to start from.";
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
