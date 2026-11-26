import { createContext, useContext } from "react";

/**
 * The room the tab bar takes at the bottom of a page (TASK-469 part B,
 * ADR-0383): the pages of the tab bar go on under the bar, which floats
 * over them, so each one adds this room after the last thing it shows —
 * to the end of its scroller, and under anything it keeps at the bottom.
 *
 * Given by the tab shell. Zero outside it, and zero until the bar floats:
 * a page that asks for it today looks as it did.
 *
 * Not the safe area: that one reaches the sheets a page opens too, and
 * they are not under the bar.
 */
export const TabBarRoomContext = createContext(0);

/** The room to leave at the bottom of a page of the tab bar, in points. */
export function useTabBarRoom(): number {
  return useContext(TabBarRoomContext);
}
