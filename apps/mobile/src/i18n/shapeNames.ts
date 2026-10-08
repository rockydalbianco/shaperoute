import { appLanguage } from "./language";
import { t, tLater } from "./translate";

/** The catalogue's shapes as people read them, in English (TASK-210). */
const SHAPE_NAMES: Readonly<Record<string, string>> = {
  circle: tLater("Circle"),
  heart: tLater("Heart"),
  star: tLater("Star"),
  horse: tLater("Horse"),
  moon: tLater("Moon"),
  cat: tLater("Cat"),
  fish: tLater("Fish"),
  butterfly: tLater("Butterfly"),
  snail: tLater("Snail"),
  dog_head: tLater("Dog head"),
  rabbit_head: tLater("Rabbit head"),
  pumpkin: tLater("Pumpkin"),
  christmas_tree: tLater("Christmas tree"),
  smiley: tLater("Smiley"),
  ghost: tLater("Ghost"),
  donut: tLater("Donut"),
  // Not "Sun": that is Sunday's, in the list of the days (activityText.ts).
  sun: tLater("The sun"),
};

/**
 * A shape's name with a capital, in the app's language: "Dog head" for
 * `dog_head`. A shape the app does not know yet is written from its id.
 */
export function shapeName(shape: string): string {
  const name = SHAPE_NAMES[shape];
  if (name !== undefined) {
    return t(name);
  }
  const words = shape.replace(/_/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/**
 * A shape's name inside a sentence, and in «Draw»'s field (TASK-210 F):
 * "dog head", «Hundekopf», «testa di cane», «cabeza de perro», «tête de
 * chien». The name above without its capital, except in German, which
 * writes every noun with one. English keeps the shape's own words, and so
 * does a shape the app does not know yet.
 */
export function shapeWord(shape: string): string {
  const language = appLanguage();
  if (language === "en" || SHAPE_NAMES[shape] === undefined) {
    return shape.replace(/_/g, " ");
  }
  const name = shapeName(shape);
  return language === "de" ? name : name.charAt(0).toLowerCase() + name.slice(1);
}
