import { createContext, useContext, useEffect, useMemo, useRef } from "react";
import type { NativeScrollEvent, NativeSyntheticEvent, ScrollView } from "react-native";

/**
 * The parts of the real screens the tour shows (TASK-266): each one is
 * kept here by its name while it is on screen, with the scroll it sits in,
 * so the tour can find it, bring it into sight and measure it. Nothing here
 * draws: the screens only hand their views over.
 */

/** A box on the screen, in the window's points. */
export type Box = { x: number; y: number; width: number; height: number };

/** What the tour needs of a view: where it is on the screen. */
export type Measurable = {
  measureInWindow: (
    callback: (x: number, y: number, width: number, height: number) => void,
  ) => void;
};

/** A scroll that holds parts of the tour: the scroll itself, given by
 * `hold` as its ref, and how far it is scrolled now, kept by `onScroll`. */
export class TourScroll {
  view: ScrollView | null = null;
  offset = 0;
  readonly hold = (view: ScrollView | null): void => {
    this.view = view;
  };
  readonly onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>): void => {
    this.offset = event.nativeEvent.contentOffset.y;
  };
}

type Part = { view: Measurable; scroll: TourScroll | null };

const parts = new Map<string, Part>();

/** The scroll the parts under it sit in: the tour scrolls it to them. */
export const TourScrollContext = createContext<TourScroll | null>(null);

/** A ref that keeps `view` under `name` while it is on screen. */
function partRef(
  name: string,
  scroll: TourScroll | null,
): (view: Measurable | null) => void {
  let mine: Measurable | null = null;
  return (view) => {
    if (view !== null) {
      mine = view;
      parts.set(name, { view, scroll });
    } else if (mine !== null) {
      // Another view may have taken the name since: it stays.
      if (parts.get(name)?.view === mine) {
        parts.delete(name);
      }
      mine = null;
    }
  };
}

/** The ref of a part of the tour inside a screen, in the scroll around it
 * if any. */
export function useTourPart(name: string): (view: Measurable | null) => void {
  const scroll = useContext(TourScrollContext);
  return useMemo(() => partRef(name, scroll), [name, scroll]);
}

const fixedRefs = new Map<string, (view: Measurable | null) => void>();

/** The ref of a part outside any scroll, made once per name: for lists of
 * parts, such as the names of the pages, where a hook cannot be called. */
export function tourPart(name: string): (view: Measurable | null) => void {
  let ref = fixedRefs.get(name);
  if (ref === undefined) {
    ref = partRef(name, null);
    fixedRefs.set(name, ref);
  }
  return ref;
}

/** The part's name of the page `title` and of its name in the header. */
export function pageName(title: string): string {
  return `page:${title}`;
}

export function tabName(title: string): string {
  return `tab:${title}`;
}

/** The pages of the app as the tour moves between them. */
export type TourPager = {
  /** The title of the page on screen. */
  shown: () => string | null;
  /** Goes to the page of `title`, as touching its name does. */
  show: (title: string) => void;
};

let pager: TourPager | null = null;

/** The pager on screen, for the tour; null when another screen is up. */
export function tourPager(): TourPager | null {
  return pager;
}

/** Hands the pages over to the tour while the pager is on screen. */
export function useTourPager(
  titles: readonly string[],
  page: number,
  onPage: (index: number) => void,
): void {
  const now = useRef({ titles, page, onPage });
  useEffect(() => {
    now.current = { titles, page, onPage };
  });
  useEffect(() => {
    const door: TourPager = {
      shown: () => now.current.titles[now.current.page] ?? null,
      show: (title) => {
        const index = now.current.titles.indexOf(title);
        if (index >= 0 && index !== now.current.page) {
          now.current.onPage(index);
        }
      },
    };
    pager = door;
    return () => {
      if (pager === door) {
        pager = null;
      }
    };
  }, []);
}

/** A view that does not answer within this is taken as not on screen. */
export const MEASURE_WAIT_MS = 600;

/** How long a scroll moved by the tour takes to rest. */
export const SCROLL_REST_MS = 350;

/** Room left above a part brought into sight. */
const SCROLL_MARGIN = 16;

export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Where `view` is on the screen; null when it has no size or no answer. */
export function measure(view: Measurable): Promise<Box | null> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), MEASURE_WAIT_MS);
    try {
      view.measureInWindow((x, y, width, height) => {
        clearTimeout(timer);
        resolve(width > 0 && height > 0 ? { x, y, width, height } : null);
      });
    } catch {
      clearTimeout(timer);
      resolve(null);
    }
  });
}

/** The scrolls the tour moved: back to their top when it ends. */
const moved = new Set<TourScroll>();

/** Where the part is, after scrolling it into sight when it is out of it. */
async function reveal(part: Part): Promise<Box | null> {
  const box = await measure(part.view);
  const scroll = part.scroll;
  const scrollView = scroll?.view;
  const host = scrollView?.getNativeScrollRef?.();
  if (box === null || scroll === null || !scrollView || !host) {
    return box;
  }
  const frame = await measure(host);
  if (frame === null) {
    return box;
  }
  if (box.y >= frame.y && box.y + box.height <= frame.y + frame.height) {
    return box;
  }
  const y = Math.max(0, scroll.offset + box.y - frame.y - SCROLL_MARGIN);
  scrollView.scrollTo({ y, animated: true });
  moved.add(scroll);
  await wait(SCROLL_REST_MS);
  return measure(part.view);
}

/** The smallest box around all of `boxes`; null for none. */
export function around(boxes: readonly Box[]): Box | null {
  if (boxes.length === 0) {
    return null;
  }
  const left = Math.min(...boxes.map((box) => box.x));
  const top = Math.min(...boxes.map((box) => box.y));
  const right = Math.max(...boxes.map((box) => box.x + box.width));
  const bottom = Math.max(...boxes.map((box) => box.y + box.height));
  return { x: left, y: top, width: right - left, height: bottom - top };
}

/** True when some of `box` is inside the screen. */
export function onScreen(box: Box, screen: { width: number; height: number }): boolean {
  return (
    box.x < screen.width &&
    box.x + box.width > 0 &&
    box.y < screen.height &&
    box.y + box.height > 0
  );
}

/** Where parts are on the screen, together. */
export type Located = {
  /** The box around the parts on screen; null when none is. */
  box: Box | null;
  /** Every part asked for is on screen. */
  all: boolean;
};

/** Where the parts `names` are, together. */
export async function locate(
  names: readonly string[],
  screen: { width: number; height: number },
): Promise<Located> {
  const boxes: Box[] = [];
  for (const name of names) {
    const part = parts.get(name);
    const box = part === undefined ? null : await reveal(part);
    if (box !== null && onScreen(box, screen)) {
      boxes.push(box);
    }
  }
  return { box: around(boxes), all: boxes.length === names.length };
}

/** True when `a` and `b` are the same box, to half a point. */
export function sameBox(a: Box | null, b: Box | null): boolean {
  if (a === null || b === null) {
    return a === b;
  }
  return (
    Math.abs(a.x - b.x) < 0.5 &&
    Math.abs(a.y - b.y) < 0.5 &&
    Math.abs(a.width - b.width) < 0.5 &&
    Math.abs(a.height - b.height) < 0.5
  );
}

/** The tour ended: the scrolls it moved go back to their top. */
export function scrollsBack(): void {
  for (const scroll of moved) {
    scroll.view?.scrollTo({ y: 0, animated: true });
  }
  moved.clear();
}

/** For tests: the parts kept now, by name. */
export function partNames(): string[] {
  return [...parts.keys()];
}
