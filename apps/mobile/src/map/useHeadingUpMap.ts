import { useCallback, useEffect, useRef, useState } from "react";

import { mapHeading, shouldTurn, type Turned } from "../navigation/headingUp";
import { useRunPage } from "../navigation/runPage";
import { useCompass } from "../navigation/useCompass";
import type { Turn, TurnedMap } from "./turnedMap";

/** What the run tells the map about where it is going. */
export type RunHeading = {
  /** A run is on screen: its «Compass» page may be open. */
  on: boolean;
  /** Where the line run points (`headingDeg`), or null before 10 m. */
  trackDeg: number | null;
  /** When the last fix came, or null before the first. */
  lastFixMs: number | null;
};

export type HeadingUpMap = TurnedMap & {
  /** «Compass» is open: the arrow is this page's, and alternates north up
   * and where the phone points. */
  compass: boolean;
  /** On «Compass», north was put up by a tap: the map is not turning. */
  northUp: boolean;
  /** On «Compass», the direction the map last turned to (TASK-431): the
   * runner's arrow points there, up on the screen. Null off the page, with
   * north up, and before the first direction. */
  facing: number | null;
};

/**
 * The map turned where the phone points while the run's «Compass» page is
 * open (TASK-422, ADR-0350), over the map turned as its drawing
 * (`useTurnedMap`). Each direction worth it (`mapHeading`, `shouldTurn`) is
 * a turn asked of the map; a tap on the north arrow puts north up and keeps
 * it, the next tap turns heading-up again. Off the page, or at the end of
 * the run, the map goes back to the drawing's bearing and the arrow is the
 * drawing's again.
 */
export function useHeadingUpMap(turned: TurnedMap, run: RunHeading): HeadingUpMap {
  const page = useRunPage();
  const on = run.on && page === "compass";
  // North up, asked by a tap: the compass is let go until the next one.
  const [northUp, setNorthUp] = useState(false);
  const compass = useCompass(on && !northUp);
  // The turn asked of the map last, whoever asked it: the drawing's arrow
  // off this page, the compass on it. The drawing's is taken as it comes.
  const [latest, setLatest] = useState<Turn | null>(turned.turn);
  const [theirs, setTheirs] = useState(turned.turn);
  if (turned.turn !== theirs) {
    setTheirs(turned.turn);
    setLatest(turned.turn);
  }
  const last = useRef<Turned | null>(null);
  // The direction of the last turn, for the arrow (TASK-431).
  const [facing, setFacing] = useState<number | null>(null);
  // Since when the page is open: a reading of before does not count.
  const openedAt = useRef<number | null>(null);

  // The page opened: heading-up starts afresh. Left, or the run over: the
  // map as it was.
  useEffect(() => {
    if (on) {
      openedAt.current = Date.now();
      return;
    }
    if (openedAt.current !== null) {
      openedAt.current = null;
      last.current = null;
      setFacing(null);
      setNorthUp(false);
      setLatest({ bearing: turned.bearing });
    }
  }, [on, turned.bearing]);

  // Each reading, and each fix: maybe a turn.
  useEffect(() => {
    if (!on || northUp) {
      return;
    }
    const nowMs = Date.now();
    const fresh =
      compass !== null && openedAt.current !== null && compass.atMs >= openedAt.current;
    const chosen = mapHeading({
      compass: fresh ? compass : null,
      trackDeg: run.trackDeg,
      lastFixMs: run.lastFixMs,
      nowMs,
    });
    if (chosen !== null && shouldTurn(last.current, chosen.deg, nowMs)) {
      last.current = { deg: chosen.deg, atMs: nowMs };
      setLatest({ bearing: chosen.deg });
      setFacing(chosen.deg);
    }
  }, [on, northUp, compass, run.trackDeg, run.lastFixMs]);

  const onArrow = useCallback(() => {
    last.current = null;
    if (northUp) {
      // The next reading turns the map.
      setNorthUp(false);
    } else {
      setNorthUp(true);
      setLatest({ bearing: 0 });
      setFacing(null);
    }
  }, [northUp]);

  if (!on) {
    return { ...turned, turn: latest, compass: false, northUp: false, facing: null };
  }
  return {
    bearing: turned.bearing,
    turn: latest,
    onTurned: turned.onTurned,
    shown: turned.shown,
    arrow: true,
    onArrow,
    compass: true,
    northUp,
    facing: northUp ? null : facing,
  };
}
