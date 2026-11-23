import { t, tLater } from "../i18n";

/**
 * The seven figures of the milestones at the gym (TASK-385 E, ADR-0327,
 * docs/sports/gym.md «Le scale»): level 1 is the mouse, level 7 the gorilla.
 * The same order as `figures` in fixtures/gym-exercises.json. Names approved
 * by the user on 2026-11-04.
 */
export const GYM_FIGURES = [
  { key: "mouse", emoji: "🐭", name: tLater("Mouse") },
  { key: "rabbit", emoji: "🐰", name: tLater("Rabbit") },
  { key: "fox", emoji: "🦊", name: tLater("Fox") },
  { key: "wolf", emoji: "🐺", name: tLater("Wolf") },
  { key: "bear", emoji: "🐻", name: tLater("Bear") },
  { key: "rhino", emoji: "🦏", name: tLater("Rhino") },
  { key: "gorilla", emoji: "🦍", name: tLater("Gorilla") },
] as const;

export type GymFigure = (typeof GYM_FIGURES)[number];

/** The figure of a level, 1 to 7; the highest for anything above. */
export function figureOf(level: number): GymFigure {
  const n = Math.min(Math.max(Math.round(level), 1), GYM_FIGURES.length);
  return GYM_FIGURES[n - 1];
}

/** «🦍 Gorilla», in the app's language. */
export function figureLabel(level: number): string {
  const figure = figureOf(level);
  return `${figure.emoji} ${t(figure.name)}`;
}
