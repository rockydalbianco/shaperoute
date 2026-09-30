import type {
  EditKind,
  ImageOutline,
  ImageOutlineEditRequest,
  OutlinePoint,
} from "@shaperoute/shared-types";

import { apiKey, keyHeaders } from "./apiUrl";
import { isImageOutline } from "./imageOutlines";
import { isApiError } from "./routes";
import type { ImageOutcome } from "./imageOutlines";

/** Every way adding a drawn line to an outline can end: the same as
 * tracing one, the refusal being "outline_edit_rejected". */
export type EditOutcome = ImageOutcome;

/**
 * Asks the API to add a line drawn over the picture to its outline, as a
 * part or a detail (TASK-079, ADR-0074). The API keeps nothing: the outline
 * shown goes with the line, and the answer is the new one. Never throws.
 */
export async function requestOutlineEdit(
  baseUrl: string,
  outline: ImageOutline,
  kind: EditKind,
  line: OutlinePoint[],
  {
    signal,
    fetchFn = fetch,
    key = apiKey(),
  }: { signal?: AbortSignal; fetchFn?: typeof fetch; key?: string | null } = {},
): Promise<EditOutcome> {
  const request: ImageOutlineEditRequest = {
    image_points: outline.image_points,
    image_strokes: outline.image_strokes ?? [],
    aspect: outline.aspect,
    kind,
    line,
  };
  let response: Response;
  try {
    response = await fetchFn(`${baseUrl}/image-outline-edits`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...keyHeaders(key) },
      body: JSON.stringify(request),
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
