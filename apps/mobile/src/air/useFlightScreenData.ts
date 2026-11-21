import { useMemo } from "react";

import type { Track } from "../navigation/trackRecorder";
import { altitudeSeries, type Instrument, instrumentNow } from "./instrument";
import {
  type Assistant,
  assistantOf,
  circlingNow,
  circlings,
  type ThermalNow,
  thermalNow,
} from "./thermal";
import { type Wind, windNow } from "./wind";

/**
 * Everything the flight screen shows at a time (TASK-479 part B1), worked
 * out once per fix for what depends only on the track (the circlings, the
 * wind, the thermal assistant), once a tick for what ages with the clock.
 */
export type FlightScreenData = {
  nowMs: number;
  instrument: Instrument;
  thermal: ThermalNow | null;
  wind: Wind | null;
  assistant: Assistant;
  altitudes: (number | null)[];
  /** The live link is being shared. */
  live: boolean;
};

export function flightScreenData(
  track: Track,
  nowMs: number,
  takeoffMs: number | null,
  live: boolean,
): FlightScreenData {
  const all = circlings(track);
  return {
    nowMs,
    instrument: instrumentNow(track, nowMs, takeoffMs, circlingNow(track, all)),
    thermal: thermalNow(track, nowMs, all),
    wind: windNow(track, all),
    assistant: assistantOf(track),
    altitudes: altitudeSeries(track, nowMs),
    live,
  };
}

export function useFlightScreenData(
  track: Track,
  nowMs: number,
  takeoffMs: number | null,
  live: boolean,
): FlightScreenData {
  const all = useMemo(() => circlings(track), [track]);
  const wind = useMemo(() => windNow(track, all), [track, all]);
  const assistant = useMemo(() => assistantOf(track), [track]);
  const circling = useMemo(() => circlingNow(track, all), [track, all]);
  return {
    nowMs,
    instrument: instrumentNow(track, nowMs, takeoffMs, circling),
    thermal: thermalNow(track, nowMs, all),
    wind,
    assistant,
    altitudes: altitudeSeries(track, nowMs),
    live,
  };
}
