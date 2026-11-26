import { useCallback, useEffect, useRef, useState } from "react";

import { mapHeading, shouldTurn, type Turned } from "../navigation/headingUp";
import { usePocketOn } from "../navigation/pocketOn";
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
   * runner's arrow points there, up on the screen. On «Map», where the
   * phone points while the map keeps the drawing's turn (TASK-519). Null on
   * «Data», under pocket mode, with north up, off the run, and before the
   * first direction. */
  facing: number | null;
};

/**
 * The map turned where the phone points while the run's «Compass» page is
 * open (TASK-422, ADR-0350), over the map turned as its drawing
 * (`useTurnedMap`). Each direction worth it (`mapHeading`, `shouldTurn`) is
 * a turn asked of the map; a tap on the north arrow puts north up and keeps
 * it, the next tap turns heading-up again. Off the page, or at the end of
 * the run, the map goes back to the drawing's bearing and the arrow is the
 * drawing's again. On «Map» (TASK-519) the compass stays on for the arrow
 * alone: it points where the phone does, with its cone, and the map does
 * not turn; under pocket mode, where nobody sees it, the compass rests.
 */
export function useHeadingUpMap(turned: TurnedMap, run: RunHeading): HeadingUpMap {
  const page = useRunPage();
  const pocket = usePocketOn();
  const on = run.on && page === "compass";
  // «Map» (TASK-519): the arrow faces where the phone points, the map not.
  const facingOnly = run.on && page === "map" && !pocket;
  // North up, asked by a tap: the compass is let go until the next one.
  const [northUp, setNorthUp] = useState(false);
  const compass = useCompass((on && !northUp) || facingOnly);
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
  // Since when a page with the arrow's direction is open, «Compass» or
  // «Map» one after the other: a reading of before does not count.
  const openedAt = useRef<number | null>(null);
  const seen = on || facingOnly;
  // Whether the map was turned heading-up: leaving «Compass» turns it back.
  const turning = useRef(false);

  // Neither page open: the arrow is the line run's again.
  useEffect(() => {
    if (seen) {
      openedAt.current ??= Date.now();
      return;
    }
    if (openedAt.current !== null) {
      openedAt.current = null;
      last.current = null;
      setFacing(null);
    }
  }, [seen]);

  // «Compass» opened: heading-up starts afresh, the map turned at once.
  // Left, or the run over: the map as it was.
  useEffect(() => {
    if (on) {
      turning.current = true;
      last.current = null;
      return;
    }
    if (turning.current) {
      turning.current = false;
      last.current = null;
      setNorthUp(false);
      setLatest({ bearing: turned.bearing });
    }
  }, [on, turned.bearing]);

  // Each reading, and each fix: maybe a turn, or on «Map» the arrow alone.
  useEffect(() => {
    if (on ? northUp : !facingOnly) {
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
      if (on) {
        setLatest({ bearing: chosen.deg });
      }
      setFacing(chosen.deg);
    }
  }, [on, facingOnly, northUp, compass, run.trackDeg, run.lastFixMs]);

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
    return {
      ...turned,
      turn: latest,
      compass: false,
      northUp: false,
      facing: facingOnly ? facing : null,
    };
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
