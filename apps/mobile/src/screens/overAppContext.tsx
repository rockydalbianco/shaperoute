import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { StyleSheet, View } from "react-native";

import { OnScreenContext } from "../ui/backLayers";

/**
 * The pages over the app (a member's profile, «Profile» and its pages, a
 * contest, a conversation, the bell: `ProfileLayer`) and what the app shows
 * full screen of its own (TASK-470 D).
 *
 * - A page of the app in a native `Modal`, as a post opened from «Feed»
 *   (`PostPage`), is drawn over every view: a profile opened from it (the
 *   author of a comment, a notification) went under it, out of sight. A
 *   `Modal` of their own would not do: iOS presents a `Modal` from the view
 *   that holds it, and the app's root is already presenting the post. So
 *   while such a page is up, the pages over the app are drawn inside it, in
 *   its `OverAppSlot`; the post stays as it was under them, scroll and
 *   unsent comment kept, and «←» finds it.
 * - «Play» over the app, opened by a notification while a page over the app
 *   was up, went under that page. While the app covers them, the pages over
 *   it stay, out of sight and out of «back»'s reach, as they were; «←» of
 *   «Play» finds them again.
 */
type OverApp = {
  /** A page in a native `Modal` is up until the returned call. */
  holdModalPage: () => () => void;
  /** The app shows something full screen over the pages over it. */
  setCovered: (covered: boolean) => void;
};

const NONE: OverApp = {
  holdModalPage: () => () => {},
  setCovered: () => {},
};

/** Made once: the app reads it without being drawn again. */
const OverAppContext = createContext<OverApp>(NONE);

/** The pages over the app for the slot of a page in a `Modal`, and whether
 * one is on screen. Only the slot reads it. */
type Slot = { pages: ReactNode; shown: boolean };

const SlotContext = createContext<Slot>({ pages: null, shown: false });

export type OverAppState = { modalPages: number; covered: boolean };

/** What the pages over the app need to know of the app. */
export function useOverAppState(): [OverApp, OverAppState] {
  const [modalPages, setModalPages] = useState(0);
  const [covered, setCovered] = useState(false);
  const holdModalPage = useCallback(() => {
    setModalPages((count) => count + 1);
    let held = true;
    return () => {
      if (held) {
        held = false;
        setModalPages((count) => count - 1);
      }
    };
  }, []);
  const door = useMemo(() => ({ holdModalPage, setCovered }), [holdModalPage]);
  return [door, { modalPages, covered }];
}

type ProviderProps = {
  door: OverApp;
  slot: Slot;
  children: ReactNode;
};

/** Around the app: its pages in a `Modal` and «Play» reach the pages over it. */
export function OverAppProvider({ door, slot, children }: ProviderProps) {
  return (
    <OverAppContext.Provider value={door}>
      <SlotContext.Provider value={slot}>{children}</SlotContext.Provider>
    </OverAppContext.Provider>
  );
}

/** For a page in a native `Modal`: the pages over the app come into it. */
export function useModalPage(): void {
  const { holdModalPage } = useContext(OverAppContext);
  useEffect(() => holdModalPage(), [holdModalPage]);
}

/** Whether a page over the app is on screen in the slot: Android's «back»
 * of the `Modal` is that page's first. */
export function useOverAppShown(): boolean {
  return useContext(SlotContext).shown;
}

/** Inside a page in a `Modal`, last, over its content: where the pages over
 * the app are drawn while it is up. */
export function OverAppSlot() {
  return <>{useContext(SlotContext).pages}</>;
}

/** For what the app shows full screen over the pages over it («Play»). */
export function useCoverOverApp(covered: boolean): void {
  const { setCovered } = useContext(OverAppContext);
  useEffect(() => {
    setCovered(covered);
    return () => setCovered(false);
  }, [covered, setCovered]);
}

type PagesProps = {
  covered: boolean;
  children: ReactNode;
};

/**
 * The pages over the app, filling what holds them; kept out of sight, and
 * out of «back»'s reach, while the app covers them.
 */
export function OverAppPages({ covered, children }: PagesProps) {
  return (
    <OnScreenContext.Provider value={!covered}>
      <View
        style={[StyleSheet.absoluteFill, covered && styles.hidden]}
        pointerEvents="box-none"
        testID="over-app-pages"
      >
        {children}
      </View>
    </OnScreenContext.Provider>
  );
}

const styles = StyleSheet.create({
  hidden: {
    display: "none",
  },
});
