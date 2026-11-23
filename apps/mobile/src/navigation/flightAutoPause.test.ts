/**
 * No auto-pause in the air (TASK-305): standing still over the ground is
 * flying into the wind, and the live link would say «Paused» with the
 * pilot up there. A flight starts with it off, a run as before; the switch
 * stays, and what the pilot chose is there at the next flight.
 */
import type { LatLon } from "@shaperoute/shared-types";

import {
  AUTO_PAUSE_AFTER_MS,
  controlRun,
  COUNTDOWN_MS,
  runControl,
  setAutoPause,
} from "./runControl";
import { openPause } from "./trackRecorder";
import { clearRun, startRun } from "./trackStore";

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

const START: LatLon = [45.735, 10.835];
const NOW = Date.UTC(2026, 10, 14, 10, 0, 0);

function begin(air: boolean) {
  const recorder = startRun([], Date.now());
  const session = controlRun(recorder, { onChange: jest.fn(), say: jest.fn(), air });
  return { recorder, session };
}

/** The countdown over, one fix, then standing still well past the pause. */
function standStill(begun: ReturnType<typeof begin>) {
  jest.advanceTimersByTime(COUNTDOWN_MS);
  begun.session.onFix({ point: START, timeMs: Date.now(), accuracyM: 5 }, false);
  jest.advanceTimersByTime(AUTO_PAUSE_AFTER_MS * 3);
}

beforeEach(() => {
  jest.useFakeTimers({ now: NOW });
  clearRun();
});

afterEach(() => {
  jest.useRealTimers();
});

test("a flight starts with the auto-pause off, and hovering pauses nothing", () => {
  const flight = begin(true);
  expect(runControl().autoPause).toBe(false);
  standStill(flight);
  expect(runControl().phase).toBe("running");
  expect(openPause(flight.recorder.track())).toBeNull();
  flight.session.end();
});

test("a run keeps its auto-pause on, as before", () => {
  const run = begin(false);
  expect(runControl().autoPause).toBe(true);
  standStill(run);
  expect(runControl()).toMatchObject({ phase: "paused", auto: true });
  run.session.end();
});

test("each kind keeps what was chosen in it, for the next one", () => {
  // The pilot turns it on in a flight: the next flight has it on.
  const first = begin(true);
  setAutoPause(true);
  first.session.end();
  // A run in between keeps its own, untouched.
  const run = begin(false);
  expect(runControl().autoPause).toBe(true);
  setAutoPause(false);
  run.session.end();
  const second = begin(true);
  expect(runControl().autoPause).toBe(true);
  setAutoPause(false);
  second.session.end();
  // And the runner who turned it off for runs finds it off at the next run.
  begin(false).session.end();
  expect(runControl().autoPause).toBe(false);
  // As it was for the other tests.
  const last = begin(false);
  setAutoPause(true);
  last.session.end();
});
