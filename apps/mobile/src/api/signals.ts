import type { Drawn, Signal } from "@shaperoute/shared-types/src/signals";

import { apiKey, apiUrl, keyHeaders } from "./apiUrl";
import { type AnyRouteRequest, isImageRequest } from "./routes";

/**
 * Tells the API what came of a search (TASK-142, ADR-0111): POST /signals,
 * for its search events (docs/INSIGHTS.md). Fire and forget: never throws,
 * nothing waits for it, and without an API it sends nothing.
 */
export async function sendSignal(
  signal: Signal,
  {
    baseUrl = apiUrl(),
    fetchFn = fetch,
    key = apiKey(),
  }: { baseUrl?: string | null; fetchFn?: typeof fetch; key?: string | null } = {},
): Promise<boolean> {
  if (baseUrl === null) {
    return false;
  }
  try {
    const response = await fetchFn(`${baseUrl}/signals`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...keyHeaders(key) },
      body: JSON.stringify(signal),
    });
    return response.ok;
  } catch {
    return false;
  }
}

/** What a request draws, as a signal says it: never its start. */
export function drawnOf(request: AnyRouteRequest): Drawn {
  if (isImageRequest(request)) {
    return { shape: "image" };
  }
  return request.shape != null
    ? { shape: request.shape }
    : { word: (request.word ?? "").toUpperCase() };
}
