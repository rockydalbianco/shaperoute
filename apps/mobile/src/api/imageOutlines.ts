import type { ImageOutline } from "@shaperoute/shared-types";

import { isApiError, type RouteOutcome } from "./routes";

/** Every way asking for the outline of an image can end. */
export type ImageOutcome =
  | { kind: "outline"; outline: ImageOutline }
  | Extract<RouteOutcome, { kind: "api_error" | "bad_answer" | "unreachable" }>
  | { kind: "cancelled" };

/**
 * Asks the API for the outline the engine traces from an image (TASK-073,
 * ADR-0069): the image goes once, in base64. The app shows the outline
 * before the route is asked for. Never throws.
 */
export async function requestImageOutline(
  baseUrl: string,
  base64: string,
  { signal, fetchFn = fetch }: { signal?: AbortSignal; fetchFn?: typeof fetch } = {},
): Promise<ImageOutcome> {
  let response: Response;
  try {
    response = await fetchFn(`${baseUrl}/image-outlines`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: base64 }),
      signal,
    });
  } catch {
    return signal?.aborted
      ? { kind: "cancelled" }
      : { kind: "unreachable", url: baseUrl };
  }
  const body: unknown = await response.json().catch(() => undefined);
  if (response.ok && isImageOutline(body)) {
    return { kind: "outline", outline: body };
  }
  return !response.ok && isApiError(body)
    ? { kind: "api_error", ...body.error }
    : { kind: "bad_answer", status: response.status };
}

function isPoints(value: unknown, min: number, max: number): boolean {
  return (
    Array.isArray(value) &&
    value.length >= 4 &&
    value.every(
      (point) =>
        Array.isArray(point) &&
        point.length === 2 &&
        point.every(
          (part) =>
            typeof part === "number" &&
            Number.isFinite(part) &&
            part >= min &&
            part <= max,
        ),
    )
  );
}

/** Enough checks to draw it and send it back safely. */
export function isImageOutline(body: unknown): body is ImageOutline {
  if (typeof body !== "object" || body === null) {
    return false;
  }
  const { points, image_points, aspect } = body as Record<string, unknown>;
  return (
    isPoints(points, -1, 1) &&
    isPoints(image_points, 0, 1) &&
    (image_points as unknown[]).length === (points as unknown[]).length &&
    typeof aspect === "number" &&
    Number.isFinite(aspect) &&
    aspect > 0
  );
}
