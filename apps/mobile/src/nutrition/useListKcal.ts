import { useSyncExternalStore } from "react";

import type { Activity } from "../api/activities";
import type { BodyProfile } from "../body/bodyProfile";
import { t } from "../i18n";
import { hubActivityKcal } from "./activityEnergy";
import { activityKcalOf, type EnergyEdits } from "./energyEdits";
import { kcalLabel } from "./MealCard";
import { NUTRITION_ON } from "./nutritionOn";
import { energyEdits, subscribeNutrition } from "./useNutrition";

function none(): EnergyEdits | null {
  return null;
}

/**
 * The calories that end the facts of an activity in the private list
 * (TASK-489 part C1, ADR-0397): the ones the day's balance counts for it.
 * «412 kcal» is MuW's estimate from what the list says of the activity;
 * «250 kcal (edited)» the number the user wrote over it in «Nutrition».
 * Kept on this phone: the post of the activity is not touched.
 *
 * None while «Nutrition» is off, and nothing is read from the phone then:
 * the list is as it was. None for an activity that counts for nothing.
 */
export function useListKcal(activity: Activity, body: BodyProfile): string | null {
  const edits = useSyncExternalStore(
    subscribeNutrition,
    NUTRITION_ON ? energyEdits : none,
    NUTRITION_ON ? energyEdits : none,
  );
  if (edits === null) {
    return null;
  }
  const counted = activityKcalOf(edits, activity.id, hubActivityKcal(activity, body));
  if (counted.edited) {
    return `${kcalLabel(counted.kcal)} (${t("edited")})`;
  }
  return counted.kcal > 0 ? kcalLabel(counted.kcal) : null;
}
