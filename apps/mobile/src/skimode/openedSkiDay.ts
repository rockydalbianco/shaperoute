import type { Drawing } from "@shaperoute/shared-types";

/**
 * The day of skiing open in «Days» (TASK-470 D, defect 10). «Map» on it puts
 * the day on the big map, and the map takes the whole screen: the tab bar
 * and its pages go, and «Days» with them. Kept here, out of the page, «←»
 * from the map finds the day again, not the list. Its «←» lets it go.
 */
let opened: Drawing | null = null;

/** The day open in «Days», if any. */
export function openedSkiDay(): Drawing | null {
  return opened;
}

/** A day opened in «Days», or none. */
export function keepSkiDay(day: Drawing | null): void {
  opened = day;
}
