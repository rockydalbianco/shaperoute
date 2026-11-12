/**
 * The screens the app shows over itself, not pages of the tab bar: «Play»
 * (TASK-296) and, in the ski mode, «Messages» (TASK-429). A drawing, a
 * favorite or a run opened from them, as from a page, shows on the map, and
 * back from the map finds them again (TASK-470 D, defect 9): it once stayed
 * opened out of sight, and the map came only on the next page.
 */
const OVER_APP: readonly string[] = ["play", "messages"];

/** Whether the map is on screen: something is opened on it, from a page of
 * the bar or from a screen over the app. */
export function showsMap(
  screen: string,
  pages: readonly string[],
  opened: boolean,
): boolean {
  return opened && (pages.includes(screen) || OVER_APP.includes(screen));
}
