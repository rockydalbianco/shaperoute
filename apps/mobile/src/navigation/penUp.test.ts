import type { LatLon, Walk } from "@shaperoute/shared-types";

import { POOR_FIX_M } from "./navigator";
import { movePen, PEN_DOWN_M, type Pen, startPen } from "./penUp";
import {
  AUTO_PAUSE_AFTER_MS,
  controlRun,
  pauseRun,
  resumeRun,
  runControl,
  setAutoPause,
  setVoice,
  skipCountdown,
} from "./runControl";
import {
  addFix,
  durationMs,
  emptyTrack,
  openPause,
  pauseTrack,
  penDownTrack,
  penUpTrack,
  type Track,
  type TrackFix,
} from "./trackRecorder";
import { clearRun, startRun } from "./trackStore";

// The phone's documents folder, in memory.
jest.mock("expo-file-system", () => {
  const files = new Map<string, string>();
  class File {
    uri: string;
    constructor(directory: { uri: string }, name: string) {
      this.uri = `${directory.uri}${name}`;
    }
    get exists(): boolean {
      return files.has(this.uri);
    }
    create(): void {
      files.set(this.uri, "");
    }
    write(text: string): void {
      files.set(this.uri, text);
    }
    textSync(): string {
      return files.get(this.uri) ?? "";
    }
    delete(): void {
      files.delete(this.uri);
    }
  }
  return { File, Paths: { document: { uri: "file:///documents/" } } };
});

const START: LatLon = [46.0122, 11.2986];
const METRE = 1 / 111_195;
const NOW = Date.UTC(2026, 9, 2, 7, 0, 0);

/** A fix `northM` metres north of START, `seconds` after NOW. */
function fix(northM: number, seconds: number): TrackFix {
  return {
    point: [START[0] + northM * METRE, START[1]],
    timeMs: NOW + seconds * 1000,
    accuracyM: 5,
  };
}

function record(fixes: TrackFix[]): Track {
  return fixes.reduce(addFix, emptyTrack());
}

// Three letters in a row: walks from 300 m to 500 m and from 800 m to 1000 m.
const ALONG = [0, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000];
const WALKS: Walk[] = [
  [3, 5],
  [8, 10],
];

describe("the pen along the route", () => {
  test("goes up at the end of a letter and down just before the next", () => {
    let pen: Pen = startPen(ALONG, WALKS, "sun");
    const moves: (string | null)[] = [];
    const said: string[] = [];
    for (let m = 0; m <= 1000; m += 10) {
      const step = movePen(pen, m);
      pen = step.pen;
      moves.push(step.move === null ? null : `${step.move} at ${m}`);
      said.push(...step.cues.map((cue) => cue.say));
    }
    expect(moves.filter((move) => move !== null)).toEqual([
      "up at 300",
      `down at ${500 - PEN_DOWN_M}`,
      "up at 800",
      `down at ${1000 - PEN_DOWN_M}`,
    ]);
    // Each said once, the letters named by the word.
    expect(said).toEqual([
      "Letter done. Walk to the U: the drawing is paused.",
      "Pen down: draw the U.",
      "Letter done. Walk to the N: the drawing is paused.",
      "Pen down: draw the N.",
    ]);
  });

  test("a fix less accurate than POOR_FIX_M moves nothing", () => {
    const pen = startPen(ALONG, WALKS, "SUN");
    expect(movePen(pen, 320, POOR_FIX_M + 1)).toEqual({ pen, move: null, cues: [] });
    expect(movePen(pen, 320, POOR_FIX_M).move).toBe("up");
  });

  test("one move a fix: a fix past a whole walk lifts the pen, the next lowers it", () => {
    const up = movePen(startPen(ALONG, WALKS, "SUN"), 520);
    expect(up.move).toBe("up");
    expect(movePen(up.pen, 525).move).toBe("down");
  });

  test("without walks the pen never moves", () => {
    const pen = startPen(ALONG, [], "SUN");
    expect(movePen(pen, 1000)).toEqual({ pen, move: null, cues: [] });
  });

  test("by bike the way to the next letter is ridden (TASK-216)", () => {
    let pen: Pen = startPen(ALONG, WALKS, "sun", "cycling");
    const said: string[] = [];
    for (let m = 0; m <= 1000; m += 10) {
      const step = movePen(pen, m);
      pen = step.pen;
      said.push(...step.cues.map((cue) => cue.say));
    }
    expect(said).toEqual([
      "Letter done. Ride to the U: the drawing is paused.",
      "Pen down: draw the U.",
      "Letter done. Ride to the N: the drawing is paused.",
      "Pen down: draw the N.",
    ]);
    expect(
      movePen(startPen(ALONG, WALKS, "SUNNY", "cycling"), 300, null, "it").cues,
    ).toEqual([
      {
        say: "Lettera finita. Pedala fino alla lettera successiva: il disegno è in pausa.",
        vibrate: true,
      },
    ]);
    // On foot for a run, and for any other activity.
    expect(movePen(startPen(ALONG, WALKS, "sun", "running"), 300).cues[0].say).toBe(
      "Letter done. Walk to the U: the drawing is paused.",
    );
  });

  test("a word that does not fit its walks says the next letter", () => {
    const step = movePen(startPen(ALONG, WALKS, "SUNNY"), 300);
    expect(step.cues).toEqual([
      {
        say: "Letter done. Walk to the next letter: the drawing is paused.",
        vibrate: true,
      },
    ]);
  });

  test("a shape in pieces, walks and no word, says the next part (TASK-223)", () => {
    let pen: Pen = startPen(ALONG, WALKS, null);
    const said: string[] = [];
    for (let m = 0; m <= 1000; m += 10) {
      const step = movePen(pen, m);
      pen = step.pen;
      said.push(...step.cues.map((cue) => cue.say));
    }
    expect(said).toEqual([
      "Part done. Walk to the next part: the drawing is paused.",
      "Pen down: draw the next part.",
      "Part done. Walk to the next part: the drawing is paused.",
      "Pen down: draw the next part.",
    ]);
    expect(
      movePen(startPen(ALONG, WALKS, null, "cycling"), 300, null, "it").cues,
    ).toEqual([
      {
        say: "Parte finita. Pedala fino alla parte successiva: il disegno è in pausa.",
        vibrate: true,
      },
    ]);
  });
});

describe("the pause of the pen in the track", () => {
  test("nothing of a walk is of the run, and the next letter starts a new line", () => {
    let track = record([fix(0, 0), fix(300, 90)]);
    track = penUpTrack(track, NOW + 90_000);
    expect(openPause(track)).toEqual({ fromMs: NOW + 90_000, toMs: null, pen: true });
    track = addFix(track, fix(400, 120));
    expect(track.fixes).toHaveLength(2);
    track = penDownTrack(track, NOW + 144_000);
    track = addFix(track, fix(480, 144));
    track = addFix(track, fix(600, 180));
    // 300 m of the first letter and 120 of the second: none of the walk.
    expect(track.distanceM).toBeCloseTo(420, 0);
    expect(track.fixes[2].gap).toBe(true);
    expect(durationMs(track)).toBe(180_000 - 54_000);
  });

  test("a pause by standing still becomes the pen's; the runner's stays theirs", () => {
    const moving = record([fix(0, 0), fix(300, 90)]);
    const still = pauseTrack(moving, NOW + 95_000, true);
    expect(openPause(penUpTrack(still, NOW + 100_000))).toEqual({
      fromMs: NOW + 95_000,
      toMs: null,
      pen: true,
    });
    const mine = pauseTrack(moving, NOW + 95_000);
    expect(penUpTrack(mine, NOW + 100_000)).toBe(mine);
    // The next letter ends only the pen's pause.
    expect(penDownTrack(mine, NOW + 150_000)).toBe(mine);
    expect(penDownTrack(moving, NOW + 150_000)).toBe(moving);
  });
});

describe("the pen under the run's controls", () => {
  beforeEach(() => {
    jest.useFakeTimers({ now: NOW });
    clearRun();
    setAutoPause(true);
    setVoice(true);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  function begin() {
    const recorder = startRun([], Date.now());
    const onChange = jest.fn();
    const say = jest.fn();
    const session = controlRun(recorder, { onChange, say });
    skipCountdown();
    return { recorder, session, onChange, say };
  }

  test("the pen pauses the run and the next letter resumes it", () => {
    const { recorder, session, onChange } = begin();
    session.onFix(fix(0, 0), false);
    session.onFix(fix(300, 90), false);
    session.liftPen(NOW + 90_000);
    expect(runControl()).toMatchObject({ phase: "paused", auto: false, pen: true });
    expect(onChange).toHaveBeenCalledTimes(1);
    // Ten seconds still on the walk are no pause by standing still.
    jest.setSystemTime(NOW + 120_000);
    jest.advanceTimersByTime(AUTO_PAUSE_AFTER_MS * 2);
    expect(openPause(recorder.track())?.pen).toBe(true);
    session.lowerPen(NOW + 144_000);
    expect(runControl()).toMatchObject({ phase: "running", pen: false });
    expect(openPause(recorder.track())).toBeNull();
    session.end();
  });

  test("standing still at the end of a letter becomes the pen's pause", () => {
    const { recorder, session } = begin();
    session.onFix(fix(0, 0), false);
    session.onFix(fix(300, 90), false);
    jest.setSystemTime(NOW + 90_000);
    jest.advanceTimersByTime(AUTO_PAUSE_AFTER_MS);
    expect(runControl()).toMatchObject({ phase: "paused", auto: true });
    session.liftPen(NOW + 101_000);
    expect(runControl()).toMatchObject({ phase: "paused", auto: false, pen: true });
    // Walking on does not end it: the next letter does.
    session.onFix(fix(350, 120), false);
    expect(runControl().phase).toBe("paused");
    expect(recorder.track().fixes).toHaveLength(2);
    session.end();
  });

  test("a pause of the runner's is theirs: the pen neither takes nor ends it", () => {
    const { recorder, session } = begin();
    session.onFix(fix(0, 0), false);
    session.onFix(fix(250, 75), false);
    jest.setSystemTime(NOW + 80_000);
    pauseRun();
    session.liftPen(NOW + 90_000);
    expect(runControl()).toMatchObject({ phase: "paused", pen: false });
    session.lowerPen(NOW + 144_000);
    expect(runControl().phase).toBe("paused");
    expect(openPause(recorder.track())).toEqual({ fromMs: NOW + 80_000, toMs: null });
    // «Resume» by hand ends it, and a pen's pause too.
    jest.setSystemTime(NOW + 150_000);
    resumeRun();
    expect(runControl()).toMatchObject({ phase: "running", pen: false });
    session.end();
    expect(runControl()).toMatchObject({ phase: "idle", pen: false });
  });
});
