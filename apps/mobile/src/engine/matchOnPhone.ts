import type {
  ApiErrorCode,
  LatLon,
  StrokeMatchRequest,
  StrokeMatchResult,
} from "@shaperoute/shared-types";

import { isApiError } from "../api/routes";
import {
  isStrokeMatch,
  requestStrokeMatch,
  strokeMatchesOnServer,
  type StrokeMatchOutcome,
} from "../api/strokeMatches";
import { metresBetween } from "../map/coordinates";
import { VERDICTS } from "./onPhone";
import { MATCH_TIMEOUT_MS, type PhoneEngine, phoneEngine } from "./phoneEngine";
import { phoneId } from "./prefetch";
import {
  AROUND_MARGIN_M,
  downloadZone,
  type Network,
  NETWORKS,
  savedZones,
  touchZone,
  type ZoneDownload,
  type ZoneEntry,
  zonesForEngine,
} from "./zones";

/**
 * A stroke drawn on the map, anchored to the roads as the finger lifts
 * (TASK-347 part B, ADR-0300): the engine on the phone first, on the zone
 * saved around the stroke, then the server, as for routes (onPhone.ts).
 * Never throws and never shows an error: whoever asks (part C) draws what it
 * gets, and leaves the stroke as a ghost otherwise.
 *
 * Where it goes first, from part A's times («Esito» of TASK-347):
 * - a stroke up to PHONE_MAX_STROKE_M, with a zone around it, on the phone;
 *   a longer one, or one with no zone here, on the server, and on the phone
 *   only when the server cannot be asked;
 * - once a stroke took more than PHONE_SLOW_MS on the phone with its zone
 *   already read, the strokes after it go to the server first, until the
 *   app starts again: this phone is too slow for strokes as you draw;
 * - a stroke far from the zones saved, a drawing somewhere else, goes to
 *   the server, and the zone of that place is downloaded meanwhile (as a
 *   zone ahead, counted against the day's cap), so the strokes after it are
 *   anchored on the phone;
 * - with no zone and no server, or a server older than TASK-347 (its probe
 *   answers 404), the stroke stays a ghost ("none"), to be anchored at the
 *   next chance.
 */

export type MatchAnswer =
  | { kind: "match"; match: StrokeMatchResult; by: "phone" | "server" }
  /** What the engine decides, the same on the phone and on the server: a
   * stroke collapsing onto a single road node, or a stroke the API refuses.
   * Asking again does not change it. */
  | { kind: "verdict"; code: ApiErrorCode; message: string }
  /** Nothing to draw now: the stroke stays a ghost, and may be asked again. */
  | { kind: "none"; why: string }
  | { kind: "cancelled" };

/** The longest stroke the phone anchors first: part A measured 0.2–0.56 s
 * in Pyodide on the Mac up to 3.7 km, a phone being slower. */
export const PHONE_MAX_STROKE_M = 3_000;
/** A stroke slower than this on the phone, with its zone already read,
 * sends the strokes after it to the server first (ADR-0300). */
export const PHONE_SLOW_MS = 1_500;

/** How the phone has done with strokes since the app started. */
export class MatchPace {
  /** A stroke took longer than PHONE_SLOW_MS with its zone in memory. */
  slow = false;
  /** The zones of the last stroke on the phone: the page keeps them in
   * memory, so the next stroke on the same ones is timed without reading
   * them. */
  private lastZones: string | null = null;

  /** Hears how long a stroke took on the phone on `zones`. The first stroke
   * on a set of zones reads them (up to 5 s for a wide zone): it does not
   * count. */
  heard(zones: string, ms: number): void {
    if (this.lastZones === zones && ms > PHONE_SLOW_MS) {
      this.slow = true;
    }
    this.lastZones = zones;
  }
}

/** The one pace of the app. */
export const matchPace = new MatchPace();

/** Downloads of the zone of a far drawing, one at a time per network. */
const fetching = new Set<Network>();

/** The zone of `network` around `point`, as a zone ahead (zones.ts). */
export type FetchZone = (
  baseUrl: string,
  network: Network,
  point: LatLon,
) => Promise<ZoneDownload>;

const fetchAhead: FetchZone = (baseUrl, network, point) =>
  downloadZone(baseUrl, network, point, { prefetch: true, marginM: AROUND_MARGIN_M });

type Options = {
  signal?: AbortSignal;
  engine?: PhoneEngine;
  zones?: () => ZoneEntry[];
  pace?: MatchPace;
  phone?: () => string;
  ask?: typeof requestStrokeMatch;
  probe?: typeof strokeMatchesOnServer;
  fetchZone?: FetchZone;
  timeoutMs?: number;
};

/** Neither a match nor a verdict where it was asked: the other side may
 * do better. */
type Skipped = { kind: "skipped"; why: string };

/** The stroke's length in metres, from where the one before ended. */
export function strokeLength({ line, from }: StrokeMatchRequest): number {
  let total = 0;
  let before: LatLon | undefined = from;
  for (const point of line) {
    if (before !== undefined) {
      total += metresBetween(before, point);
    }
    before = point;
  }
  return total;
}

/** Where the stroke's zone is looked for: where the route starts. */
function anchorOf({ line, from }: StrokeMatchRequest): LatLon {
  return from ?? line[0];
}

export async function matchStroke(
  baseUrl: string | null,
  request: StrokeMatchRequest,
  {
    signal,
    engine = phoneEngine,
    zones = savedZones,
    pace = matchPace,
    phone = phoneId,
    ask = requestStrokeMatch,
    probe = strokeMatchesOnServer,
    fetchZone = fetchAhead,
    timeoutMs = MATCH_TIMEOUT_MS,
  }: Options = {},
): Promise<MatchAnswer> {
  const network = NETWORKS[request.activity];
  if (network === undefined) {
    return {
      kind: "verdict",
      code: "invalid_request",
      message: `no roads for ${request.activity}`,
    };
  }
  const near = zonesForEngine(zones(), network, anchorOf(request));
  if (near.length === 0 && baseUrl !== null) {
    fetchZoneOf(baseUrl, network, anchorOf(request), fetchZone);
  }
  const onPhone = () => matchOnPhone(request, engine, near, pace, timeoutMs, signal);
  const phoneFirst =
    near.length > 0 &&
    engine.available &&
    !pace.slow &&
    strokeLength(request) <= PHONE_MAX_STROKE_M;

  if (phoneFirst) {
    const drawn = await onPhone();
    if (drawn.kind !== "skipped") {
      return drawn;
    }
    if (signal?.aborted) {
      return { kind: "cancelled" };
    }
    const served = await onServer(baseUrl, request, ask, probe, phone, signal);
    return served.kind === "skipped"
      ? { kind: "none", why: `${drawn.why}; ${served.why}` }
      : served;
  }
  const served = await onServer(baseUrl, request, ask, probe, phone, signal);
  if (served.kind !== "skipped") {
    return served;
  }
  if (near.length === 0) {
    return { kind: "none", why: `${served.why}; no zone saved around the stroke` };
  }
  const drawn = await onPhone();
  return drawn.kind === "skipped"
    ? { kind: "none", why: `${served.why}; ${drawn.why}` }
    : drawn;
}

/** Starts the download of the zone around a stroke far from the zones
 * saved, unless one of the same network is on its way. Nobody waits for it:
 * the next stroke there finds it. */
function fetchZoneOf(
  baseUrl: string,
  network: Network,
  point: LatLon,
  fetchZone: FetchZone,
): void {
  if (fetching.has(network)) {
    return;
  }
  fetching.add(network);
  void fetchZone(baseUrl, network, point)
    .catch(() => undefined)
    .finally(() => fetching.delete(network));
}

async function matchOnPhone(
  request: StrokeMatchRequest,
  engine: PhoneEngine,
  near: ReturnType<typeof zonesForEngine>,
  pace: MatchPace,
  timeoutMs: number,
  signal?: AbortSignal,
): Promise<MatchAnswer | Skipped> {
  if (!engine.available) {
    return { kind: "skipped", why: "the engine does not run on this phone" };
  }
  for (const zone of near) {
    touchZone(zone.name);
  }
  const answer = await engine.match(JSON.stringify(request), near, timeoutMs, signal);
  if (signal?.aborted || answer.kind === "cancelled") {
    return { kind: "cancelled" };
  }
  if (answer.kind === "failed") {
    return { kind: "skipped", why: answer.why };
  }
  pace.heard(near.map((zone) => `${zone.name}@${zone.version}`).join(","), answer.ms);
  return fromPhone(answer.json, request.line.length);
}

function fromPhone(json: string, sent: number): MatchAnswer | Skipped {
  let body: unknown;
  try {
    body = JSON.parse(json);
  } catch {
    return { kind: "skipped", why: "the engine gave no JSON" };
  }
  if (isStrokeMatch(body, sent)) {
    return { kind: "match", match: body, by: "phone" };
  }
  if (isApiError(body) && VERDICTS.includes(body.error.code)) {
    return { kind: "verdict", code: body.error.code, message: body.error.message };
  }
  // No zone that holds the stroke, or anything else: the server may.
  return {
    kind: "skipped",
    why: isApiError(body) ? body.error.message : "the engine gave no match",
  };
}

async function onServer(
  baseUrl: string | null,
  request: StrokeMatchRequest,
  ask: typeof requestStrokeMatch,
  probe: typeof strokeMatchesOnServer,
  phone: () => string,
  signal?: AbortSignal,
): Promise<MatchAnswer | Skipped> {
  if (baseUrl === null) {
    return { kind: "skipped", why: "no server" };
  }
  const knows = await probe(baseUrl);
  if (signal?.aborted) {
    return { kind: "cancelled" };
  }
  if (knows !== true) {
    return {
      kind: "skipped",
      why:
        knows === false
          ? "the server does not anchor strokes"
          : "the server cannot tell",
    };
  }
  return fromServer(
    await ask(baseUrl, request, { signal, phone: phone() }),
    request.line.length,
  );
}

function fromServer(outcome: StrokeMatchOutcome, sent: number): MatchAnswer | Skipped {
  switch (outcome.kind) {
    case "match":
      return isStrokeMatch(outcome.match, sent)
        ? { kind: "match", match: outcome.match, by: "server" }
        : {
            kind: "skipped",
            why: "the server gave a distance for each point it did not get",
          };
    case "cancelled":
      return { kind: "cancelled" };
    case "api_error":
      return VERDICTS.includes(outcome.code)
        ? { kind: "verdict", code: outcome.code, message: outcome.message }
        : { kind: "skipped", why: `${outcome.code}: ${outcome.message}` };
    case "unreachable":
      return { kind: "skipped", why: `${outcome.url} cannot be reached` };
    case "bad_answer":
      return { kind: "skipped", why: `the server answered ${outcome.status}` };
  }
}
