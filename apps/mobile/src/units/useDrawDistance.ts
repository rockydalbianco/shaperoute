import type { Activity } from "@shaperoute/shared-types";
import { useCallback, useState } from "react";

import {
  distanceMOf,
  type DrawDistance,
  type DrawnFor,
  fieldText,
  firstDistance,
  refitDistance,
} from "./drawDistance";
import { useUnits } from "./useUnits";

/** The distance of «Draw», for App.tsx. */
export type DrawDistanceField = {
  /** The field's text, in the app's units ("4.5 mi" with «Miles»,
   * `units/distanceInput`). */
  text: string;
  /** The whole metres a route is asked at; null when the field is not valid. */
  metres: number | null;
  /** What the field writes: typed, −, +, «Use N mi». */
  type: (text: string) => void;
  /** A distance the app chooses by itself, in metres: a «Try», a lake's. */
  choose: (metres: number) => void;
};

/**
 * The distance asked for in «Draw», kept at the root of the app (TASK-182
 * part E, ADR-0149): the text typed, or the metres the app chose, shown in
 * the app's units and following «Settings» at once, whether «Draw» is on the
 * screen or not, and the sport of `activity`.
 */
export function useDrawDistance(activity: Activity): DrawDistanceField {
  const units = useUnits();
  const [distance, setDistance] = useState<DrawDistance>(() =>
    firstDistance({ activity, units }),
  );
  // A sport or units just chosen bring the distance within their limits.
  const [drawnFor, setDrawnFor] = useState<DrawnFor>({ activity, units });
  if (drawnFor.activity !== activity || drawnFor.units !== units) {
    setDrawnFor({ activity, units });
    setDistance(refitDistance(distance, drawnFor, { activity, units }));
  }
  const type = useCallback((text: string) => setDistance({ text }), []);
  const choose = useCallback((metres: number) => setDistance({ metres }), []);
  return {
    text: fieldText(distance, units),
    metres: distanceMOf(distance, activity, units),
    type,
    choose,
  };
}
