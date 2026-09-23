import type { GpxRequest } from "@shaperoute/shared-types";

import { isApiError, type RouteOutcome } from "./routes";

/** Used when the API gives no usable file name. */
export const FALLBACK_FILE_NAME = "shaperoute.gpx";

export type GpxOutcome =
  | { kind: "gpx"; text: string; fileName: string }
  | Extract<RouteOutcome, { kind: "api_error" | "bad_answer" | "unreachable" }>;

/**
 * Asks the API to write the route as GPX (ADR-0033): the same file the CLI
 * writes. The API keeps nothing, so the app sends request and result.
 * Never throws.
 */
export async function requestGpx(
  baseUrl: string,
  body: GpxRequest,
  fetchFn: typeof fetch = fetch,
): Promise<GpxOutcome> {
  let response: Response;
  try {
    response = await fetchFn(`${baseUrl}/gpx`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    return { kind: "unreachable", url: baseUrl };
  }
  if (response.ok) {
    const text = await response.text().catch(() => "");
    return text.includes("<gpx")
      ? {
          kind: "gpx",
          text,
          fileName: fileNameOf(response.headers.get("content-disposition")),
        }
      : { kind: "bad_answer", status: response.status };
  }
  const error: unknown = await response.json().catch(() => undefined);
  return isApiError(error)
    ? { kind: "api_error", code: error.error.code, message: error.error.message }
    : { kind: "bad_answer", status: response.status };
}

/** The name in `attachment; filename="..."`, if it is a plain .gpx name. */
export function fileNameOf(disposition: string | null): string {
  const name = disposition?.match(/filename="([^"]+)"/)?.[1];
  return name && /^[\w.-]+\.gpx$/.test(name) ? name : FALLBACK_FILE_NAME;
}
