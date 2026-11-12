import type { Activity, LatLon, Shape } from "@shaperoute/shared-types";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { AnyRouteRequest } from "../api/routes";
import { ERASER_PX, REACH_PX } from "../map/mapPage";
import type { CanvasEvent, MapCanvas } from "../map/MapView";
import type { CanvasMode } from "../map/messages";
import type { ImageSource, Picked } from "../route/pickImage";
import type { SamplePicture } from "../route/samplePictures";
import { type ImageState, useImageOutline } from "../route/useImageOutline";
import { isPlacedFree } from "../snow/snow";
import { appUnits } from "../units/units";
import { canvasRequest, figureApart, piecesRequest } from "./canvasRequest";
import { isOpenLine, linkedOf, newDrawing, withDetail } from "./drawing";
import { asDrawing, drawingOf, type FigureLines, touchesLines } from "./edit";
import {
  distanceOf,
  type Figure,
  lookOf,
  onMap,
  type Placed,
  placeAt,
  placedLines,
  placedStart,
  unitLimits,
  unitsOn,
  withinLimits,
} from "./figure";
import { dist } from "./geometry";
import { toPlane } from "./plane";
import {
  addedPiece,
  fitsRoute,
  heldPieces,
  joinedPieces,
  MAX_PIECES,
  pieceAt,
  pieceBox,
  pieceDistance,
  type PieceProblem,
  piecesSized,
  piecesTurnedBy,
} from "./pieces";
import { type FigureChoice, figureOf } from "./resultFigure";
import { startedAt, startLineOf } from "./startPoint";
import {
  bent,
  CORNER_SHARE,
  erased,
  type Straight,
  straightGoneOn,
  straightStarted,
  type ToolProblem,
  unitsOf,
} from "./tools";
import {
  normalDeg,
  shapeOutline,
  shownFigure,
  turnedBy,
  turnedTo,
  turnOf,
} from "./turn";

/** What «Undo» takes back (TASK-281), and «Redo» puts again (TASK-331 part
 * B): a figure put on the map or drawn, or taken away, in place of what was
 * there; a tile, a line, the eraser, a point tapped or a bend that changed
 * the figure where it is, or turned it (TASK-402). With it, the straight
 * line being tapped then, and the pieces after the first as they were
 * (TASK-402 part B). Moving and sizing a figure alone are not undone; with
 * pieces, each piece added, moved, turned or taken away is a step. */
type Step = (
  { kind: "put"; before: Placed | null } | { kind: "swap"; before: Figure }
) & {
  straight: Straight | null;
  rest: Placed[];
};

/** Why the last line, tool or tile gave nothing. */
export type CanvasProblem = ToolProblem | PieceProblem;

/** The pieces of the figure (TASK-402 part B, ADR-0336). */
export type PiecesState = {
  /** How many there are: none without a figure. */
  count: number;
  /** «Change | Add»: whether a tile adds a piece, rather than changing
   * the one chosen, or the first. */
  adding: boolean;
  setAdding: (adding: boolean) => void;
  /** The piece chosen with «Move»; none for the whole figure. */
  chosen: Placed | null;
  /** «Delete piece»: the piece chosen taken away; the first gone, the next
   * gives the outline. */
  deleteChosen: () => void;
};

export type MapCanvasOptions = {
  apiUrl: string | null;
  /** As «Draw» asks a shape in pieces: with the pen up when on. */
  penUp: boolean;
  activity: Activity;
  /** The distances «Draw» offers, in metres: the figure stays within. */
  limitsM: readonly [number, number];
  /** The distance of «Draw»: the size of the first figure put on the map. */
  distanceM: number | null;
  /** Where «Draw» starts: the map is there until it tells where it is. */
  start: LatLon | null;
  /** The phone's pictures, for «+ photo» (a stand-in in the tests). */
  pick?: (source: ImageSource) => Promise<Picked>;
};

export type MapCanvasState = {
  mode: CanvasMode;
  setMode: (mode: CanvasMode) => void;
  /** The figure on the map, within the distances; none at first. */
  placed: Placed | null;
  /** For the map, while the screen is on it. */
  canvas: MapCanvas;
  onCanvas: (event: CanvasEvent) => void;
  /** A tile: the shape in the middle of the map, or in place of the figure,
   * where it is and as big. */
  pick: (shape: Shape) => void;
  /** A ready-made picture of «Draw» (TASK-280): its outline, as a tile. */
  pickSample: (sample: SamplePicture) => void;
  /** «+ photo»: a picture of the phone, whose outline the engine traces. */
  photo: ImageState;
  choosePhoto: () => void;
  undo: () => void;
  canUndo: boolean;
  /** «Redo» (TASK-331 part B): what «Undo» took back, again. */
  redo: () => void;
  canRedo: boolean;
  /** «Clear all» (TASK-331 part B): the figure off the map; «Undo» puts it
   * back. */
  clear: () => void;
  /** The pieces of the figure: «Change | Add», the piece chosen and
   * «Delete piece» (TASK-402 part B). `placed` is the first. */
  pieces: PiecesState;
  /** What the figure would make, in metres, following two fingers. */
  distanceM: number | null;
  /** How far the figure, or the piece chosen, is turned on the map,
   * clockwise, in whole degrees within (−180°, 180°] (TASK-402, ADR-0336);
   * 0 with none. */
  turnDeg: number;
  /** «−15°» and «+15°»: the figure, or the piece chosen, turned that much
   * more. */
  turnBy: (deg: number) => void;
  /** The degrees typed: the figure, or the piece chosen, turned to them. */
  turnTo: (deg: number) => void;
  /** «Draw route»: the request for the figure where it is. */
  request: AnyRouteRequest | null;
  /** Why the last line drawn, the last tool or tile gave nothing. */
  problem: CanvasProblem | null;
  /** Whether a straight line is being tapped: its next point goes on it. */
  tapping: boolean;
  /** The screen opens: the map is framed on the figure, or the start. */
  open: () => void;
  /** «Edit the drawing» (TASK-331): the lines of a figure the app proposes
   * on the map as a drawing, in the middle of the start, as long as
   * `distanceM`, to draw on; «Undo» takes it away. False when they make no
   * drawing. */
  edit: (lines: FigureLines, distanceM: number) => boolean;
  /** «Edit the drawing» on a member's drawing (TASK-346, ADR-0299): its
   * track on the map where it was run and as big — `centre` the middle of
   * the lines, `unitM` the metres of one unit — to draw on, within the
   * distances; «Undo» takes it away. False when they make no drawing. */
  editInPlace: (lines: FigureLines, centre: LatLon, unitM: number) => boolean;
  /** «Try 8 km» on the route of the figure: the figure that size, and the
   * request for it, to draw at once. */
  sizeTo: (distanceM: number) => AnyRouteRequest | null;
  /** A tile under the route of the figure (TASK-286): that figure in its
   * place, with the same middle and as long as `distanceM`, and the request
   * for it, to draw at once. «Undo» puts back the one of before. */
  changeTo: (choice: FigureChoice, distanceM: number) => AnyRouteRequest | null;
};

/** One empty list, so the map is not told again and again of no marks. */
const NO_MARKS: LatLon[] = [];

/** Metres between two points of the map. */
function metresApart(a: LatLon, b: LatLon): number {
  return dist([0, 0], toPlane(a, b));
}

/**
 * «Draw on the map» (TASK-281, ADR-0245): the figure on the map of the
 * town, drawn with a finger, a shape of the catalogue or a photo's outline;
 * moved and sized by the fingers on the map, changed in place by a tile, by
 * a line drawn on it and by the tools of TASK-331 — the eraser, the
 * straight line, the bend — and taken back by «Undo», put again by «Redo».
 * It stays as it was while the route of it is shown, so «←» comes back to
 * it.
 */
export function useMapCanvas({
  apiUrl,
  penUp,
  activity,
  limitsM,
  distanceM,
  start,
  pick: pickPicture,
}: MapCanvasOptions): MapCanvasState {
  const [mode, setModeState] = useState<CanvasMode>("draw");
  const [kept, setKept] = useState<Placed | null>(null);
  // The pieces after the first (TASK-402 part B): none for a figure alone.
  const [keptRest, setKeptRest] = useState<Placed[]>([]);
  const [chosen, setChosen] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const [steps, setSteps] = useState<Step[]>([]);
  const [undone, setUndone] = useState<Step[]>([]);
  const [problem, setProblem] = useState<CanvasProblem | null>(null);
  const [straight, setStraight] = useState<Straight | null>(null);
  // Two fingers sizing the figure: how many times bigger, so far.
  const [sizing, setSizing] = useState(1);
  // A new number frames the map; another answer to a line clears its ink.
  const [framing, setFraming] = useState(0);
  const [answers, setAnswers] = useState(0);
  // Where the middle of the map is, as the page last said.
  const centre = useRef<LatLon | null>(null);
  const photo = useImageOutline(apiUrl, pickPicture);
  const [lowest, highest] = limitsM;

  const apartOf = useCallback(
    (figure: Figure) => figureApart(figure, penUp, activity),
    [penUp, activity],
  );
  const within = useCallback(
    (placed: Placed) =>
      withinLimits(placed, [lowest, highest], apartOf(shownFigure(placed))),
    [lowest, highest, apartOf],
  );
  /** `figure` turned `turnDeg` about `middle`, as long as `metres` as it is
   * drawn: a shape turned by its outline. */
  const placeTurned = useCallback(
    (figure: Figure, middle: LatLon, metres: number, turnDeg: number): Placed => {
      const turned = turnedTo({ figure, centre: middle, unitM: 1 }, turnDeg);
      const shownNow = shownFigure(turned);
      return {
        ...turned,
        unitM: placeAt(shownNow, middle, metres, apartOf(shownNow)).unitM,
      };
    },
    [apartOf],
  );
  // Within the distances of now: a sport chosen since may have others.
  // With pieces, all of them together, grown or shrunk as one.
  const pieces = useMemo((): Placed[] => {
    if (kept === null) {
      return [];
    }
    if (keptRest.length === 0) {
      return [within(kept)];
    }
    const all = [kept, ...keptRest];
    const total = distanceOf(joinedPieces(all).placed);
    const clamped = Math.min(highest, Math.max(lowest, total));
    return clamped === total ? all : piecesSized(all, clamped / total);
  }, [kept, keptRest, within, lowest, highest]);
  const placed = pieces.length === 0 ? null : pieces[0];
  const rest = useMemo(() => pieces.slice(1), [pieces]);
  // The pieces as one drawing, as they are drawn and asked; none alone.
  const joined = useMemo(
    () => (pieces.length > 1 ? joinedPieces(pieces) : null),
    [pieces],
  );
  // The piece chosen with «Move», among two or more.
  const chosenNow =
    mode === "move" && chosen !== null && chosen < pieces.length && pieces.length > 1
      ? chosen
      : null;

  /** `next` on the map in place of what is there, a step «Undo» takes back:
   * `put` puts back the whole figure of before, `swap` its lines where the
   * figure is then. A new change forgets what «Redo» would put again. With
   * pieces (TASK-402 part B), `rest` are those after the first, as they are
   * if not given; the first taken away, the next gives the outline. Pieces
   * that would be more than one route runs are not changed: false. */
  const change = useCallback(
    (
      next: Placed | null,
      how: "put" | "swap",
      straightNext: Straight | null = null,
      more: { rest?: Placed[]; chosen?: number | null } = {},
    ): boolean => {
      let first = next;
      let others = more.rest ?? rest;
      let chosenNext = more.chosen === undefined ? chosenNow : more.chosen;
      if (first === null && others.length > 0) {
        [first, ...others] = others;
        chosenNext = null;
      }
      if (
        first !== null &&
        others.length > 0 &&
        !fitsRoute(joinedPieces([first, ...others]))
      ) {
        setProblem("too_much");
        return false;
      }
      const step: Step =
        how === "swap" && placed !== null
          ? { kind: "swap", before: placed.figure, straight, rest }
          : { kind: "put", before: placed, straight, rest };
      setSteps((now) => [...now, step]);
      setUndone([]);
      setKept(first);
      setKeptRest(others);
      setChosen(chosenNext !== null && chosenNext <= others.length ? chosenNext : null);
      setStraight(straightNext);
      return true;
    },
    [placed, rest, straight, chosenNow],
  );

  const setMode = useCallback((next: CanvasMode) => {
    setModeState(next);
    setProblem(null);
    // Another tool finishes the straight line, and lets the piece go.
    setStraight(null);
    setChosen(null);
  }, []);

  /** A new piece of `figure` in the middle of the map, a third of the
   * figure's size, chosen; at most MAX_PIECES (TASK-402 part B). */
  const addPiece = useCallback(
    (figure: Figure) => {
      if (placed === null) {
        return;
      }
      if (pieces.length >= MAX_PIECES) {
        setProblem("too_many");
        return;
      }
      const piece = addedPiece(pieces, figure, centre.current ?? placed.centre);
      change(placed, "put", null, { rest: [...rest, piece], chosen: pieces.length });
    },
    [placed, pieces, rest, change],
  );

  /** `next` in place of the piece at `index`, a step. */
  const changePiece = useCallback(
    (index: number, next: Placed) => {
      const all = pieces.map((piece, i) => (i === index ? next : piece));
      return change(all[0], "put", null, { rest: all.slice(1) });
    },
    [pieces, change],
  );

  /** `figure` on the map: in place of the one there, where it is and as
   * big — of the piece chosen, with pieces — or in the middle of the map,
   * as long as the distance of «Draw». With «Add», a new piece. */
  const putFigure = useCallback(
    (figure: Figure) => {
      setProblem(null);
      // Moving it is what comes next.
      setModeState("move");
      if (placed === null) {
        const middle = centre.current ?? start;
        if (middle === null) {
          return;
        }
        change(placeAt(figure, middle, distanceM ?? lowest, apartOf(figure)), "put");
        setFraming((n) => n + 1);
        return;
      }
      if (adding) {
        addPiece(figure);
        return;
      }
      if (chosenNow !== null && chosenNow > 0) {
        changePiece(chosenNow, { ...pieces[chosenNow], figure });
        return;
      }
      change({ ...placed, figure }, "swap");
    },
    [
      placed,
      pieces,
      adding,
      chosenNow,
      start,
      distanceM,
      lowest,
      apartOf,
      change,
      addPiece,
      changePiece,
    ],
  );

  // What a tile changes: the piece chosen, or the first.
  const target = chosenNow === null ? placed : pieces[chosenNow];

  const pick = useCallback(
    (shape: Shape) => {
      if (!adding && target?.figure.kind === "shape" && target.figure.shape === shape) {
        return;
      }
      putFigure({ kind: "shape", shape });
    },
    [adding, target, putFigure],
  );

  const pickSample = useCallback(
    (sample: SamplePicture) => {
      if (
        !adding &&
        target?.figure.kind === "picture" &&
        target.figure.sample === sample.id
      ) {
        return;
      }
      putFigure(figureOf({ kind: "picture", sample }));
    },
    [adding, target, putFigure],
  );

  // A photo traced: its outline is the figure, once.
  const tracedPut = useRef<unknown>(null);
  const traced = photo.state.status === "traced" ? photo.state.outline : null;
  useEffect(() => {
    if (traced !== null && traced !== tracedPut.current) {
      tracedPut.current = traced;
      putFigure({
        kind: "picture",
        outline: traced.points,
        strokes: traced.strokes ?? [],
      });
    }
  }, [traced, putFigure]);

  const { choose } = photo;
  const choosePhoto = useCallback(() => choose("library"), [choose]);

  /** The eraser (TASK-331 part B): the pieces of lines within `radiusM` of
   * the finger's path taken away. A shape of the catalogue is no drawing
   * to take apart: it goes whole. */
  const erase = useCallback(
    (line: readonly LatLon[], radiusM: number) => {
      if (placed === null) {
        return;
      }
      const rubbed = line.map((point) => unitsOf(placed, point));
      const radius = radiusM / placed.unitM;
      const drawing = asDrawing(placed.figure);
      if (drawing === null) {
        const lines = lookOf(placed.figure, apartOf(placed.figure)).lines;
        if (touchesLines(lines, rubbed, radius)) {
          setProblem(null);
          change(null, "put");
        }
        return;
      }
      const left = erased(drawing, rubbed, radius);
      if (left === null) {
        return;
      }
      if ("problem" in left) {
        setProblem(left.problem);
        return;
      }
      setProblem(null);
      change(
        left.drawing === null ? null : within({ ...placed, figure: left.drawing }),
        left.drawing === null ? "put" : "swap",
      );
    },
    [placed, within, apartOf, change],
  );

  /** A point tapped with «Line» (TASK-331 part B): the first of a straight
   * line, the next one it goes on to, its first point again to close it, or
   * its last one again to finish it. */
  const tap = useCallback(
    (point: LatLon, reachM: number) => {
      setProblem(null);
      if (straight === null) {
        change(placed, "put", { kind: "first", at: point });
        return;
      }
      if (straight.kind === "first") {
        if (metresApart(straight.at, point) <= reachM) {
          setStraight(null);
          return;
        }
        const drawing = placed === null ? null : asDrawing(placed.figure);
        const started = straightStarted(
          placed !== null && drawing !== null ? { placed, drawing } : null,
          straight.at,
          point,
          reachM,
        );
        if ("problem" in started) {
          setProblem(started.problem);
          return;
        }
        change(
          within(started.placed),
          drawing === null ? "put" : "swap",
          started.straight,
        );
        return;
      }
      const drawing = placed?.figure.kind === "drawing" ? placed.figure : null;
      const detail = drawing?.details[straight.index];
      if (placed === null || drawing === null || detail === undefined) {
        setStraight(null);
        return;
      }
      const at = unitsOf(placed, point);
      const reach = reachM / placed.unitM;
      if (dist(at, detail[detail.length - 1]) <= reach) {
        setStraight(null);
        return;
      }
      const gone = straightGoneOn(drawing, straight, at, reach);
      if ("problem" in gone) {
        setProblem(gone.problem);
        return;
      }
      change(
        within({ ...placed, figure: gone.drawing }),
        "swap",
        gone.closed ? null : straight,
      );
    },
    [placed, straight, within, change],
  );

  /** A line held and dragged with «Move» (TASK-331 part B). */
  const bend = useCallback(
    (from: LatLon, to: LatLon, reachM: number) => {
      const drawing = placed === null ? null : asDrawing(placed.figure);
      if (placed === null || drawing === null) {
        return;
      }
      const result = bent(
        drawing,
        unitsOf(placed, from),
        unitsOf(placed, to),
        reachM / placed.unitM,
      );
      if (result === null) {
        return;
      }
      if ("problem" in result) {
        setProblem(result.problem);
        return;
      }
      setProblem(null);
      change(within({ ...placed, figure: result.drawing }), "swap");
    },
    [placed, within, change],
  );

  /** The start dot left with «Move» (TASK-426, ADR-0354): the figure, or
   * the first piece, starting at the point of its line nearest, a corner
   * winning within half a finger's reach; a step «Undo» takes back. */
  const moveStart = useCallback(
    (point: LatLon, reachM: number) => {
      if (placed === null || isPlacedFree(activity)) {
        return;
      }
      const alone = pieces.length === 1;
      const next = startedAt(
        placed.figure,
        unitsOn(placed, point),
        reachM / placed.unitM,
        alone && apartOf(shownFigure(placed)),
      );
      if (next === null) {
        return;
      }
      setProblem(null);
      if (alone) {
        change(within({ ...placed, figure: next }), "swap");
      } else {
        changePiece(0, { ...placed, figure: next });
      }
    },
    [placed, pieces, activity, apartOf, within, change, changePiece],
  );

  const onCanvas = useCallback(
    (event: CanvasEvent) => {
      if (event.type === "centre") {
        centre.current = event.point;
        return;
      }
      if (event.type === "figure") {
        if (placed === null) {
          return;
        }
        if (!event.done) {
          setSizing(event.factor);
          return;
        }
        setSizing(1);
        const turning = event.turn ?? 0;
        // A piece chosen moves alone; with pieces, the whole figure moved
        // is a step too (TASK-402 part B).
        if (chosenNow !== null) {
          const piece = pieces[chosenNow];
          changePiece(
            chosenNow,
            turnedBy(
              { ...piece, centre: event.centre, unitM: piece.unitM * event.factor },
              turning,
            ),
          );
          return;
        }
        if (rest.length > 0) {
          const held = heldPieces(pieces, event.centre, event.factor, turning);
          change(held[0], "put", null, { rest: held.slice(1) });
          return;
        }
        const moved = {
          ...placed,
          centre: event.centre,
          unitM: placed.unitM * event.factor,
        };
        // Turned by two fingers too: a step «Undo» takes back (TASK-402).
        if (turning !== 0) {
          change(within(turnedBy(moved, turning)), "put");
          return;
        }
        setKept(moved);
        return;
      }
      // A tap with «Move» chooses the piece under it, or none (TASK-402
      // part B).
      if (event.type === "tapped") {
        if (mode === "move" && pieces.length > 1) {
          setChosen(pieceAt(pieces, event.point, REACH_PX * event.metresPerPx));
        }
        return;
      }
      // A line drawn or bent: the page shows it until the app answers,
      // whatever comes of it.
      setAnswers((n) => n + 1);
      if (event.type === "started") {
        moveStart(event.point, CORNER_SHARE * REACH_PX * event.metresPerPx);
        return;
      }
      if (event.type === "bent") {
        bend(event.from, event.to, REACH_PX * event.metresPerPx);
        return;
      }
      if (mode === "erase") {
        erase(event.line, ERASER_PX * event.metresPerPx);
        return;
      }
      if (mode === "line") {
        tap(event.line[event.line.length - 1], REACH_PX * event.metresPerPx);
        return;
      }
      if (mode !== "draw") {
        return;
      }
      // On a photo the line joins it too: the figure becomes a drawing
      // where it is, as big (TASK-331). On a shape of the catalogue, which
      // is not changed, the line is a new drawing in its place.
      const drawing = placed === null ? null : asDrawing(placed.figure);
      const drawn =
        placed !== null && drawing !== null
          ? withDetail({ ...placed, figure: drawing }, event.line)
          : newDrawing(event.line);
      if (drawn === null) {
        return;
      }
      if ("problem" in drawn) {
        setProblem(drawn.problem);
        return;
      }
      setProblem(null);
      change(
        within(drawn.placed),
        placed !== null && drawing !== null ? "swap" : "put",
      );
    },
    [
      placed,
      pieces,
      rest,
      chosenNow,
      mode,
      within,
      erase,
      tap,
      bend,
      moveStart,
      change,
      changePiece,
    ],
  );

  /** The figure turned on the map, a step «Undo» takes back (TASK-402):
   * the piece chosen alone, or all the pieces about their middle. */
  const turn = useCallback(
    (next: (placed: Placed) => Placed) => {
      if (placed === null) {
        return;
      }
      const piece = chosenNow === null ? placed : pieces[chosenNow];
      const turned = next(piece);
      if (turnOf(turned) === turnOf(piece)) {
        return;
      }
      setProblem(null);
      if (chosenNow !== null) {
        changePiece(chosenNow, turned);
      } else if (rest.length > 0) {
        const all = piecesTurnedBy(pieces, normalDeg(turnOf(turned) - turnOf(piece)));
        change(all[0], "put", null, { rest: all.slice(1) });
      } else {
        change(within(turned), "put");
      }
    },
    [placed, pieces, rest, chosenNow, within, change, changePiece],
  );
  const turnBy = useCallback(
    (deg: number) => turn((placed) => turnedBy(placed, deg)),
    [turn],
  );
  const turnTo = useCallback(
    (deg: number) => turn((placed) => turnedTo(placed, deg)),
    [turn],
  );

  /** `step` done again, or undone: the figure as it was then, and the
   * straight line being tapped, while «Line» is still on. */
  const restore = useCallback(
    (step: Step) => {
      setProblem(null);
      if (step.kind === "put") {
        setKept(step.before);
      } else if (placed !== null) {
        setKept({ ...placed, figure: step.before });
      }
      setKeptRest(step.rest);
      setChosen(null);
      setStraight(mode === "line" ? step.straight : null);
    },
    [placed, mode],
  );

  /** The step that takes the figure back to how it is now. */
  const stepBack = useCallback(
    (kind: Step["kind"]): Step =>
      kind === "swap" && placed !== null
        ? { kind: "swap", before: placed.figure, straight, rest }
        : { kind: "put", before: placed, straight, rest },
    [placed, rest, straight],
  );

  const undo = useCallback(() => {
    const step = steps[steps.length - 1];
    if (step === undefined) {
      return;
    }
    setSteps(steps.slice(0, -1));
    setUndone((now) => [...now, stepBack(step.kind)]);
    restore(step);
  }, [steps, stepBack, restore]);

  const redo = useCallback(() => {
    const step = undone[undone.length - 1];
    if (step === undefined) {
      return;
    }
    setUndone(undone.slice(0, -1));
    setSteps((now) => [...now, stepBack(step.kind)]);
    restore(step);
  }, [undone, stepBack, restore]);

  const clear = useCallback(() => {
    if (placed !== null) {
      setProblem(null);
      change(null, "put", null, { rest: [] });
    }
  }, [placed, change]);

  const deleteChosen = useCallback(() => {
    if (chosenNow === null) {
      return;
    }
    setProblem(null);
    const left = pieces.filter((_, i) => i !== chosenNow);
    change(left[0], "put", null, { rest: left.slice(1), chosen: null });
  }, [pieces, chosenNow, change]);

  const chooseAdding = useCallback((on: boolean) => {
    setAdding(on);
    setProblem(null);
  }, []);

  // As it is drawn and asked: a shape turned is its outline (ADR-0336).
  // With pieces, the drawing they make together (TASK-402 part B).
  const shown = useMemo(
    () =>
      joined !== null
        ? joined.placed
        : placed === null
          ? null
          : { ...placed, figure: shownFigure(placed) },
    [joined, placed],
  );
  const apart = shown === null || joined !== null ? false : apartOf(shown.figure);
  // The points of the straight line being tapped, the first to close it.
  const marks = useMemo(() => {
    if (straight === null) {
      return NO_MARKS;
    }
    if (straight.kind === "first") {
      return [straight.at];
    }
    const detail =
      placed?.figure.kind === "drawing"
        ? placed.figure.details[straight.index]
        : undefined;
    if (placed === null || detail === undefined) {
      return NO_MARKS;
    }
    return detail.slice(straight.from).map((point) => onMap(placed, point));
  }, [straight, placed]);

  const canvas = useMemo((): MapCanvas => {
    if (placed === null || shown === null) {
      return {
        mode,
        lines: [],
        links: [],
        bendable: [],
        marks,
        centre: null,
        shrink: 1,
        grow: 1,
        choosing: false,
        chosen: [],
        box: [],
        framing,
      };
    }
    const lines = placedLines(shown, apart);
    const figure = placed.figure;
    const drawing = figure.kind === "drawing" ? figure : null;
    const open = drawing !== null && isOpenLine(drawing.outline, drawing.details);
    // Line by line, the piece it is of: all of the first, alone.
    const owners = joined === null ? lines.map(() => 0) : joined.owners;
    const shownDrawing = shown.figure.kind === "drawing" ? shown.figure : null;
    let [shrink, grow] = unitLimits(shown.figure, [lowest, highest], apart).map(
      (unitM) => unitM / shown.unitM,
    );
    if (chosenNow !== null) {
      // The piece chosen grows and shrinks alone: the others keep their
      // share of the distance, and it keeps at least its share of the
      // shortest (TASK-402 part B).
      const own = pieceDistance(pieces[chosenNow], chosenNow);
      const others = distanceOf(shown) - own;
      const smallest = Math.max(lowest - others, lowest / MAX_PIECES);
      shrink = Math.min(1, smallest / own);
      grow = Math.max(1, (highest - others) / own);
    }
    // Where the route starts, a dot, none on the water or the snow
    // (TASK-426, TASK-413 B: the engine places the shape there): on the
    // first piece, which gives the outline; it moves along that piece's
    // line, unless another piece is chosen.
    const water = isPlacedFree(activity);
    const startFigure =
      joined === null
        ? shown.figure
        : figure.kind === "shape"
          ? shapeOutline(figure.shape)
          : figure;
    const along =
      water || (chosenNow !== null && chosenNow > 0)
        ? null
        : startLineOf(startFigure, joined === null && apart);
    return {
      mode,
      lines,
      // The outline has no link; a detail may.
      links:
        shownDrawing === null
          ? lines.map(() => false)
          : [false, ...linkedOf(shownDrawing)],
      // An emoji is not changed, nor the ring of an open line, which nothing
      // of shows; with pieces, only the first's lines, while it is not
      // another piece that is chosen.
      bendable:
        figure.kind === "shape" || (chosenNow !== null && chosenNow > 0)
          ? []
          : lines.map((_, i) => i).filter((i) => owners[i] === 0 && (i > 0 || !open)),
      marks,
      centre: chosenNow === null ? placed.centre : pieces[chosenNow].centre,
      shrink,
      grow,
      choosing: pieces.length > 1,
      chosen:
        chosenNow === null
          ? []
          : owners.flatMap((owner, i) => (owner === chosenNow ? [i] : [])),
      box: chosenNow === null ? [] : pieceBox(pieces[chosenNow], chosenNow),
      framing,
      start: water ? null : placedStart(shown, apart),
      startLine: along === null ? [] : along.line.map((point) => onMap(placed, point)),
      startEnds: along?.ends === true,
    };
    // A new answer to a line is a new canvas, so the page clears its ink.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    placed,
    pieces,
    joined,
    chosenNow,
    shown,
    apart,
    mode,
    marks,
    lowest,
    highest,
    activity,
    framing,
    answers,
  ]);

  // The app renders again with new units (TASK-182): the request follows.
  // With pieces, the drawing they make (TASK-402 part B).
  const units = appUnits();
  const request = useMemo(
    () =>
      placed === null
        ? null
        : canvasRequest(joined?.placed ?? placed, penUp, activity, units),
    [placed, joined, penUp, activity, units],
  );

  // What the figure would make, following two fingers: of a piece chosen,
  // only its own part grows.
  let distanceNow: number | null = null;
  if (shown !== null) {
    const total = distanceOf(shown, apart);
    distanceNow =
      chosenNow === null
        ? total * sizing
        : total + (sizing - 1) * pieceDistance(pieces[chosenNow], chosenNow);
  }

  const open = useCallback(() => setFraming((n) => n + 1), []);

  /** The drawing put on the map to edit, framed, ready to draw on. */
  const putToEdit = useCallback(
    (next: Placed) => {
      setProblem(null);
      // Drawing on it is what comes next.
      setModeState("draw");
      // One piece: the others come from there (TASK-402 part B).
      change(within(next), "put", null, { rest: [] });
      setFraming((n) => n + 1);
    },
    [within, change],
  );
  const edit = useCallback(
    (lines: FigureLines, metres: number) => {
      const drawing = drawingOf(lines);
      const middle = start ?? centre.current;
      if (drawing === null || middle === null) {
        return false;
      }
      putToEdit(placeAt(drawing, middle, metres));
      return true;
    },
    [start, putToEdit],
  );
  const editInPlace = useCallback(
    (lines: FigureLines, middle: LatLon, unitM: number) => {
      const drawing = drawingOf(lines);
      if (drawing === null) {
        return false;
      }
      putToEdit({ figure: drawing, centre: middle, unitM });
      return true;
    },
    [putToEdit],
  );

  const sizeTo = useCallback(
    (metres: number) => {
      if (placed === null) {
        return null;
      }
      if (shown !== null && rest.length > 0) {
        // All the pieces as one (TASK-402 part B).
        const all = piecesSized(pieces, metres / distanceOf(shown));
        setKept(all[0]);
        setKeptRest(all.slice(1));
        return piecesRequest(all, penUp, activity, units);
      }
      const sized = within(
        placeTurned(placed.figure, placed.centre, metres, turnOf(placed)),
      );
      setKept(sized);
      return canvasRequest(sized, penUp, activity, units);
    },
    [placed, pieces, rest, shown, within, placeTurned, penUp, activity, units],
  );

  const changeTo = useCallback(
    (choice: FigureChoice, metres: number) => {
      if (placed === null) {
        return null;
      }
      const figure = figureOf(choice);
      // Turned as the figure of before (TASK-402).
      const changed = within(
        placeTurned(figure, placed.centre, metres, turnOf(placed)),
      );
      setProblem(null);
      // In place of all the pieces.
      change(changed, "put", null, { rest: [] });
      return canvasRequest(changed, penUp, activity, units);
    },
    [placed, within, placeTurned, penUp, activity, units, change],
  );

  return {
    mode,
    setMode,
    placed,
    canvas,
    onCanvas,
    pick,
    pickSample,
    photo: photo.state,
    choosePhoto,
    undo,
    canUndo: steps.length > 0,
    redo,
    canRedo: undone.length > 0,
    clear,
    pieces: {
      count: pieces.length,
      adding,
      setAdding: chooseAdding,
      chosen: chosenNow === null ? null : pieces[chosenNow],
      deleteChosen,
    },
    distanceM: distanceNow,
    turnDeg: target === null ? 0 : turnOf(target),
    turnBy,
    turnTo,
    request,
    problem,
    tapping: straight !== null,
    open,
    edit,
    editInPlace,
    sizeTo,
    changeTo,
  };
}
