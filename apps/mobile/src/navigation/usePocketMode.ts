import * as Brightness from "expo-brightness";
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";

/** The keep-awake tag of pocket mode, so it never clears someone else's. */
export const KEEP_AWAKE_TAG = "pocket-mode";
/** The brightness in pocket mode: the lowest the screen goes. */
export const POCKET_BRIGHTNESS = 0;

export type PocketMode = {
  on: boolean;
  enter: () => void;
  exit: () => void;
};

/**
 * Pocket mode (TASK-070, ADR-0066): the app stays in front with the screen on,
 * so voice, vibration and GPS go on as in navigation, but the screen is dark
 * and ignores touches.
 *
 * The brightness comes back as it was when pocket mode ends: on exit, when
 * `active` turns false (arrived, stopped), when the screen goes away and when
 * the app goes to the background. On iOS the app's brightness outlives the
 * app until the phone locks, so it is also given back while the app is only
 * "inactive" (control centre, notification centre, side button), and taken
 * again if the app comes back without leaving.
 *
 * Brightness and keep-awake are best effort: if the phone refuses them, the
 * screen is still black and navigation goes on.
 */
export function usePocketMode(active: boolean): PocketMode {
  const [on, setOn] = useState(false);
  const entered = useRef(false);
  /** The app's brightness before dimming; null when not dimmed. */
  const saved = useRef<number | null>(null);
  /** Bumped on every dim and undim: a late answer from an old one is dropped. */
  const generation = useRef(0);
  const dimmed = useRef(false);

  const dim = useCallback(() => {
    if (dimmed.current) {
      return;
    }
    dimmed.current = true;
    const mine = ++generation.current;
    void (async () => {
      try {
        const before = await Brightness.getBrightnessAsync();
        if (generation.current !== mine) {
          return;
        }
        saved.current = before;
        await Brightness.setBrightnessAsync(POCKET_BRIGHTNESS);
      } catch {
        // No brightness control: the black screen alone still hides it.
      }
    })();
  }, []);

  const undim = useCallback(() => {
    dimmed.current = false;
    generation.current += 1;
    const before = saved.current;
    saved.current = null;
    if (before !== null) {
      Brightness.setBrightnessAsync(before).catch(() => {});
    }
  }, []);

  const exit = useCallback(() => {
    if (!entered.current) {
      return;
    }
    entered.current = false;
    setOn(false);
    undim();
    deactivateKeepAwake(KEEP_AWAKE_TAG).catch(() => {});
  }, [undim]);

  const enter = useCallback(() => {
    if (!active || entered.current) {
      return;
    }
    entered.current = true;
    setOn(true);
    activateKeepAwakeAsync(KEEP_AWAKE_TAG).catch(() => {});
    dim();
  }, [active, dim]);

  useEffect(() => {
    if (!active) {
      exit();
    }
  }, [active, exit]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (next) => {
      if (next === "background") {
        exit();
      } else if (!entered.current) {
        return;
      } else if (next === "active") {
        dim();
      } else {
        undim();
      }
    });
    return () => {
      subscription.remove();
      exit();
    };
  }, [exit, dim, undim]);

  return { on, enter, exit };
}
