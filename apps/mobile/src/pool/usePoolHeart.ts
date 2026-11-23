import { useCallback, useEffect, useRef, useState } from "react";

import { appBody } from "../body/bodyProfile";
import { appHeart } from "../body/heartZones";
import { type HeartReader, readHeart } from "../health/heartSamples";
import {
  hasWindow,
  keepPoolHeartOn,
  loadPoolHeartOn,
  type PoolHeart,
  poolHeartOf,
  poolWindow,
} from "./poolHeart";
import type { PoolSwim } from "./poolSwim";

/** Where the heart rate of the swim is (TASK-409 part B):
 * - `absent`: no Apple Health here (an old build, Android): nothing shows;
 * - `ask`: never added: the button «Add heart rate from Apple Health»;
 * - `reading`: being read;
 * - `none`: read, and the watch wrote nothing for the swim;
 * - `heart`: its average, maximum and zones. */
export type PoolHeartState =
  | { kind: "absent" }
  | { kind: "ask" }
  | { kind: "reading" }
  | { kind: "none" }
  | { kind: "heart"; heart: PoolHeart };

/**
 * The heart rate of the swim ended: read at once when the user added it
 * before, else on the button's tap, which asks the phone first and is kept
 * as the consent.
 */
export function usePoolHeart(
  reader: HeartReader | null,
  swim: PoolSwim,
): { state: PoolHeartState; add: () => void } {
  const [state, setState] = useState<PoolHeartState>(() =>
    reader === null || !hasWindow(swim) ? { kind: "absent" } : { kind: "reading" },
  );
  const live = useRef(true);
  useEffect(() => {
    live.current = true;
    return () => {
      live.current = false;
    };
  }, []);

  const read = useCallback(async () => {
    if (reader === null) {
      return;
    }
    setState({ kind: "reading" });
    const { fromMs, toMs, pauses } = poolWindow(swim);
    const samples = await readHeart(reader, fromMs, toMs, pauses);
    const heart = poolHeartOf(
      samples,
      swim,
      appHeart(),
      appBody(),
      new Date(swim.startedMs).getFullYear(),
    );
    if (live.current) {
      setState(heart === null ? { kind: "none" } : { kind: "heart", heart });
    }
  }, [reader, swim]);

  useEffect(() => {
    if (reader === null || !hasWindow(swim)) {
      return;
    }
    let going = true;
    void (async () => {
      const available = await reader.available().catch(() => false);
      if (!going || !live.current) {
        return;
      }
      if (!available) {
        setState({ kind: "absent" });
      } else if (loadPoolHeartOn()) {
        await read();
      } else {
        setState({ kind: "ask" });
      }
    })();
    return () => {
      going = false;
    };
    // Once per swim: `read` changes with it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reader, swim.key]);

  const add = useCallback(() => {
    if (reader === null) {
      return;
    }
    keepPoolHeartOn();
    void (async () => {
      try {
        await reader.ask();
      } catch {
        // A sheet that did not open reads as a refusal: no readings.
      }
      await read();
    })();
  }, [reader, read]);

  return { state, add };
}
