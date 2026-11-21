import { createContext, useContext, useEffect, useRef } from "react";
import { BackHandler, type NativeEventSubscription } from "react-native";

/**
 * Android's «back» for the pages that open over the app as views, not as a
 * `Modal` (a conversation, the bell, a member, a contest, «Play», the map):
 * it closes the page opened last, as its «←» does, before the tab bar's
 * «back» goes to the page shown before or the app leaves. A `Modal` has
 * `onRequestClose` for this; a view had nothing, and «back» changed the tab
 * under the page left open, or left the app.
 *
 * The pages open on one stack. Its listener is registered again each time a
 * page opens, so it is called before any listener registered earlier; the
 * tab bar, built again after the map, asks the stack first all the same
 * (`closeTopLayer`).
 */

type Layer = { close: () => void };

const layers: Layer[] = [];
let listening: NativeEventSubscription | null = null;

/** Closes the page opened last, if any: true when one was there. */
export function closeTopLayer(): boolean {
  const top = layers.at(-1);
  if (top === undefined) {
    return false;
  }
  top.close();
  return true;
}

/** How many pages are open over the app, for the tests. */
export function openLayers(): number {
  return layers.length;
}

function add(layer: Layer): void {
  layers.push(layer);
  listening?.remove();
  listening = BackHandler.addEventListener("hardwareBackPress", closeTopLayer);
}

function remove(layer: Layer): void {
  const index = layers.indexOf(layer);
  if (index >= 0) {
    layers.splice(index, 1);
  }
  if (layers.length === 0) {
    listening?.remove();
    listening = null;
  }
}

/**
 * Whether the page around is the one on screen: false for a tab's page out
 * of sight, which stays built with what it had open. Outside the tab bar,
 * true.
 */
export const OnScreenContext = createContext(true);

/**
 * While `open`, and its page on screen, Android's «back» calls `close`: the
 * page's own «←». The newest `close` is called.
 */
export function useBackCloses(open: boolean, close: () => void): void {
  const onScreen = useContext(OnScreenContext);
  const latest = useRef(close);
  useEffect(() => {
    latest.current = close;
  });
  const on = open && onScreen;
  useEffect(() => {
    if (!on) {
      return;
    }
    const layer: Layer = { close: () => latest.current() };
    add(layer);
    return () => remove(layer);
  }, [on]);
}
