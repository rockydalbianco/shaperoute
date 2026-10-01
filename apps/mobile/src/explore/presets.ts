import type { Place } from "../places/photon";

/**
 * The quick choices of "Explore" (TASK-134): cities from around the world,
 * and the categories of "Ask for a route", Food first. A city is a name
 * only: its centre comes from the API when it is tapped, never written here.
 */
export const FEATURED_CITIES = [
  "New York",
  "London",
  "Paris",
  "Tokyo",
  "Rome",
  "Milan",
  "Torino",
  "Barcelona",
  "Dubai",
  "Amsterdam",
  "Berlin",
  "Lisbon",
  "Sydney",
  "San Francisco",
] as const;

/** Each category is a theme of the API, named in words its tables read. */
export const CATEGORIES = [
  "Food",
  "Famous Places",
  "Romantic",
  "Best Views",
  "Shopping",
  "Culture",
  "Nightlife",
  "Hidden Gems",
  "Running",
  "Walking",
  "Family",
  "Photography",
  "Local Experience",
] as const;

export type Category = (typeof CATEGORIES)[number];

/** "Milan, Lombardy, Italy" → "Milan". */
export function cityShort(label: string): string {
  return label.split(",")[0].trim();
}

/** The words sent for a category: "Food in New York". */
export function requestFor(category: string, city: Place | null): string {
  return city === null ? category : `${category} in ${cityShort(city.label)}`;
}

/** The hint in the request field, for the chosen city. */
export function exampleFor(city: Place | null): string {
  return city === null
    ? "e.g. a romantic heart, famous places, food 8 km"
    : `e.g. a romantic heart in ${cityShort(city.label)}, 8 km`;
}
