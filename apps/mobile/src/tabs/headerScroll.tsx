import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
} from "react";
import type { NativeScrollEvent, NativeSyntheticEvent } from "react-native";

/**
 * The header that turns to glass when the page scrolls (TASK-469 A5b,
 * ADR-0383, «Capsula»): at the top of a page the header is the page's own
 * colour, with no line under it; once the page has scrolled, the band takes
 * the glass, its edge and its shadow over the content.
 *
 * Each page of the tab bar tells it through `useHeaderScroll()`, spread on
 * its main scroller. A page that does not tell keeps the header at rest.
 */

/** How far, in points, a page scrolls before the header turns to glass: a
 * little more than the bounce of a touch that did not mean to scroll. */
export const SCROLLED_AFTER = 4;

/** Whether a page scrolled to `y` has the header in glass. */
export function isScrolled(y: number): boolean {
  return y > SCROLLED_AFTER;
}

/** What a page tells the header: scrolled or at the top. */
export type HeaderScrollReport = (scrolled: boolean) => void;

/** Given by the tab shell to each page; `null` outside it. */
export const HeaderScrollContext = createContext<HeaderScrollReport | null>(null);

/** The props to spread on a page's main scroller. */
export type HeaderScrollProps = {
  onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  scrollEventThrottle: number;
};

/**
 * The props for the main scroller of a page of the tab bar: it tells the
 * header when the page leaves the top and when it is back, only when that
 * changes. Outside the tab shell it tells nobody.
 *
 * `active` false is a scroller kept but hidden, as a tab of the Feed that is
 * not on the screen (TASK-469 A5c-2): it leaves the header at rest, and
 * shown again it tells where it is.
 */
export function useHeaderScroll(active = true): HeaderScrollProps {
  const report = useContext(HeaderScrollContext);
  const told = useRef(false);
  // Where the scroller is, told or not: away from its top or at it.
  const away = useRef(false);
  // A scroller that goes while away from the top (a lazy page, the ski
  // mode, a page of the profile) leaves the header at rest, not in glass
  // over a page that is at its top.
  useEffect(
    () => () => {
      if (told.current) {
        told.current = false;
        report?.(false);
      }
    },
    [report],
  );
  // Hidden: at rest, in a layout effect, so before the scroller shown in
  // its place says it is away from the top in its own effect below.
  useLayoutEffect(() => {
    if (!active && told.current) {
      told.current = false;
      report?.(false);
    }
  }, [active, report]);
  useEffect(() => {
    if (active && away.current && !told.current) {
      told.current = true;
      report?.(true);
    }
  }, [active, report]);
  const onScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      away.current = isScrolled(event.nativeEvent.contentOffset.y);
      const scrolled = active && away.current;
      if (scrolled !== told.current) {
        told.current = scrolled;
        report?.(scrolled);
      }
    },
    [active, report],
  );
  return { onScroll, scrollEventThrottle: 16 };
}
