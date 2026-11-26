/**
 * With the app behind another, or the phone locked, a fix no longer writes
 * the whole run again (TASK-496, an addition to ADR-0264): it adds a line to
 * the journal beside the file. The promise of TASK-304 stays: whenever iOS
 * closes MuW, the file with its journal is the run, to the last fix kept.
 */
import type { LatLon } from "@shaperoute/shared-types";
import { AppState, type AppStateStatus } from "react-native";

import { FULL_EVERY_LINES, JOURNAL_FILE, journalBase, journalLine } from "./runJournal";
import type { TrackFix } from "./trackRecorder";
import {
  clearRun,
  endRecording,
  interruptedRun,
  loadRun,
  RUN_FILE,
  type SavedRun,
  saveRun,
  startRun,
} from "./trackStore";

// The phone's documents folder, in memory, with every write counted: what
// is written stays there for the next read, as after iOS closed the app.
jest.mock("expo-file-system", () => {
  const files = new Map<string, string>();
  const state = {
    /** What the phone refuses: every write, the journal's, or emptying it. */
    refusing: null as null | "all" | "journal" | "emptying",
    writes: [] as { uri: string; chars: number; append: boolean }[],
  };
  const isJournal = (uri: string) => uri.endsWith(".journal");
  class File {
    uri: string;
    constructor(directory: { uri: string }, name: string) {
      this.uri = `${directory.uri}${name}`;
    }
    get exists(): boolean {
      return files.has(this.uri);
    }
    create(): void {
      this.refuse();
      files.set(this.uri, "");
    }
    write(text: string, options?: { append?: boolean }): void {
      this.refuse();
      const append = options?.append === true;
      files.set(this.uri, append ? (files.get(this.uri) ?? "") + text : text);
      state.writes.push({ uri: this.uri, chars: text.length, append });
    }
    textSync(): string {
      return files.get(this.uri) ?? "";
    }
    delete(): void {
      if (state.refusing === "emptying" && isJournal(this.uri)) {
        throw new Error("Operation not permitted");
      }
      files.delete(this.uri);
    }
    private refuse(): void {
      if (
        state.refusing === "all" ||
        (state.refusing === "journal" && isJournal(this.uri))
      ) {
        throw new Error("No space left on device");
      }
    }
  }
  return { File, Paths: { document: { uri: "file:///documents/" } }, files, state };
});

const disk = jest.requireMock<{
  files: Map<string, string>;
  state: {
    refusing: null | "all" | "journal" | "emptying";
    writes: { uri: string; chars: number; append: boolean }[];
  };
}>("expo-file-system");
const RUN_URI = `file:///documents/${RUN_FILE}`;
const JOURNAL_URI = `file:///documents/${JOURNAL_FILE}`;

const START: LatLon = [46.0122, 11.2986];
const METRE = 1 / 111_195;
const NOW = Date.UTC(2026, 10, 23, 9, 0, 0);
const north = (m: number): LatLon => [START[0] + m * METRE, START[1]];
const ROUTE: LatLon[] = Array.from({ length: 21 }, (_, i) => north(100 * i));
const MINUTE = 60_000;

/** A fix `northM` metres north of START, `seconds` after NOW. */
function fix(northM: number, seconds: number): TrackFix {
  return { point: north(northM), timeMs: NOW + seconds * 1000, accuracyM: 5 };
}

/** The whole file as it is on the phone, without the journal. */
function fileAlone(): SavedRun {
  return JSON.parse(disk.files.get(RUN_URI) ?? "null") as SavedRun;
}

function journalLines(): string[] {
  return (disk.files.get(JOURNAL_URI) ?? "").split("\n").filter((line) => line !== "");
}

/** The writes of the whole file, and of lines, since the last count. */
function written(): { whole: number; lines: number; chars: number } {
  const writes = disk.state.writes;
  disk.state.writes = [];
  return {
    whole: writes.filter((write) => write.uri === RUN_URI).length,
    lines: writes.filter((write) => write.uri === JOURNAL_URI && write.append).length,
    chars: writes.reduce((sum, write) => sum + write.chars, 0),
  };
}

/** What the app tells its listeners, and what it says it is. */
let listeners: ((next: AppStateStatus) => void)[] = [];
let state: AppStateStatus = "active";
function goTo(next: AppStateStatus): void {
  state = next;
  listeners.forEach((listener) => listener(next));
}

beforeEach(() => {
  disk.files.clear();
  disk.state.refusing = null;
  disk.state.writes = [];
  listeners = [];
  state = "active";
  jest.spyOn(AppState, "addEventListener").mockImplementation((_type, listener) => {
    listeners.push(listener as (next: AppStateStatus) => void);
    return {
      remove: () => {
        listeners = listeners.filter((other) => other !== listener);
      },
    } as ReturnType<typeof AppState.addEventListener>;
  });
  Object.defineProperty(AppState, "currentState", {
    configurable: true,
    get: () => state,
  });
});

afterEach(() => {
  jest.restoreAllMocks();
});

/** How much ROUTE looks like its shape: a run of it can be opened again. */
const SIMILARITY = 0.9;

/** A run of ROUTE with `fixes` fixes 10 m and 3 s apart, in front. */
function runOf(fixes: number) {
  const run = startRun(ROUTE, NOW, SIMILARITY);
  for (let i = 0; i < fixes; i += 1) {
    run.onFix(fix(10 * i, 3 * i), false);
  }
  return run;
}

describe("behind another app, a fix kept", () => {
  test("adds one line to the journal and leaves the whole file as it was", () => {
    const run = runOf(4);
    goTo("background");
    const whole = disk.files.get(RUN_URI);
    written();
    run.onFix(fix(40, 12), false);
    expect(written()).toMatchObject({ whole: 0, lines: 1 });
    expect(disk.files.get(RUN_URI)).toBe(whole);
    expect(fileAlone().track.fixes).toHaveLength(4);
    expect(journalLines()).toHaveLength(1);
    expect(loadRun()?.track).toEqual(run.track());
    run.stop();
  });

  test("«inactive», the step before, is behind too", () => {
    const run = runOf(4);
    goTo("inactive");
    written();
    run.onFix(fix(40, 12), false);
    expect(written()).toMatchObject({ whole: 0, lines: 1 });
    expect(loadRun()?.track).toEqual(run.track());
    run.stop();
  });

  test("a fix the line does not keep writes nothing", () => {
    const run = runOf(4);
    goTo("background");
    written();
    run.onFix(fix(31, 12), false);
    expect(written()).toEqual({ whole: 0, lines: 0, chars: 0 });
    run.stop();
  });

  test("writes as much at the end of a long run as at its start", () => {
    const run = runOf(1000);
    goTo("background");
    written();
    run.onFix(fix(10_000, 3000), false);
    const line = written();
    expect(line).toMatchObject({ whole: 0, lines: 1 });
    // The whole file is some 100 characters a fix: a line is one fix.
    expect(line.chars).toBeLessThan(250);
    expect(disk.files.get(RUN_URI)?.length).toBeGreaterThan(50_000);
    run.stop();
  });

  test("the first fix of a run started behind is the whole file", () => {
    goTo("background");
    const run = startRun(ROUTE, NOW);
    run.onFix(fix(0, 0), false);
    expect(written()).toMatchObject({ whole: 1, lines: 0 });
    run.onFix(fix(10, 3), false);
    expect(written()).toMatchObject({ whole: 0, lines: 1 });
    expect(loadRun()?.track).toEqual(run.track());
    run.stop();
  });
});

describe("closed by iOS behind another app", () => {
  test("at any fix, the file with its journal is the track in memory", () => {
    const run = runOf(6);
    goTo("background");
    for (let i = 6; i < 60; i += 1) {
      run.onFix(fix(10 * i, 3 * i), false);
      // iOS could end the app here: only the files are left.
      expect(loadRun()?.track).toEqual(run.track());
    }
    expect(loadRun()?.status).toBe("running");
    expect(fileAlone().track.fixes).toHaveLength(6);
  });

  test("opened again, the run is the same, and goes on", () => {
    const run = runOf(6);
    goTo("background");
    for (let i = 6; i < 40; i += 1) {
      run.onFix(fix(10 * i, 3 * i), false);
    }
    const left = run.track();
    // Closed: no «Stop». The app opens again two minutes later.
    state = "active";
    const nowMs = NOW + 39 * 3000 + 2 * MINUTE;
    expect(interruptedRun(loadRun(), nowMs)?.track).toEqual(left);
    const again = startRun(ROUTE, nowMs, SIMILARITY);
    expect(again.track()).toEqual(left);
    again.onFix(fix(600, 39 * 3 + 125), false);
    expect(again.track().fixes).toHaveLength(41);
    // Its first write is the whole file, and the journal starts again.
    expect(fileAlone().track.fixes).toHaveLength(41);
    expect(disk.files.has(JOURNAL_URI)).toBe(false);
    again.stop();
  });

  test("as the last line was being written: all the fixes before it", () => {
    const run = runOf(6);
    goTo("background");
    for (let i = 6; i < 20; i += 1) {
      run.onFix(fix(10 * i, 3 * i), false);
    }
    const before = run.track();
    run.onFix(fix(200, 60), false);
    const journal = disk.files.get(JOURNAL_URI) ?? "";
    // The last line cut short, at half its length.
    const lastStart = journal.lastIndexOf("\n", journal.length - 2) + 1;
    const half = lastStart + Math.floor((journal.length - lastStart) / 2);
    disk.files.set(JOURNAL_URI, journal.slice(0, half));
    expect(loadRun()?.track).toEqual(before);
    // Opened again it goes on from there, and the cut line is gone.
    state = "active";
    const again = startRun(ROUTE, NOW + 3 * MINUTE);
    expect(again.track()).toEqual(before);
    again.onFix(fix(210, 185), false);
    expect(loadRun()?.track).toEqual(again.track());
    expect(disk.files.has(JOURNAL_URI)).toBe(false);
    again.stop();
  });

  test("a journal that cannot be read leaves the run of the file", () => {
    const run = runOf(6);
    goTo("background");
    run.onFix(fix(60, 18), false);
    disk.files.set(JOURNAL_URI, "\u0000\u0000 not a journal");
    expect(loadRun()?.track.fixes).toHaveLength(6);
    run.stop();
  });

  test("with a pause by standing still, an absence and the runner's pause", () => {
    const run = runOf(6);
    goTo("background");
    run.onFix(fix(60, 18), false);
    // Standing still for the photo, then on: the pause ends in a line.
    run.pause(NOW + 30_000, true);
    expect(loadRun()?.track).toEqual(run.track());
    written();
    run.onFix(fix(70, 50), false);
    expect(written()).toMatchObject({ whole: 0, lines: 1 });
    expect(loadRun()?.track).toEqual(run.track());
    expect(loadRun()?.track.pauses).toEqual([
      { fromMs: NOW + 30_000, toMs: NOW + 50_000, auto: true },
    ]);
    // iOS froze the app for eleven minutes: a pause of the phone's.
    run.leave(NOW + 51_000);
    run.onFix(fix(900, 50 + 11 * 60), false);
    expect(run.track().pauses).toHaveLength(2);
    expect(loadRun()?.track).toEqual(run.track());
    // The runner's own pause and «Resume»: the next fix carries both.
    run.pause(NOW + 12 * MINUTE);
    expect(loadRun()?.track).toEqual(run.track());
    run.resume(NOW + 13 * MINUTE);
    run.onFix(fix(950, 13 * 60 + 3), false);
    expect(run.track().fixes[run.track().fixes.length - 1].gap).toBe(true);
    expect(loadRun()?.track).toEqual(run.track());
    run.stop();
  });
});

describe("the whole file", () => {
  test("is written leaving the front, and the journal starts from it", () => {
    const run = runOf(6);
    run.onFix(fix(60, 18), false);
    // In front the file is at most 15 s old: the first fix, and the sixth.
    expect(fileAlone().track.fixes).toHaveLength(6);
    written();
    goTo("background");
    expect(written()).toMatchObject({ whole: 1, lines: 0 });
    expect(fileAlone().track.fixes).toHaveLength(7);
    run.stop();
  });

  test("is written again every FULL_EVERY_LINES lines, and the journal emptied", () => {
    const run = runOf(2);
    goTo("background");
    written();
    for (let i = 2; i < 2 + FULL_EVERY_LINES; i += 1) {
      run.onFix(fix(10 * i, 3 * i), false);
    }
    expect(written()).toMatchObject({ whole: 0, lines: FULL_EVERY_LINES });
    expect(journalLines()).toHaveLength(FULL_EVERY_LINES);
    const next = 2 + FULL_EVERY_LINES;
    run.onFix(fix(10 * next, 3 * next), false);
    expect(written()).toMatchObject({ whole: 1, lines: 0 });
    expect(disk.files.has(JOURNAL_URI)).toBe(false);
    expect(fileAlone().track).toEqual(run.track());
    run.onFix(fix(10 * (next + 1), 3 * (next + 1)), false);
    expect(written()).toMatchObject({ whole: 0, lines: 1 });
    expect(loadRun()?.track).toEqual(run.track());
    run.stop();
  });

  test("is written at a pause, at the end and at «Stop», the journal emptied", () => {
    const run = runOf(4);
    goTo("background");
    run.onFix(fix(40, 12), false);
    expect(journalLines()).toHaveLength(1);
    run.pause(NOW + 15_000);
    expect(disk.files.has(JOURNAL_URI)).toBe(false);
    expect(fileAlone().track).toEqual(run.track());
    run.resume(NOW + 20_000);
    run.onFix(fix(60, 23), false);
    expect(journalLines()).toHaveLength(1);
    run.stop();
    expect(disk.files.has(JOURNAL_URI)).toBe(false);
    expect(fileAlone().status).toBe("stopped");
    expect(fileAlone().track).toEqual(run.track());
  });

  test("arriving behind another app writes it, the journal emptied", () => {
    const run = runOf(4);
    goTo("background");
    run.onFix(fix(40, 12), false);
    run.onFix(fix(50, 15), true);
    expect(disk.files.has(JOURNAL_URI)).toBe(false);
    expect(fileAlone().status).toBe("arrived");
    expect(fileAlone().track).toEqual(run.track());
  });

  test("back in front it is written every 15 s as before, the journal read until then", () => {
    const run = runOf(4);
    goTo("background");
    run.onFix(fix(40, 12), false);
    run.onFix(fix(50, 15), false);
    goTo("active");
    written();
    run.onFix(fix(60, 18), false);
    expect(written()).toEqual({ whole: 0, lines: 0, chars: 0 });
    // What was written behind is still the run on the phone.
    expect(loadRun()?.track.fixes).toHaveLength(6);
    run.onFix(fix(110, 33), false);
    expect(written()).toMatchObject({ whole: 1, lines: 0 });
    expect(disk.files.has(JOURNAL_URI)).toBe(false);
    expect(fileAlone().track).toEqual(run.track());
    run.stop();
  });
});

describe("what the journal is not read into", () => {
  test("a run of before the journal: the file alone, as ever", () => {
    const run = runOf(5);
    run.stop();
    const old = fileAlone();
    clearRun();
    disk.files.set(RUN_URI, JSON.stringify({ ...old, status: "running" }));
    expect(disk.files.has(JOURNAL_URI)).toBe(false);
    expect(loadRun()).toEqual({ ...old, status: "running" });
    // Opened again it goes on, and writes as any run.
    const again = startRun(ROUTE, NOW + MINUTE);
    expect(again.track()).toEqual(old.track);
    again.stop();
  });

  test("another run's journal, left by a phone that would not empty it", () => {
    const first = runOf(5);
    goTo("background");
    first.onFix(fix(50, 15), false);
    first.onFix(fix(60, 18), false);
    const stale = disk.files.get(JOURNAL_URI) ?? "";
    expect(stale).not.toBe("");
    clearRun();
    state = "active";
    // A new run an hour later, its file written with the old journal there.
    const later = NOW + 60 * MINUTE;
    const second = startRun(ROUTE, later);
    for (let i = 0; i < 5; i += 1) {
      second.onFix({ ...fix(10 * i, 0), timeMs: later + 3000 * i }, false);
    }
    second.stop();
    const file = fileAlone();
    disk.files.set(RUN_URI, JSON.stringify({ ...file, status: "running" }));
    disk.files.set(JOURNAL_URI, stale);
    expect(loadRun()?.track).toEqual(file.track);
  });

  test("lines older than the file, when the app closed before the journal was emptied", () => {
    const run = runOf(5);
    goTo("background");
    run.onFix(fix(50, 15), false);
    run.onFix(fix(60, 18), false);
    const journal = disk.files.get(JOURNAL_URI) ?? "";
    // The whole file written, and the app closed before the journal went.
    run.pause(NOW + 20_000, true);
    disk.files.set(JOURNAL_URI, journal);
    expect(loadRun()?.track).toEqual(run.track());
    expect(loadRun()?.track.fixes).toHaveLength(7);
  });

  test("a run stopped or arrived: its file is the run", () => {
    const run = runOf(5);
    goTo("background");
    run.onFix(fix(50, 15), false);
    const track = run.track();
    const line = journalLine(
      journalBase(track),
      { ...track, fixes: [...track.fixes, fix(60, 18)] },
      { fixes: track.fixes.length, pauses: track.pauses },
    );
    run.stop();
    disk.files.set(JOURNAL_URI, line);
    expect(loadRun()?.track).toEqual(track);
  });

  test("«Discard» clears the journal with the file", () => {
    const run = runOf(4);
    goTo("background");
    run.onFix(fix(40, 12), false);
    expect(disk.files.has(JOURNAL_URI)).toBe(true);
    clearRun();
    expect(disk.files.has(RUN_URI)).toBe(false);
    expect(disk.files.has(JOURNAL_URI)).toBe(false);
    expect(loadRun()).toBeNull();
  });
});

describe("a phone that refuses", () => {
  test("the line: the whole file is written instead, nothing lost", () => {
    const run = runOf(4);
    goTo("background");
    disk.state.refusing = "journal";
    written();
    run.onFix(fix(40, 12), false);
    expect(written()).toMatchObject({ whole: 1, lines: 0 });
    expect(fileAlone().track).toEqual(run.track());
    run.onFix(fix(50, 15), false);
    expect(fileAlone().track).toEqual(run.track());
    // Lines again once it takes them.
    disk.state.refusing = null;
    written();
    run.onFix(fix(60, 18), false);
    expect(written()).toMatchObject({ whole: 0, lines: 1 });
    expect(loadRun()?.track).toEqual(run.track());
    run.stop();
  });

  test("to empty the journal: the whole file at each fix, until it does", () => {
    const run = runOf(4);
    goTo("background");
    run.onFix(fix(40, 12), false);
    expect(journalLines()).toHaveLength(1);
    disk.state.refusing = "emptying";
    run.pause(NOW + 15_000, true);
    // The journal is still there, of the file before: passed over.
    expect(journalLines()).toHaveLength(1);
    expect(loadRun()?.track).toEqual(run.track());
    written();
    run.onFix(fix(60, 40), false);
    run.onFix(fix(70, 43), false);
    expect(written()).toMatchObject({ whole: 2, lines: 0 });
    expect(journalLines()).toHaveLength(1);
    expect(loadRun()?.track).toEqual(run.track());
    disk.state.refusing = null;
    run.onFix(fix(80, 46), false);
    expect(written()).toMatchObject({ whole: 1, lines: 0 });
    expect(disk.files.has(JOURNAL_URI)).toBe(false);
    run.onFix(fix(90, 49), false);
    expect(written()).toMatchObject({ whole: 0, lines: 1 });
    expect(loadRun()?.track).toEqual(run.track());
    run.stop();
  });

  test("every write: the run is still given back at «Stop», from memory", () => {
    const run = runOf(4);
    goTo("background");
    disk.state.refusing = "all";
    run.onFix(fix(40, 12), false);
    run.onFix(fix(50, 15), false);
    const ended = endRecording();
    expect(ended?.track).toEqual(run.track());
    expect(ended?.status).toBe("stopped");
  });
});

describe("any run, whatever happens in it", () => {
  /** A generator of numbers that gives the same ones each time. */
  function numbers(seed: number): () => number {
    let value = seed;
    return () => {
      value = (Math.imul(value, 1_664_525) + 1_013_904_223) >>> 0;
      return value / 0x1_0000_0000;
    };
  }

  test.each([1, 2, 3, 4, 5])(
    "behind, after each fix the file with its journal is the track (run %i)",
    (seed) => {
      const next = numbers(seed);
      const run = startRun(ROUTE, NOW);
      let metres = 0;
      let seconds = 0;
      for (let step = 0; step < 600; step += 1) {
        const dice = next();
        seconds += 1 + Math.floor(next() * 4);
        const nowMs = NOW + seconds * 1000;
        if (dice < 0.03) {
          goTo(state === "active" ? "background" : "active");
        } else if (dice < 0.05) {
          goTo("inactive");
        } else if (dice < 0.07) {
          run.pause(nowMs, next() < 0.5);
        } else if (dice < 0.1) {
          run.resume(nowMs);
        } else if (dice < 0.11) {
          run.liftPen(nowMs);
        } else if (dice < 0.12) {
          run.lowerPen(nowMs);
        } else if (dice < 0.13) {
          run.leave(nowMs);
          seconds += next() < 0.5 ? 30 : 11 * 60;
        } else {
          // Now and then a fix too near to be kept.
          metres += next() < 0.15 ? 2 : 6 + Math.floor(next() * 10);
          run.onFix(fix(metres, seconds), false);
          if (state !== "active") {
            expect(loadRun()?.track).toEqual(run.track());
          }
        }
      }
      run.stop();
      expect(loadRun()?.track).toEqual(run.track());
      expect(disk.files.has(JOURNAL_URI)).toBe(false);
    },
  );
});

describe("what a locked phone writes over a long run", () => {
  test("grows with the run, not with its square", () => {
    // 12 km locked, a fix every 6 m: 2000 fixes behind.
    const run = runOf(2);
    goTo("background");
    written();
    for (let i = 2; i < 2002; i += 1) {
      run.onFix(fix(6 * i + 4, 2 * i), false);
    }
    const journalled = written();
    const wholeFile = disk.files.get(RUN_URI)?.length ?? 0;
    expect(loadRun()?.track).toEqual(run.track());
    expect(run.track().fixes).toHaveLength(2002);
    // Before the journal each of the 2000 fixes wrote the whole file: on
    // average half of the last one, 2000 times.
    const before = (2000 * wholeFile) / 2;
    expect(journalled.whole).toBe(Math.floor(2000 / (FULL_EVERY_LINES + 1)));
    expect(journalled.chars).toBeLessThan(before / 50);
    run.stop();
  });

  test("the whole file is the one `saveRun` writes: read back as it was", () => {
    const run = runOf(3);
    run.stop();
    const saved = loadRun() as SavedRun;
    expect(saveRun(saved)).toBe(true);
    expect(loadRun()).toEqual(saved);
  });
});
