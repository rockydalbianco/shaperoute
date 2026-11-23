import type {
  Activity,
  LatLon,
  WayBack,
  WayBackRequest,
} from "@shaperoute/shared-types";
import { AppState } from "react-native";

import { apiUrl } from "../api/apiUrl";
import { type WayBackAnswer, wayBackOnPhoneFirst } from "../engine/wayBackOnPhone";
import { NETWORKS } from "../engine/zones";
import type { Language } from "../i18n/languages";
import {
  type Cue,
  type Navigation,
  PASS_M,
  POOR_FIX_M,
  type Reading,
  rejoinWindow,
} from "./navigator";
import { alongWay, newWayCues, pointAlong, wayShownOf } from "./wayBackShown";

/**
 * The way back to the route on the streets during a run (TASK-314 part B,
 * ADR-0274). Off the route the engine is asked for it, the phone's first
 * (`wayBackOnPhoneFirst`), at most every WAY_BACK_EVERY_S and one request
 * at a time. The way is kept while the runner is on it, and asked again
 * when they leave it or the route's stretch it reaches (`rejoinWindow`)
 * moves past it. Its turns are said as the route's, after what the
 * navigator says: off the route it says no turn, so never over one. No way
 * (no zone, no signal, an old server, 429, 422, too slow) is the straight
 * dotted line of TASK-303, as before. Getting back on the route is still
 * the navigator's, from the fixes (ADR-0263): the way only goes with it.
 */

/** At most one request this often while off the route: the API takes 6 a
 * minute from a phone (`way_back_api.py`). */
export const WAY_BACK_EVERY_S = 15;
/** A request not answered by then is given up: the phone's engine waits
 * 20 s (WAY_BACK_TIMEOUT_MS), the server a little after. */
export const WAY_BACK_WAIT_MS = 25_000;
/** The route's stretch sent, at most: the engine finds no way longer than
 * 3 km (MAX_WAY_M), and the map it reads is cut around it. */
export const AHEAD_CAP_M = 3000;
/** A new way's turn is said at once at most this often: a runner who keeps
 * leaving the way hears its turns when near them, not each new one. */
export const NEW_WAY_SAID_EVERY_S = 60;

/** The navigator's step for a fix: the navigation, and what to say. */
export type Step = { navigation: Navigation; cues: Cue[] };

/** Asks for the way back; `inFront` is whether the app is on the screen. */
export type WayBackAsk = (
  request: WayBackRequest,
  signal: AbortSignal,
  inFront: boolean,
) => Promise<WayBackAnswer>;

export type WayBackRun = {
  /** After the navigator's step for a fix: the way back in the navigation,
   * and its turn to say after the navigator's words. */
  onFix: (step: Step, fix: LatLon, reading: Reading, language: Language) => Step;
  /** The run is over: nothing more is asked or answered. */
  end: () => void;
};

/** With the phone locked the engine's page sleeps and would only time
 * out: the server is asked at once. */
const askOnPhoneFirst: WayBackAsk = (request, signal, inFront) =>
  wayBackOnPhoneFirst(apiUrl(), request, {
    signal,
    ...(inFront ? {} : { zones: () => [] }),
  });

/**
 * The way back of one run. `onWay` gets each way found between two fixes,
 * as `place`, which puts it on the navigation of that moment with what to
 * say. A sport without streets to the route (the water, the snow) asks
 * nothing.
 */
export function startWayBack(
  activity: Activity | undefined,
  onWay: (place: (navigation: Navigation, language: Language) => Step) => void,
  {
    ask = askOnPhoneFirst,
    now = Date.now,
    inFront = () => AppState.currentState === "active",
  }: { ask?: WayBackAsk; now?: () => number; inFront?: () => boolean } = {},
): WayBackRun {
  const sport = activity ?? "running";
  if (NETWORKS[sport] === undefined) {
    return { onFix: (step) => step, end: () => {} };
  }
  let asking: AbortController | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let askedAtMs = -Infinity;
  let saidAtMs = -Infinity;
  let lastFix: LatLon | null = null;
  let ended = false;

  const settle = () => {
    asking = null;
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  };
  const cancel = () => {
    asking?.abort();
    settle();
  };

  const place =
    (way: WayBack, fromM: number) =>
    (navigation: Navigation, language: Language): Step => {
      // Back on the route meanwhile, or the run over: nothing to show.
      if (!navigation.offRoute || navigation.arrived || lastFix === null) {
        return { navigation, cues: [] };
      }
      // Where the runner is on it now: they ran on while it was looked for.
      const followed = alongWay(
        wayShownOf(way, fromM),
        lastFix,
        {},
        language,
        navigation.announceM,
      );
      if (followed.shown === null || followed.shown.leftFixes > 0) {
        return { navigation, cues: [] };
      }
      let { shown, cues } = followed;
      if (cues.length === 0 && now() - saidAtMs >= NEW_WAY_SAID_EVERY_S * 1000) {
        ({ shown, cues } = newWayCues(shown, language, navigation.announceM));
      }
      if (cues.length > 0) {
        saidAtMs = now();
      }
      return { navigation: { ...navigation, wayBack: shown }, cues };
    };

  const askFrom = (navigation: Navigation, fix: LatLon) => {
    const ahead = aheadOf(navigation);
    if (ahead === null) {
      return;
    }
    askedAtMs = now();
    const controller = new AbortController();
    asking = controller;
    timer = setTimeout(() => controller.abort(), WAY_BACK_WAIT_MS);
    void ask(
      { activity: sport, here: fix, ahead: ahead.points },
      controller.signal,
      inFront(),
    )
      .catch((): WayBackAnswer => ({ kind: "none", why: "the way back failed" }))
      .then((answer) => {
        // Cancelled, back on the route, or the run over.
        if (asking !== controller) {
          return;
        }
        settle();
        if (!ended && answer.kind === "way") {
          onWay(place(answer.way, ahead.fromM));
        }
      });
  };

  return {
    onFix(step, fix, reading, language) {
      const { navigation } = step;
      if (!navigation.offRoute || navigation.arrived) {
        // Back on the route: the navigator says so, and the way goes. The
        // next time off it, a way is asked and said at once.
        cancel();
        askedAtMs = -Infinity;
        saidAtMs = -Infinity;
        lastFix = null;
        return navigation.wayBack
          ? { navigation: { ...navigation, wayBack: null }, cues: step.cues }
          : step;
      }
      const poor = (reading.accuracyM ?? 0) > POOR_FIX_M;
      if (!poor) {
        lastFix = fix;
      }
      const before = navigation.wayBack ?? null;
      let shown = before;
      let cues: Cue[] = [];
      if (shown !== null) {
        ({ shown, cues } = alongWay(
          shown,
          fix,
          reading,
          language,
          navigation.announceM,
        ));
        if (shown !== null && !reaches(navigation, shown.rejoinAlongM)) {
          shown = null;
        }
      }
      if (
        shown === null &&
        asking === null &&
        !poor &&
        now() - askedAtMs >= WAY_BACK_EVERY_S * 1000
      ) {
        askFrom(navigation, fix);
      }
      if (shown === before && cues.length === 0) {
        return step;
      }
      return {
        navigation: { ...navigation, wayBack: shown },
        cues: [...step.cues, ...cues],
      };
    },
    end() {
      ended = true;
      cancel();
    },
  };
}

/**
 * The stretch of the route sent with the request: where the runner may get
 * back on it (`rejoinWindow`), at most AHEAD_CAP_M from its start, with
 * `fromM` where it starts along the route. On a closed route not joined
 * yet, anywhere on it, the stretch around the point the dots go to. Null
 * when there is none.
 */
export function aheadOf(
  navigation: Navigation,
): { fromM: number; points: LatLon[] } | null {
  const { points, along } = navigation;
  const total = along[along.length - 1] ?? 0;
  let { fromM, toM } = rejoinWindow(navigation);
  if (!Number.isFinite(fromM)) {
    const atM = navigation.rejoin?.alongM ?? 0;
    fromM = atM - AHEAD_CAP_M / 2;
    toM = atM + AHEAD_CAP_M / 2;
  }
  fromM = Math.max(0, fromM);
  toM = Math.min(total, toM, fromM + AHEAD_CAP_M);
  if (toM <= fromM) {
    return null;
  }
  const inside = points.filter((_, i) => along[i] > fromM && along[i] < toM);
  return {
    fromM,
    points: [
      pointAlong(points, along, fromM),
      ...inside,
      pointAlong(points, along, toM),
    ],
  };
}

/** Whether the way still reaches the route where the runner may get back
 * on it: after a gap, or once a closed route is joined, it moves. */
function reaches(navigation: Navigation, rejoinAlongM: number): boolean {
  const { fromM, toM } = rejoinWindow(navigation);
  return rejoinAlongM >= fromM - PASS_M && rejoinAlongM <= toM + PASS_M;
}
