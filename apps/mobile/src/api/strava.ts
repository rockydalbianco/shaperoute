import { t } from "../i18n";
import { type AccountOutcome, ask } from "./accounts";

/**
 * Send to Strava (TASK-187, ADR-0156): the calls of docs/API.md, «Send to
 * Strava», all with the session token. The bodies are
 * packages/shared-types/fixtures/strava-*.json; the types live here, like
 * `Favorite`. The app never sees a Strava token: connecting goes through
 * the browser and the API.
 */

/** GET /me/strava: is Strava on this API, and is the account connected? */
export type StravaStatus = {
  /** False when the API has no Strava application: nothing of Strava shows. */
  available: boolean;
  connected: boolean;
  /** The athlete's name on Strava, for «Connected as …»; null when unknown. */
  athlete: string | null;
};

/** What Strava has of a saved run. */
export type StravaActivity = {
  status: "not_sent" | "processing" | "sent";
  /** The activity's page on Strava, once `sent`; null when unknown. */
  url: string | null;
};

/**
 * An outcome of a Strava call, with the HTTP status of the answer (`http`;
 * null without one): the API
 * says `http_error` for a run it does not know (404), an athlete not
 * connected (409), Strava silent (502) and Strava off (503), and the app
 * does something different for each.
 */
export type StravaOutcome<T> = AccountOutcome<T> & { http: number | null };

/** Strava off: what an API from before TASK-187 means too. */
export const STRAVA_OFF: StravaStatus = {
  available: false,
  connected: false,
  athlete: null,
};

type Options = { fetchFn?: typeof fetch; key?: string | null };

/** A send's options: also the text of the run's post (TASK-231). */
type SendOptions = Options & { post?: string | null };

/** `ask`, keeping the status of the answer. */
async function askStrava<T>(
  baseUrl: string,
  path: string,
  init: { method: string; body?: unknown; token: string },
  accept: (body: unknown, status: number) => body is T,
  { fetchFn = fetch, key }: Options,
): Promise<StravaOutcome<T>> {
  let http: number | null = null;
  const outcome = await ask(baseUrl, path, init, accept, {
    key,
    fetchFn: async (input, request) => {
      const response = await fetchFn(input, request);
      http = response.status;
      return response;
    },
  });
  return { ...outcome, http };
}

/**
 * GET /me/strava. An API from before Strava has no such endpoint and says
 * 404: Strava is off there.
 */
export async function fetchStravaStatus(
  baseUrl: string,
  token: string,
  options: Options = {},
): Promise<StravaOutcome<StravaStatus>> {
  const outcome = await askStrava(
    baseUrl,
    "/me/strava",
    { method: "GET", token },
    isStravaStatus,
    options,
  );
  return outcome.kind === "api_error" && outcome.http === 404
    ? { kind: "ok", value: STRAVA_OFF, http: outcome.http }
    : outcome;
}

/** POST /me/strava/connect: Strava's page to open in the browser. */
export async function connectStrava(
  baseUrl: string,
  token: string,
  options: Options = {},
): Promise<StravaOutcome<string>> {
  const outcome = await askStrava(
    baseUrl,
    "/me/strava/connect",
    { method: "POST", token },
    isConnect,
    options,
  );
  return outcome.kind === "ok" ? { ...outcome, value: outcome.value.url } : outcome;
}

/** DELETE /me/strava: disconnected, or never connected. */
export function disconnectStrava(
  baseUrl: string,
  token: string,
  options: Options = {},
): Promise<StravaOutcome<null>> {
  return askStrava(
    baseUrl,
    "/me/strava",
    { method: "DELETE", token },
    isEmpty,
    options,
  );
}

function stravaPath(key: string): string {
  return `/me/activities/${encodeURIComponent(key)}/strava`;
}

/** GET /me/activities/{key}/strava: what Strava has of the run. */
export function fetchStravaActivity(
  baseUrl: string,
  token: string,
  key: string,
  options: Options = {},
): Promise<StravaOutcome<StravaActivity>> {
  return askStrava(
    baseUrl,
    stravaPath(key),
    { method: "GET", token },
    isStravaActivity,
    options,
  );
}

/**
 * POST /me/activities/{key}/strava: the saved run to Strava, `sent` or
 * still `processing` (202: the same call later goes on). `name` is the one
 * typed before «Save»; without one no body goes, and the API gives its own
 * name, as before names could be typed; it counts only for the first
 * send. `post`, the text of the run's post (TASK-231), goes over the API's
 * «Drawn with Sgrava», and on a run already on Strava replaces the text
 * there. Sending again is always safe: the API never makes two activities
 * of a run.
 */
export function sendToStrava(
  baseUrl: string,
  token: string,
  key: string,
  name: string | null,
  { post = null, ...options }: SendOptions = {},
): Promise<StravaOutcome<StravaActivity>> {
  const typed = name?.trim() ?? "";
  const posted = post?.trim() ?? "";
  const body = {
    ...(typed === "" ? {} : { name: typed }),
    ...(posted === "" ? {} : { post: posted }),
  };
  return askStrava(
    baseUrl,
    stravaPath(key),
    { method: "POST", token, ...(Object.keys(body).length === 0 ? {} : { body }) },
    isStravaActivity,
    options,
  );
}

/** The athlete is not connected (any more): «Connect with Strava» again. */
export function notConnected(outcome: StravaOutcome<unknown>): boolean {
  return outcome.kind === "api_error" && outcome.http === 409;
}

/**
 * A sending that the same call, later, could make go: no network, the API
 * or Strava silent or busy, Strava still reading the run.
 */
export function worthAgain(outcome: StravaOutcome<StravaActivity>): boolean {
  switch (outcome.kind) {
    case "ok":
      return outcome.value.status === "processing";
    case "unreachable":
      return true;
    case "bad_answer":
      return outcome.status >= 500;
    case "api_error":
      return (
        outcome.code === "too_many_requests" ||
        outcome.code === "session_expired" ||
        outcome.code === "not_signed_in" ||
        outcome.http === 502
      );
  }
}

/** Words for a Strava call that did not go; null when it did. */
export function stravaProblem(outcome: StravaOutcome<unknown>): string | null {
  if (outcome.kind === "ok") {
    return null;
  }
  if (outcome.kind === "unreachable") {
    return t("No connection. Try again when you are online.");
  }
  if (outcome.kind === "api_error") {
    if (outcome.code === "session_expired" || outcome.code === "not_signed_in") {
      return t("Your session has ended. Log in again.");
    }
    if (outcome.code === "too_many_requests") {
      return t("Strava is taking no more runs for now. Try again later.");
    }
    if (outcome.code === "invalid_request") {
      return t("Strava could not read this run.");
    }
    if (outcome.http === 409) {
      return t("Strava is not connected. Connect it and try again.");
    }
    if (outcome.http === 404) {
      return t("This run is no longer in your activities.");
    }
    if (outcome.http === 503) {
      return t("Strava is not available on this API.");
    }
  }
  return t("Strava did not answer. Try again in a while.");
}

function isEmpty(body: unknown, status: number): body is null {
  return status === 204 && body === null;
}

function isRecord(body: unknown): body is Record<string, unknown> {
  return typeof body === "object" && body !== null;
}

export function isStravaStatus(body: unknown): body is StravaStatus {
  return (
    isRecord(body) &&
    typeof body.available === "boolean" &&
    typeof body.connected === "boolean" &&
    (body.athlete === null || typeof body.athlete === "string")
  );
}

function isConnect(body: unknown): body is { url: string } {
  // Only Strava's own page opens in the browser.
  return (
    isRecord(body) && typeof body.url === "string" && body.url.startsWith("https://")
  );
}

export function isStravaActivity(body: unknown): body is StravaActivity {
  return (
    isRecord(body) &&
    (body.status === "not_sent" ||
      body.status === "processing" ||
      body.status === "sent") &&
    (body.url === null || typeof body.url === "string")
  );
}
