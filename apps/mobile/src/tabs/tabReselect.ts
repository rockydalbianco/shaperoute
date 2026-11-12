import { createContext, useContext, useEffect, useRef } from "react";

/**
 * A tab touched again while its page is on screen (TASK-367): the page goes
 * back to its top, or to its first view. Each page of the tab bar has its
 * own; a screen outside the bar has none, and nothing happens.
 */
export class TabReselect {
  private readonly listeners = new Set<() => void>();

  readonly listen = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  readonly reselect = (): void => {
    this.listeners.forEach((listener) => listener());
  };
}

export const TabReselectContext = createContext<TabReselect | null>(null);

/** Calls `onReselect` when the tab of the page around it is touched again,
 * with the newest `onReselect`: a scroll to the top, a view closed. */
export function useTabReselect(onReselect: () => void): void {
  const tab = useContext(TabReselectContext);
  const latest = useRef(onReselect);
  useEffect(() => {
    latest.current = onReselect;
  });
  useEffect(() => tab?.listen(() => latest.current()), [tab]);
}

/** What a scroll needs to go back to its top: a ScrollView or a FlatList. */
type ToTop = {
  scrollTo?: (to: { x?: number; y?: number; animated?: boolean }) => void;
  scrollToOffset?: (to: { offset: number; animated?: boolean }) => void;
};

/** A ref for the scroll of a page: back to its top when its tab is
 * touched again. A list `shown` false, one of the lists of a page that
 * shows one at a time («All», «Following», «Style» in «Feed»), keeps its
 * place: only the one on screen goes back to its top. */
export function useScrollToTopOnReselect<T extends ToTop>(shown = true) {
  const scroll = useRef<T | null>(null);
  const isShown = useRef(shown);
  useEffect(() => {
    isShown.current = shown;
  });
  useTabReselect(() => {
    if (!isShown.current) {
      return;
    }
    const view = scroll.current;
    if (view?.scrollToOffset) {
      view.scrollToOffset({ offset: 0, animated: true });
    } else {
      view?.scrollTo?.({ y: 0, animated: true });
    }
  });
  return scroll;
}
