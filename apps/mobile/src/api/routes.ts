import {
  API_ERROR_CODES,
  type ApiError,
  type ApiErrorCode,
  type RouteRequest,
  type RouteResult,
  SHAPES,
} from "@shaperoute/shared-types";

/**
 * iOS closes a request that stays silent for about a minute: the app stops
 * waiting at the same point, and says so (ADR-0031).
 */
export const ROUTE_TIMEOUT_MS = 60_000;

/** Every way a route request can end. */
export type RouteOutcome =
  | { kind: "route"; result: RouteResult }
  | { kind: "api_error"; code: ApiErrorCode; message: string }
  | { kind: "bad_answer"; status: number }
  | { kind: "unreachable"; url: string }
  | { kind: "timeout" }
  | { kind: "cancelled" };

type Options = {
  /** Aborting it cancels the request. */
  signal?: AbortSignal;
  fetchFn?: typeof fetch;
  timeoutMs?: number;
};

/** Asks the API for a route; never throws. */
export async function requestRoute(
  baseUrl: string,
  request: RouteRequest,
  { signal, fetchFn = fetch, timeoutMs = ROUTE_TIMEOUT_MS }: Options = {},
): Promise<RouteOutcome> {
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  const cancel = () => controller.abort();
  signal?.addEventListener("abort", cancel);
  try {
    const response = await fetchFn(`${baseUrl}/routes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
      signal: controller.signal,
    });
    const body: unknown = await response.json().catch(() => undefined);
    if (response.ok && isRouteResult(body)) {
      return { kind: "route", result: body };
    }
    if (!response.ok && isApiError(body)) {
      return { kind: "api_error", code: body.error.code, message: body.error.message };
    }
    return { kind: "bad_answer", status: response.status };
  } catch {
    if (timedOut) {
      return { kind: "timeout" };
    }
    if (signal?.aborted) {
      return { kind: "cancelled" };
    }
    return { kind: "unreachable", url: baseUrl };
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", cancel);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isPoint(value: unknown): boolean {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    value.every((part) => typeof part === "number" && Number.isFinite(part))
  );
}

/** Enough checks to draw it safely: the API is ours, but it is another program. */
export function isRouteResult(body: unknown): body is RouteResult {
  return (
    isRecord(body) &&
    Array.isArray(body.points) &&
    body.points.length >= 2 &&
    body.points.every(isPoint) &&
    typeof body.distance_m === "number" &&
    typeof body.similarity === "number" &&
    (SHAPES as readonly unknown[]).includes(body.shape) &&
    Array.isArray(body.warnings) &&
    body.warnings.every((warning) => typeof warning === "string")
  );
}

function isApiError(body: unknown): body is ApiError {
  return (
    isRecord(body) &&
    isRecord(body.error) &&
    (API_ERROR_CODES as readonly unknown[]).includes(body.error.code) &&
    typeof body.error.message === "string"
  );
}
