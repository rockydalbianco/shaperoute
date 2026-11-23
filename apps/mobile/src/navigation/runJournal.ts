import type { Pause, Track, TrackFix } from "./trackRecorder";

/**
 * The journal of the run in progress (TASK-496, an addition to ADR-0264):
 * beside the run's file, one line for each write made with the app behind
 * another, holding only what is new since the write before. The file itself
 * holds the whole run and is written now and then; the two together are the
 * run, so nothing is lost when iOS closes MuW, and a fix behind no longer
 * writes the whole run again.
 *
 * A line is JSON, ended by a new line. A line cut short by the app closing
 * as it was written can only be the last one: reading stops there.
 */

export const JOURNAL_FILE = "current-run.journal";

/** After this many lines the file is written whole and the journal starts
 * again: 300 fixes kept are 1.5 km at least. */
export const FULL_EVERY_LINES = 300;

export type JournalLine = {
  /** The whole file this line follows (`journalBase`): a line is of no
   * other file. */
  b: string;
  /** How many fixes the track had before this line. */
  n: number;
  /** The fixes kept since the write before. */
  f: TrackFix[];
  /** The track's metres with them. */
  d: number;
  /** The pauses, all of them, when they changed since the write before. */
  p?: Pause[];
};

/** How the lines read are told from anything else. */
export type JournalChecks = {
  fix: (value: unknown) => value is TrackFix;
  pause: (value: unknown) => value is Pause;
};

/** FNV-1a, 32 bits: enough to tell two lists of pauses apart. */
function hash(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

/**
 * What tells one whole file from another: the run (when its first fix was
 * taken), how many fixes it has, its last one and its pauses. Fixes are only
 * ever added, so two files of a run with the same key hold the same track.
 */
export function journalBase(track: Track): string {
  const first = track.fixes[0];
  const last = track.fixes[track.fixes.length - 1];
  return [
    first?.timeMs ?? "-",
    track.fixes.length,
    last?.timeMs ?? "-",
    hash(JSON.stringify(track.pauses ?? null)),
  ].join(":");
}

/**
 * The line that takes what is written, `fixes` fixes and `pauses`, to
 * `track`, after the whole file `base`.
 */
export function journalLine(
  base: string,
  track: Track,
  written: { fixes: number; pauses: Pause[] | undefined },
): string {
  const line: JournalLine = {
    b: base,
    n: written.fixes,
    f: track.fixes.slice(written.fixes),
    d: track.distanceM,
    ...(track.pauses !== undefined && track.pauses !== written.pauses
      ? { p: track.pauses }
      : {}),
  };
  return `${JSON.stringify(line)}\n`;
}

function isLine(value: unknown, checks: JournalChecks): value is JournalLine {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const line = value as Record<string, unknown>;
  return (
    typeof line.b === "string" &&
    typeof line.n === "number" &&
    Number.isInteger(line.n) &&
    line.n >= 0 &&
    Array.isArray(line.f) &&
    line.f.every(checks.fix) &&
    typeof line.d === "number" &&
    Number.isFinite(line.d) &&
    (line.p === undefined || (Array.isArray(line.p) && line.p.every(checks.pause)))
  );
}

/**
 * `track`, as read from the whole file, with the journal's lines after it.
 * A line of another file is passed over (a journal the phone could not
 * empty); one that cannot be read, or that does not start where the track
 * ends, stops the reading: what was read until then is the run.
 */
export function replayJournal(
  track: Track,
  text: string,
  checks: JournalChecks,
): Track {
  const base = journalBase(track);
  let out = track;
  for (const raw of text.split("\n")) {
    if (raw === "") {
      continue;
    }
    let line: unknown;
    try {
      line = JSON.parse(raw);
    } catch {
      break;
    }
    if (!isLine(line, checks)) {
      break;
    }
    if (line.b !== base) {
      continue;
    }
    if (line.n !== out.fixes.length) {
      break;
    }
    out = {
      ...out,
      fixes: line.f.length > 0 ? [...out.fixes, ...line.f] : out.fixes,
      distanceM: line.d,
      ...(line.p !== undefined ? { pauses: line.p } : {}),
    };
  }
  return out;
}
