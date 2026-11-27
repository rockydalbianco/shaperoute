import { createContext, useContext } from "react";

/**
 * The room the tab bar takes at the bottom of a page (TASK-469 part B,
 * ADR-0383): where the bar floats over the pages they go on under it, so
 * each one adds this room after the last thing it shows — to the end of
 * its scroller, and under anything it keeps at the bottom.
 *
 * Given by the tab shell: the band of the bar, the home indicator's room
 * in it, on a phone that draws the real glass (`tabBarFloats`). Zero
 * where the bar keeps its own band under the pages, and zero outside the
 * shell, where there is no bar: a page that asks looks as it did.
 *
 * Not the safe area: that one reaches the sheets a page opens too, and
 * they are not under the bar.
 */
export const TabBarRoomContext = createContext(0);

/** The room to leave at the bottom of a page of the tab bar, in points. */
export function useTabBarRoom(): number {
  return useContext(TabBarRoomContext);
}
