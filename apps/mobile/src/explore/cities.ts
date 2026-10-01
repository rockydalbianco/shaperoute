import { apiKey, keyHeaders } from "../api/apiUrl";
import type { Place } from "../places/photon";
import { isPlaces } from "../places/placeFinder";

/**
 * Cities of the whole world by name, from the API's GET /cities (TASK-129):
 * each with its centre, as `Place`. Never throws: a failure is no cities.
 */
export async function searchCities(
  baseUrl: string,
  query: string,
  {
    fetchFn = fetch,
    key = apiKey(),
    signal,
  }: { fetchFn?: typeof fetch; key?: string | null; signal?: AbortSignal } = {},
): Promise<Place[] | null> {
  const text = query.trim();
  if (text === "") {
    return [];
  }
  try {
    const response = await fetchFn(`${baseUrl}/cities?q=${encodeURIComponent(text)}`, {
      headers: keyHeaders(key),
      signal,
    });
    const body: unknown = await response.json();
    return response.ok && isPlaces(body) ? body.places : null;
  } catch {
    return null;
  }
}

/**
 * Cities and places while typing (TASK-134, TASK-138): GET
 * /city-suggestions, "Par" → Paris, Parma; "arena di ver" → Arena di Verona.
 * Never throws: null when the API does not answer.
 */
export async function suggestCities(
  baseUrl: string,
  query: string,
  {
    fetchFn = fetch,
    key = apiKey(),
    signal,
  }: { fetchFn?: typeof fetch; key?: string | null; signal?: AbortSignal } = {},
): Promise<Place[] | null> {
  const text = query.trim();
  if (text.length < 2) {
    return [];
  }
  try {
    const response = await fetchFn(
      `${baseUrl}/city-suggestions?q=${encodeURIComponent(text)}`,
      { headers: keyHeaders(key), signal },
    );
    const body: unknown = await response.json();
    return response.ok && isPlaces(body) ? body.places.map(asSuggestion) : null;
  } catch {
    return signal?.aborted ? [] : null;
  }
}

/** A city unless the API says it is a place: before TASK-138 it sent cities. */
export function asSuggestion({ label, point, kind }: Place): Place {
  return { label, point, kind: kind === "place" ? "place" : "city" };
}
