/**
 * The journal of the run (TASK-496): a line holds only what is new, and the
 * lines read after the whole file give the track back; a line cut short, or
 * out of place, stops the reading without losing what came before.
 */
import type { LatLon } from "@shaperoute/shared-types";

import {
  type JournalChecks,
  journalBase,
  journalLine,
  replayJournal,
} from "./runJournal";
import {
  addFix,
  emptyTrack,
  type Pause,
  pauseTrack,
  resumeTrack,
  type Track,
  type TrackFix,
} from "./trackRecorder";

const START: LatLon = [46.0122, 11.2986];
const METRE = 1 / 111_195;

function fix(northM: number, seconds: number): TrackFix {
  return {
    point: [START[0] + northM * METRE, START[1]],
    timeMs: seconds * 1000,
    accuracyM: 5,
  };
}

/** A track of `fixes` fixes, 10 m and 3 s apart. */
function trackOf(fixes: number): Track {
  let track = emptyTrack();
  for (let i = 0; i < fixes; i += 1) {
    track = addFix(track, fix(10 * i, 3 * i));
  }
  return track;
}

const checks: JournalChecks = {
  fix: (value): value is TrackFix =>
    typeof value === "object" &&
    value !== null &&
    Array.isArray((value as TrackFix).point) &&
    typeof (value as TrackFix).timeMs === "number",
  pause: (value): value is Pause =>
    typeof value === "object" &&
    value !== null &&
    typeof (value as Pause).fromMs === "number",
};

/** What is written of `track`, as the recorder keeps it. */
function writtenOf(track: Track): { fixes: number; pauses: Pause[] | undefined } {
  return { fixes: track.fixes.length, pauses: track.pauses };
}

describe("a line", () => {
  test("holds the new fixes only, however long the run is", () => {
    const before = trackOf(2000);
    const after = addFix(before, fix(20_000, 6000));
    const line = journalLine(journalBase(before), after, writtenOf(before));
    expect(line.endsWith("\n")).toBe(true);
    expect(line.length).toBeLessThan(200);
    const read = JSON.parse(line) as {
      n: number;
      f: TrackFix[];
      d: number;
      p?: Pause[];
    };
    expect(read.n).toBe(2000);
    expect(read.f).toEqual([fix(20_000, 6000)]);
    expect(read.d).toBe(after.distanceM);
    expect(read.p).toBeUndefined();
  });

  test("holds the pauses when they changed, and only then", () => {
    const before = pauseTrack(trackOf(3), 9000, true);
    // Moving again ends the pause by standing still.
    const after = addFix(before, fix(40, 20));
    const line = journalLine(journalBase(before), after, writtenOf(before));
    expect((JSON.parse(line) as { p?: Pause[] }).p).toEqual(after.pauses);
    const next = addFix(after, fix(50, 23));
    const second = journalLine(journalBase(before), next, writtenOf(after));
    expect((JSON.parse(second) as { p?: Pause[] }).p).toBeUndefined();
  });
});

describe("the lines read after the whole file", () => {
  /** The journal of `steps` after `base`, and the track they lead to. */
  function journalOf(base: Track, steps: ((track: Track) => Track)[]) {
    const key = journalBase(base);
    let track = base;
    let text = "";
    for (const step of steps) {
      const next = step(track);
      text += journalLine(key, next, writtenOf(track));
      track = next;
    }
    return { text, track };
  }

  const base = trackOf(5);
  const steps = [
    (track: Track) => addFix(track, fix(50, 15)),
    (track: Track) => addFix(track, fix(60, 18)),
    (track: Track) => pauseTrack(track, 20_000, true),
    (track: Track) => addFix(track, fix(80, 60)),
    (track: Track) => addFix(track, fix(90, 63)),
  ];

  test("give the track back, fix for fix, with its metres and pauses", () => {
    const { text, track } = journalOf(base, steps);
    expect(track.fixes).toHaveLength(9);
    expect(replayJournal(base, text, checks)).toEqual(track);
  });

  test("no journal, or an empty one: the track of the file, itself", () => {
    expect(replayJournal(base, "", checks)).toBe(base);
    expect(replayJournal(base, "\n", checks)).toBe(base);
  });

  test("the last line cut short: all the lines before it, nothing else lost", () => {
    const { text } = journalOf(base, steps);
    const upTo4 = journalOf(base, steps.slice(0, 4));
    // Cut anywhere in the last line, down to its first character.
    const lastStart = upTo4.text.length;
    for (let cut = lastStart + 1; cut < text.length - 1; cut += 7) {
      expect(replayJournal(base, text.slice(0, cut), checks)).toEqual(upTo4.track);
    }
  });

  test("a line that is not one stops the reading there", () => {
    const { text } = journalOf(base, steps);
    const lines = text.split("\n");
    const upTo2 = journalOf(base, steps.slice(0, 2));
    lines[2] = '{"b":1,"n":"x"}';
    expect(replayJournal(base, lines.join("\n"), checks)).toEqual(upTo2.track);
    lines[2] = "not json";
    expect(replayJournal(base, lines.join("\n"), checks)).toEqual(upTo2.track);
  });

  test("a line that does not start where the track ends stops the reading", () => {
    const { text } = journalOf(base, steps);
    const lines = text.split("\n");
    const upTo1 = journalOf(base, steps.slice(0, 1));
    // The second line lost: the third would leave a hole.
    lines.splice(1, 1);
    expect(replayJournal(base, lines.join("\n"), checks)).toEqual(upTo1.track);
  });

  test("lines of another file are passed over, those of this one read", () => {
    const older = trackOf(3);
    const stale = journalOf(older, [
      (track: Track) => addFix(track, fix(30, 9)),
      (track: Track) => addFix(track, fix(40, 12)),
    ]);
    const { text, track } = journalOf(base, steps);
    expect(replayJournal(base, stale.text, checks)).toBe(base);
    expect(replayJournal(base, stale.text + text, checks)).toEqual(track);
  });
});

describe("what tells one whole file from another", () => {
  test("the run, its fixes and its pauses", () => {
    const track = trackOf(5);
    expect(journalBase(track)).toBe(journalBase(trackOf(5)));
    expect(journalBase(track)).not.toBe(journalBase(trackOf(6)));
    const paused = pauseTrack(track, 20_000);
    expect(journalBase(paused)).not.toBe(journalBase(track));
    expect(journalBase(resumeTrack(paused, 30_000))).not.toBe(journalBase(paused));
    // Another run with as many fixes: it started at another time.
    const other = addFix(emptyTrack(), fix(0, 1));
    expect(journalBase(other)).not.toBe(journalBase(trackOf(1)));
    expect(journalBase(emptyTrack())).toBe(journalBase(emptyTrack()));
  });
});
