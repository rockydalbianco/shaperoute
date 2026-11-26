import { t } from "../i18n";
import { compassPoint } from "../navigation/runStats";

/**
 * Where one faces on «Compass», in words and degrees (TASK-518 B, the
 * user's choice of 2026-11-24): «NE · 42°», the nearest of the eight points
 * in the app's language and the degrees clockwise from north, whole. With
 * north up nothing is written (the user's «Niente etichetta»: the arrow
 * says N already).
 */
export function headingLabel(facing: number): string {
  const deg = Math.round(((facing % 360) + 360) % 360) % 360;
  return `${t(compassPoint(deg))} · ${deg}°`;
}
