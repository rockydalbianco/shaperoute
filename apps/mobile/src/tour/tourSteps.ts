import type { PageName } from "../screens/pageTitles";
import { pageName, tabName } from "./tourParts";

/** The parts of «Draw» and of the header the tour shows, by their name. */
export const TOUR_PART = {
  /** «START»: from where you are or from a place searched. */
  start: "start",
  /** The tiles of the shapes. */
  shapes: "shapes",
  /** The distance with «−» and «+». */
  distance: "distance",
  /** The foot of «Draw», with «Draw route». */
  draw: "draw",
  /** The sport and the way to «Profile», at the right of the pages' names. */
  header: "header",
} as const;

export type TourStepId =
  "welcome" | "start" | "shape" | "distance" | "draw" | "header" | "explore" | "feed";

export type TourStep = {
  id: TourStepId;
  /** The page it is shown on. */
  page: PageName;
  /** The parts it shows; none: its words alone, in the middle. */
  parts: readonly string[];
  /** It shows its page itself, with the page's name in the header. */
  wholePage?: boolean;
};

/**
 * The tour of the first opening (TASK-266), in its order: «Draw» from top
 * to foot, the sport and «Profile», then «Explore» and «Feed». It ends on
 * «Draw», one page from «Feed».
 */
export const TOUR_STEPS: readonly TourStep[] = [
  { id: "welcome", page: "draw", parts: [] },
  { id: "start", page: "draw", parts: [TOUR_PART.start] },
  { id: "shape", page: "draw", parts: [TOUR_PART.shapes] },
  { id: "distance", page: "draw", parts: [TOUR_PART.distance] },
  { id: "draw", page: "draw", parts: [TOUR_PART.draw] },
  { id: "header", page: "draw", parts: [TOUR_PART.header] },
  { id: "explore", page: "explore", parts: [], wholePage: true },
  { id: "feed", page: "feed", parts: [], wholePage: true },
];

/** The names of the parts `step` shows, its page being called `title`. */
export function partsOf(step: TourStep, title: string): string[] {
  return step.wholePage ? [tabName(title), pageName(title)] : [...step.parts];
}
