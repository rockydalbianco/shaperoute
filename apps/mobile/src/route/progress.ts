import type { RouteState } from "./useRouteRequest";

/** What the API says it is doing (ADR-0032). */
export type WaitingPhase = Extract<RouteState, { status: "waiting" }>["phase"];

/**
 * Where each phase begins and ends on the bar (TASK-055, ADR-0050). The API
 * gives the phase, never a percentage, so the bar is an estimate: it moves
 * through the phase at the pace the measures give (UI.md, «Chiedere un
 * percorso») and slows down as it nears the end of it, without ever passing it.
 * Only the route itself fills the bar.
 */
const SPAN: Record<"waiting" | "downloading_map" | "computing", [number, number]> = {
  waiting: [0, 0.08],
  downloading_map: [0.08, 0.45],
  computing: [0.45, 0.95],
};

/** A new zone downloads in about 105 s for 21 km (API.md, «Tempi»). */
const DOWNLOAD_S = 90;
/** Queued jobs wait for the one before; the POST itself is instant. */
const WAITING_S = 4;

/**
 * Seconds the engine usually takes: 5–35 s up to 10 km, 30–50 s from 15 to
 * 21 km (UI.md). About 2.5 s a km, never under 10 s.
 */
export function computeSeconds(distanceM: number): number {
  return Math.max(10, 2.5 * (distanceM / 1000));
}

function spanOf(phase: WaitingPhase): [number, number] {
  switch (phase) {
    case "downloading_map":
      return SPAN.downloading_map;
    case "sending":
    case "queued":
      return SPAN.waiting;
    default:
      return SPAN.computing;
  }
}

/**
 * Seconds a phase usually lasts. Past twice this the bar shows it is still
 * waiting (`isSlow`), so an API that does not answer never looks stuck
 * (TASK-058, ADR-0055).
 */
export function phaseSeconds(phase: WaitingPhase, distanceM: number): number {
  switch (phase) {
    case "downloading_map":
      return DOWNLOAD_S;
    case "sending":
    case "queued":
      return WAITING_S;
    default:
      return computeSeconds(distanceM);
  }
}

/**
 * The share of the bar to fill, from 0 to 1, after `seconds` in `phase`.
 * At the expected time a phase is 86% through its span, then creeps on.
 */
export function estimateProgress(
  phase: WaitingPhase,
  seconds: number,
  distanceM: number,
): number {
  return along(spanOf(phase), seconds, phaseSeconds(phase, distanceM));
}

/**
 * The AI reads a word in 4–10 s with the model loaded, 39–49 s when it must
 * load it first (AI.md); the API gives up at 90 s (API.md).
 */
export const READING_S = 20;

/** MapLibre and the first tiles, over the phone's connection. */
export const MAP_S = 5;

/** The AI's reading of the words, as a bar (TASK-058). */
export function readingProgress(seconds: number): number {
  return along([0, 0.95], seconds, READING_S);
}

/** The map page and its tiles, as a bar (TASK-058). */
export function mapProgress(seconds: number): number {
  return along([0, 0.95], seconds, MAP_S);
}

/** Past twice the usual time: the bar says it is still waiting. */
export function isSlow(seconds: number, expectedS: number): boolean {
  return seconds >= 2 * expectedS;
}

function along(
  [from, to]: [number, number],
  seconds: number,
  expectedS: number,
): number {
  const through = 1 - Math.exp((-2 * Math.max(0, seconds)) / expectedS);
  return from + (to - from) * through;
}
