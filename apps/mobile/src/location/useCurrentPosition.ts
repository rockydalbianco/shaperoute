import type { LatLon } from "@shaperoute/shared-types";
import * as Location from "expo-location";
import { useCallback, useEffect, useRef, useState } from "react";

/** Indoors a reading can take forever: after this long, give up and say so. */
export const POSITION_TIMEOUT_MS = 15_000;

export type PositionState =
  | { status: "loading" }
  | { status: "ok"; point: LatLon }
  | { status: "denied" }
  | { status: "unavailable" };

/** Asks for the permission if needed, then reads the position once. */
export async function readPosition(): Promise<PositionState> {
  try {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (!permission.granted) {
      return { status: "denied" };
    }
    const { coords } = await withTimeout(
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
      POSITION_TIMEOUT_MS,
    );
    return { status: "ok", point: [coords.latitude, coords.longitude] };
  } catch {
    return { status: "unavailable" };
  }
}

/**
 * The position of the phone, read when the screen opens and again on
 * `refresh`. It never leaves the phone.
 */
export function useCurrentPosition(): {
  position: PositionState;
  refresh: () => void;
} {
  const [position, setPosition] = useState<PositionState>({ status: "loading" });
  const lastRequest = useRef(0);

  const read = useCallback(() => {
    // Only the latest reading counts, if two overlap.
    const request = ++lastRequest.current;
    void readPosition().then((next) => {
      if (request === lastRequest.current) {
        setPosition(next);
      }
    });
  }, []);

  useEffect(read, [read]);

  const refresh = useCallback(() => {
    setPosition({ status: "loading" });
    read();
  }, [read]);

  return { position, refresh };
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`No answer in ${ms} ms`)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}
