import {
  type Shape,
  type ShapeReading,
  type ShapeReadingRequest,
  SHAPES,
} from "@shaperoute/shared-types";

import { isApiError, type RouteOutcome } from "./routes";

export type ShapeReadingOutcome =
  | { kind: "reading"; shape: Shape | null }
  | Extract<RouteOutcome, { kind: "api_error" | "bad_answer" | "unreachable" }>;

/**
 * Asks the AI on the PC which shape of the catalogue the words name
 * (ADR-0012): only for words the app's own table does not know. Null: none.
 * Never throws.
 */
export async function requestShapeReading(
  baseUrl: string,
  text: string,
  fetchFn: typeof fetch = fetch,
): Promise<ShapeReadingOutcome> {
  const body: ShapeReadingRequest = { text };
  let response: Response;
  try {
    response = await fetchFn(`${baseUrl}/shape-readings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    return { kind: "unreachable", url: baseUrl };
  }
  const answer: unknown = await response.json().catch(() => undefined);
  if (response.ok && isShapeReading(answer)) {
    return { kind: "reading", shape: answer.shape };
  }
  return !response.ok && isApiError(answer)
    ? { kind: "api_error", code: answer.error.code, message: answer.error.message }
    : { kind: "bad_answer", status: response.status };
}

function isShapeReading(body: unknown): body is ShapeReading {
  if (typeof body !== "object" || body === null) {
    return false;
  }
  const { text, shape } = body as Record<string, unknown>;
  return (
    typeof text === "string" &&
    (shape === null ||
      (typeof shape === "string" && (SHAPES as readonly string[]).includes(shape)))
  );
}
