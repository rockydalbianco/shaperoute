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
 * Cities while typing (TASK-134): GET /city-suggestions, "Par" → Parma,
 * Paris. Never throws: null when the API does not answer.
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
    return response.ok && isPlaces(body) ? body.places : null;
  } catch {
    return signal?.aborted ? [] : null;
  }
}
