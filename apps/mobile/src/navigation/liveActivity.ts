import {
  type NativeLiveActivity,
  nativeLiveActivity,
} from "../../modules/live-activity";
import { t } from "../i18n";
import { appLanguage } from "../i18n/language";
import type { Language } from "../i18n/languages";
import { color, type Palette } from "../theme/tokens";
import { nearDistanceLabel } from "../units/format";
import { appUnits, type Units } from "../units/units";
import { wordsOf } from "../voice/words";
import { type Navigation, remainingM, upcoming } from "./navigator";
import { ARROWS, distanceLabel } from "./phrases";
import { compassPoint, share } from "./runStats";
import { upcomingOnWay } from "./wayBackShown";

/**
 * The run's directions as an iOS Live Activity (TASK-401 part B, ADR-0335):
 * on the lock screen and in the Dynamic Island, with the turn's arrow, the
 * way to it and the banner's words, and a bar with the drawing done and the
 * way left (the user's «Solo la guida»). Only along a route («No, solo con
 * percorso»). At the end it says so and goes after five minutes; stopped
 * before, it goes at once («Riepilogo per qualche minuto»). Every word and
 * colour is the app's: the widget only lays them out.
 */

/** How long the end stays on the lock screen after arriving. */
export const ARRIVED_STAYS_S = 5 * 60;

/** At most one update a second: each one wakes the widget. */
export const UPDATE_EVERY_MS = 1000;

/** What the widget shows, as MuWRunAttributes.ContentState reads it. */
export type LiveState = {
  sign: string;
  distance: string;
  instruction: string;
  done: number;
  drawn: string;
  left: string;
  arrived: boolean;
  off: boolean;
};

/** The app's colours the widget uses, from the tokens. */
export type LiveColors = {
  accent: string;
  onAccent: string;
  surface: string;
  text: string;
  textMuted: string;
  warning: string;
};

const OFF_SIGN = "⚠";
const ARRIVED_SIGN = "✓";

export function liveColorsOf(palette: Palette = color): LiveColors {
  return {
    accent: palette.accent,
    onAccent: palette.onAccent,
    surface: palette.surface,
    text: palette.text,
    textMuted: palette.textMuted,
    warning: palette.warning,
  };
}

/** What the widget shows for `navigation`, written as the banner writes it. */
export function liveStateOf(
  navigation: Navigation,
  language: Language = appLanguage(),
  units: Units = appUnits(),
): LiveState {
  const total = navigation.along[navigation.along.length - 1] ?? 0;
  // In whole percents, as written under the bar: a few metres more is not
  // a new state to send.
  const percent = navigation.arrived
    ? 100
    : Math.round(share(navigation.alongM, total) * 100);
  const base = {
    done: percent / 100,
    drawn: t("{percent}% drawn", { percent }),
    left: t("{distance} left", {
      distance: nearDistanceLabel(
        navigation.arrived ? 0 : remainingM(navigation),
        units,
      ),
    }),
    arrived: navigation.arrived,
    off: false,
  };
  if (navigation.arrived) {
    return {
      ...base,
      sign: ARRIVED_SIGN,
      distance: "",
      instruction: t("You have arrived."),
    };
  }
  if (navigation.offRoute) {
    // The next turn of the way back on the streets, as the banner, the
    // voice and the notification say it (TASK-314 B, ADR-0274); without one,
    // how far the route is and which way.
    const turn = navigation.wayBack ? upcomingOnWay(navigation.wayBack) : null;
    if (turn !== null) {
      return {
        ...base,
        off: true,
        sign: ARROWS[turn.direction.turn],
        distance: distanceLabel(turn.inM, units),
        instruction: wordsOf(language, units).direction(turn.direction),
      };
    }
    const rejoin = navigation.rejoin ?? null;
    return {
      ...base,
      off: true,
      sign: OFF_SIGN,
      distance:
        rejoin === null
          ? ""
          : `${distanceLabel(rejoin.distanceM, units)} ${t(compassPoint(rejoin.bearingDeg))}`,
      instruction: t("Off the route"),
    };
  }
  const next = upcoming(navigation);
  if (next === null) {
    return {
      ...base,
      sign: ARROWS.straight,
      distance: "",
      instruction: t("Follow the route to the end."),
    };
  }
  return {
    ...base,
    sign: ARROWS[next.direction.turn],
    distance: distanceLabel(next.inM, units),
    instruction: wordsOf(language, units).direction(next.direction),
  };
}

export type LiveActivityRun = {
  /** After each fix. */
  update: (navigation: Navigation) => void;
  /** The run is over: arrived, the end stays a while; stopped, it goes. */
  end: (navigation: Navigation) => void;
};

/**
 * Starts the Live Activity of a run along a route; null where the phone has
 * none (no module in this build, or turned off by the user), and the
 * notification of part A writes the directions instead.
 */
export function startLiveActivity(
  navigation: Navigation,
  native: NativeLiveActivity | null = nativeLiveActivity(),
  now: () => number = Date.now,
): LiveActivityRun | null {
  if (native === null || !native.isAvailable()) {
    return null;
  }
  let sent = JSON.stringify(liveStateOf(navigation));
  let sentMs = now();
  let ended = false;
  void native.start(JSON.stringify(liveColorsOf()), sent).catch(() => false);
  return {
    update(next) {
      if (ended) {
        return;
      }
      const state = liveStateOf(next);
      const json = JSON.stringify(state);
      if (json === sent) {
        return;
      }
      // Leaving the route or arriving shows at once; the metres can wait.
      const before = JSON.parse(sent) as LiveState;
      const turned = state.off !== before.off || state.arrived !== before.arrived;
      if (!turned && now() - sentMs < UPDATE_EVERY_MS) {
        return;
      }
      sent = json;
      sentMs = now();
      void native.update(json).catch(() => {});
    },
    end(last) {
      if (ended) {
        return;
      }
      ended = true;
      const state = liveStateOf(last);
      void native
        .end(JSON.stringify(state), state.arrived ? ARRIVED_STAYS_S : 0)
        .catch(() => {});
    },
  };
}
