import {
  API_ERROR_CODES,
  type ApiError,
  type ApiErrorCode,
  JOB_STATUSES,
  type JobStatus,
  type RouteJob,
  type RouteRequest,
  type RouteResult,
  SHAPES,
} from "@shaperoute/shared-types";

/** How often the app asks where a route job stands (ADR-0032). */
export const POLL_MS = 2_000;
/** When the app stops waiting: the worst case seen was about 165 s. */
export const MAX_WAIT_MS = 5 * 60_000;
/** Network errors in a row while waiting before the API counts as gone. */
export const MAX_POLL_FAILURES = 3;

/** Every way a route request can end. */
export type RouteOutcome =
  | { kind: "route"; result: RouteResult }
  | { kind: "api_error"; code: ApiErrorCode; message: string }
  | { kind: "bad_answer"; status: number }
  | { kind: "unreachable"; url: string }
  /** The API does not know the job any more: restarted, or 10 minutes gone. */
  | { kind: "lost" }
  | { kind: "timeout" }
  | { kind: "cancelled" };

type Options = {
  /** Aborting it cancels the request, on the API too. */
  signal?: AbortSignal;
  /** Called with each state the API reports while working. */
  onStatus?: (status: JobStatus) => void;
  fetchFn?: typeof fetch;
  pollMs?: number;
  maxWaitMs?: number;
};

type Answer = { status: number; ok: boolean; body: unknown };

/**
 * Asks the API for a route in two steps (ADR-0032): POST /route-jobs answers
 * at once with a job, then GET /route-jobs/{id} every `pollMs` until the job
 * is done or failed. Never throws.
 */
export async function requestRoute(
  baseUrl: string,
  request: RouteRequest,
  {
    signal,
    onStatus,
    fetchFn = fetch,
    pollMs = POLL_MS,
    maxWaitMs = MAX_WAIT_MS,
  }: Options = {},
): Promise<RouteOutcome> {
  const deadline = Date.now() + maxWaitMs;
  let answer: Answer;
  try {
    answer = await call(fetchFn, `${baseUrl}/route-jobs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
      signal,
    });
  } catch {
    return signal?.aborted
      ? { kind: "cancelled" }
      : { kind: "unreachable", url: baseUrl };
  }
  if (!isRouteJob(answer.body)) {
    return problemOf(answer);
  }
  let job = answer.body;
  const jobUrl = `${baseUrl}/route-jobs/${encodeURIComponent(job.job_id)}`;
  // Tells the API to drop the job; nobody waits for its answer.
  const forget = () =>
    void fetchFn(jobUrl, { method: "DELETE" }).catch(() => undefined);

  let failures = 0;
  for (;;) {
    if (job.status === "done" && job.result) {
      return { kind: "route", result: job.result };
    }
    if (job.status === "failed" && job.error) {
      return { kind: "api_error", code: job.error.code, message: job.error.message };
    }
    onStatus?.(job.status);
    if (Date.now() >= deadline) {
      forget();
      return { kind: "timeout" };
    }
    try {
      await sleep(pollMs, signal);
      answer = await call(fetchFn, jobUrl, { signal });
    } catch {
      if (signal?.aborted) {
        forget();
        return { kind: "cancelled" };
      }
      failures += 1;
      if (failures >= MAX_POLL_FAILURES) {
        return { kind: "unreachable", url: baseUrl };
      }
      continue;
    }
    failures = 0;
    if (answer.status === 404) {
      return { kind: "lost" };
    }
    if (!isRouteJob(answer.body)) {
      return problemOf(answer);
    }
    job = answer.body;
  }
}

async function call(
  fetchFn: typeof fetch,
  url: string,
  init: RequestInit,
): Promise<Answer> {
  const response = await fetchFn(url, init);
  const body: unknown = await response.json().catch(() => undefined);
  return { status: response.status, ok: response.ok, body };
}

function problemOf(answer: Answer): RouteOutcome {
  if (!answer.ok && isApiError(answer.body)) {
    const { code, message } = answer.body.error;
    return { kind: "api_error", code, message };
  }
  return { kind: "bad_answer", status: answer.status };
}

/** Waits `ms`, or rejects as soon as `signal` aborts. */
function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new Error("Aborted"));
      return;
    }
    const stop = () => {
      clearTimeout(timer);
      reject(new Error("Aborted"));
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", stop);
      resolve();
    }, ms);
    signal?.addEventListener("abort", stop, { once: true });
  });
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

function isErrorDetail(value: unknown): value is ApiError["error"] {
  return (
    isRecord(value) &&
    (API_ERROR_CODES as readonly unknown[]).includes(value.code) &&
    typeof value.message === "string"
  );
}

function isApiError(body: unknown): body is ApiError {
  return isRecord(body) && isErrorDetail(body.error);
}

export function isRouteJob(body: unknown): body is RouteJob {
  return (
    isRecord(body) &&
    typeof body.job_id === "string" &&
    (JOB_STATUSES as readonly unknown[]).includes(body.status) &&
    (body.result === null || isRouteResult(body.result)) &&
    (body.error === null || isErrorDetail(body.error))
  );
}
