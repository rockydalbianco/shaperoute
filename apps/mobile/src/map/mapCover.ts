import { createContext, useContext } from "react";

import { MIN_TAP_SIZE, space } from "../theme/tokens";

/** A box over the map, in points from the top left of the map's view. */
export type CoverBox = { x: number; y: number; width: number; height: number };

/**
 * What lies over the top of the map (TASK-443): the route is framed clear
 * of it. The page of the map is told with `setCover`; its points are the
 * page's pixels.
 */
export type MapCover = {
  /** The status bar and the Dynamic Island: the route stays under it. */
  top: number;
  /** The buttons over the map, or the banner of a run. */
  buttons: CoverBox[];
};

/**
 * The cover of the map on `MapScreen`, whose top row starts `space.sm`
 * under the safe area, `space.lg` from the sides: the way back on the left
 * and the map's kind on the right, or the banner of a run, as high as
 * measured, with the map's kind under it; the north arrow comes last, on
 * the right.
 */
export function mapCover(over: {
  insetTop: number;
  /** The width of the map's view. */
  width: number;
  /** The height of the banner in place of the way back, or null without. */
  bannerHeight: number | null;
  /** Whether the north arrow is shown. */
  compass: boolean;
}): MapCover {
  const right = over.width - space.lg - MIN_TAP_SIZE;
  const button = (x: number, y: number): CoverBox => ({
    x,
    y,
    width: MIN_TAP_SIZE,
    height: MIN_TAP_SIZE,
  });
  const buttons: CoverBox[] = [];
  let y = over.insetTop + space.sm;
  if (over.bannerHeight === null) {
    buttons.push(button(space.lg, y), button(right, y));
    y += MIN_TAP_SIZE + space.sm;
  } else {
    buttons.push({
      x: space.lg,
      y,
      width: over.width - 2 * space.lg,
      height: over.bannerHeight,
    });
    y += over.bannerHeight + space.sm;
    buttons.push(button(right, y));
    y += MIN_TAP_SIZE + space.sm;
  }
  if (over.compass) {
    buttons.push(button(right, y));
  }
  return { top: over.insetTop, buttons };
}

/** The cover of the map shown inside: none where nothing lies over it. */
export const MapCoverContext = createContext<MapCover | null>(null);

export function useMapCover(): MapCover | null {
  return useContext(MapCoverContext);
}
